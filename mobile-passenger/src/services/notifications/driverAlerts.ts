import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { AppState, Platform, Vibration } from 'react-native';

type DriverAlertKind = 'incoming-request' | 'accepted' | 'trip-started' | 'trip-ended';

const driverAlertSound = require('../../../assets/sounds/incoming-request.wav');

const foregroundSounds: Record<DriverAlertKind, number | null> = {
  'incoming-request': driverAlertSound,
  accepted: driverAlertSound,
  'trip-started': driverAlertSound,
  'trip-ended': driverAlertSound,
};

const vibrationPatterns: Record<DriverAlertKind, number[] | number> = {
  'incoming-request': [0, 350, 180, 350],
  accepted: 80,
  'trip-started': [0, 120, 80, 120],
  'trip-ended': [0, 180, 60, 180, 60, 180],
};

const notificationSounds: Record<DriverAlertKind, 'default' | 'incoming-request.wav'> = {
  'incoming-request': 'incoming-request.wav',
  accepted: 'default',
  'trip-started': 'default',
  'trip-ended': 'default',
};

let audioModeReady = false;

const ensureAudioMode = async () => {
  if (audioModeReady) {
    return;
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
  });
  audioModeReady = true;
};

const playForegroundSound = async (kind: DriverAlertKind) => {
  const soundAsset = foregroundSounds[kind];
  if (!soundAsset) {
    return;
  }

  let sound: Audio.Sound | null = null;

  try {
    await ensureAudioMode();
    const playback = await Audio.Sound.createAsync(soundAsset, { shouldPlay: true, volume: 1 });
    sound = playback.sound;
    const playbackSound = playback.sound;
    playbackSound.setOnPlaybackStatusUpdate((status) => {
      if ('isLoaded' in status && status.isLoaded && status.didJustFinish) {
        void playbackSound.unloadAsync();
      }
    });
  } catch (error) {
    if (sound) {
      await sound.unloadAsync();
    }
    throw error;
  }
};

export const configureDriverAlerts = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('driver-alerts', {
      name: 'Driver alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 150, 300],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: 'incoming-request.wav',
    });
  }
};

export const ensureDriverAlertPermissions = async () => {
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
};

export const sendDriverAlert = async (kind: DriverAlertKind, title: string, body: string) => {
  if (AppState.currentState === 'active') {
    try {
      await playForegroundSound(kind);
    } catch {
      // fall back to haptics/vibration only
    }

    if (kind === 'incoming-request') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Vibration.vibrate(vibrationPatterns[kind]);
    return;
  }

  const hasPermission = await ensureDriverAlertPermissions();
  if (!hasPermission) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: notificationSounds[kind],
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: null,
  });
};

export const vibrateForAction = async (kind: 'selection' | 'success' | 'warning') => {
  if (kind === 'selection') {
    await Haptics.selectionAsync();
    Vibration.vibrate(25);
    return;
  }

  await Haptics.notificationAsync(
    kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
  );
  Vibration.vibrate(kind === 'success' ? 80 : [0, 120, 80, 120]);
};
