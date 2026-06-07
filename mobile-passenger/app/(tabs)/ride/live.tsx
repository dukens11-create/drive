import { useEffect, useMemo, useState } from 'react';
import { Share } from 'react-native';
import { io, type Socket } from 'socket.io-client';

import { PassengerScreen } from '../../../src/components/ui/PassengerScreen';
import { LiveRideTracker } from '../../../src/components/ride/LiveRideTracker';
import { useAuth } from '../../../src/context/AuthContext';
import { useDriveRealtime } from '../../../src/context/DriveRealtimeContext';
import { ridesApi } from '../../../src/services/api/ridesApi';
import { apiBaseUrl } from '../../../src/services/config/apiConfig';
import type { LatLng } from '../../../src/types/drive';

export default function RideLiveTrackingScreen() {
  const { session } = useAuth();
  const { activeTrip, location, refreshData } = useDriveRealtime();
  const [driverLocation, setDriverLocation] = useState<LatLng | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!session?.accessToken || !activeTrip?.rideId) {
      setDriverLocation(null);
      return;
    }

    setConnecting(true);
    const socket: Socket = io(apiBaseUrl, {
      transports: ['websocket'],
      auth: { token: session.accessToken },
    });

    socket.on('connect', () => {
      socket.emit('ride:join', { rideId: activeTrip.rideId });
      setConnecting(false);
    });

    socket.on('ride:driver_location', (payload: { lat?: number; lng?: number }) => {
      if (!Number.isFinite(payload?.lat) || !Number.isFinite(payload?.lng)) return;
      setDriverLocation({ latitude: Number(payload.lat), longitude: Number(payload.lng) });
    });

    socket.on('disconnect', () => setConnecting(false));

    return () => {
      socket.disconnect();
    };
  }, [activeTrip?.rideId, session?.accessToken]);

  const etaMinutes = useMemo(() => {
    if (driverLocation && activeTrip) {
      const latDistance = Math.abs(driverLocation.latitude - activeTrip.pickupPosition.latitude);
      const lngDistance = Math.abs(driverLocation.longitude - activeTrip.pickupPosition.longitude);
      const miles = Math.sqrt(latDistance * latDistance + lngDistance * lngDistance) * 69;
      return Math.max(1, Math.round(miles * 3.5));
    }
    return activeTrip?.pickupEtaMinutes ?? 6;
  }, [activeTrip, driverLocation]);

  const sendChat = async (message: string) => {
    if (!activeTrip?.rideId) return;
    await ridesApi.message(activeTrip.rideId, message);
  };

  const shareTrip = async () => {
    if (!activeTrip?.rideId) return;
    await Share.share({
      message: `Track my trip in Drive: ${apiBaseUrl}/ride/live?rideId=${activeTrip.rideId}`,
    });
  };

  return (
    <PassengerScreen title="Live Ride Tracking" subtitle="Real-time driver location, chat, and safety actions.">
      <LiveRideTracker
        activeTrip={activeTrip}
        riderLocation={location}
        driverLocation={driverLocation}
        etaMinutes={etaMinutes}
        isConnecting={connecting}
        onRefresh={() => void refreshData()}
        onShareTrip={() => void shareTrip()}
        onSendChat={sendChat}
      />
    </PassengerScreen>
  );
}
