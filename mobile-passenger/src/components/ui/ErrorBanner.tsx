import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { useAccessibilitySettings } from '../../context/AccessibilityContext';
import { useLocale } from '../../context/LocaleContext';

type Props = {
  message: string;
  onRetry?: () => void;
};

export const ErrorBanner = ({ message, onRetry }: Props) => {
  const { maxFontSizeMultiplier } = useAccessibilitySettings();
  const { t } = useLocale();

  return (
    <View className="mb-4 flex-row items-center rounded-2xl bg-rose-50 p-4 dark:bg-rose-950" accessibilityRole="alert">
      <Ionicons name="alert-circle" size={18} color="#F43F5E" />
      <Text className="ml-2 flex-1 text-sm text-rose-600 dark:text-rose-300" maxFontSizeMultiplier={maxFontSizeMultiplier}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} className="ml-3" accessibilityRole="button" accessibilityLabel="Retry loading">
          <Text className="text-sm font-semibold text-rose-600 dark:text-rose-400" maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('common.retry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};
