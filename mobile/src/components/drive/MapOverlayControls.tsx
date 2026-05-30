import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View, useColorScheme } from 'react-native';

type MapOverlayControlsProps = {
  onEmergency: () => void;
  onRecenter: () => void;
  onShareTrip: () => void;
  onSupport: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onOverview: () => void;
  showOverview?: boolean;
};

export const MapOverlayControls = ({
  onEmergency,
  onRecenter,
  onShareTrip,
  onSupport,
  onZoomIn,
  onZoomOut,
  onOverview,
  showOverview = false,
}: MapOverlayControlsProps) => {
  const isDark = useColorScheme() === 'dark';
  const neutralIconColor = isDark ? '#F4F4F5' : '#0F172A';

  return (
    <View className="absolute bottom-80 right-4 z-20 gap-3">
      <QuickActionButton tone="danger" label="SOS" icon="warning" onPress={onEmergency} />
      <QuickActionButton tone="neutral" label="Share" icon="share-social" onPress={onShareTrip} />
      <QuickActionButton tone="neutral" label="Help" icon="help-buoy" onPress={onSupport} />
      {showOverview ? (
        <Pressable
          className="h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-soft dark:bg-zinc-900"
          onPress={onOverview}
          accessibilityRole="button"
          accessibilityLabel="Overview route"
          accessibilityHint="Zoom out to see the full current route"
          hitSlop={8}
        >
          <Ionicons name="map" size={18} color="#2563EB" />
        </Pressable>
      ) : null}
      <Pressable
        className="h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-soft dark:bg-zinc-900"
        onPress={onZoomIn}
        accessibilityRole="button"
        accessibilityLabel="Zoom in map"
        hitSlop={8}
      >
        <Ionicons name="add" size={20} color={neutralIconColor} />
      </Pressable>
      <Pressable
        className="h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-soft dark:bg-zinc-900"
        onPress={onZoomOut}
        accessibilityRole="button"
        accessibilityLabel="Zoom out map"
        hitSlop={8}
      >
        <Ionicons name="remove" size={20} color={neutralIconColor} />
      </Pressable>
      <Pressable
        className="h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft dark:bg-zinc-900"
        onPress={onRecenter}
        accessibilityRole="button"
        accessibilityLabel="Recenter map"
        accessibilityHint="Centers the map on your live location"
        hitSlop={8}
      >
        <Ionicons name="locate" size={22} color="#16A34A" />
      </Pressable>
    </View>
  );
};

const QuickActionButton = ({
  icon,
  label,
  onPress,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone: 'danger' | 'neutral';
}) => (
  <Pressable
    className={`items-center rounded-2xl px-2 py-2 shadow-soft ${tone === 'danger' ? 'bg-rose-500' : 'bg-white dark:bg-zinc-900'}`}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={label}
    hitSlop={8}
  >
    <Ionicons name={icon} size={18} color={tone === 'danger' ? '#FFFFFF' : '#16A34A'} />
    <Text className={`mt-1 text-[10px] font-semibold ${tone === 'danger' ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>{label}</Text>
  </Pressable>
);
