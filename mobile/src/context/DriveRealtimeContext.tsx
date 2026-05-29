import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { buildNearbyRequests, buildTripPoint, getSeedLocation, seedRideHistory } from '../services/realtime/mockDriveFeed';
import type { ActiveTrip, DriverMetrics, DriverProfile, LatLng, RideHistoryItem, RideRequest } from '../types/drive';
import { getNextTripStatus } from '../utils/driveStatus';

type DriveContextValue = {
  profile: DriverProfile;
  metrics: DriverMetrics;
  location: LatLng;
  nearbyRequests: ReturnType<typeof buildNearbyRequests>;
  activeRequest: RideRequest | null;
  activeTrip: ActiveTrip | null;
  rideHistory: RideHistoryItem[];
  requestTimeLeft: number;
  setOnline: (isOnline: boolean) => void;
  acceptRequest: () => void;
  declineRequest: () => void;
  advanceTrip: () => void;
};

const DriveRealtimeContext = createContext<DriveContextValue | undefined>(undefined);

const requestTone = require('../../assets/sounds/incoming-request.wav');

const rideTemplates = [
  { pickupAddress: '102 Main St, Downtown', dropoffAddress: 'Pier 39, North Beach' },
  { pickupAddress: '88 3rd St, Civic Center', dropoffAddress: 'Oracle Park, SoMa' },
  { pickupAddress: '300 Howard St, SoMa', dropoffAddress: 'Ferry Building, Embarcadero' },
  { pickupAddress: '1 Market St, Financial District', dropoffAddress: 'Mission Dolores Park' },
];
const riderNames = ['Janelle R.', 'Marcus T.', 'Lina O.', 'Chris P.'];
const pickupDistances = [0.7, 1.2, 1.9, 2.4];
const tripDistances = [4.6, 7.2, 5.4, 8.1];
const estimatedFares = [12.8, 18.4, 21.9, 26.7];
const pickupEtas = [3, 4, 6, 5];
const riderRatings = [4.92, 4.88, 4.95, 4.9];
let requestCursor = 0;

const seedProfile: DriverProfile = {
  id: 'driver-1',
  name: 'Duke N.',
  avatarUrl: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&w=200&q=80',
  vehicleStatus: 'good',
  isOnline: true,
  status: 'waiting',
};

const seedMetrics: DriverMetrics = {
  earningsToday: 184.75,
  tripsCompleted: 14,
  hoursOnline: 6.8,
};

const buildRequest = (): RideRequest => {
  const currentIndex = requestCursor % rideTemplates.length;
  requestCursor += 1;
  const route = rideTemplates[currentIndex];

  return {
    id: `request-${Date.now()}`,
    riderName: riderNames[currentIndex],
    pickupAddress: route.pickupAddress,
    dropoffAddress: route.dropoffAddress,
    pickupPosition: buildTripPoint(currentIndex, 0.012),
    dropoffPosition: buildTripPoint(currentIndex + 3, 0.03),
    pickupDistanceKm: pickupDistances[currentIndex],
    tripDistanceKm: tripDistances[currentIndex],
    estimatedFare: estimatedFares[currentIndex],
    pickupEtaMinutes: pickupEtas[currentIndex],
    riderRating: riderRatings[currentIndex],
    expiresAt: Date.now() + 15_000,
  };
};

const playIncomingRequestSound = async () => {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const { sound } = await Audio.Sound.createAsync(requestTone, { shouldPlay: true, volume: 1 });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
};

export const DriveRealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const [profile, setProfile] = useState(seedProfile);
  const [metrics, setMetrics] = useState(seedMetrics);
  const [location, setLocation] = useState<LatLng>(getSeedLocation());
  const [nearbyRequests, setNearbyRequests] = useState(buildNearbyRequests());
  const [activeRequest, setActiveRequest] = useState<RideRequest | null>(null);
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [rideHistory, setRideHistory] = useState<RideHistoryItem[]>(seedRideHistory());
  const [requestTimeLeft, setRequestTimeLeft] = useState(0);

  useEffect(() => {
    let watcher: Location.LocationSubscription | null = null;

    const setupLocationTracking = async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        return;
      }

      watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 4000, distanceInterval: 8 },
        (update) => {
          setLocation({ latitude: update.coords.latitude, longitude: update.coords.longitude });
        }
      );
    };

    void setupLocationTracking();

    return () => watcher?.remove();
  }, []);

  useEffect(() => {
    const metricsTicker = setInterval(() => {
      if (!profile.isOnline) {
        return;
      }

      setMetrics((current) => ({
        ...current,
        hoursOnline: Number((current.hoursOnline + 0.01).toFixed(2)),
      }));
      setNearbyRequests(buildNearbyRequests());
    }, 6000);

    return () => clearInterval(metricsTicker);
  }, [profile.isOnline]);

  useEffect(() => {
    if (!profile.isOnline || activeRequest || activeTrip) {
      return;
    }

    const pushRequest = () => {
      const nextRequest = buildRequest();
      setActiveRequest(nextRequest);
      void playIncomingRequestSound();
    };

    const warmup = setTimeout(pushRequest, 4500);
    const requestTicker = setInterval(pushRequest, 28_000);

    return () => {
      clearTimeout(warmup);
      clearInterval(requestTicker);
    };
  }, [activeRequest, activeTrip, profile.isOnline]);

  useEffect(() => {
    if (!activeRequest) {
      setRequestTimeLeft(0);
      return;
    }

    const syncRequestTimer = () => {
      const secondsLeft = Math.max(0, Math.ceil((activeRequest.expiresAt - Date.now()) / 1000));
      setRequestTimeLeft(secondsLeft);

      if (secondsLeft === 0) {
        setActiveRequest(null);
      }
    };

    syncRequestTimer();
    const timer = setInterval(syncRequestTimer, 250);

    return () => clearInterval(timer);
  }, [activeRequest]);

  const acceptRequest = useCallback(() => {
    if (!activeRequest || !profile.isOnline || profile.status !== 'waiting') {
      return;
    }

    const nextTrip: ActiveTrip = {
      ...activeRequest,
      status: 'accepted',
    };

    setActiveTrip(nextTrip);
    setProfile((current) => ({ ...current, status: 'accepted' }));
    setActiveRequest(null);
  }, [activeRequest, profile.isOnline, profile.status]);

  const declineRequest = useCallback(() => {
    setActiveRequest(null);
  }, []);

  const advanceTrip = useCallback(() => {
    if (!activeTrip) {
      return;
    }

    if (activeTrip.status === 'completed') {
      setActiveTrip(null);
      setProfile((current) => ({ ...current, status: current.isOnline ? 'waiting' : 'offline' }));
      return;
    }

    const nextStatus = getNextTripStatus(activeTrip.status);
    if (!nextStatus) {
      return;
    }

    setActiveTrip((current) => (current ? { ...current, status: nextStatus } : current));
    setProfile((current) => ({ ...current, status: nextStatus }));

    if (nextStatus === 'completed') {
      setMetrics((current) => ({
        ...current,
        tripsCompleted: current.tripsCompleted + 1,
        earningsToday: Number((current.earningsToday + activeTrip.estimatedFare * 0.78).toFixed(2)),
      }));
      setRideHistory((current) => [
        {
          id: activeTrip.id,
          riderName: activeTrip.riderName,
          route: `${activeTrip.pickupAddress} → ${activeTrip.dropoffAddress}`,
          fare: activeTrip.estimatedFare,
          timeLabel: 'Now',
        },
        ...current,
      ]);
    }
  }, [activeTrip]);

  const setOnline = useCallback((isOnline: boolean) => {
    setProfile((current) => ({
      ...current,
      isOnline,
      status: isOnline ? 'waiting' : 'offline',
    }));

    if (isOnline) {
      setNearbyRequests(buildNearbyRequests());
      return;
    }

    setActiveRequest(null);
    setActiveTrip(null);
    setRequestTimeLeft(0);
  }, []);

  const value = useMemo(
    () => ({
      profile,
      metrics,
      location,
      nearbyRequests,
      activeRequest,
      activeTrip,
      rideHistory,
      requestTimeLeft,
      setOnline,
      acceptRequest,
      declineRequest,
      advanceTrip,
    }),
    [acceptRequest, activeRequest, activeTrip, advanceTrip, declineRequest, location, metrics, nearbyRequests, profile, requestTimeLeft, rideHistory, setOnline]
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
