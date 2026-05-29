import { Pressable, Text, View } from 'react-native';

import { useDriveRealtime } from '../../context/DriveRealtimeContext';
import { driverStatusMeta, tripStatusOrder, tripStepLabels } from '../../utils/driveStatus';

export const RideRequestCard = () => {
  const { activeRequest, activeTrip, requestTimeLeft, acceptRequest, declineRequest, advanceTrip } = useDriveRealtime();

  if (!activeRequest && !activeTrip) {
    return null;
  }

  if (activeTrip) {
    const activeIndex = tripStatusOrder.indexOf(activeTrip.status);
    const statusMeta = driverStatusMeta[activeTrip.status];

    return (
      <View className="absolute bottom-72 left-4 right-4 z-30 rounded-[28px] bg-white p-5 shadow-soft dark:bg-zinc-900">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: `${statusMeta.accentColor}1A` }}>
              <Text className="text-xs font-semibold" style={{ color: statusMeta.accentColor }}>{statusMeta.label}</Text>
            </View>
            <Text className="mt-3 text-xl font-semibold text-zinc-950 dark:text-zinc-100">{activeTrip.riderName}</Text>
            <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{activeTrip.pickupAddress}</Text>
            <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Dropoff · {activeTrip.dropoffAddress}</Text>
          </View>
          <View className="items-end">
            <Text className="text-sm font-semibold text-emerald-600">${activeTrip.estimatedFare.toFixed(2)}</Text>
            <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">{activeTrip.tripDistanceKm} km trip</Text>
            <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">⭐ {activeTrip.riderRating.toFixed(2)}</Text>
          </View>
        </View>

        <View className="mt-4 flex-row flex-wrap gap-2">
          {tripStatusOrder.map((status, index) => {
            const isActive = index <= activeIndex;
            return (
              <View
                key={status}
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: isActive ? `${driverStatusMeta[status].accentColor}1A` : '#E4E4E7' }}
              >
                <Text className="text-xs font-semibold" style={{ color: isActive ? driverStatusMeta[status].accentColor : '#71717A' }}>
                  {tripStepLabels[status]}
                </Text>
              </View>
            );
          })}
        </View>

        <Text className="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{statusMeta.subtitle}</Text>

        <Pressable className="mt-4 rounded-2xl bg-zinc-950 px-4 py-3 dark:bg-zinc-100" onPress={advanceTrip}>
          <Text className="text-center font-semibold text-white dark:text-zinc-950">{statusMeta.actionLabel}</Text>
        </Pressable>
      </View>
    );
  }

  if (!activeRequest) {
    return null;
  }

  const request = activeRequest;

  return (
    <View className="absolute bottom-72 left-4 right-4 z-30 rounded-[28px] bg-white p-5 shadow-soft dark:bg-zinc-900">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-semibold text-zinc-950 dark:text-zinc-100">{request.riderName}</Text>
          <Text className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-400">Pickup</Text>
          <Text className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{request.pickupAddress}</Text>
          <Text className="mt-3 text-xs uppercase tracking-[0.18em] text-zinc-400">Dropoff</Text>
          <Text className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{request.dropoffAddress}</Text>
        </View>
        <View className="items-end rounded-3xl bg-rose-100 px-3 py-2 dark:bg-rose-900/40">
          <Text className="text-xs font-medium uppercase tracking-wide text-rose-500 dark:text-rose-300">Respond in</Text>
          <Text className="mt-1 text-xl font-semibold text-rose-600 dark:text-rose-300">{requestTimeLeft}s</Text>
        </View>
      </View>

      <View className="mt-4 flex-row justify-between rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800">
        <InfoItem label="Pickup" value={`${request.pickupDistanceKm} km`} />
        <InfoItem label="Trip" value={`${request.tripDistanceKm} km`} />
        <InfoItem label="Fare" value={`$${request.estimatedFare.toFixed(2)}`} />
        <InfoItem label="Rider" value={`⭐ ${request.riderRating.toFixed(2)}`} />
      </View>

      <Text className="mt-3 text-sm text-zinc-600 dark:text-zinc-300">Pickup ETA {request.pickupEtaMinutes} min · Premium mock request flow ready for backend data.</Text>

      <View className="mt-4 flex-row gap-3">
        <Pressable className="flex-1 rounded-2xl bg-zinc-200 px-4 py-3 dark:bg-zinc-800" onPress={declineRequest}>
          <Text className="text-center font-semibold text-zinc-800 dark:text-zinc-100">Decline</Text>
        </Pressable>
        <Pressable className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3" onPress={acceptRequest}>
          <Text className="text-center font-semibold text-white">Accept</Text>
        </Pressable>
      </View>
    </View>
  );
};

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <View>
    <Text className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-300">{label}</Text>
    <Text className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</Text>
  </View>
);
