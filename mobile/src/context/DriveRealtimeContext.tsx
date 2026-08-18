import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from './AuthContext';
import { driversApi } from '../services/api/driversApi';
import { HttpError } from '../services/api/client';
import { syncDriverLocationInBackground } from '../services/background/locationTask';
import { configureDriverAlerts, ensureDriverAlertPermissions, sendDriverAlert, vibrateForAction } from '../services/notifications/driverAlerts';
import { ridesApi, type DriverRideRequestSummary } from '../services/api/ridesApi';
import { logError, logEvent, startPerformanceTimer } from '../services/observability';
import { logDriverError, logDriverWarning, trackDriverEvent } from '../services/monitoring/telemetry';
import type { RideEvent, RideSummary } from '../types/api';
import type { ActiveTrip, DriverMetrics, DriverProfile, LatLng, NearbyRequest, RideHistoryItem, RideRequest } from '../types/drive';
import { distanceKmBetween } from '../utils/navigation';

type DriveContextValue = {
  profile: DriverProfile;
  metrics: DriverMetrics;
  location: LatLng;
  nearbyRequests: NearbyRequest[];
  activeRequest: RideRequest | null;
  activeTrip: ActiveTrip | null;
  rideHistory: RideHistoryItem[];
  notifications: Array<{ id: string; title: string; body: string; createdAt: string }>;
  requestTimeLeft: number;
  waitingSeconds: number;
  isLoading: boolean;
  error: string | null;
  onboardingRequired: boolean;
  isOfflineMode: boolean;
  setOnline: (isOnline: boolean) => Promise<void>;
  updatePreferences: (nextPreferences: Partial<DriverProfile['preferences']>) => void;
  acceptRequest: () => Promise<void>;
  declineRequest: () => void;
  advanceTrip: () => Promise<void>;
  arriveAtPickup: () => Promise<void>;
  reportNoShow: () => Promise<void>;
  cancelTrip: (reason?: string) => Promise<void>;
  refreshData: () => Promise<void>;
};

const fareFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const formatFare = (amount: number) => fareFormatter.format(amount);

const buildSuppressedTripAlertKey = (rideId: string, state: 'in-progress' | 'completed') => `${rideId}:${state}`;

const DriveRealtimeContext = createContext<DriveContextValue | undefined>(undefined);
const EMPTY_LOCATION: LatLng = { latitude: 0, longitude: 0 };

const HOURS_INCREMENT_PER_TICK = 0.01;
const DATA_REFRESH_INTERVAL_MS = 6000;
const LOCATION_SEND_INTERVAL_MS = 3000;
const LOCATION_SEND_DISTANCE_METERS = 8;
const MAX_LOCATION_ACCURACY_METERS = 90;
const REQUEST_RESPONSE_WINDOW_MS = 30_000;
const LOCATION_UPDATE_INTERVAL_MS = 2000;
const LOCATION_UPDATE_DISTANCE_METERS = 2;
const DRIVER_CACHE_KEY = 'drive.driver-cache.v1';
const DEFAULT_TRUST_SCORE = 80;

type DriverNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

const defaultProfile: DriverProfile = {
  id: 'driver',
  name: 'Driver',
  vehicleStatus: 'good',
  isOnline: false,
  status: 'offline',
  preferences: {
    rideTypes: ['standard', 'comfort'],
    minimumRiderRating: 4.85,
    directionPreference: 'toward_downtown',
    availabilityWindows: [
      { day: 'Mon-Fri', start: '07:00', end: '11:00' },
      { day: 'Mon-Fri', start: '16:00', end: '21:00' },
    ],
  },
  trustScore: DEFAULT_TRUST_SCORE,
  verificationBadge: 'pending',
};

const defaultMetrics: DriverMetrics = {
  earningsToday: 0,
  tripsCompleted: 0,
  hoursOnline: 0,
  earningsPerTrip: 0,
  earningsPerHour: 0,
};

type DriverCacheSnapshot = {
  profile: DriverProfile;
  metrics: DriverMetrics;
  rideHistory: RideHistoryItem[];
  notifications: DriverNotification[];
};

// Trust score combines rating quality and verification state:
// - Base score maps star rating to a 60-100 range using rating*20.
// - Verified drivers get a +5 bonus.
// - Rejected profiles get a -10 penalty (floored at 50).
const computeTrustScore = (rating?: number, verificationState?: string) => {
  const base = Math.min(100, Math.max(60, Math.round((rating ?? 4.5) * 20)));
  if (verificationState === 'verified') {
    return Math.min(100, base + 5);
  }
  if (verificationState === 'rejected') {
    return Math.max(50, base - 10);
  }
  return base;
};

const buildTrustMetadata = (rating?: number, verificationState?: string) => ({
  trustScore: computeTrustScore(rating, verificationState),
  verificationBadge: verificationState === 'verified' ? ('verified' as const) : ('pending' as const),
});

const formatCoordinate = (lat?: number, lng?: number) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'Unknown location';
  }
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
};

const mapFareSummary = (ride: RideSummary) => {
  const fallbackTotal = Number(ride.fareEstimate.toFixed(2));
  return {
    subtotal: Number((ride.fareDetails?.subtotal ?? fallbackTotal).toFixed(2)),
    discounts: Number((ride.fareDetails?.discounts ?? 0).toFixed(2)),
    taxes: Number((ride.fareDetails?.taxes ?? 0).toFixed(2)),
    tolls: Number((ride.fareDetails?.tolls ?? 0).toFixed(2)),
    tips: Number((ride.fareDetails?.tips ?? 0).toFixed(2)),
    total: Number((ride.fareDetails?.total ?? fallbackTotal).toFixed(2)),
    driverEarnings: Number((ride.fareDetails?.driverEarnings ?? fallbackTotal * 0.8).toFixed(2)),
    currency: (ride.fareDetails?.currency || ride.receipt?.currency || 'USD').toUpperCase(),
  };
};

const mapReceiptSummary = (ride: RideSummary): ActiveTrip['receipt'] | undefined => {
  if (ride.status !== 'completed' && ride.status !== 'canceled') {
    return undefined;
  }
  return {
    receiptType: ride.receipt?.receiptType ?? (ride.status === 'completed' ? 'ride_receipt' : 'ride_cancellation'),
    invoiceNumber: ride.receipt?.invoiceNumber || `INV-${ride.id.toUpperCase()}`,
    issuedAt: ride.receipt?.issuedAt || ride.updatedAt || ride.createdAt,
    paymentStatus: ride.receipt?.paymentStatus || (ride.status === 'completed' ? 'settled_internal' : 'not_charged'),
    totalCents: Number.isFinite(ride.receipt?.totalCents)
      ? Number(ride.receipt?.totalCents)
      : Math.round((ride.fareDetails?.total ?? ride.fareEstimate) * 100),
    currency: ride.receipt?.currency || ride.fareDetails?.currency || 'USD',
  };
};

const riderNameFrom = (riderId: string) => {
  if (!riderId) {
    return 'Rider';
  }
  return `Rider ${riderId.slice(-4).toUpperCase()}`;
};

const isDriverOnlineState = (availabilityStatus: 'offline' | 'online' | 'assigned' | 'unavailable') =>
  availabilityStatus === 'online' || availabilityStatus === 'assigned';

const mapRideToActiveTrip = (ride: RideSummary): ActiveTrip => {
  const backendStatus =
    ride.status === 'started'
      ? 'in-progress'
      : ride.status === 'arrived_at_pickup'
        ? 'arrived_at_pickup'
        : ride.status === 'accepted'
          ? 'accepted'
          : 'completed';
  return {
    rideId: ride.id,
    id: ride.id,
    riderId: ride.riderId,
    riderPhone: ride.riderPhone,
    riderName: riderNameFrom(ride.riderId),
    rideType: 'standard',
    pickupAddress: `Pickup · ${formatCoordinate(ride.pickupLat, ride.pickupLng)}`,
    dropoffAddress: `Dropoff · ${formatCoordinate(ride.dropoffLat, ride.dropoffLng)}`,
    pickupPosition: {
      latitude: Number.isFinite(ride.pickupLat) ? Number(ride.pickupLat) : EMPTY_LOCATION.latitude,
      longitude: Number.isFinite(ride.pickupLng) ? Number(ride.pickupLng) : EMPTY_LOCATION.longitude,
    },
    dropoffPosition: {
      latitude: Number.isFinite(ride.dropoffLat) ? Number(ride.dropoffLat) : EMPTY_LOCATION.latitude,
      longitude: Number.isFinite(ride.dropoffLng) ? Number(ride.dropoffLng) : EMPTY_LOCATION.longitude,
    },
    pickupDistanceKm: Number(ride.miles.toFixed(1)),
    tripDistanceKm: Number(ride.miles.toFixed(1)),
    estimatedFare: Number(ride.fareEstimate.toFixed(2)),
    surgeMultiplier: 1,
    pickupEtaMinutes: Number(ride.minutes.toFixed(0)),
    riderRating: 5,
    directionTag: 'toward_downtown',
    status: backendStatus,
    timeline: (ride.events ?? []).map((event) => ({ id: event.id, title: event.title, message: event.message, createdAt: event.createdAt })),
    passengerRating: ride.passengerRating,
    passengerReview: ride.passengerReview,
    waitingSince: ride.waitingSince,
    fareSummary: mapFareSummary(ride),
    receipt: mapReceiptSummary(ride),
  };
};

const mapRideToHistory = (ride: RideSummary): RideHistoryItem => ({
  id: ride.id,
  riderName: riderNameFrom(ride.riderId),
  route: `${formatCoordinate(ride.pickupLat, ride.pickupLng)} → ${formatCoordinate(ride.dropoffLat, ride.dropoffLng)}`,
  fare: Number(ride.fareEstimate.toFixed(2)),
  timeLabel: new Date(ride.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
  miles: Number(ride.miles.toFixed(1)),
  date: new Date(ride.updatedAt).toLocaleDateString(),
});

const mapRideToRequest = (ride: RideSummary): RideRequest => {
  const activeTrip = mapRideToActiveTrip(ride);
  const baseTimestamp = Date.parse(ride.latestEvent?.createdAt ?? ride.updatedAt ?? ride.createdAt);
  return {
    ...activeTrip,
    expiresAt: (Number.isFinite(baseTimestamp) ? baseTimestamp : Date.now()) + REQUEST_RESPONSE_WINDOW_MS,
  };
};

const mapLiveDriverRideRequest = (
  ride: DriverRideRequestSummary,
  driverLocation: LatLng
): RideRequest => {
  const pickupPosition = {
    latitude: Number.isFinite(Number(ride.pickupLat)) ? Number(ride.pickupLat) : EMPTY_LOCATION.latitude,
    longitude: Number.isFinite(Number(ride.pickupLng)) ? Number(ride.pickupLng) : EMPTY_LOCATION.longitude,
  };
  const dropoffPosition = {
    latitude: Number.isFinite(Number(ride.dropoffLat)) ? Number(ride.dropoffLat) : EMPTY_LOCATION.latitude,
    longitude: Number.isFinite(Number(ride.dropoffLng)) ? Number(ride.dropoffLng) : EMPTY_LOCATION.longitude,
  };
  const hasRealDriverLocation = driverLocation.latitude !== 0 || driverLocation.longitude !== 0;
  const hasPickupLocation = pickupPosition.latitude !== 0 || pickupPosition.longitude !== 0;
  const pickupDistanceKm =
    hasRealDriverLocation && hasPickupLocation
      ? distanceKmBetween(driverLocation, pickupPosition)
      : 0;
  const expiresAtMs = ride.expiresAt ? Date.parse(ride.expiresAt) : NaN;
  const rideTypeRaw = String(ride.rideType || 'economy').toLowerCase();
  const rideType =
    rideTypeRaw === 'comfort'
      ? ('comfort' as const)
      : rideTypeRaw === 'xl'
        ? ('xl' as const)
        : ('standard' as const);

  return {
    id: ride.rideId,
    riderName: ride.riderName || 'Rider',
    rideType,
    pickupAddress: ride.pickupAddress || formatCoordinate(ride.pickupLat, ride.pickupLng),
    dropoffAddress: ride.dropoffAddress || ride.destinationAddress || formatCoordinate(ride.dropoffLat, ride.dropoffLng),
    pickupPosition,
    dropoffPosition,
    pickupDistanceKm: Number(pickupDistanceKm.toFixed(1)),
    tripDistanceKm: Number((Number(ride.distance || 0) * 1.609344).toFixed(1)),
    estimatedFare: Number(Number(ride.fareEstimate || 0).toFixed(2)),
    surgeMultiplier: 1,
    pickupEtaMinutes: Math.max(1, Math.round(Number(ride.etaMinutes || ride.minutes || 1))),
    riderRating: Number(ride.riderRating || 5),
    directionTag: 'toward_downtown',
    expiresAt: Number.isFinite(expiresAtMs)
      ? expiresAtMs
      : Date.now() + Math.max(1, Number(ride.timeLeft || 30)) * 1000,
  };
};
const shouldSurfaceIncomingRequest = (ride: RideSummary | null, handledRequestIds: Set<string>) =>
  Boolean(ride && ride.status === 'accepted' && !handledRequestIds.has(ride.id));

const buildDriverNotifications = (rides: RideSummary[]): DriverNotification[] => {
  const seen = new Set<string>();

  return rides
    .flatMap((ride) =>
      (ride.events ?? []).map((event: RideEvent) => ({
        id: `${ride.id}-${event.id}`,
        title: event.title,
        body: event.message,
        createdAt: event.createdAt,
      }))
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .filter((notice) => {
      if (seen.has(notice.id)) {
        return false;
      }
      seen.add(notice.id);
      return true;
    })
    .slice(0, 20);
};

const toErrorMessage = (error: unknown) => {
  if (error instanceof HttpError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong while syncing drive data.';
};

export const DriveRealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const { state, session, onboardingStep } = useAuth();
  const refreshInFlightRef = useRef(false);
  const lastLocationPushRef = useRef<LatLng | null>(null);
  const lastLocationPushAtRef = useRef(0);
  const handledRequestIdsRef = useRef(new Set<string>());
  const previousTripRef = useRef<{ rideId: string; status: ActiveTrip['status'] } | null>(null);
  const lastIncomingRequestIdRef = useRef<string | null>(null);
  const suppressedTripAlertRef = useRef<string | null>(null);
  const [profile, setProfile] = useState<DriverProfile>(defaultProfile);
  const [metrics, setMetrics] = useState<DriverMetrics>(defaultMetrics);
  const [location, setLocation] = useState<LatLng>(EMPTY_LOCATION);
  const [nearbyRequests, setNearbyRequests] = useState<NearbyRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<RideRequest | null>(null);
  const [backendActiveTrip, setBackendActiveTrip] = useState<ActiveTrip | null>(null);
  const [completedTripReview, setCompletedTripReview] = useState<ActiveTrip | null>(null);
  const [rideHistory, setRideHistory] = useState<RideHistoryItem[]>([]);
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [requestTimeLeft, setRequestTimeLeft] = useState(0);
  const [waitingSeconds, setWaitingSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingRequired, setOnboardingRequired] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const activeTrip = backendActiveTrip ?? completedTripReview;

  const persistCacheSnapshot = useCallback(async (snapshot: DriverCacheSnapshot) => {
    try {
      await SecureStore.setItemAsync(DRIVER_CACHE_KEY, JSON.stringify(snapshot));
    } catch (cacheError) {
      console.warn('Unable to persist driver cache snapshot', cacheError);
    }
  }, []);

  const restoreFromCache = useCallback(async () => {
    const raw = await SecureStore.getItemAsync(DRIVER_CACHE_KEY);
    if (!raw) {
      return false;
    }
    try {
      const parsed = JSON.parse(raw) as DriverCacheSnapshot;
      setProfile(parsed.profile);
      setMetrics(parsed.metrics);
      setRideHistory(parsed.rideHistory);
      setNotifications(parsed.notifications);
      return true;
    } catch {
      return false;
    }
  }, []);

  const refreshData = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    if (state !== 'signed_in' || !session) {
      setProfile(defaultProfile);
      setMetrics(defaultMetrics);
      setBackendActiveTrip(null);
      setCompletedTripReview(null);
      setActiveRequest(null);
      setRideHistory([]);
      setNotifications([]);
      setRequestTimeLeft(0);
      setOnboardingRequired(false);
      setIsOfflineMode(false);
      handledRequestIdsRef.current.clear();
      previousTripRef.current = null;
      lastIncomingRequestIdRef.current = null;
      suppressedTripAlertRef.current = null;
      return;
    }

    setIsLoading(true);
    setError(null);
    refreshInFlightRef.current = true;
    const stopRefreshTimer = startPerformanceTimer('driver_refresh_data_duration');

    try {
      const [driver, trip, history, earnings] = await Promise.all([
        driversApi.me(),
        driversApi.currentTrip(),
        ridesApi.history(),
        driversApi.earnings(),
      ]);

      const backendProfile = driver.profile;
      const mappedTrip = trip.ride ? mapRideToActiveTrip(trip.ride) : null;
      const trustMetadata = buildTrustMetadata(backendProfile.rating, backendProfile.verificationState);
      const nextDriverStatus =
        onboardingStep !== 'ready'
          ? 'onboarding'
          : mappedTrip
            ? mappedTrip.status
            : isDriverOnlineState(backendProfile.availabilityStatus)
              ? 'waiting'
              : 'offline';
      setBackendActiveTrip(mappedTrip);
      if (mappedTrip) {
        setCompletedTripReview(null);
        setRequestTimeLeft(0);
      }
      if (mappedTrip) {
        setActiveRequest(null);
      } else if (shouldSurfaceIncomingRequest(trip.ride, handledRequestIdsRef.current) && trip.ride) {
        setActiveRequest(mapRideToRequest(trip.ride));
      }

      setProfile((current) => ({
        id: backendProfile.userId,
        name: (session.user.email?.split('@')[0] || '').trim() || 'Driver',
        email: session.user.email,
        vehicleStatus: 'good',
        isOnline: isDriverOnlineState(backendProfile.availabilityStatus),
        status: nextDriverStatus,
        preferences: current.preferences,
        trustScore: trustMetadata.trustScore,
        verificationBadge: trustMetadata.verificationBadge,
      }));

      setRideHistory(history.rides.map(mapRideToHistory));
      setMetrics((current) => {
        const nextHours = isDriverOnlineState(backendProfile.availabilityStatus)
          ? Number((current.hoursOnline + HOURS_INCREMENT_PER_TICK).toFixed(2))
          : current.hoursOnline;
        const earningsToday = Number((earnings.earningsCents / 100).toFixed(2));
        const rideCount = earnings.rideCount;
        return {
          earningsToday,
          tripsCompleted: rideCount,
          hoursOnline: nextHours,
          earningsPerTrip: rideCount > 0 ? Number((earningsToday / rideCount).toFixed(2)) : 0,
          earningsPerHour: nextHours > 0 ? Number((earningsToday / nextHours).toFixed(2)) : 0,
        };
      });
      setNotifications(buildDriverNotifications(trip.ride ? [trip.ride, ...history.rides] : history.rides));
      setOnboardingRequired(onboardingStep !== 'ready');
      setIsOfflineMode(false);
      await persistCacheSnapshot({
        profile: {
          id: backendProfile.userId,
          name: (session.user.email?.split('@')[0] || '').trim() || 'Driver',
          email: session.user.email,
          vehicleStatus: 'good',
          isOnline: isDriverOnlineState(backendProfile.availabilityStatus),
          status: nextDriverStatus,
          preferences: profile.preferences,
          trustScore: trustMetadata.trustScore,
          verificationBadge: trustMetadata.verificationBadge,
        },
        metrics: {
          earningsToday: Number((earnings.earningsCents / 100).toFixed(2)),
          tripsCompleted: earnings.rideCount,
          hoursOnline: metrics.hoursOnline,
          earningsPerTrip: earnings.rideCount > 0 ? Number(((earnings.earningsCents / 100) / earnings.rideCount).toFixed(2)) : 0,
          earningsPerHour: metrics.hoursOnline > 0 ? Number(((earnings.earningsCents / 100) / metrics.hoursOnline).toFixed(2)) : 0,
        },
        rideHistory: history.rides.map(mapRideToHistory),
        notifications: buildDriverNotifications(trip.ride ? [trip.ride, ...history.rides] : history.rides),
      });
      stopRefreshTimer({
        success: true,
        rideHistoryCount: history.rides.length,
        hasActiveTrip: Boolean(mappedTrip),
      });
      logEvent('driver_data_refreshed', {
        rideHistoryCount: history.rides.length,
        hasActiveTrip: Boolean(mappedTrip),
      });
    } catch (err) {
      const message = toErrorMessage(err);
      stopRefreshTimer({ success: false });
      if (message.includes('driver not found')) {
        setOnboardingRequired(true);
        setError(null);
        logEvent('driver_onboarding_required');
      } else {
        setError(message);
        logError('driver_refresh_data_failed', err);
      }
      const restored = await restoreFromCache();
      setIsOfflineMode(restored);
      logDriverError('refresh_data', err, { onboardingStep, hasSession: Boolean(session) });
    } finally {
      setIsLoading(false);
      refreshInFlightRef.current = false;
    }
  }, [onboardingStep, persistCacheSnapshot, restoreFromCache, session, state]);

  const updatePreferences = useCallback((nextPreferences: Partial<DriverProfile['preferences']>) => {
    setProfile((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        ...nextPreferences,
      },
    }));
  }, []);


  useEffect(() => {
    const configureAlerts = async () => {
      try {
        await configureDriverAlerts();
        await ensureDriverAlertPermissions();
      } catch (err) {
        logDriverError('configure_alerts', err);
      }
    };

    void configureAlerts();
  }, []);

  useEffect(() => {
    if (
      state !== 'signed_in' ||
      onboardingStep !== 'ready' ||
      !profile.isOnline ||
      activeTrip
    ) {
      setActiveRequest(null);
      return;
    }

    let canceled = false;

    const loadLiveRequests = async () => {
      try {
        const feed = await ridesApi.openRequests(20);
        if (canceled) return;

        const requests = (feed.rides || [])
          .map((ride) => mapLiveDriverRideRequest(ride, location))
          .filter((ride) => !handledRequestIdsRef.current.has(ride.id))
          .filter((ride) => ride.expiresAt > Date.now());

        setActiveRequest((current) => {
          if (current && requests.some((ride) => ride.id === current.id)) {
            return current;
          }
          return requests[0] || null;
        });

        logEvent('driver_live_request_feed', {
          requestCount: requests.length,
        });
      } catch (err) {
        logDriverError('load_live_ride_requests', err);
      }
    };

    void loadLiveRequests();
    const liveRequestTimer = setInterval(() => {
      void loadLiveRequests();
    }, DATA_REFRESH_INTERVAL_MS);

    return () => {
      canceled = true;
      clearInterval(liveRequestTimer);
    };
  }, [
    activeTrip,
    location.latitude,
    location.longitude,
    onboardingStep,
    profile.isOnline,
    state,
  ]);
  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;

    const setupLocationTracking = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== Location.PermissionStatus.GRANTED) {
          setError('Location permission is required for live trip updates.');
          logEvent('location_permission_denied');
          return;
        }

        try {
          const initialFix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
          setLocation({ latitude: initialFix.coords.latitude, longitude: initialFix.coords.longitude });
        } catch (initialFixError) {
          // Stay offline until a real GPS fix is available; never fabricate a driver location.
          logError('location_initial_fix_unavailable', initialFixError);
          logDriverWarning('initial_location_fix', initialFixError);
        }

        watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: LOCATION_UPDATE_INTERVAL_MS,
            distanceInterval: LOCATION_UPDATE_DISTANCE_METERS,
            mayShowUserSettingsDialog: true,
          },
          (update) => {
            if (typeof update.coords.accuracy === 'number' && update.coords.accuracy > MAX_LOCATION_ACCURACY_METERS) {
              return;
            }
            const nextLocation = { latitude: update.coords.latitude, longitude: update.coords.longitude };
            setLocation(nextLocation);
            if (state === 'signed_in' && profile.isOnline) {
              const now = Date.now();
              const distanceFromLastPush = lastLocationPushRef.current
                ? distanceKmBetween(lastLocationPushRef.current, nextLocation) * 1000
                : Number.POSITIVE_INFINITY;
              const elapsed = now - lastLocationPushAtRef.current;
              if (distanceFromLastPush >= LOCATION_SEND_DISTANCE_METERS || elapsed >= LOCATION_SEND_INTERVAL_MS) {
                lastLocationPushRef.current = nextLocation;
                lastLocationPushAtRef.current = now;
                logEvent('driver_location_synced');
                void driversApi.updateLocation(nextLocation.latitude, nextLocation.longitude).catch((err) => {
                  logDriverError('update_location', err, {
                    latitude: Number(nextLocation.latitude.toFixed(3)),
                    longitude: Number(nextLocation.longitude.toFixed(3)),
                  });
                });
              }
            }
          }
        );
      } catch (err) {
        setError('Unable to start live location updates right now.');
        logDriverError('location_tracking_setup', err);
      }
    };

    void setupLocationTracking();

    return () => watcher?.remove();
  }, [profile.isOnline, state]);

  useEffect(() => {
    void syncDriverLocationInBackground(state === 'signed_in' && profile.isOnline);
  }, [profile.isOnline, state]);

  useEffect(() => {
    if (state !== 'signed_in') {
      return;
    }
    void refreshData();

    const ticker = setInterval(() => {
      void refreshData();
    }, DATA_REFRESH_INTERVAL_MS);

    return () => clearInterval(ticker);
  }, [refreshData, state]);

  useEffect(() => {
    if (!activeRequest) {
      setRequestTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const nextTimeLeft = Math.max(0, Math.ceil((activeRequest.expiresAt - Date.now()) / 1000));
      setRequestTimeLeft(nextTimeLeft);
      if (nextTimeLeft === 0) {
        logEvent('ride_request_expired', {
          requestId: activeRequest.id,
        });
        trackDriverEvent('request_expired', { requestId: activeRequest.id });
        handledRequestIdsRef.current.add(activeRequest.id);
        setActiveRequest(null);
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [activeRequest]);

  useEffect(() => {
    if (activeTrip?.status !== 'arrived_at_pickup' || !activeTrip.waitingSince) {
      setWaitingSeconds(0);
      return;
    }
    const waitingStart = Date.parse(activeTrip.waitingSince);
    const updateWaiting = () => {
      setWaitingSeconds(Math.floor((Date.now() - waitingStart) / 1000));
    };
    updateWaiting();
    const waitInterval = setInterval(updateWaiting, 1000);
    return () => clearInterval(waitInterval);
  }, [activeTrip?.status, activeTrip?.waitingSince]);

  useEffect(() => {
    if (!activeRequest || lastIncomingRequestIdRef.current === activeRequest.id) {
      return;
    }

    lastIncomingRequestIdRef.current = activeRequest.id;
    logEvent('ride_request_received', {
      requestId: activeRequest.id,
    });
    void sendDriverAlert(
      'incoming-request',
      'Incoming ride request',
      `${activeRequest.riderName} • ${activeRequest.pickupEtaMinutes} min away • ${formatFare(activeRequest.estimatedFare)}`
    );
  }, [activeRequest]);

  useEffect(() => {
    const previousTrip = previousTripRef.current;

    if (!activeTrip) {
      if (previousTrip?.status === 'in-progress') {
        if (suppressedTripAlertRef.current === buildSuppressedTripAlertKey(previousTrip.rideId, 'completed')) {
          suppressedTripAlertRef.current = null;
          previousTripRef.current = null;
          return;
        }
        void sendDriverAlert('trip-ended', 'Trip ended', 'Trip completed successfully.');
      }
      previousTripRef.current = null;
      return;
    }

    if (!previousTrip || previousTrip.rideId !== activeTrip.rideId) {
      previousTripRef.current = { rideId: activeTrip.rideId, status: activeTrip.status };
      return;
    }

    if (previousTrip.status !== activeTrip.status) {
      if (activeTrip.status === 'in-progress') {
        // Suppress the next alert when the state change was initiated locally; the user already
        // received feedback from the tap handler before refreshData observes the server update.
        if (suppressedTripAlertRef.current === buildSuppressedTripAlertKey(activeTrip.rideId, 'in-progress')) {
          suppressedTripAlertRef.current = null;
          previousTripRef.current = { rideId: activeTrip.rideId, status: activeTrip.status };
          return;
        }
        void sendDriverAlert('trip-started', 'Trip started', 'Pickup confirmed and the ride is now in progress.');
      } else if (activeTrip.status === 'completed') {
        if (suppressedTripAlertRef.current === buildSuppressedTripAlertKey(activeTrip.rideId, 'completed')) {
          suppressedTripAlertRef.current = null;
          previousTripRef.current = { rideId: activeTrip.rideId, status: activeTrip.status };
          return;
        }
        void sendDriverAlert('trip-ended', 'Trip ended', 'Trip completed successfully.');
      }
    }

    previousTripRef.current = { rideId: activeTrip.rideId, status: activeTrip.status };
  }, [activeTrip]);

  const setOnline = useCallback(
    async (isOnline: boolean) => {
      if (onboardingStep !== 'ready') {
        setError('Finish onboarding before going online.');
        return;
      }

      setError(null);
      if (isOnline && location.latitude === 0 && location.longitude === 0) {
        setError('Waiting for a real GPS fix before going online.');
        return;
      }
      const stopAvailabilityTimer = startPerformanceTimer('driver_set_availability_duration');
      try {
        if (isOnline) {
          await driversApi.updateLocation(location.latitude, location.longitude);
        }
        await driversApi.setAvailability(isOnline ? 'online' : 'offline');
        await refreshData();
        await vibrateForAction(isOnline ? 'success' : 'selection');
        stopAvailabilityTimer({ success: true, isOnline });
        logEvent('driver_availability_updated', { isOnline });
      } catch (err) {
        stopAvailabilityTimer({ success: false, isOnline });
        logError('driver_set_availability_failed', err, { isOnline });
        setError(toErrorMessage(err));
        logDriverError('set_online', err, { isOnline });
      }
    },
    [location.latitude, location.longitude, onboardingStep, refreshData]
  );

  const acceptRequest = useCallback(async () => {
    if (!activeRequest) {
      return;
    }

    const requestId = activeRequest.id;
    const stopAcceptTimer = startPerformanceTimer('ride_request_accept_duration', {
      requestId,
    });

    try {
      await ridesApi.accept(requestId);
      handledRequestIdsRef.current.add(requestId);
      previousTripRef.current = { rideId: requestId, status: 'accepted' };
      setCompletedTripReview(null);
      setActiveRequest(null);
      setRequestTimeLeft(0);
      setError(null);
      trackDriverEvent('request_accepted', { requestId, mock: false });
      await sendDriverAlert(
        'accepted',
        'Request accepted',
        `Head to ${activeRequest.riderName} for pickup.`
      );
      await refreshData();
      await vibrateForAction('success');
      stopAcceptTimer({ success: true, mock: false });
      logEvent('ride_request_accepted', { requestId, mock: false });
    } catch (err) {
      stopAcceptTimer({ success: false });
      logError('ride_request_accept_failed', err, { requestId });
      setError(toErrorMessage(err));
      logDriverError('accept_request', err, { requestId });
    }
  }, [activeRequest, refreshData]);
  const declineRequest = useCallback(async () => {
    if (!activeRequest) {
      return;
    }

    const requestId = activeRequest.id;

    try {
      await ridesApi.decline(requestId);
      handledRequestIdsRef.current.add(requestId);
      setActiveRequest(null);
      setRequestTimeLeft(0);
      setError(null);
      trackDriverEvent('request_declined', { requestId, mock: false });
      logEvent('ride_request_declined', { requestId });
      await vibrateForAction('warning');
    } catch (err) {
      setError(toErrorMessage(err));
      logDriverError('decline_request', err, { requestId });
    }
  }, [activeRequest]);
  const advanceTrip = useCallback(async () => {
    if (!activeTrip) {
      return;
    }

    const fromStatus = activeTrip.status;
    let toStatus: ActiveTrip['status'] | 'cleared' | 'unchanged' = 'unchanged';
    const stopAdvanceTimer = startPerformanceTimer('trip_advance_duration', {
      rideId: activeTrip.rideId,
      fromStatus,
    });

    try {
      if (activeTrip.status === 'accepted') {
        await ridesApi.arrive(activeTrip.rideId);
        trackDriverEvent('trip_status_advanced', {
          rideId: activeTrip.rideId,
          nextStatus: 'arrived_at_pickup',
          mock: false,
        });
        await sendDriverAlert(
          'driver-arrived',
          'Arrived at pickup',
          `Waiting for ${activeTrip.riderName}.`
        );
        toStatus = 'arrived_at_pickup';
      } else if (activeTrip.status === 'arrived_at_pickup') {
        await ridesApi.start(activeTrip.rideId);
        suppressedTripAlertRef.current = buildSuppressedTripAlertKey(
          activeTrip.rideId,
          'in-progress'
        );
        trackDriverEvent('trip_status_advanced', {
          rideId: activeTrip.rideId,
          nextStatus: 'in-progress',
          mock: false,
        });
        await sendDriverAlert(
          'trip-started',
          'Trip started',
          `${activeTrip.riderName} is onboard. Continue to the destination.`
        );
        toStatus = 'in-progress';
      } else if (activeTrip.status === 'in-progress') {
        const completion = await ridesApi.complete(activeTrip.rideId);
        setCompletedTripReview(
          mapRideToActiveTrip({
            ...completion.ride,
            receipt: completion.receipt ?? completion.ride.receipt,
          })
        );
        setBackendActiveTrip(null);
        suppressedTripAlertRef.current = buildSuppressedTripAlertKey(
          activeTrip.rideId,
          'completed'
        );
        trackDriverEvent('trip_status_advanced', {
          rideId: activeTrip.rideId,
          nextStatus: 'completed',
          mock: false,
        });
        await sendDriverAlert(
          'trip-ended',
          'Trip ended',
          `${activeTrip.riderName}'s trip is complete.`
        );
        toStatus = 'completed';
      } else if (activeTrip.status === 'completed') {
        setCompletedTripReview(null);
        toStatus = 'cleared';
      }

      await vibrateForAction('success');
      const resolvedToStatus =
        toStatus === 'unchanged' ? fromStatus : toStatus;

      if (resolvedToStatus !== 'cleared') {
        await refreshData();
      }

      stopAdvanceTimer({ success: true, toStatus: resolvedToStatus });
      logEvent('trip_status_advanced', {
        rideId: activeTrip.rideId,
        fromStatus,
        toStatus: resolvedToStatus,
      });
    } catch (err) {
      const resolvedToStatus =
        toStatus === 'unchanged' ? fromStatus : toStatus;
      stopAdvanceTimer({ success: false, toStatus: resolvedToStatus });
      logError('trip_advance_failed', err, {
        rideId: activeTrip.rideId,
        fromStatus,
        toStatus: resolvedToStatus,
      });
      setError(toErrorMessage(err));
      logDriverError('advance_trip', err, {
        rideId: activeTrip.rideId,
        status: activeTrip.status,
      });
    }
  }, [activeTrip, refreshData]);
  const arriveAtPickup = useCallback(async () => {
    if (!activeTrip || activeTrip.status !== 'accepted') {
      return;
    }

    try {
      await ridesApi.arrive(activeTrip.rideId);
      await sendDriverAlert(
        'driver-arrived',
        'Arrived at pickup',
        `Waiting for ${activeTrip.riderName}.`
      );
      await refreshData();
      await vibrateForAction('success');
    } catch (err) {
      setError(toErrorMessage(err));
      logDriverError('arrive_at_pickup', err, {
        rideId: activeTrip.rideId,
      });
    }
  }, [activeTrip, refreshData]);
  const reportNoShow = useCallback(async () => {
    if (!activeTrip || activeTrip.status !== 'arrived_at_pickup') {
      return;
    }

    try {
      await ridesApi.noShow(activeTrip.rideId);
      trackDriverEvent('rider_no_show', {
        rideId: activeTrip.rideId,
        mock: false,
      });
      await sendDriverAlert(
        'rider-no-show',
        'Rider no-show',
        'Trip canceled. You are now free to accept new requests.'
      );
      await refreshData();
      await vibrateForAction('warning');
    } catch (err) {
      setError(toErrorMessage(err));
      logDriverError('report_no_show', err, {
        rideId: activeTrip.rideId,
      });
    }
  }, [activeTrip, refreshData]);
  const cancelTrip = useCallback(async (reason?: string) => {
    if (!activeTrip) {
      return;
    }
    if (activeTrip.status === 'in-progress' || activeTrip.status === 'completed') {
      return;
    }

    try {
      await ridesApi.driverCancel(activeTrip.rideId, reason);
      trackDriverEvent('driver_canceled_trip', {
        rideId: activeTrip.rideId,
        reason,
        mock: false,
      });
      await sendDriverAlert(
        'trip-canceled',
        'Trip canceled',
        'You have canceled the trip.'
      );
      await refreshData();
      await vibrateForAction('warning');
    } catch (err) {
      setError(toErrorMessage(err));
      logDriverError('cancel_trip', err, {
        rideId: activeTrip.rideId,
      });
    }
  }, [activeTrip, refreshData]);
  const value = useMemo(
    () => ({
      profile,
      metrics,
      location,
      nearbyRequests,
      activeRequest,
      activeTrip,
      rideHistory,
      notifications,
      requestTimeLeft,
      waitingSeconds,
      isLoading,
      error,
      onboardingRequired,
      isOfflineMode,
      setOnline,
      updatePreferences,
      acceptRequest,
      declineRequest,
      advanceTrip,
      arriveAtPickup,
      reportNoShow,
      cancelTrip,
      refreshData,
    }),
    [acceptRequest, activeRequest, activeTrip, advanceTrip, arriveAtPickup, cancelTrip, declineRequest, error, isLoading, isOfflineMode, location, metrics, nearbyRequests, notifications, onboardingRequired, profile, refreshData, reportNoShow, requestTimeLeft, rideHistory, setOnline, updatePreferences, waitingSeconds]
  );

  return <DriveRealtimeContext.Provider value={value}>{children}</DriveRealtimeContext.Provider>;
};

export const useDriveRealtime = () => {
  const context = useContext(DriveRealtimeContext);
  if (!context) {
    throw new Error('useDriveRealtime must be used within DriveRealtimeProvider');
  }
  return context;
};
