import { ActivityIndicator, Text, View } from 'react-native';

type Props = {
  label?: string;
};

export const LoadingState = ({ label }: Props) => (
  <View className="flex-1 items-center justify-center gap-4">
    <ActivityIndicator size="large" color="#16A34A" />
    {label ? <Text className="text-sm text-zinc-500 dark:text-zinc-400">{label}</Text> : null}
  </View>
);
