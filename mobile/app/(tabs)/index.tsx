import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, Linking, Pressable, Share, Text, useColorScheme, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { BottomStatsPanel } from '../../src/components/drive/BottomStatsPanel';
import { MapOverlayControls } from '../../src/components/drive/MapOverlayControls';
import { RideRequestCard } from '../../src/components/drive/RideRequestCard';
import { TopOverlay } from '../../src/components/drive/TopOverlay';
import { useAuth } from '../../src/context/AuthContext';
import { useAccessibilitySettings } from '../../src/context/AccessibilityContext';
import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { useScreenTracking } from '../../src/hooks/useScreenTracking';
import { safetyApi } from '../../src/services/api/safetyApi';
import { logError, logEvent } from '../../src/services/observability';
import { logDriverError, logDriverWarning, trackDriverEvent } from '../../src/services/monitoring/telemetry';
import type { LatLng } from '../../src/types/drive';
import { buildNavigationRoute, distanceKmBetween } from '../../src/utils/navigation';

const TRIP_TRACE_MIN_DISTANCE_KM = 0.03;
const TRIP_TRACE_MAX_POINTS = 60;
const TRIP_TRACE_KEEP_POINTS = TRIP_TRACE_MAX_POINTS - 1;
const MIN_ZOOM_LEVEL = 12;
const MAX_ZOOM_LEVEL = 19;
const ROUTE_OVERVIEW_EDGE_PADDING = { top: 170, right: 60, bottom: 360, left: 60 };
const MIN_ROUTE_OVERVIEW_POINTS = 2;
// Keep the arrival banner directly beneath the expanded navigation card (top-36 plus card height)
// while leaving space above the support sheet entry point.
const ARRIVAL_NOTIFICATION_TOP_OFFSET = 456;

type ExpoExtra = {
  emergencyNumber?: string;
};

const expoExtra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
const configuredEmergencyNumber = process.env.EXPO_PUBLIC_EMERGENCY_NUMBER?.trim();
const expoEmergencyNumber = expoExtra.emergencyNumber?.trim();
const emergencyNumber = configuredEmergencyNumber || expoEmergencyNumber || '911';
const hasValidRouteOverview = (polyline?: LatLng[]) => Boolean(polyline && polyline.length >= MIN_ROUTE_OVERVIEW_POINTS);

export default function DriveHomeScreen() {
  const mapRef = useRef<MapView | null>(null);
  const scheme = useColorScheme();
  const router = useRouter();
  const { session } = useAuth();
  const { highContrastEnabled, maxFontSizeMultiplier } = useAccessibilitySettings();
  const [isSupportVisible, setIsSupportVisible] = useState(false);
  const { location, nearbyRequests, activeRequest, activeTrip, error, profile } = useDriveRealtime();
  const { t, formatNumber } = useLocale();
  const lastCameraCenterRef = useRef(location);
  const [zoomLevel, setZoomLevel] = useState(16);
  const [tripTrace, setTripTrace] = useState<LatLng[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const activeTripSnapshotRef = useRef<string | null>(null);
  const announcedInstructionRef = useRef<string | null>(null);
  const routeData = useMemo(() => buildNavigationRoute(location, activeTrip), [activeTrip, location]);
  useScreenTracking('home');

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

  useEffect(() => {
    if (!routeData?.voiceInstruction || routeData.voiceInstruction === announcedInstructionRef.current) {
      return;
    }

    announcedInstructionRef.current = routeData.voiceInstruction;
    AccessibilityInfo.announceForAccessibility(routeData.voiceInstruction);
  }, [routeData?.voiceInstruction]);

  const updateZoom = (nextZoom: number) => {
    const boundedZoom = Math.min(MAX_ZOOM_LEVEL, Math.max(MIN_ZOOM_LEVEL, nextZoom));
    logEvent('map_zoom_changed', {
      zoomLevel: boundedZoom,
    });
    setZoomLevel(boundedZoom);
    mapRef.current?.animateCamera({ center: location, zoom: boundedZoom }, { duration: 220 });
  };

  const handleEmergency = () => {
    logEvent('emergency_help_tapped');
    Alert.alert(t('home.emergencyTitle'), t('home.emergencyMessage'), [
      { text: t('home.cancel'), style: 'cancel' },
      {
        text: 'Panic alert',
        style: 'destructive',
        onPress: () => {
          if (!session?.user.id) {
            return;
          }
          void safetyApi
            .sos(session.user.id, 'Driver panic alert triggered from mobile app.', activeTrip?.rideId, location.latitude, location.longitude)
            .then(() => {
              Alert.alert('Alert sent', 'Support and safety teams were notified.');
            })
            .catch(() => {
              Alert.alert('Alert failed', 'Unable to notify safety support right now.');
            });
        },
      },
      {
        text: t('home.callNumber', { number: emergencyNumber }),
        style: 'destructive',
        onPress: () => {
          void (async () => {
            trackDriverEvent('emergency_call_tapped');
            try {
              const supported = await Linking.canOpenURL(`tel:${emergencyNumber}`);
              if (!supported) {
                throw new Error('Dialer is unavailable on this device.');
              }
              await Linking.openURL(`tel:${emergencyNumber}`);
            } catch (dialError) {
              logDriverError('open_emergency_dialer', dialError, { emergencyNumber });
              Alert.alert(t('home.unableToOpenDialerTitle'), t('home.unableToOpenDialerBody'));
            }
          })();
        },
      },
    ]);
  };

  const handleShareTrip = async () => {
    logEvent('share_trip_tapped', {
      hasActiveTrip: Boolean(activeTrip),
    });
    const message = activeTrip
      ? `Drive trip update: ${activeTrip.riderName} • ${activeTrip.pickupAddress} → ${activeTrip.dropoffAddress} • Status: ${activeTrip.status}.`
      : `Drive status update: I am ${profile.isOnline ? 'online and available with Drive right now' : 'currently offline with Drive'}.`;

    try {
      trackDriverEvent('share_trip_tapped', { hasActiveTrip: Boolean(activeTrip) });
      await Share.share({ title: t('home.shareTripTitle'), message });
    } catch (shareError) {
      logError('share_trip_failed', shareError, { hasActiveTrip: Boolean(activeTrip) });
      logDriverError('share_trip', shareError, { hasActiveTrip: Boolean(activeTrip) });
      Alert.alert(t('home.unableToShareTrip'), shareError instanceof Error ? shareError.message : 'Please try again.');
    }
  };

  const toggleSupportSheet = () => {
    const nextVisible = !isSupportVisible;
    logEvent('support_sheet_toggled', { visible: nextVisible });
    setIsSupportVisible(nextVisible);
  };

  return (
    <View className={`flex-1 ${highContrastEnabled ? 'bg-black' : 'bg-zinc-950'}`}>
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
        onMapReady={() => {
          logEvent('map_ready');
          setMapReady(true);
        }}
        showsUserLocation
        followsUserLocation={false}
        showsTraffic
        loadingEnabled
        moveOnMarkerPress={false}
        toolbarEnabled={false}
        mapPadding={{ top: 180, right: 24, bottom: 360, left: 24 }}
        customMapStyle={highContrastEnabled ? highContrastMapStyle : scheme === 'dark' ? darkMapStyle : undefined}
      >
        <Marker
          coordinate={location}
          pinColor="#2563EB"
          title={t('home.markerYou')}
          description={t('home.markerYouDescription')}
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
              title={t('home.markerPickup')}
              description={activeTrip.pickupAddress}
              tracksViewChanges={false}
            />
            <Marker
              coordinate={activeTrip.dropoffPosition}
              pinColor="#F59E0B"
              title={t('home.markerDropoff')}
              description={activeTrip.dropoffAddress}
              tracksViewChanges={false}
            />
          </>
        ) : activeRequest ? (
          <>
            <Marker coordinate={activeRequest.pickupPosition} pinColor="#22C55E" title={t('home.markerPickup')} description={activeRequest.pickupAddress} />
            <Marker coordinate={activeRequest.dropoffPosition} pinColor="#F97316" title={t('home.markerDropoff')} description={activeRequest.dropoffAddress} />
          </>
        ) : (
          sortedNearbyRequests.map((request) => (
            <Marker
              key={request.id}
              coordinate={request.position}
              title={request.zoneName}
              description={`${formatNumber(request.distanceKm, { maximumFractionDigits: 1 })} km · surge x${formatNumber(request.surgeMultiplier, { maximumFractionDigits: 1 })}`}
              pinColor={request.surgeMultiplier > 1.3 ? '#F97316' : '#22C55E'}
              tracksViewChanges={false}
            />
          ))
        )}
      </MapView>

      <TopOverlay />
      {routeData ? (
        <View className={`absolute left-4 right-20 top-36 z-30 rounded-3xl px-4 py-4 shadow-soft ${highContrastEnabled ? 'border border-white bg-black' : 'bg-white/95 dark:bg-zinc-900/95'}`}>
          <View className="flex-row gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-blue-600">
              <Text className="text-3xl font-bold text-white" maxFontSizeMultiplier={maxFontSizeMultiplier}>{routeData.currentStep.arrow}</Text>
            </View>
            <View className="flex-1">
              <Text className={`text-xs font-semibold uppercase tracking-wider ${highContrastEnabled ? 'text-white' : 'text-zinc-500 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('home.turnByTurn')}</Text>
              <Text className={`mt-1 text-sm font-semibold ${highContrastEnabled ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{routeData.nextInstruction}</Text>
              <Text className={`mt-1 text-xs ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Voice guidance enabled for the next turn
              </Text>
            </View>
          </View>

          <View className="mt-3 flex-row gap-2">
            <NavigationStat
              label="Remaining"
              value={`${formatNumber(routeData.remainingDistanceKm, { maximumFractionDigits: 1 })} km`}
              highContrastEnabled={highContrastEnabled}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            />
            <NavigationStat
              label="ETA"
              value={`${formatNumber(routeData.remainingDurationMinutes)} min`}
              highContrastEnabled={highContrastEnabled}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            />
            <NavigationStat
              label={routeData.currentTarget === 'pickup' ? 'Pickup' : 'Dropoff'}
              value={`${formatNumber(routeData.currentTargetDistanceKm, { maximumFractionDigits: 1 })} km · ${formatNumber(routeData.currentTargetEtaMinutes)} min`}
              highContrastEnabled={highContrastEnabled}
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            />
          </View>

          <View className={`mt-3 rounded-2xl px-3 py-2 ${highContrastEnabled ? 'border border-white bg-black' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
            <Text className={`text-xs font-medium ${highContrastEnabled ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Traffic-aware routing · {routeData.trafficLevel} traffic
              {routeData.trafficDelayMinutes > 0 ? ` · +${formatNumber(routeData.trafficDelayMinutes)} min` : ''}
            </Text>
          </View>

          {routeData.upcomingSteps.length ? (
            <View className="mt-3">
              <Text className={`text-[11px] font-semibold uppercase tracking-wider ${highContrastEnabled ? 'text-white' : 'text-zinc-500 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                Upcoming turns
              </Text>
              <View className="mt-2 gap-2">
                {routeData.upcomingSteps.map((step, index) => (
                  <View key={`${step.target}-${index}-${step.instruction}`} className={`flex-row items-center gap-3 rounded-2xl px-3 py-2 ${highContrastEnabled ? 'border border-white bg-black' : 'bg-zinc-100/90 dark:bg-zinc-800/90'}`}>
                    <Text className={`w-5 text-base font-semibold ${highContrastEnabled ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{step.arrow}</Text>
                    <View className="flex-1">
                      <Text className={`text-xs font-medium ${highContrastEnabled ? 'text-white' : 'text-zinc-800 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{step.instruction}</Text>
                      <Text className={`mt-0.5 text-[11px] ${highContrastEnabled ? 'text-white' : 'text-zinc-500 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                        {formatNumber(step.distanceKm, { maximumFractionDigits: 1 })} km · {formatNumber(step.etaMinutes)} min
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}
      {routeData?.arrivalMessage ? (
        <View
          style={{ top: ARRIVAL_NOTIFICATION_TOP_OFFSET }}
          className={`absolute left-4 right-20 z-30 rounded-2xl px-4 py-3 ${highContrastEnabled ? 'border border-white bg-black' : 'bg-emerald-500/95'}`}
        >
          <Text className={`text-xs font-semibold uppercase tracking-wider ${highContrastEnabled ? 'text-white' : 'text-emerald-50'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Arrival notification
          </Text>
          <Text className={`mt-1 text-sm font-semibold ${highContrastEnabled ? 'text-white' : 'text-white'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>
            {routeData.arrivalMessage}
          </Text>
        </View>
      ) : null}
      {isSupportVisible ? (
        <View className={`absolute left-4 right-20 top-36 z-30 rounded-3xl px-4 py-4 ${highContrastEnabled ? 'border border-white bg-black' : 'border border-zinc-800 bg-zinc-950/95'}`}>
          <Text className="text-sm font-semibold text-zinc-100" maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('home.supportTitle')}</Text>
          <Text className="mt-2 text-xs text-zinc-300" maxFontSizeMultiplier={maxFontSizeMultiplier}>Use SOS for emergencies, share active trips with a trusted contact, and open Inbox for follow-up support.</Text>
          <View className="mt-3 gap-2">
            <Text className="text-xs text-zinc-400" maxFontSizeMultiplier={maxFontSizeMultiplier}>• Pull over before responding to an incident.</Text>
            <Text className="text-xs text-zinc-400" maxFontSizeMultiplier={maxFontSizeMultiplier}>• Report harassment, crashes, or unsafe riders in Inbox.</Text>
            <Text className="text-xs text-zinc-400" maxFontSizeMultiplier={maxFontSizeMultiplier}>• Trip details can be shared even before pickup starts.</Text>
          </View>
          <View className="mt-4 flex-row gap-3">
            <Pressable
              className="flex-1 rounded-2xl bg-emerald-500 px-3 py-3"
              onPress={() => {
                trackDriverEvent('support_open_inbox_tapped');
                setIsSupportVisible(false);
                router.push('/(tabs)/inbox');
              }}
              accessibilityRole="button"
              accessibilityLabel="Open support inbox"
            >
              <Text className="text-center text-sm font-semibold text-white" maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('home.openInbox')}</Text>
            </Pressable>
            <Pressable className={`rounded-2xl px-3 py-3 ${highContrastEnabled ? 'border border-white' : 'border border-zinc-700'}`} onPress={() => setIsSupportVisible(false)} accessibilityRole="button" accessibilityLabel="Dismiss support panel">
              <Text className="text-sm font-semibold text-zinc-100" maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('home.dismiss')}</Text>
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
        onSupport={toggleSupportSheet}
        onZoomIn={() => updateZoom(zoomLevel + 1)}
        onZoomOut={() => updateZoom(zoomLevel - 1)}
        onOverview={() => {
          if (!routeData || !mapRef.current || !hasValidRouteOverview(routeData.polyline)) {
            logDriverWarning('route_overview_unavailable', {
              hasRouteData: Boolean(routeData),
              hasMapRef: Boolean(mapRef.current),
              polylinePointCount: routeData?.polyline.length ?? 0,
            });
            return;
          }
          logEvent('map_route_overview_tapped');
          trackDriverEvent('route_overview_tapped', { tripStatus: activeTrip?.status ?? null });
          mapRef.current.fitToCoordinates(routeData.polyline, {
            edgePadding: ROUTE_OVERVIEW_EDGE_PADDING,
            animated: true,
          });
        }}
        showOverview={Boolean(routeData)}
        highContrastEnabled={highContrastEnabled}
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

const highContrastMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#000000' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#000000' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1F2937' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#FACC15' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#111827' }] },
];

const NavigationStat = ({
  label,
  value,
  highContrastEnabled,
  maxFontSizeMultiplier,
}: {
  label: string;
  value: string;
  highContrastEnabled: boolean;
  maxFontSizeMultiplier?: number;
}) => (
  <View className={`flex-1 rounded-2xl px-3 py-2 ${highContrastEnabled ? 'border border-white bg-black' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
    <Text className={`text-[11px] font-semibold uppercase tracking-wider ${highContrastEnabled ? 'text-white' : 'text-zinc-500 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>
      {label}
    </Text>
    <Text className={`mt-1 text-xs font-semibold ${highContrastEnabled ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>
      {value}
    </Text>
  </View>
);
