import { Redirect } from 'expo-router';
import * as Location from 'expo-location';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { PLACEHOLDER_DRIVER_DOCUMENTS, REQUIRED_DRIVER_DOCUMENTS } from '../src/constants/onboarding';
import { kycApi } from '../src/services/api/kycApi';
import { useAuth } from '../src/context/AuthContext';

const FALLBACK_APPLICATION_LOCATION = { lat: 37.7749, lng: -122.4194 };

export default function OnboardingScreen() {
  const { state, session, onboardingProfile, onboardingStep, completeApplication, submitDocuments, refreshOnboarding, errorMessage, isOnboardingLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);

  if (state !== 'signed_in') {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (onboardingStep === 'ready') {
    return <Redirect href="/(tabs)" />;
  }

  const handleApply = async () => {
    setIsSubmitting(true);
    setScreenError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        await completeApplication(FALLBACK_APPLICATION_LOCATION);
      } else {
        const current = await Location.getCurrentPositionAsync({});
        await completeApplication({ lat: current.coords.latitude, lng: current.coords.longitude });
      }
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Failed to submit driver application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadDocuments = async () => {
    setIsSubmitting(true);
    setScreenError(null);
    try {
      await submitDocuments(PLACEHOLDER_DRIVER_DOCUMENTS);
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Failed to upload onboarding documents');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshKycStatus = async () => {
    if (!session?.user.id) {
      return;
    }

    setIsSubmitting(true);
    setScreenError(null);
    try {
      if (onboardingProfile?.verificationState === 'kyc_pending') {
        await kycApi.status(session.user.id);
      } else {
        await kycApi.createSession(session.user.id);
      }
      await refreshOnboarding();
    } catch (error) {
      setScreenError(error instanceof Error ? error.message : 'Failed to refresh KYC status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-zinc-950 px-6 py-16">
      <Text className="text-3xl font-bold text-zinc-100">Driver onboarding</Text>
      <Text className="mt-2 text-sm text-zinc-400">Complete all onboarding steps to unlock online driving.</Text>

      <View className="mt-8 rounded-3xl bg-zinc-900 p-5">
        <StepRow title="Application" value={onboardingProfile ? 'Submitted' : 'Pending'} active={onboardingStep === 'application'} />
        <StepRow
          title="Documents"
          value={(onboardingProfile?.documents ?? []).length >= REQUIRED_DRIVER_DOCUMENTS ? 'Uploaded' : 'Pending'}
          active={onboardingStep === 'documents'}
        />
        <StepRow
          title="KYC verification"
          value={onboardingProfile?.verificationState === 'verified' ? 'Verified' : onboardingProfile?.verificationState === 'rejected' ? 'Rejected' : 'Pending'}
          active={onboardingStep === 'kyc'}
        />
      </View>

      {onboardingStep === 'application' ? (
        <ActionButton title="Submit application" loading={isSubmitting} onPress={handleApply} />
      ) : null}
      {onboardingStep === 'documents' ? (
        <ActionButton title="Upload required documents" loading={isSubmitting} onPress={handleUploadDocuments} />
      ) : null}
      {onboardingStep === 'kyc' ? (
        <ActionButton
          title={onboardingProfile?.verificationState === 'kyc_pending' ? 'Refresh KYC status' : 'Create KYC session'}
          loading={isSubmitting || isOnboardingLoading}
          onPress={handleRefreshKycStatus}
        />
      ) : null}

      {(screenError || errorMessage) ? <Text className="mt-4 text-sm text-rose-400">{screenError || errorMessage}</Text> : null}
    </View>
  );
}

const StepRow = ({ title, value, active }: { title: string; value: string; active: boolean }) => (
  <View className={`mb-3 rounded-2xl border px-4 py-3 ${active ? 'border-emerald-400 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-800/60'}`}>
    <Text className="text-sm font-semibold text-zinc-100">{title}</Text>
    <Text className="mt-1 text-xs text-zinc-300">{value}</Text>
  </View>
);

const ActionButton = ({ title, loading, onPress }: { title: string; loading: boolean; onPress: () => void }) => (
  <Pressable className="mt-6 rounded-2xl bg-emerald-500 px-4 py-3" disabled={loading} onPress={onPress}>
    <Text className="text-center font-semibold text-white">{loading ? 'Working...' : title}</Text>
  </Pressable>
);
