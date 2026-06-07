import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Linking, Modal, Pressable, Text, TextInput, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import type { ActiveTrip, LatLng } from '../../types/drive';

type LiveRideTrackerProps = {
  activeTrip: ActiveTrip | null;
  riderLocation: LatLng;
  driverLocation: LatLng | null;
  etaMinutes: number;
  isConnecting: boolean;
  onRefresh: () => void;
  onShareTrip: () => void;
  onSendChat: (message: string) => Promise<void>;
};

function midpoint(first: LatLng, second: LatLng): LatLng {
  return {
    latitude: (first.latitude + second.latitude) / 2,
    longitude: (first.longitude + second.longitude) / 2,
  };
}

export function LiveRideTracker({
  activeTrip,
  riderLocation,
  driverLocation,
  etaMinutes,
  isConnecting,
  onRefresh,
  onShareTrip,
  onSendChat,
}: LiveRideTrackerProps) {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatStatus, setChatStatus] = useState('');
  const hasTrip = Boolean(activeTrip);

  const mapCenter = useMemo(() => {
    if (driverLocation) {
      return midpoint(riderLocation, driverLocation);
    }
    return riderLocation;
  }, [driverLocation, riderLocation]);

  const openCall = async () => {
    await Linking.openURL('tel:+18001234567').catch(() => {
      setChatStatus('Unable to start a phone call right now.');
    });
  };

  const submitChat = async () => {
    const message = chatMessage.trim();
    if (!message) return;
    try {
      await onSendChat(message);
      setChatMessage('');
      setChatStatus('Message sent to driver.');
    } catch {
      setChatStatus('Failed to send message.');
    }
  };

  return (
    <View className="space-y-3">
      <View className="h-64 overflow-hidden rounded-2xl border border-zinc-800">
        <MapView
          style={{ flex: 1 }}
          region={{
            latitude: mapCenter.latitude,
            longitude: mapCenter.longitude,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          }}
        >
          <Marker coordinate={riderLocation} title="You" pinColor="#22c55e" />
          {driverLocation ? <Marker coordinate={driverLocation} title="Driver" pinColor="#0ea5e9" /> : null}
          {activeTrip ? (
            <Marker coordinate={activeTrip.dropoffPosition} title="Destination" pinColor="#f59e0b" />
          ) : null}
          {driverLocation && activeTrip ? (
            <Polyline
              coordinates={[driverLocation, activeTrip.pickupPosition, activeTrip.dropoffPosition]}
              strokeColor="#22c55e"
              strokeWidth={4}
            />
          ) : null}
        </MapView>
      </View>

      <View className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <Text className="text-base font-semibold text-zinc-100">{hasTrip ? 'Live Trip Tracking' : 'No Active Trip'}</Text>
        <Text className="mt-1 text-sm text-zinc-400">
          {hasTrip
            ? `${activeTrip?.pickupAddress} → ${activeTrip?.dropoffAddress}`
            : 'Request a ride to unlock real-time tracking, driver contact, and trip sharing.'}
        </Text>
        <Text className="mt-2 text-sm text-emerald-300">ETA: {Math.max(1, etaMinutes)} min</Text>
        <Text className="text-xs text-zinc-500">{isConnecting ? 'Connecting to live updates…' : 'Live updates connected'}</Text>

        <View className="mt-4 flex-row flex-wrap gap-2">
          <Pressable className="rounded-full bg-emerald-600 px-4 py-2" onPress={onRefresh} accessibilityRole="button">
            <Text className="font-semibold text-white">Refresh</Text>
          </Pressable>
          <Pressable className="rounded-full bg-sky-600 px-4 py-2" onPress={() => setChatOpen(true)} accessibilityRole="button">
            <Text className="font-semibold text-white">Chat</Text>
          </Pressable>
          <Pressable className="rounded-full bg-zinc-700 px-4 py-2" onPress={openCall} accessibilityRole="button">
            <Text className="font-semibold text-white">Call Driver</Text>
          </Pressable>
          <Pressable className="rounded-full bg-violet-700 px-4 py-2" onPress={onShareTrip} accessibilityRole="button">
            <Text className="font-semibold text-white">Share Trip</Text>
          </Pressable>
        </View>
        {chatStatus ? <Text className="mt-3 text-xs text-zinc-300">{chatStatus}</Text> : null}
      </View>

      <Modal transparent animationType="slide" visible={chatOpen} onRequestClose={() => setChatOpen(false)}>
        <View className="flex-1 items-center justify-end bg-black/60 p-4">
          <View className="w-full rounded-2xl bg-zinc-900 p-4">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-base font-semibold text-zinc-100">Driver Chat</Text>
              <Pressable onPress={() => setChatOpen(false)}>
                <Ionicons name="close" size={20} color="#fff" />
              </Pressable>
            </View>
            <TextInput
              value={chatMessage}
              onChangeText={setChatMessage}
              placeholder="Send a message to your driver"
              placeholderTextColor="#9ca3af"
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-100"
            />
            <Pressable className="mt-3 rounded-xl bg-emerald-600 px-4 py-3" onPress={submitChat} accessibilityRole="button">
              <Text className="text-center font-semibold text-white">Send Message</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
