import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { buildNearbyRequests, getSeedLocation, seedRideHistory } from '../services/realtime/mockDriveFeed';
import type { DriverMetrics, DriverProfile, LatLng, RideHistoryItem, RideRequest } from '../types/drive';

type DriveContextValue = {
  profile: DriverProfile;
  metrics: DriverMetrics;
  location: LatLng;
  nearbyRequests: ReturnType<typeof buildNearbyRequests>;
  activeRequest: RideRequest | null;
  rideHistory: RideHistoryItem[];
  requestTimeLeft: number;
  setOnline: (isOnline: boolean) => void;
  acceptRequest: () => void;
  declineRequest: () => void;
};

const DriveRealtimeContext = createContext<DriveContextValue | undefined>(undefined);

const requestTone = require('../../assets/sounds/incoming-request.wav');

const seedProfile: DriverProfile = {
  id: 'driver-1',
  name: 'Duke N.',
  avatarUrl: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&w=200&q=80',
  vehicleStatus: 'good',
  isOnline: true,
  status: 'available',
};

const seedMetrics: DriverMetrics = {
  earningsToday: 184.75,
  tripsCompleted: 14,
  hoursOnline: 6.8,
};

const buildRequest = (): RideRequest => ({
  id: `request-${Date.now()}`,
  riderName: ['Janelle R.', 'Marcus T.', 'Lina O.'][Math.floor(Math.random() * 3)],
  pickupAddress: ['102 Main St, Downtown', '88 3rd St, Civic Center', '300 Howard St, SoMa'][Math.floor(Math.random() * 3)],
  distanceKm: Number((0.4 + Math.random() * 2.8).toFixed(1)),
  estimatedFare: Number((8 + Math.random() * 24).toFixed(2)),
  expiresAt: Date.now() + 15_000,
});

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
  const [rideHistory, setRideHistory] = useState<RideHistoryItem[]>(seedRideHistory());
  const tripResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => () => {
    if (tripResetTimeoutRef.current) {
      clearTimeout(tripResetTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const metricsTicker = setInterval(() => {
      if (!profile.isOnline) {
        return;
      }
      setMetrics((current) => ({
        earningsToday: Number((current.earningsToday + Math.random() * 1.8).toFixed(2)),
        tripsCompleted: current.tripsCompleted,
        hoursOnline: Number((current.hoursOnline + 0.01).toFixed(2)),
      }));
      setNearbyRequests(buildNearbyRequests());
    }, 6000);

    return () => clearInterval(metricsTicker);
  }, [profile.isOnline]);

  useEffect(() => {
    const requestTicker = setInterval(() => {
      if (!profile.isOnline || activeRequest) {
        return;
      }
      const nextRequest = buildRequest();
      setActiveRequest(nextRequest);
      void playIncomingRequestSound();
    }, 26000);

    return () => clearInterval(requestTicker);
  }, [activeRequest, profile.isOnline]);

  useEffect(() => {
    if (!activeRequest) {
      return;
    }

    const timer = setInterval(() => {
      if (Date.now() > activeRequest.expiresAt) {
        setActiveRequest(null);
      }
    }, 250);

    return () => clearInterval(timer);
  }, [activeRequest]);

  const acceptRequest = useCallback(() => {
    if (!activeRequest || !profile.isOnline || profile.status !== 'available') {
      return;
    }

    setProfile((current) => ({ ...current, status: 'on-trip' }));
    setMetrics((current) => ({
      ...current,
      tripsCompleted: current.tripsCompleted + 1,
      earningsToday: Number((current.earningsToday + activeRequest.estimatedFare * 0.72).toFixed(2)),
    }));
    setRideHistory((current) => [
      {
        id: activeRequest.id,
        riderName: activeRequest.riderName,
        route: `Pickup: ${activeRequest.pickupAddress}`,
        fare: activeRequest.estimatedFare,
        timeLabel: 'Now',
      },
      ...current,
    ]);
    setActiveRequest(null);

    if (tripResetTimeoutRef.current) {
      clearTimeout(tripResetTimeoutRef.current);
    }

    tripResetTimeoutRef.current = setTimeout(() => {
      setProfile((current) => ({ ...current, status: current.isOnline ? 'available' : 'break' }));
      tripResetTimeoutRef.current = null;
    }, 10_000);
  }, [activeRequest, profile.isOnline, profile.status]);

  const declineRequest = useCallback(() => {
    setActiveRequest(null);
  }, []);

  const requestTimeLeft = activeRequest ? Math.max(0, Math.ceil((activeRequest.expiresAt - Date.now()) / 1000)) : 0;

  const setOnline = useCallback((isOnline: boolean) => {
    setProfile((current) => ({
      ...current,
      isOnline,
      status: isOnline ? 'available' : 'break',
    }));
    if (!isOnline) {
      setActiveRequest(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      profile,
      metrics,
      location,
      nearbyRequests,
      activeRequest,
      rideHistory,
      requestTimeLeft,
      setOnline,
      acceptRequest,
      declineRequest,
    }),
    [acceptRequest, activeRequest, declineRequest, location, metrics, nearbyRequests, profile, requestTimeLeft, rideHistory, setOnline]
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
