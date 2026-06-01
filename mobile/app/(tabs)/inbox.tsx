import { Linking, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { useMemo, useState } from 'react';

import { useAuth } from '../../src/context/AuthContext';
import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ErrorBanner } from '../../src/components/ui/ErrorBanner';
import { LoadingState } from '../../src/components/ui/LoadingState';
import { ridesApi } from '../../src/services/api/ridesApi';
import { supportApi } from '../../src/services/api/supportApi';
import { useLocale } from '../../src/context/LocaleContext';
import { useScreenTracking } from '../../src/hooks/useScreenTracking';
import { logEvent } from '../../src/services/observability';

const CHAT_EVENT_TITLE = 'Trip chat';
const MAX_VISIBLE_CHAT_MESSAGES = 8;

const QUICK_REPLIES = [
  { id: 'qr1', label: "On my way", content: 'I am on my way to pick you up.' },
  { id: 'qr2', label: "Arrived", content: 'I have arrived at the pickup location.' },
  { id: 'qr3', label: "Wait please", content: 'Please wait for me, I will be there shortly.' },
  { id: 'qr4', label: "2 min away", content: 'I am about 2 minutes away.' },
];

type TripChatEvent = {
  id: string;
  title: string;
  message: string;
  voiceNoteUrl?: string;
  voiceNoteDurationSecs?: number;
  transcription?: string;
  translations?: Record<string, string>;
};

type ActiveTripWithPhone = {
  rideId: string;
  riderName: string;
  riderPhone?: string;
  timeline?: TripChatEvent[];
};

export default function InboxScreen() {
  const { notifications, activeTrip, isLoading, error, refreshData } = useDriveRealtime();
  const { session } = useAuth();
  useScreenTracking('inbox');
  const { t, formatTime } = useLocale();
  const [chatMessage, setChatMessage] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportStatus, setSupportStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const hasNotifications = notifications.length > 0;

  const typedActiveTrip = activeTrip as ActiveTripWithPhone | null;

  const chatMessages = useMemo(
    () => ((typedActiveTrip?.timeline ?? []) as TripChatEvent[]).filter((event) => event.title === CHAT_EVENT_TITLE).slice(-MAX_VISIBLE_CHAT_MESSAGES),
    [typedActiveTrip?.timeline]
  );

  const sendTripMessage = async (content?: string) => {
    const text = content ?? chatMessage;
    if (!typedActiveTrip || !text.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      await ridesApi.message(typedActiveTrip.rideId, text.trim());
      if (!content) setChatMessage('');
      await refreshData();
    } catch (sendError) {
      setSupportStatus(sendError instanceof Error ? sendError.message : 'Unable to send trip message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const callPassenger = () => {
    logEvent('call_passenger_tapped');
    const phone = typedActiveTrip?.riderPhone;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        setSupportStatus('Unable to initiate call.');
      });
    } else {
      setSupportStatus('Passenger phone number is not available.');
    }
  };

  const sendSupportMessage = async () => {
    if (!session?.user.id || !supportMessage.trim()) {
      return;
    }
    setIsSubmitting(true);
    try {
      if (openTicketId) {
        await supportApi.replyTicket(session.user.id, openTicketId, supportMessage.trim());
      } else {
        const tickets = await supportApi.listTickets(session.user.id);
        const openTicket = tickets.tickets.find((ticket) => ticket.status !== 'closed');
        if (openTicket) {
          setOpenTicketId(openTicket.id);
          await supportApi.replyTicket(session.user.id, openTicket.id, supportMessage.trim());
        } else {
          const created = await supportApi.createTicket(session.user.id, 'driver_help', supportMessage.trim());
          setOpenTicketId(created.ticket.id);
        }
      }
      setSupportMessage('');
      setSupportStatus('Support message sent.');
    } catch (sendError) {
      setSupportStatus(sendError instanceof Error ? sendError.message : 'Unable to send support message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-zinc-50 dark:bg-zinc-950">
      <View className="px-5 pb-2 pt-14">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{t('inbox.title')}</Text>
      </View>

      {isLoading && !hasNotifications && !error ? (
        <LoadingState label={t('common.loadingNotifications')} />
      ) : !hasNotifications && !error ? (
        <EmptyState icon="mail-outline" title={t('inbox.emptyTitle')} subtitle={t('inbox.emptySubtitle')} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                logEvent('inbox_refresh_tapped');
                void refreshData();
              }}
              tintColor="#16A34A"
            />
          }
        >
          {error ? <ErrorBanner message={error} onRetry={() => void refreshData()} /> : null}
          <View className="mt-2 gap-3">
            {typedActiveTrip ? (
              <View className="rounded-2xl bg-white p-4 shadow-soft dark:bg-zinc-900">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Trip chat · {typedActiveTrip.riderName}</Text>
                  <Pressable
                    className="rounded-xl bg-emerald-500 px-3 py-1"
                    onPress={callPassenger}
                    accessibilityLabel="Call passenger"
                  >
                    <Text className="text-xs font-semibold text-white">📞 Call</Text>
                  </Pressable>
                </View>

                {chatMessages.length > 0 ? (
                  <View className="mt-2 gap-2">
                    {chatMessages.map((message) => {
                      const bestTranslation = message.translations
                        ? Object.values(message.translations)[0]
                        : undefined;
                      return (
                        <View key={message.id} className="rounded-xl bg-zinc-100 p-2 dark:bg-zinc-800">
                          <Text className="text-xs text-zinc-700 dark:text-zinc-200">{message.message}</Text>
                          {message.voiceNoteUrl ? (
                            <Text className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                              🎙 Voice note {message.voiceNoteDurationSecs ? `· ${message.voiceNoteDurationSecs}s` : ''}
                              {message.transcription ? ` · "${message.transcription}"` : ''}
                            </Text>
                          ) : null}
                          <Pressable
                            onPress={() => setTranslatingId(translatingId === message.id ? null : message.id)}
                            accessibilityLabel="Toggle translation"
                          >
                            <Text className="mt-1 text-[10px] text-emerald-600">🌐 Translate</Text>
                          </Pressable>
                          {translatingId === message.id ? (
                            <Text className="mt-1 text-[10px] italic text-zinc-400">
                              {bestTranslation ?? '[Translated text will appear here]'}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text className="mt-2 text-xs text-zinc-500 dark:text-zinc-300">No messages yet. Send a quick pickup update.</Text>
                )}

                {/* Quick reply templates */}
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {QUICK_REPLIES.map((qr) => (
                    <Pressable
                      key={qr.id}
                      className="rounded-xl bg-zinc-100 px-3 py-1 dark:bg-zinc-800"
                      onPress={() => {
                        logEvent('quick_reply_tapped', { label: qr.label });
                        void sendTripMessage(qr.content);
                      }}
                    >
                      <Text className="text-xs text-zinc-700 dark:text-zinc-200">{qr.label}</Text>
                    </Pressable>
                  ))}
                </View>

                <View className="mt-3 flex-row gap-2">
                  <TextInput
                    value={chatMessage}
                    onChangeText={setChatMessage}
                    placeholder="Message passenger"
                    className="flex-1 rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                  <Pressable className={`rounded-xl px-3 py-2 ${isSubmitting ? 'bg-emerald-300' : 'bg-emerald-500'}`} onPress={() => void sendTripMessage()} disabled={isSubmitting}>
                    <Text className="text-xs font-semibold text-white">Send</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            <View className="rounded-2xl bg-white p-4 shadow-soft dark:bg-zinc-900">
              <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Driver support</Text>
              <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">Send issues to support in-app for safety and trip help.</Text>
              <View className="mt-3 flex-row gap-2">
                <TextInput
                  value={supportMessage}
                  onChangeText={setSupportMessage}
                  placeholder="Describe your issue"
                  className="flex-1 rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                />
                <Pressable className={`rounded-xl px-3 py-2 dark:bg-zinc-100 ${isSubmitting ? 'bg-zinc-500' : 'bg-zinc-900'}`} onPress={() => void sendSupportMessage()} disabled={isSubmitting}>
                  <Text className="text-xs font-semibold text-white dark:text-zinc-900">Submit</Text>
                </Pressable>
              </View>
              {supportStatus ? <Text className="mt-2 text-xs text-zinc-500 dark:text-zinc-300">{supportStatus}</Text> : null}
            </View>
            {notifications.map((notice: { id: string; title: string; body: string; createdAt: string }) => (
              <View key={notice.id} className="rounded-2xl bg-white p-4 shadow-soft dark:bg-zinc-900">
                <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{notice.title}</Text>
                <Text className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{notice.body}</Text>
                <Text className="mt-2 text-[11px] uppercase tracking-wide text-zinc-400">{formatTime(notice.createdAt)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
