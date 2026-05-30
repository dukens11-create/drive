import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

export const MapOverlayControls = ({ onRecenter }: { onRecenter: () => void }) => (
  <View className="absolute bottom-80 right-4 z-20">
    <Pressable
      className="h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-soft dark:bg-zinc-900"
      onPress={onRecenter}
    >
      <Ionicons name="locate" size={22} color="#16A34A" />
    </Pressable>
  </View>
);
