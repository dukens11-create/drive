import { Pressable, Text, View } from 'react-native';

import { useDriveRealtime } from '../../context/DriveRealtimeContext';
import { driverStatusMeta, tripStatusOrder, tripStepLabels } from '../../utils/driveStatus';

const COLOR_STEP_INACTIVE = '#E4E4E7'; // zinc-200

export const RideRequestCard = () => {
  const { activeRequest, activeTrip, requestTimeLeft, acceptRequest, declineRequest, advanceTrip } = useDriveRealtime();

  if (!activeRequest && !activeTrip) {
    return null;
  }

  if (!activeRequest) {
    if (!activeTrip) {
      return null;
    }

    const activeIndex = tripStatusOrder.indexOf(activeTrip.status);
    const statusMeta = driverStatusMeta[activeTrip.status];
    const latestUpdates = activeTrip.timeline.slice(-3).reverse();

    return (
      <View className="absolute bottom-72 left-4 right-4 z-30 rounded-[28px] bg-white p-5 shadow-soft dark:bg-zinc-900">
        {/* Status badge + rider info */}
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: `${statusMeta.accentColor}22` }}>
              <Text className="text-xs font-semibold" style={{ color: statusMeta.accentColor }}>
                {statusMeta.label}
              </Text>
            </View>
            <Text className="mt-3 text-xl font-semibold text-zinc-950 dark:text-zinc-100">{activeTrip.riderName}</Text>
            <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{activeTrip.pickupAddress}</Text>
            <Text className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">Drop-off · {activeTrip.dropoffAddress}</Text>
          </View>
          <View className="items-end">
            <Text className="text-base font-bold text-emerald-600">${activeTrip.estimatedFare.toFixed(2)}</Text>
            <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">{activeTrip.tripDistanceKm} km</Text>
            <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">⭐ {activeTrip.riderRating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Step progress indicator */}
        <View className="mt-4 flex-row items-center">
          {tripStatusOrder.map((status, index) => {
            const isDone = index < activeIndex;
            const isActive = index === activeIndex;
            const color = isDone || isActive ? driverStatusMeta[status].accentColor : '#D4D4D8';
            return (
              <View key={status} className="flex-row flex-1 items-center">
                <View className="flex-1 items-center">
                  <View
                    className="h-7 w-7 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${color}22`, borderWidth: isActive ? 2 : 0, borderColor: color }}
                  >
                    <Text className="text-xs font-bold" style={{ color }}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="mt-1 text-[10px] font-medium" style={{ color: isActive ? color : '#A1A1AA' }}>
                    {tripStepLabels[status]}
                  </Text>
                </View>
                {index < tripStatusOrder.length - 1 ? (
                  <View
                    className="mb-3 h-0.5 flex-1"
                    style={{ backgroundColor: isDone ? driverStatusMeta[status].accentColor : COLOR_STEP_INACTIVE }}
                  />
                ) : null}
              </View>
            );
          })}
        </View>

        <View className="mt-4 rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800">
          <Text className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-300">Next step</Text>
          <Text className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{statusMeta.label}</Text>
          <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{statusMeta.subtitle}</Text>
        </View>

        <View className="mt-4 gap-2">
          {latestUpdates.map((event) => (
            <View key={event.id} className="rounded-2xl border border-zinc-200 px-3 py-2 dark:border-zinc-700">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{event.title}</Text>
                  <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">{event.message}</Text>
                </View>
                <Text className="text-[11px] uppercase tracking-wide text-zinc-400">
                  {new Date(event.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable className="mt-4 rounded-2xl px-4 py-3.5" style={{ backgroundColor: statusMeta.accentColor }} onPress={advanceTrip}>
          <Text className="text-center text-base font-bold text-white">{statusMeta.actionLabel}</Text>
        </Pressable>
      </View>
    );
  }

  const request = activeRequest;
  const urgentSeconds = requestTimeLeft <= 5;

  return (
    <View className="absolute bottom-72 left-4 right-4 z-30 rounded-[28px] bg-white p-5 shadow-soft dark:bg-zinc-900">
      {/* Header: rider + countdown */}
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="self-start rounded-full bg-rose-100 px-3 py-1 dark:bg-rose-900/40">
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-500 dark:text-rose-300">New request</Text>
          </View>
          <Text className="mt-3 text-base font-semibold text-zinc-950 dark:text-zinc-100">{request.riderName}</Text>
          <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Pickup ETA {request.pickupEtaMinutes} min · Trip payout ${request.estimatedFare.toFixed(2)}</Text>
          <Text className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-400">Pickup</Text>
          <Text className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{request.pickupAddress}</Text>
          <Text className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-400">Drop-off</Text>
          <Text className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{request.dropoffAddress}</Text>
        </View>
        <View
          className="items-center rounded-2xl px-3 py-2"
          style={{ backgroundColor: urgentSeconds ? '#FEF2F2' : '#F0FDF4' }}
        >
          <Text className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: urgentSeconds ? '#EF4444' : '#16A34A' }}>
            Respond in
          </Text>
          <Text className="mt-1 text-2xl font-bold" style={{ color: urgentSeconds ? '#DC2626' : '#15803D' }}>
            {requestTimeLeft}s
          </Text>
        </View>
      </View>

      {/* Trip details strip */}
      <View className="mt-4 flex-row justify-between rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800">
        <InfoItem label="Pickup ETA" value={`${request.pickupEtaMinutes} min`} />
        <InfoItem label="Trip" value={`${request.tripDistanceKm} km`} />
        <InfoItem label="Fare" value={`$${request.estimatedFare.toFixed(2)}`} />
        <InfoItem label="Rating" value={`⭐ ${request.riderRating.toFixed(1)}`} />
      </View>

      <View className="mt-4 rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800">
        <Text className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-300">Decision needed</Text>
        <Text className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Accept to start navigation to pickup now.</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Declining keeps you online so the next nearby request can appear right away.</Text>
      </View>
      <View className="mt-4 flex-row gap-3">
        <Pressable className="flex-1 rounded-2xl bg-zinc-200 px-4 py-3 dark:bg-zinc-800" onPress={declineRequest}>
          <Text className="text-center font-semibold text-zinc-800 dark:text-zinc-100">Decline</Text>
        </Pressable>
        <Pressable className="flex-[2] rounded-2xl bg-emerald-500 px-4 py-3" onPress={acceptRequest}>
          <Text className="text-center text-base font-bold text-white">Accept</Text>
        </Pressable>
      </View>
    </View>
  );
};

const InfoItem = ({ label, value }: { label: string; value: string }) => (
  <View>
    <Text className="text-[11px] uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</Text>
    <Text className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{value}</Text>
  </View>
);
