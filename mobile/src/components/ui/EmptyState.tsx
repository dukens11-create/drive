import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useAccessibilitySettings } from '../../context/AccessibilityContext';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
};

export const EmptyState = ({ icon, title, subtitle }: Props) => {
  const { maxFontSizeMultiplier } = useAccessibilitySettings();

  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <Ionicons name={icon} size={36} color="#71717A" />
      </View>
      <Text className="text-center text-lg font-semibold text-zinc-800 dark:text-zinc-100" accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>{title}</Text>
      <Text className="mt-2 text-center text-sm text-zinc-500 dark:text-zinc-400" maxFontSizeMultiplier={maxFontSizeMultiplier}>{subtitle}</Text>
    </View>
  );
};
