import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

export default function FoodOrderRatingScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [review, setReview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setIsSubmitting(false);
    router.push('/(drawer)/(tabs)/food');
  };

  const StarRow = ({ value, onChange, label }: { value: number; onChange: (rating: number) => void; label: string }) => (
    <View>
      <Text className="text-sm font-semibold text-white">{label}</Text>
      <View className="mt-2 flex-row gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${star} stars for ${label}`}
          >
            <Text className={`text-3xl ${star <= value ? 'opacity-100' : 'opacity-30'}`}>⭐</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-zinc-950">
      <View className="flex-row items-center px-5 pb-2 pt-14">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Skip rating" className="mr-3">
          <Text className="text-base text-zinc-400">Skip</Text>
        </Pressable>
        <Text className="text-xl font-bold text-white">Rate Your Order</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 20 }}>
        <Text className="mt-2 text-sm text-zinc-400">Order #{orderId}</Text>

        <View className="gap-4 rounded-2xl bg-zinc-900 p-4">
          <StarRow value={restaurantRating} onChange={setRestaurantRating} label="Restaurant / Food Quality" />
          <View className="border-t border-zinc-800" />
          <StarRow value={deliveryRating} onChange={setDeliveryRating} label="Delivery Speed & Driver" />
        </View>

        <View className="rounded-2xl bg-zinc-900 p-4">
          <Text className="text-sm font-semibold text-white">Write a Review (optional)</Text>
          <TextInput
            value={review}
            onChangeText={setReview}
            placeholder="Share your experience..."
            placeholderTextColor="#52525B"
            multiline
            numberOfLines={4}
            className="mt-2 rounded-xl bg-zinc-800 px-3 py-2 text-sm text-white"
            accessibilityLabel="Write a review"
          />
        </View>

        <Pressable
          className={`rounded-2xl py-4 ${isSubmitting || (restaurantRating === 0 && deliveryRating === 0) ? 'bg-zinc-700' : 'bg-emerald-600'}`}
          onPress={() => void handleSubmit()}
          disabled={isSubmitting || (restaurantRating === 0 && deliveryRating === 0)}
          accessibilityRole="button"
          accessibilityLabel="Submit rating"
        >
          <Text className="text-center font-bold text-white">{isSubmitting ? 'Submitting…' : 'Submit Rating'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
