import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from './AuthContext';
import { driversApi } from '../services/api/driversApi';
import { HttpError } from '../services/api/client';
import { ridesApi } from '../services/api/ridesApi';
import { buildIncomingRideRequests, buildNearbyRequests, getSeedLocation } from '../services/realtime/mockDriveFeed';
import type { RideSummary } from '../types/api';
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

const DriveRealtimeContext = createContext<DriveContextValue | undefined>(undefined);

const HOURS_INCREMENT_PER_TICK = 0.01;
const DATA_REFRESH_INTERVAL_MS = 6000;
const REQUEST_EXPIRATION_SECONDS = 18;
const MOCK_REQUEST_PREFIX = 'mock-request-';
type PendingRideRequest = Omit<RideRequest, 'expiresAt'>;

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
  earningsPerTrip: 0,
  earningsPerHour: 0,
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
  miles: Number(ride.miles.toFixed(1)),
  date: ride.updatedAt,
});

const mapRequestToMockTrip = (request: RideRequest): ActiveTrip => {
  const createdAt = new Date().toISOString();
  return {
    ...request,
    rideId: request.id,
    status: 'accepted',
    timeline: [
      {
        id: `${request.id}-accepted`,
        title: 'Trip accepted',
        message: 'Head to pickup and confirm the rider before you start the trip.',
        createdAt,
      },
      {
        id: `${request.id}-pickup`,
        title: 'Pickup route ready',
        message: `${request.pickupEtaMinutes} min away · ${request.pickupAddress}`,
        createdAt,
      },
    ],
  };
};

const appendMockTripEvent = (trip: ActiveTrip, nextStatus: ActiveTrip['status']): ActiveTrip => {
  const createdAt = new Date().toISOString();
  const nextEvent =
    nextStatus === 'in-progress'
      ? {
          id: `${trip.rideId}-started-${trip.timeline.length + 1}`,
          title: 'Rider onboard',
          message: `Trip started toward ${trip.dropoffAddress}.`,
          createdAt,
        }
      : {
          id: `${trip.rideId}-completed-${trip.timeline.length + 1}`,
          title: 'Dropoff complete',
          message: 'Trip complete. Earnings are ready and you can go back online for the next request.',
          createdAt,
        };

  return {
    ...trip,
    status: nextStatus,
    timeline: [...trip.timeline, nextEvent],
  };
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
  const [profile, setProfile] = useState<DriverProfile>(defaultProfile);
  const [metrics, setMetrics] = useState<DriverMetrics>(defaultMetrics);
  const [location, setLocation] = useState<LatLng>(getSeedLocation());
  const [nearbyRequests, setNearbyRequests] = useState(buildNearbyRequests());
  const [requestQueue, setRequestQueue] = useState<PendingRideRequest[]>([]);
  const [activeRequest, setActiveRequest] = useState<RideRequest | null>(null);
  const [backendActiveTrip, setBackendActiveTrip] = useState<ActiveTrip | null>(null);
  const [mockActiveTrip, setMockActiveTrip] = useState<ActiveTrip | null>(null);
  const [rideHistory, setRideHistory] = useState<RideHistoryItem[]>([]);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; body: string; createdAt: string }>>([]);
  const [requestTimeLeft, setRequestTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingRequired, setOnboardingRequired] = useState(false);
  const activeTrip = backendActiveTrip ?? mockActiveTrip;

  const refreshData = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    if (state !== 'signed_in' || !session) {
      setProfile(defaultProfile);
      setMetrics(defaultMetrics);
      setBackendActiveTrip(null);
      setMockActiveTrip(null);
      setActiveRequest(null);
      setRequestQueue([]);
      setRequestTimeLeft(0);
      setRideHistory([]);
      setNotifications([]);
      setOnboardingRequired(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    refreshInFlightRef.current = true;

    try {
      const [driver, trip, history, earnings, rideNotices] = await Promise.all([
        driversApi.me(),
        driversApi.currentTrip(),
        ridesApi.history(),
        driversApi.earnings(),
        ridesApi.notifications(),
      ]);

      const backendProfile = driver.profile;
      const mappedTrip = trip.ride ? mapRideToActiveTrip(trip.ride) : null;
      setBackendActiveTrip(mappedTrip);
      if (mappedTrip) {
        setMockActiveTrip(null);
        setActiveRequest(null);
        setRequestQueue([]);
        setRequestTimeLeft(0);
      }

      setProfile({
        id: backendProfile.userId,
        name: (session.user.email?.split('@')[0] || '').trim() || 'Driver',
        email: session.user.email,
        vehicleStatus: 'good',
        isOnline: isDriverOnlineState(backendProfile.availabilityStatus),
        status:
          onboardingStep !== 'ready'
            ? 'onboarding'
            : mappedTrip
              ? mappedTrip.status
              : isDriverOnlineState(backendProfile.availabilityStatus)
                ? 'waiting'
                : 'offline',
      });

      setRideHistory(history.rides.map(mapRideToHistory));
      setMetrics((current: DriverMetrics) => {
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

      setNotifications(
        rideNotices.notifications.map((notice) => ({
          id: `${notice.rideId ?? 'ride'}-${notice.id}`,
          title: notice.title,
          body: notice.message,
          createdAt: notice.createdAt,
        }))
      );
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
    if (state !== 'signed_in' || onboardingStep !== 'ready' || !profile.isOnline || activeTrip) {
      setRequestQueue([]);
      setActiveRequest(null);
      setRequestTimeLeft(0);
      return;
    }

    if (activeRequest || requestQueue.length > 0) {
      return;
    }

    setRequestQueue(buildIncomingRideRequests());
  }, [activeRequest, activeTrip, onboardingStep, profile.isOnline, requestQueue.length, state]);

  useEffect(() => {
    if (state !== 'signed_in' || !profile.isOnline || activeTrip || activeRequest || requestQueue.length === 0) {
      return;
    }

    const [nextRequest, ...remainingQueue] = requestQueue;
    setRequestQueue(remainingQueue);
    setActiveRequest({
      ...nextRequest,
      expiresAt: Date.now() + REQUEST_EXPIRATION_SECONDS * 1000,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => null);
  }, [activeRequest, activeTrip, profile.isOnline, requestQueue, state]);

  useEffect(() => {
    if (!activeRequest) {
      setRequestTimeLeft(0);
      return;
    }

    const syncCountdown = () => {
      const now = Date.now();
      const secondsLeft = Math.max(0, Math.ceil((activeRequest.expiresAt - now) / 1000));
      setRequestTimeLeft(secondsLeft);
      if (activeRequest.expiresAt <= now) {
        setActiveRequest((current) => (current?.id === activeRequest.id ? null : current));
      }
    };

    syncCountdown();
    const interval = setInterval(syncCountdown, 1000);

    return () => clearInterval(interval);
  }, [activeRequest]);

  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;

    const setupLocationTracking = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setError('Location permission is required for live trip updates.');
        return;
      }

      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 4000, distanceInterval: 8 },
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
    if (state !== 'signed_in') {
      return;
    }
    void refreshData();

    const ticker = setInterval(() => {
      void refreshData();
    }, DATA_REFRESH_INTERVAL_MS);

    return () => clearInterval(ticker);
  }, [refreshData, state]);

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
      if (activeRequest.id.startsWith(MOCK_REQUEST_PREFIX)) {
        setMockActiveTrip(mapRequestToMockTrip(activeRequest));
        setActiveRequest(null);
        setRequestQueue([]);
        setRequestTimeLeft(0);
        setError(null);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }
      await ridesApi.accept(activeRequest.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshData();
      setActiveRequest(null);
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }, [activeRequest, refreshData]);

  const declineRequest = useCallback(() => {
    setActiveRequest(null);
    setRequestTimeLeft(0);
    setError(null);
    void Haptics.selectionAsync().catch(() => null);
  }, []);

  const advanceTrip = useCallback(async () => {
    if (!activeTrip) {
      return;
    }

    try {
      if (activeTrip.rideId.startsWith(MOCK_REQUEST_PREFIX)) {
        if (activeTrip.status === 'accepted') {
          setMockActiveTrip(appendMockTripEvent(activeTrip, 'in-progress'));
        } else if (activeTrip.status === 'in-progress') {
          setMockActiveTrip(appendMockTripEvent(activeTrip, 'completed'));
        } else {
          setMockActiveTrip(null);
        }
      } else if (activeTrip.status === 'accepted') {
        await ridesApi.start(activeTrip.rideId);
      } else if (activeTrip.status === 'in-progress') {
        await ridesApi.complete(activeTrip.rideId);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!activeTrip.rideId.startsWith(MOCK_REQUEST_PREFIX)) {
        await refreshData();
      }
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
