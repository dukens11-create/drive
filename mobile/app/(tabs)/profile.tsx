import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';

import { useAuth } from '../../src/context/AuthContext';
import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';
import { driverStatusMeta } from '../../src/utils/driveStatus';

export default function ProfileScreen() {
  const { profile } = useDriveRealtime();
  const router = useRouter();
  const { signOut, onboardingStep, onboardingProfile } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const documentsUploaded = (onboardingProfile?.documents ?? []).length;
  const verificationStatus =
    onboardingProfile?.verificationState === 'verified'
      ? 'Verified'
      : onboardingProfile?.verificationState === 'rejected'
        ? 'Needs review'
        : onboardingProfile?.verificationState === 'kyc_pending'
          ? 'In progress'
          : 'Pending';

  const handleSignOut = async () => {
    setSignOutError(null);
    try {
      await signOut();
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : 'Unable to sign out right now.');
    }
  };

  return (
    <View className="flex-1 bg-zinc-50 p-4 dark:bg-zinc-950">
      <View className="rounded-3xl bg-white p-5 shadow-soft dark:bg-zinc-900">
        <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{profile.name}</Text>
        {profile.email ? <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{profile.email}</Text> : null}
        <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Status: {driverStatusMeta[profile.status].label}</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Onboarding: {onboardingStep}</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Vehicle health: {profile.vehicleStatus === 'good' ? 'Good to drive' : 'Service soon'}</Text>
      </View>

      <View className="mt-4 rounded-3xl bg-white p-5 shadow-soft dark:bg-zinc-900">
        <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Verification</Text>
        <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Documents uploaded: {documentsUploaded}</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Review status: {verificationStatus}</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Safety tools: SOS, trip sharing, and support live on Home.</Text>
        {onboardingStep !== 'ready' ? (
          <Pressable className="mt-4 rounded-2xl bg-emerald-500 px-4 py-3" onPress={() => router.push('/onboarding')}>
            <Text className="text-center font-semibold text-white">Continue onboarding</Text>
          </Pressable>
        ) : null}
        <Pressable className="mt-4 rounded-2xl bg-zinc-200 px-4 py-3 dark:bg-zinc-800" onPress={() => void handleSignOut()}>
          <Text className="text-center font-semibold text-zinc-900 dark:text-zinc-100">Sign out</Text>
        </Pressable>
        {signOutError ? <Text className="mt-2 text-sm text-rose-500 dark:text-rose-300">{signOutError}</Text> : null}
      </View>
    </View>
  );
}
