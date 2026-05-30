import * as Location from 'expo-location';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from './AuthContext';
import { driversApi } from '../services/api/driversApi';
import { HttpError } from '../services/api/client';
import { syncDriverLocationInBackground } from '../services/background/locationTask';
import { configureDriverAlerts, ensureDriverAlertPermissions, sendDriverAlert, vibrateForAction } from '../services/notifications/driverAlerts';
import { buildNearbyRequests, getSeedLocation } from '../services/realtime/mockDriveFeed';
import { ridesApi } from '../services/api/ridesApi';
import type { RideEvent, RideSummary } from '../types/api';
import type { ActiveTrip, DriverMetrics, DriverProfile, LatLng, RideHistoryItem, RideRequest } from '../types/drive';

type DriveContextValue = {
  profile: DriverProfile;
  metrics: DriverMetrics;
  location: LatLng;
  nearbyRequests: ReturnType<typeof buildNearbyRequests>;
  activeRequest: RideRequest | null;
  activeTrip: ActiveTrip | null;
  rideHistory: RideHistoryItem[];
  notifications: Array<{ id: string; title: string; body: string; createdAt: string }>;
  requestTimeLeft: number;
  isLoading: boolean;
  error: string | null;
  onboardingRequired: boolean;
  setOnline: (isOnline: boolean) => Promise<void>;
  acceptRequest: () => Promise<void>;
  declineRequest: () => void;
  advanceTrip: () => Promise<void>;
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

const HOURS_INCREMENT_PER_TICK = 0.01;
const DATA_REFRESH_INTERVAL_MS = 6000;
const REQUEST_RESPONSE_WINDOW_MS = 30_000;
const LOCATION_UPDATE_INTERVAL_MS = 4000;
const LOCATION_UPDATE_DISTANCE_METERS = 8;

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
};

const defaultMetrics: DriverMetrics = {
  earningsToday: 0,
  tripsCompleted: 0,
  hoursOnline: 0,
};

const formatCoordinate = (lat?: number, lng?: number) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return 'Unknown location';
  }
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
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
  const backendStatus = ride.status === 'started' ? 'in-progress' : ride.status === 'accepted' ? 'accepted' : 'completed';
  return {
    rideId: ride.id,
    id: ride.id,
    riderName: riderNameFrom(ride.riderId),
    pickupAddress: `Pickup · ${formatCoordinate(ride.pickupLat, ride.pickupLng)}`,
    dropoffAddress: `Dropoff · ${formatCoordinate(ride.dropoffLat, ride.dropoffLng)}`,
    pickupPosition: {
      latitude: Number.isFinite(ride.pickupLat) ? Number(ride.pickupLat) : getSeedLocation().latitude,
      longitude: Number.isFinite(ride.pickupLng) ? Number(ride.pickupLng) : getSeedLocation().longitude,
    },
    dropoffPosition: {
      latitude: Number.isFinite(ride.dropoffLat) ? Number(ride.dropoffLat) : getSeedLocation().latitude,
      longitude: Number.isFinite(ride.dropoffLng) ? Number(ride.dropoffLng) : getSeedLocation().longitude,
    },
    pickupDistanceKm: Number(ride.miles.toFixed(1)),
    tripDistanceKm: Number(ride.miles.toFixed(1)),
    estimatedFare: Number(ride.fareEstimate.toFixed(2)),
    pickupEtaMinutes: Number(ride.minutes.toFixed(0)),
    riderRating: 5,
    status: backendStatus,
    timeline: (ride.events ?? []).map((event) => ({ id: event.id, title: event.title, message: event.message, createdAt: event.createdAt })),
  };
};

const mapRideToHistory = (ride: RideSummary): RideHistoryItem => ({
  id: ride.id,
  riderName: riderNameFrom(ride.riderId),
  route: `${formatCoordinate(ride.pickupLat, ride.pickupLng)} → ${formatCoordinate(ride.dropoffLat, ride.dropoffLng)}`,
  fare: Number(ride.fareEstimate.toFixed(2)),
  timeLabel: new Date(ride.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
});

const mapRideToRequest = (ride: RideSummary): RideRequest => {
  const activeTrip = mapRideToActiveTrip(ride);
  const baseTimestamp = Date.parse(ride.latestEvent?.createdAt ?? ride.updatedAt ?? ride.createdAt);
  return {
    ...activeTrip,
    expiresAt: (Number.isFinite(baseTimestamp) ? baseTimestamp : Date.now()) + REQUEST_RESPONSE_WINDOW_MS,
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
  const handledRequestIdsRef = useRef(new Set<string>());
  const previousTripRef = useRef<{ rideId: string; status: ActiveTrip['status'] } | null>(null);
  const lastIncomingRequestIdRef = useRef<string | null>(null);
  const suppressedTripAlertRef = useRef<string | null>(null);
  const [profile, setProfile] = useState<DriverProfile>(defaultProfile);
  const [metrics, setMetrics] = useState<DriverMetrics>(defaultMetrics);
  const [location, setLocation] = useState<LatLng>(getSeedLocation());
  const [nearbyRequests, setNearbyRequests] = useState(buildNearbyRequests());
  const [activeRequest, setActiveRequest] = useState<RideRequest | null>(null);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [rideHistory, setRideHistory] = useState<RideHistoryItem[]>([]);
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [requestTimeLeft, setRequestTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingRequired, setOnboardingRequired] = useState(false);

  const refreshData = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    if (state !== 'signed_in' || !session) {
      setProfile(defaultProfile);
      setMetrics(defaultMetrics);
      setActiveRequest(null);
      setActiveTrip(null);
      setRideHistory([]);
      setNotifications([]);
      setRequestTimeLeft(0);
      setOnboardingRequired(false);
      handledRequestIdsRef.current.clear();
      previousTripRef.current = null;
      lastIncomingRequestIdRef.current = null;
      suppressedTripAlertRef.current = null;
      return;
    }

    setIsLoading(true);
    setError(null);
    refreshInFlightRef.current = true;

    try {
      const [driver, trip, history, earnings] = await Promise.all([
        driversApi.me(),
        driversApi.currentTrip(),
        ridesApi.history(),
        driversApi.earnings(),
      ]);

      const backendProfile = driver.profile;
      const mappedTrip = trip.ride ? mapRideToActiveTrip(trip.ride) : null;
      const nextDriverStatus =
        onboardingStep !== 'ready'
          ? 'onboarding'
          : mappedTrip
            ? mappedTrip.status
            : isDriverOnlineState(backendProfile.availabilityStatus)
              ? 'waiting'
              : 'offline';
      setActiveTrip(mappedTrip);
      setActiveRequest(shouldSurfaceIncomingRequest(trip.ride, handledRequestIdsRef.current) && trip.ride ? mapRideToRequest(trip.ride) : null);

      setProfile({
        id: backendProfile.userId,
        name: (session.user.email?.split('@')[0] || '').trim() || 'Driver',
        email: session.user.email,
        vehicleStatus: 'good',
        isOnline: isDriverOnlineState(backendProfile.availabilityStatus),
        status: nextDriverStatus,
      });

      setRideHistory(history.rides.map(mapRideToHistory));
      setMetrics((current) => ({
        earningsToday: Number((earnings.earningsCents / 100).toFixed(2)),
        tripsCompleted: earnings.rideCount,
        hoursOnline:
          isDriverOnlineState(backendProfile.availabilityStatus)
            ? Number((current.hoursOnline + HOURS_INCREMENT_PER_TICK).toFixed(2))
            : current.hoursOnline,
      }));
      setNotifications(buildDriverNotifications(trip.ride ? [trip.ride, ...history.rides] : history.rides));
      setOnboardingRequired(onboardingStep !== 'ready');
    } catch (err) {
      const message = toErrorMessage(err);
      if (message.includes('driver not found')) {
        setOnboardingRequired(true);
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
      refreshInFlightRef.current = false;
    }
  }, [onboardingStep, session, state]);

  useEffect(() => {
    setNearbyRequests(buildNearbyRequests());
  }, [location]);

  useEffect(() => {
    void configureDriverAlerts();
    void ensureDriverAlertPermissions();
  }, []);

  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;

    const setupLocationTracking = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setError('Location permission is required for live trip updates.');
        return;
      }

      watcher = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: LOCATION_UPDATE_INTERVAL_MS,
          distanceInterval: LOCATION_UPDATE_DISTANCE_METERS,
        },
        (update) => {
          const nextLocation = { latitude: update.coords.latitude, longitude: update.coords.longitude };
          setLocation(nextLocation);
          if (state === 'signed_in' && profile.isOnline) {
            void driversApi.updateLocation(nextLocation.latitude, nextLocation.longitude);
          }
        }
      );
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
        handledRequestIdsRef.current.add(activeRequest.id);
        setActiveRequest(null);
      }
    };

    updateTimer();
    const intervalId = setInterval(updateTimer, 1000);
    return () => clearInterval(intervalId);
  }, [activeRequest]);

  useEffect(() => {
    if (!activeRequest || lastIncomingRequestIdRef.current === activeRequest.id) {
      return;
    }

    lastIncomingRequestIdRef.current = activeRequest.id;
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

    if (previousTrip.status !== activeTrip.status && activeTrip.status === 'in-progress') {
      // Suppress the next alert when the state change was initiated locally; the user already
      // received feedback from the tap handler before refreshData observes the server update.
      if (suppressedTripAlertRef.current === buildSuppressedTripAlertKey(activeTrip.rideId, 'in-progress')) {
        suppressedTripAlertRef.current = null;
        previousTripRef.current = { rideId: activeTrip.rideId, status: activeTrip.status };
        return;
      }
      void sendDriverAlert('trip-started', 'Trip started', 'Pickup confirmed and the ride is now in progress.');
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
      try {
        if (isOnline) {
          await driversApi.updateLocation(location.latitude, location.longitude);
        }
        await driversApi.setAvailability(isOnline ? 'online' : 'offline');
        await refreshData();
        await vibrateForAction(isOnline ? 'success' : 'selection');
      } catch (err) {
        setError(toErrorMessage(err));
      }
    },
    [location.latitude, location.longitude, onboardingStep, refreshData]
  );

  const acceptRequest = useCallback(async () => {
    if (!activeRequest) {
      return;
    }
    try {
      await ridesApi.accept(activeRequest.id);
      handledRequestIdsRef.current.add(activeRequest.id);
      previousTripRef.current = { rideId: activeRequest.id, status: 'accepted' };
      await sendDriverAlert('accepted', 'Request accepted', `Head to ${activeRequest.riderName} for pickup.`);
      await refreshData();
      setActiveRequest(null);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }, [activeRequest, refreshData]);

  const declineRequest = useCallback(() => {
    if (activeRequest) {
      handledRequestIdsRef.current.add(activeRequest.id);
      void vibrateForAction('warning');
    }
    setActiveRequest(null);
  }, [activeRequest]);

  const advanceTrip = useCallback(async () => {
    if (!activeTrip) {
      return;
    }

    try {
      if (activeTrip.status === 'accepted') {
        await ridesApi.start(activeTrip.rideId);
        suppressedTripAlertRef.current = buildSuppressedTripAlertKey(activeTrip.rideId, 'in-progress');
        await sendDriverAlert('trip-started', 'Trip started', `${activeTrip.riderName} is onboard. Continue to the destination.`);
      } else if (activeTrip.status === 'in-progress') {
        await ridesApi.complete(activeTrip.rideId);
        suppressedTripAlertRef.current = buildSuppressedTripAlertKey(activeTrip.rideId, 'completed');
        await sendDriverAlert('trip-ended', 'Trip ended', `${activeTrip.riderName}'s trip is complete.`);
      }
      await refreshData();
    } catch (err) {
      setError(toErrorMessage(err));
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
      isLoading,
      error,
      onboardingRequired,
      setOnline,
      acceptRequest,
      declineRequest,
      advanceTrip,
      refreshData,
    }),
    [acceptRequest, activeRequest, activeTrip, advanceTrip, declineRequest, error, isLoading, location, metrics, nearbyRequests, notifications, onboardingRequired, profile, refreshData, requestTimeLeft, rideHistory, setOnline]
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
