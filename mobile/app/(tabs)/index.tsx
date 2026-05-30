import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, Share, Text, useColorScheme, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { BottomStatsPanel } from '../../src/components/drive/BottomStatsPanel';
import { MapOverlayControls } from '../../src/components/drive/MapOverlayControls';
import { RideRequestCard } from '../../src/components/drive/RideRequestCard';
import { TopOverlay } from '../../src/components/drive/TopOverlay';
import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';
import type { LatLng } from '../../src/types/drive';
import { buildNavigationRoute, distanceKmBetween } from '../../src/utils/navigation';

const TRIP_TRACE_MIN_DISTANCE_KM = 0.03;
const TRIP_TRACE_MAX_POINTS = 60;
const TRIP_TRACE_KEEP_POINTS = TRIP_TRACE_MAX_POINTS - 1;
const MIN_ZOOM_LEVEL = 12;
const MAX_ZOOM_LEVEL = 19;
const ROUTE_OVERVIEW_EDGE_PADDING = { top: 170, right: 60, bottom: 360, left: 60 };

type ExpoExtra = {
  emergencyNumber?: string;
};

const expoExtra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
const configuredEmergencyNumber = process.env.EXPO_PUBLIC_EMERGENCY_NUMBER?.trim();
const expoEmergencyNumber = expoExtra.emergencyNumber?.trim();
const emergencyNumber = configuredEmergencyNumber || expoEmergencyNumber || '911';

export default function DriveHomeScreen() {
  const mapRef = useRef<MapView | null>(null);
  const scheme = useColorScheme();
  const router = useRouter();
  const [isSupportVisible, setIsSupportVisible] = useState(false);
  const { location, nearbyRequests, activeRequest, activeTrip, error, profile } = useDriveRealtime();
  const lastCameraCenterRef = useRef(location);
  const [zoomLevel, setZoomLevel] = useState(16);
  const [tripTrace, setTripTrace] = useState<LatLng[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const activeTripSnapshotRef = useRef<string | null>(null);
  const routeData = useMemo(() => buildNavigationRoute(location, activeTrip), [activeTrip, location]);

  const sortedNearbyRequests = useMemo(
    () =>
      [...nearbyRequests].sort(
        (a, b) => distanceKmBetween(location, a.position) - distanceKmBetween(location, b.position)
      ),
    [location, nearbyRequests]
  );

  useEffect(() => {
    if (!mapReady) {
      return;
    }
    const lastCenter = lastCameraCenterRef.current;
    const latitudeShift = Math.abs(lastCenter.latitude - location.latitude);
    const longitudeShift = Math.abs(lastCenter.longitude - location.longitude);

    if (latitudeShift < 0.0004 && longitudeShift < 0.0004) {
      return;
    }

    mapRef.current?.animateCamera(
      {
        center: location,
        zoom: zoomLevel,
      },
      { duration: 700 }
    );
    lastCameraCenterRef.current = location;
  }, [location, mapReady, zoomLevel]);

  useEffect(() => {
    if (!activeTrip) {
      setTripTrace([]);
      activeTripSnapshotRef.current = null;
      return;
    }
    setTripTrace((currentPath) => {
      const last = currentPath[currentPath.length - 1];
      if (!last) {
        return [location];
      }
      return distanceKmBetween(last, location) >= TRIP_TRACE_MIN_DISTANCE_KM
        ? [...currentPath.slice(-TRIP_TRACE_KEEP_POINTS), location]
        : currentPath;
    });
  }, [activeTrip, location]);

  useEffect(() => {
    if (!activeTrip || !routeData || !mapRef.current) {
      return;
    }

    const snapshot = `${activeTrip.id}:${activeTrip.status}`;
    if (snapshot === activeTripSnapshotRef.current) {
      return;
    }

    mapRef.current.fitToCoordinates(routeData.polyline, {
      edgePadding: ROUTE_OVERVIEW_EDGE_PADDING,
      animated: true,
    });
    activeTripSnapshotRef.current = snapshot;
  }, [activeTrip, routeData]);

  const updateZoom = (nextZoom: number) => {
    const boundedZoom = Math.min(MAX_ZOOM_LEVEL, Math.max(MIN_ZOOM_LEVEL, nextZoom));
    setZoomLevel(boundedZoom);
    mapRef.current?.animateCamera({ center: location, zoom: boundedZoom }, { duration: 220 });
  };

  const handleEmergency = () => {
    Alert.alert('Emergency help', 'Call local emergency services right away if you are in danger or feel unsafe.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: `Call ${emergencyNumber}`,
        style: 'destructive',
        onPress: () => {
          void Linking.openURL(`tel:${emergencyNumber}`).catch(() => {
            Alert.alert('Unable to open dialer', 'Call your local emergency number directly from this device.');
          });
        },
      },
    ]);
  };

  const handleShareTrip = async () => {
    const message = activeTrip
      ? `Drive trip update: ${activeTrip.riderName} • ${activeTrip.pickupAddress} → ${activeTrip.dropoffAddress} • Status: ${activeTrip.status}.`
      : `Drive status update: I am ${profile.isOnline ? 'online and available with Drive right now' : 'currently offline with Drive'}.`;

    try {
      await Share.share({ title: 'Share Drive trip', message });
    } catch (shareError) {
      Alert.alert('Unable to share trip', shareError instanceof Error ? shareError.message : 'Please try again.');
    }
  };

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
        onMapReady={() => setMapReady(true)}
        showsUserLocation
        followsUserLocation={false}
        showsTraffic
        loadingEnabled
        moveOnMarkerPress={false}
        toolbarEnabled={false}
        mapPadding={{ top: 180, right: 24, bottom: 360, left: 24 }}
        customMapStyle={scheme === 'dark' ? darkMapStyle : undefined}
      >
        <Marker
          coordinate={location}
          pinColor="#2563EB"
          title="You"
          description="Current driver location"
          tracksViewChanges={false}
        />

        {routeData ? <Polyline coordinates={routeData.polyline} strokeWidth={5} strokeColor="#2563EB" /> : null}
        {tripTrace.length > 1 ? (
          <Polyline coordinates={tripTrace} strokeWidth={3} strokeColor="#22C55E" lineDashPattern={[1, 5]} />
        ) : null}

        {activeTrip ? (
          <>
            <Marker
              coordinate={activeTrip.pickupPosition}
              pinColor="#22C55E"
              title="Pickup"
              description={activeTrip.pickupAddress}
              tracksViewChanges={false}
            />
            <Marker
              coordinate={activeTrip.dropoffPosition}
              pinColor="#F59E0B"
              title="Dropoff"
              description={activeTrip.dropoffAddress}
              tracksViewChanges={false}
            />
          </>
        ) : activeRequest ? (
          <>
            <Marker coordinate={activeRequest.pickupPosition} pinColor="#22C55E" title="Pickup" description={activeRequest.pickupAddress} />
            <Marker coordinate={activeRequest.dropoffPosition} pinColor="#F97316" title="Dropoff" description={activeRequest.dropoffAddress} />
          </>
        ) : (
          sortedNearbyRequests.map((request) => (
            <Marker
              key={request.id}
              coordinate={request.position}
              title={request.zoneName}
              description={`${request.distanceKm.toFixed(1)} km · surge x${request.surgeMultiplier.toFixed(1)}`}
              pinColor={request.surgeMultiplier > 1.3 ? '#F97316' : '#22C55E'}
              tracksViewChanges={false}
            />
          ))
        )}
      </MapView>

      <TopOverlay />
      {routeData ? (
        <View className="absolute left-4 right-20 top-44 z-30 rounded-2xl bg-white/95 px-4 py-3 shadow-soft dark:bg-zinc-900/95">
          <Text className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-300">Turn-by-turn</Text>
          <Text className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{routeData.nextInstruction}</Text>
          <Text className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
            {routeData.remainingDistanceKm.toFixed(1)} km · {routeData.remainingDurationMinutes} min
          </Text>
        </View>
      ) : null}
      {isSupportVisible ? (
        <View className="absolute left-4 right-20 top-36 z-30 rounded-3xl border border-zinc-800 bg-zinc-950/95 px-4 py-4">
          <Text className="text-sm font-semibold text-zinc-100">Safety & support</Text>
          <Text className="mt-2 text-xs text-zinc-300">Use SOS for emergencies, share active trips with a trusted contact, and open Inbox for follow-up support.</Text>
          <View className="mt-3 gap-2">
            <Text className="text-xs text-zinc-400">• Pull over before responding to an incident.</Text>
            <Text className="text-xs text-zinc-400">• Report harassment, crashes, or unsafe riders in Inbox.</Text>
            <Text className="text-xs text-zinc-400">• Trip details can be shared even before pickup starts.</Text>
          </View>
          <View className="mt-4 flex-row gap-3">
            <Pressable
              className="flex-1 rounded-2xl bg-emerald-500 px-3 py-3"
              onPress={() => {
                setIsSupportVisible(false);
                router.push('/(tabs)/inbox');
              }}
            >
              <Text className="text-center text-sm font-semibold text-white">Open inbox</Text>
            </Pressable>
            <Pressable className="rounded-2xl border border-zinc-700 px-3 py-3" onPress={() => setIsSupportVisible(false)}>
              <Text className="text-sm font-semibold text-zinc-100">Dismiss</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {error ? (
        <View className="absolute left-4 right-4 top-56 z-30 rounded-2xl bg-rose-500/90 px-4 py-3">
          <Text className="text-xs font-medium text-white">{error}</Text>
        </View>
      ) : null}
      <MapOverlayControls
        onRecenter={() => updateZoom(16)}
        onEmergency={handleEmergency}
        onShareTrip={() => void handleShareTrip()}
        onSupport={() => setIsSupportVisible((current) => !current)}
        onZoomIn={() => updateZoom(zoomLevel + 1)}
        onZoomOut={() => updateZoom(zoomLevel - 1)}
        onOverview={() => {
          if (!routeData || !mapRef.current) {
            return;
          }
          mapRef.current.fitToCoordinates(routeData.polyline, {
            edgePadding: ROUTE_OVERVIEW_EDGE_PADDING,
            animated: true,
          });
        }}
        showOverview={Boolean(routeData)}
      />
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
