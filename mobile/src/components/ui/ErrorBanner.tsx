import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

type Props = {
  message: string;
  onRetry?: () => void;
};

export const ErrorBanner = ({ message, onRetry }: Props) => (
  <View className="mb-4 flex-row items-center rounded-2xl bg-rose-50 p-4 dark:bg-rose-950">
    <Ionicons name="alert-circle" size={18} color="#F43F5E" />
    <Text className="ml-2 flex-1 text-sm text-rose-600 dark:text-rose-300">{message}</Text>
    {onRetry ? (
      <Pressable onPress={onRetry} className="ml-3">
        <Text className="text-sm font-semibold text-rose-600 dark:text-rose-400">Retry</Text>
      </Pressable>
    ) : null}
  </View>
);
