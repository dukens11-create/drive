import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';
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

export default function DriveHomeScreen() {
  const mapRef = useRef<MapView | null>(null);
  const scheme = useColorScheme();
  const { location, nearbyRequests, activeTrip, error } = useDriveRealtime();
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
      {error ? (
        <View className="absolute left-4 right-4 top-56 z-30 rounded-2xl bg-rose-500/90 px-4 py-3">
          <Text className="text-xs font-medium text-white">{error}</Text>
        </View>
      ) : null}
      <MapOverlayControls
        onRecenter={() => updateZoom(16)}
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
