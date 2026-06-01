import { Pressable, Text, TextInput, View } from 'react-native';
import { useEffect, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useAccessibilitySettings } from '../../context/AccessibilityContext';
import { useDriveRealtime } from '../../context/DriveRealtimeContext';
import { ridesApi } from '../../services/api/ridesApi';
import { useLocale } from '../../context/LocaleContext';
import { DRIVER_CANCEL_REASONS, driverStatusMeta, tripStatusOrder, tripStepLabels } from '../../utils/driveStatus';

const COLOR_STEP_INACTIVE = '#E4E4E7'; // zinc-200
const NO_SHOW_WAIT_SECONDS = 120; // allow no-show after 2 minutes waiting

const formatWaitTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};
const SWIPE_HANDLE_SIZE = 72;
const SWIPE_TRACK_PADDING = 8;
const SWIPE_COMPLETION_THRESHOLD = 0.74;

const clampSwipeOffset = (value: number, maxOffset: number) => Math.max(0, Math.min(value, maxOffset));

export const RideRequestCard = () => {
  const { activeRequest, activeTrip, requestTimeLeft, waitingSeconds, acceptRequest, declineRequest, advanceTrip, reportNoShow, cancelTrip } = useDriveRealtime();
  const { highContrastEnabled, maxFontSizeMultiplier } = useAccessibilitySettings();
  const { formatCurrency, formatNumber, formatTime } = useLocale();
  const [passengerRating, setPassengerRating] = useState(5);
  const [passengerComment, setPassengerComment] = useState('');
  const [ratingState, setRatingState] = useState<string | null>(null);
  const [showCancelMenu, setShowCancelMenu] = useState(false);
  const [cancelState, setCancelState] = useState<string | null>(null);
  const [swipeTrackWidth, setSwipeTrackWidth] = useState(0);
  const swipeOffset = useSharedValue(0);

  useEffect(() => {
    setPassengerRating(5);
    setPassengerComment('');
    setRatingState(null);
    setShowCancelMenu(false);
    setCancelState(null);
  }, [activeTrip?.rideId]);

  useEffect(() => {
    swipeOffset.value = 0;
  }, [activeRequest?.id, swipeOffset]);

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
    const isAtPickup = activeTrip.status === 'arrived_at_pickup';
    const canReportNoShow = isAtPickup && waitingSeconds >= NO_SHOW_WAIT_SECONDS;
    const canCancel = activeTrip.status === 'accepted' || activeTrip.status === 'arrived_at_pickup';

    return (
      <View className={`absolute bottom-72 left-4 right-4 z-30 rounded-[28px] p-5 shadow-soft ${highContrastEnabled ? 'border border-white bg-black' : 'bg-white dark:bg-zinc-900'}`}>
        {/* Status badge + rider info */}
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: `${statusMeta.accentColor}22` }}>
              <Text className="text-xs font-semibold" style={{ color: statusMeta.accentColor }}>
                {statusMeta.label}
              </Text>
            </View>
            <Text className={`mt-3 text-xl font-semibold ${highContrastEnabled ? 'text-white' : 'text-zinc-950 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{activeTrip.riderName}</Text>
            <Text className={`mt-1 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{activeTrip.pickupAddress}</Text>
            <Text className={`mt-0.5 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>Drop-off · {activeTrip.dropoffAddress}</Text>
          </View>
          <View className="items-end">
            <Text className="text-base font-bold text-emerald-600">{formatCurrency(activeTrip.estimatedFare)}</Text>
            <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">{formatNumber(activeTrip.tripDistanceKm, { maximumFractionDigits: 1 })} km</Text>
            <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">⭐ {formatNumber(activeTrip.riderRating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text>
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

        {/* Waiting timer (shown at pickup) */}
        {isAtPickup ? (
          <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-blue-50 px-4 py-3 dark:bg-blue-900/20">
            <View>
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Waiting for rider</Text>
              <Text className="mt-0.5 text-xs text-blue-500 dark:text-blue-300">
                {waitingSeconds < NO_SHOW_WAIT_SECONDS
                  ? `No-show available in ${formatWaitTime(NO_SHOW_WAIT_SECONDS - waitingSeconds)}`
                  : 'You may report a no-show'}
              </Text>
            </View>
            <Text
              className="text-2xl font-bold"
              style={{ color: waitingSeconds >= NO_SHOW_WAIT_SECONDS ? '#EF4444' : '#3B82F6' }}
              accessibilityLiveRegion="polite"
            >
              {formatWaitTime(waitingSeconds)}
            </Text>
          </View>
        ) : null}

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
                  {formatTime(event.createdAt)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {activeTrip.status === 'completed' && typeof activeTrip.passengerRating !== 'number' ? (
          <View className="mt-4 rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800">
            <Text className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-300">Passenger rating</Text>
            <View className="mt-2 flex-row gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  className={`rounded-xl px-2 py-1 ${passengerRating >= star ? 'bg-amber-400' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                  onPress={() => setPassengerRating(star)}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${star} stars`}
                >
                  <Text className="text-xs font-semibold text-zinc-900" maxFontSizeMultiplier={maxFontSizeMultiplier}>★</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={passengerComment}
              onChangeText={setPassengerComment}
              placeholder="Optional passenger feedback"
              className="mt-2 rounded-xl bg-white px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <Pressable
              className="mt-2 rounded-xl bg-zinc-900 px-3 py-2 dark:bg-zinc-100"
              onPress={() => {
                void ridesApi
                  .ratePassenger(activeTrip.rideId, passengerRating, passengerComment)
                  .then(() => setRatingState('Passenger rated.'))
                  .catch((error) => setRatingState(error instanceof Error ? error.message : 'Unable to submit passenger rating.'));
              }}
              accessibilityRole="button"
              accessibilityLabel="Submit passenger rating"
            >
              <Text className="text-center text-xs font-semibold text-white dark:text-zinc-900" maxFontSizeMultiplier={maxFontSizeMultiplier}>Submit rating</Text>
            </Pressable>
            {ratingState ? <Text className="mt-2 text-xs text-zinc-500 dark:text-zinc-300" maxFontSizeMultiplier={maxFontSizeMultiplier}>{ratingState}</Text> : null}
          </View>
        ) : activeTrip.status === 'completed' && typeof activeTrip.passengerRating === 'number' ? (
          <View className="mt-4 rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800">
            <Text className="text-xs text-zinc-700 dark:text-zinc-200" maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Passenger rated ★ {activeTrip.passengerRating.toFixed(1)}
              {activeTrip.passengerReview ? ` · ${activeTrip.passengerReview}` : ''}
            </Text>
          </View>
        ) : null}

        {/* No-show button (visible at pickup after waiting threshold) */}
        {isAtPickup && canReportNoShow ? (
          <Pressable
            className="mt-3 rounded-2xl border border-rose-300 px-4 py-3 dark:border-rose-700"
            onPress={() => void reportNoShow()}
            accessibilityRole="button"
            accessibilityLabel="Report rider no-show"
          >
            <Text className="text-center text-sm font-semibold text-rose-600 dark:text-rose-400" maxFontSizeMultiplier={maxFontSizeMultiplier}>
              Rider No-Show
            </Text>
          </Pressable>
        ) : null}

        {/* Cancel trip with reasons */}
        {canCancel && !showCancelMenu ? (
          <Pressable
            className="mt-2 rounded-2xl px-4 py-2"
            onPress={() => setShowCancelMenu(true)}
            accessibilityRole="button"
            accessibilityLabel="Cancel trip"
          >
            <Text className="text-center text-xs text-zinc-400 dark:text-zinc-500" maxFontSizeMultiplier={maxFontSizeMultiplier}>Cancel trip</Text>
          </Pressable>
        ) : null}

        {showCancelMenu ? (
          <View className="mt-3 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-700">
            <Text className="text-[11px] uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Cancel reason</Text>
            <View className="mt-2 gap-1.5">
              {DRIVER_CANCEL_REASONS.map((r) => (
                <Pressable
                  key={r.value}
                  className="rounded-xl bg-zinc-100 px-3 py-2.5 dark:bg-zinc-800"
                  onPress={() => {
                    void cancelTrip(r.value)
                      .then(() => setCancelState('Trip canceled.'))
                      .catch((err) => setCancelState(err instanceof Error ? err.message : 'Unable to cancel trip.'));
                    setShowCancelMenu(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Cancel trip: ${r.label}`}
                >
                  <Text className="text-sm text-zinc-800 dark:text-zinc-100" maxFontSizeMultiplier={maxFontSizeMultiplier}>{r.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              className="mt-2 rounded-xl px-3 py-2"
              onPress={() => setShowCancelMenu(false)}
              accessibilityRole="button"
              accessibilityLabel="Keep trip"
            >
              <Text className="text-center text-xs text-zinc-400 dark:text-zinc-500" maxFontSizeMultiplier={maxFontSizeMultiplier}>Keep trip</Text>
            </Pressable>
            {cancelState ? <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300" maxFontSizeMultiplier={maxFontSizeMultiplier}>{cancelState}</Text> : null}
          </View>
        ) : null}

        <Pressable
          className="mt-4 rounded-2xl px-4 py-3.5"
          style={{ backgroundColor: statusMeta.accentColor }}
          onPress={advanceTrip}
          accessibilityRole="button"
          accessibilityLabel={statusMeta.actionLabel}
        >
          <Text className="text-center text-base font-bold text-white" maxFontSizeMultiplier={maxFontSizeMultiplier}>{statusMeta.actionLabel}</Text>
        </Pressable>
      </View>
    );
  }

  const request = activeRequest;
  const urgentSeconds = requestTimeLeft <= 5;
  const swipeLimit = Math.max(0, swipeTrackWidth - SWIPE_HANDLE_SIZE - SWIPE_TRACK_PADDING * 2);
  const handleSwipeAccept = () => {
    void acceptRequest();
  };
  const swipeGesture = Gesture.Pan()
    .onUpdate((event) => {
      swipeOffset.value = clampSwipeOffset(event.translationX, swipeLimit);
    })
    .onEnd(() => {
      if (swipeLimit > 0 && swipeOffset.value >= swipeLimit * SWIPE_COMPLETION_THRESHOLD) {
        swipeOffset.value = withSpring(swipeLimit, { damping: 18, stiffness: 200 });
        runOnJS(handleSwipeAccept)();
        return;
      }
      swipeOffset.value = withSpring(0, { damping: 20, stiffness: 220 });
    });
  const swipeHandleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeOffset.value }],
  }));
  const swipePromptStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(swipeOffset.value / Math.max(swipeLimit || 1, 1), 0.85),
  }));

  return (
    <View className={`absolute inset-0 z-40 ${highContrastEnabled ? 'bg-black' : 'bg-zinc-950/95'}`}>
      <View className="flex-1 px-5 pb-8 pt-16">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <View className="self-start rounded-full bg-rose-500/15 px-3 py-1">
              <Text className="text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-300">Incoming ride request</Text>
            </View>
            <Text className="mt-4 text-3xl font-semibold text-white" maxFontSizeMultiplier={maxFontSizeMultiplier}>{request.riderName}</Text>
            <Text className="mt-2 text-base text-zinc-300" maxFontSizeMultiplier={maxFontSizeMultiplier}>
              {request.rideType.toUpperCase()} · {formatNumber(request.pickupEtaMinutes)} min away · ⭐ {formatNumber(request.riderRating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </Text>
            <View className="mt-4 self-start rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1">
              <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Sound alert active</Text>
            </View>
          </View>
          <View className="items-center rounded-[28px] bg-white/8 px-4 py-3">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300">Respond in</Text>
            <Text className="mt-2 text-4xl font-bold text-white" accessibilityLiveRegion="polite">
              {requestTimeLeft}s
            </Text>
            <Text className={`mt-2 text-xs font-semibold uppercase tracking-[0.18em] ${urgentSeconds ? 'text-rose-300' : 'text-emerald-300'}`}>
              {urgentSeconds ? 'Urgent' : 'On time'}
            </Text>
          </View>
        </View>

        <View className="mt-8 rounded-[32px] bg-white/8 p-5">
          <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Route overview</Text>
          <View className="mt-4 flex-row gap-4">
            <View className="items-center pt-1">
              <View className="h-3 w-3 rounded-full bg-emerald-400" />
              <View className="h-12 w-0.5 bg-zinc-600" />
              <View className="h-3 w-3 rounded-full bg-amber-400" />
            </View>
            <View className="flex-1">
              <Text className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Pickup</Text>
              <Text className="mt-2 text-base font-semibold text-white" maxFontSizeMultiplier={maxFontSizeMultiplier}>{request.pickupAddress}</Text>
              <Text className="mt-1 text-sm text-zinc-400" maxFontSizeMultiplier={maxFontSizeMultiplier}>
                {formatNumber(request.pickupDistanceKm, { maximumFractionDigits: 1 })} km away
              </Text>
              <Text className="mt-5 text-[11px] uppercase tracking-[0.2em] text-zinc-500">Destination</Text>
              <Text className="mt-2 text-base font-semibold text-white" maxFontSizeMultiplier={maxFontSizeMultiplier}>{request.dropoffAddress}</Text>
              <Text className="mt-1 text-sm text-zinc-400" maxFontSizeMultiplier={maxFontSizeMultiplier}>
                {formatNumber(request.tripDistanceKm, { maximumFractionDigits: 1 })} km trip · surge x{formatNumber(request.surgeMultiplier, { maximumFractionDigits: 1 })}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-5 flex-row gap-3">
          <MetricCard label="Pickup ETA" value={`${formatNumber(request.pickupEtaMinutes)} min`} />
          <MetricCard label="Estimated earnings" value={formatCurrency(request.estimatedFare)} valueClassName="text-emerald-300" />
        </View>
        <View className="mt-3 flex-row gap-3">
          <MetricCard label="Ride type" value={request.rideType.toUpperCase()} />
          <MetricCard
            label="Passenger rating"
            value={`⭐ ${formatNumber(request.riderRating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`}
          />
        </View>

        <View className="mt-auto rounded-[32px] bg-white/8 p-5">
          <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">Decision needed</Text>
          <Text className="mt-3 text-lg font-semibold text-white" maxFontSizeMultiplier={maxFontSizeMultiplier}>Swipe to accept and begin pickup navigation.</Text>
          <Text className="mt-2 text-sm text-zinc-300" maxFontSizeMultiplier={maxFontSizeMultiplier}>
            Reject to stay online and receive the next nearby request immediately.
          </Text>

          <Pressable
            className="mt-5 rounded-2xl border border-white/15 bg-white/5 px-4 py-4"
            onPress={declineRequest}
            accessibilityRole="button"
            accessibilityLabel="Decline ride request"
          >
            <Text className="text-center text-base font-semibold text-white" maxFontSizeMultiplier={maxFontSizeMultiplier}>Reject</Text>
          </Pressable>

          <View
            className="mt-4 rounded-[28px] bg-emerald-500/20 p-2"
            onLayout={(event) => setSwipeTrackWidth(event.nativeEvent.layout.width)}
          >
            <Animated.Text
              style={swipePromptStyle}
              className="absolute inset-x-0 top-0 py-6 text-center text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100"
              maxFontSizeMultiplier={maxFontSizeMultiplier}
            >
              Swipe to accept
            </Animated.Text>
            <GestureDetector gesture={swipeGesture}>
              <Animated.View style={swipeHandleStyle}>
                <Pressable
                  className="h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-emerald-500"
                  onPress={handleSwipeAccept}
                  accessibilityRole="button"
                  accessibilityLabel="Accept ride request"
                  accessibilityHint="Swipe right or double tap to accept this ride request"
                >
                  <Text className="text-center text-xs font-bold uppercase tracking-[0.18em] text-white" maxFontSizeMultiplier={maxFontSizeMultiplier}>Accept</Text>
                </Pressable>
              </Animated.View>
            </GestureDetector>
          </View>
        </View>
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

const MetricCard = ({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) => (
  <View className="flex-1 rounded-[28px] bg-white/8 p-4">
    <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">{label}</Text>
    <Text className={`mt-3 text-lg font-semibold text-white ${valueClassName ?? ''}`}>{value}</Text>
  </View>
);
