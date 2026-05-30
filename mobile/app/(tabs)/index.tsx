import { useEffect, useRef } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { BottomStatsPanel } from '../../src/components/drive/BottomStatsPanel';
import { MapOverlayControls } from '../../src/components/drive/MapOverlayControls';
import { RideRequestCard } from '../../src/components/drive/RideRequestCard';
import { TopOverlay } from '../../src/components/drive/TopOverlay';
import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';

export default function DriveHomeScreen() {
  const mapRef = useRef<MapView | null>(null);
  const scheme = useColorScheme();
  const { location, nearbyRequests, activeTrip, error } = useDriveRealtime();
  const lastCameraCenterRef = useRef(location);

  useEffect(() => {
    const lastCenter = lastCameraCenterRef.current;
    const latitudeShift = Math.abs(lastCenter.latitude - location.latitude);
    const longitudeShift = Math.abs(lastCenter.longitude - location.longitude);

    if (latitudeShift < 0.0004 && longitudeShift < 0.0004) {
      return;
    }

    mapRef.current?.animateCamera(
      {
        center: location,
        zoom: 15,
      },
      { duration: 700 }
    );
    lastCameraCenterRef.current = location;
  }, [location]);

  return (
    <View className="flex-1 bg-zinc-950">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        className="flex-1"
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
        showsUserLocation
        followsUserLocation
        showsTraffic
        customMapStyle={scheme === 'dark' ? darkMapStyle : undefined}
      >
        <Marker coordinate={location} pinColor="#2563EB" title="You" description="Current driver location" />

        {activeTrip ? (
          <>
            <Marker coordinate={activeTrip.pickupPosition} pinColor="#22C55E" title="Pickup" description={activeTrip.pickupAddress} />
            <Marker coordinate={activeTrip.dropoffPosition} pinColor="#F59E0B" title="Dropoff" description={activeTrip.dropoffAddress} />
          </>
        ) : (
          nearbyRequests.map((request) => (
            <Marker key={request.id} coordinate={request.position} pinColor={request.surgeMultiplier > 1.3 ? '#F97316' : '#22C55E'} />
          ))
        )}
      </MapView>

      <TopOverlay />
      {error ? (
        <View className="absolute left-4 right-4 top-44 z-30 rounded-2xl bg-rose-500/90 px-4 py-3">
          <Text className="text-xs font-medium text-white">{error}</Text>
        </View>
      ) : null}
      <MapOverlayControls onRecenter={() => mapRef.current?.animateCamera({ center: location, zoom: 16 }, { duration: 450 })} />
      <RideRequestCard />
      <BottomStatsPanel />
    </View>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#111827' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9ca3af' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4b5563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
];
