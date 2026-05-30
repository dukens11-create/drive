import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

type Props = {
  onRecenter: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onOverview: () => void;
  showOverview?: boolean;
};

export const MapOverlayControls = ({ onRecenter, onZoomIn, onZoomOut, onOverview, showOverview = false }: Props) => (
  <View className="absolute bottom-80 right-4 z-20 gap-3">
    {showOverview ? (
      <Pressable
        className="h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-soft dark:bg-zinc-900"
        onPress={onOverview}
      >
        <Ionicons name="map" size={18} color="#2563EB" />
      </Pressable>
    ) : null}
    <Pressable
      className="h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-soft dark:bg-zinc-900"
      onPress={onZoomIn}
    >
      <Ionicons name="add" size={20} color="#0F172A" />
    </Pressable>
    <Pressable
      className="h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-soft dark:bg-zinc-900"
      onPress={onZoomOut}
    >
      <Ionicons name="remove" size={20} color="#0F172A" />
    </Pressable>
    <Pressable
      className="h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft dark:bg-zinc-900"
      onPress={onRecenter}
    >
      <Ionicons name="locate" size={22} color="#16A34A" />
    </Pressable>
  </View>
);
