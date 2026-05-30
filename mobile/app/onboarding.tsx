import { Redirect } from 'expo-router';
import * as Location from 'expo-location';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { PLACEHOLDER_DRIVER_DOCUMENTS, REQUIRED_DRIVER_DOCUMENTS } from '../src/constants/onboarding';
import { kycApi } from '../src/services/api/kycApi';
import { useAccessibilitySettings } from '../src/context/AccessibilityContext';
import { useAuth } from '../src/context/AuthContext';
import { useLocale } from '../src/context/LocaleContext';
import { useScreenTracking } from '../src/hooks/useScreenTracking';
import { logEvent } from '../src/services/observability';

const FALLBACK_APPLICATION_LOCATION = { lat: 37.7749, lng: -122.4194 };
const SAFETY_POLICIES = [
  'Zero tolerance for harassment, impairment, or unsafe driving while using Drive.',
  'Emergency help and trip sharing stay available from the home screen once you are approved.',
  'Identity, license, and insurance checks must clear before online driving is enabled.',
];
const VERIFICATION_CHECKLIST = ['Government ID and driver profile review', 'Driver license and insurance upload', 'KYC approval before going online'];

export default function OnboardingScreen() {
  const { state, session, onboardingProfile, onboardingStep, completeApplication, submitDocuments, refreshOnboarding, errorMessage, isOnboardingLoading } = useAuth();
  const { maxFontSizeMultiplier } = useAccessibilitySettings();
  const { t } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  useScreenTracking('onboarding');
  const documentsUploaded = (onboardingProfile?.documents ?? []).length;
  const verificationStatus =
    onboardingProfile?.verificationState === 'verified'
      ? t('profile.verificationStatus.verified')
      : onboardingProfile?.verificationState === 'rejected'
        ? t('profile.verificationStatus.needsReview')
        : onboardingProfile?.verificationState === 'kyc_pending'
          ? t('profile.verificationStatus.inProgress')
          : t('profile.verificationStatus.pending');

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
      logEvent('onboarding_application_submit_tapped');
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
      logEvent('onboarding_documents_submit_tapped');
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
      logEvent('onboarding_kyc_refresh_tapped');
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
    <ScrollView className="flex-1 bg-zinc-950" contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 64 }}>
      <Text className="text-3xl font-bold text-zinc-100" accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('onboarding.title')}</Text>
      <Text className="mt-2 text-sm text-zinc-400" maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('onboarding.subtitle')}</Text>

      <View className="mt-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-4">
        <Text className="text-sm font-semibold text-emerald-300">What happens before your first trip</Text>
        {VERIFICATION_CHECKLIST.map((item) => (
          <Text key={item} className="mt-2 text-xs text-zinc-100">
            • {item}
          </Text>
        ))}
      </View>

      <View className="mt-4 rounded-3xl bg-zinc-900 p-5">
        <StepRow
          title="Application"
          value={onboardingProfile ? 'Submitted' : 'Pending'}
          description="Confirm your driving city and allow location so we can stage your account correctly."
          active={onboardingStep === 'application'}
        />
        <StepRow
          title="Documents"
          value={`${documentsUploaded}/${REQUIRED_DRIVER_DOCUMENTS} uploaded`}
          description="Upload your driver license and insurance before KYC review can begin."
          active={onboardingStep === 'documents'}
        />
        <StepRow
          title="KYC verification"
          value={verificationStatus}
          description="Identity review must be approved before online mode is unlocked."
          active={onboardingStep === 'kyc'}
        />
      </View>

      <View className="mt-4 rounded-3xl bg-zinc-900 p-5">
        <Text className="text-sm font-semibold text-zinc-100">{t('onboarding.safetyPolicies')}</Text>
        {SAFETY_POLICIES.map((policy) => (
          <Text key={policy} className="mt-2 text-xs leading-5 text-zinc-300">
            • {policy}
          </Text>
        ))}
      </View>

      {onboardingProfile?.verificationState === 'rejected' || onboardingProfile?.status === 'rejected' ? (
        <View className="mt-4 rounded-3xl border border-rose-500/40 bg-rose-500/10 p-4">
          <Text className="text-sm font-semibold text-rose-200">Verification needs attention</Text>
          <Text className="mt-2 text-xs leading-5 text-rose-100">
            Review your documents, refresh KYC status after corrections, and use in-app support from Home once approved if you still need help.
          </Text>
        </View>
      ) : null}

      {onboardingStep === 'application' ? (
        <ActionButton title={t('onboarding.submitApplication')} loading={isSubmitting} loadingLabel={t('onboarding.working')} onPress={handleApply} maxFontSizeMultiplier={maxFontSizeMultiplier} />
      ) : null}
      {onboardingStep === 'documents' ? (
        <ActionButton title={t('onboarding.uploadDocuments')} loading={isSubmitting} loadingLabel={t('onboarding.working')} onPress={handleUploadDocuments} maxFontSizeMultiplier={maxFontSizeMultiplier} />
      ) : null}
      {onboardingStep === 'kyc' ? (
        <ActionButton
          title={onboardingProfile?.verificationState === 'kyc_pending' ? t('onboarding.refreshKycStatus') : t('onboarding.createKycSession')}
          loading={isSubmitting || isOnboardingLoading}
          loadingLabel={t('onboarding.working')}
          onPress={handleRefreshKycStatus}
          maxFontSizeMultiplier={maxFontSizeMultiplier}
        />
      ) : null}

      <Text className="mt-4 text-xs text-zinc-500">After approval you will see SOS, trip sharing, and support shortcuts directly on the Home screen.</Text>
      {(screenError || errorMessage) ? <Text className="mt-4 text-sm text-rose-400">{screenError || errorMessage}</Text> : null}
    </ScrollView>
  );
}

const StepRow = ({ title, value, description, active }: { title: string; value: string; description: string; active: boolean }) => (
  <View className={`mb-3 rounded-2xl border px-4 py-3 ${active ? 'border-emerald-400 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-800/60'}`}>
    <Text className="text-sm font-semibold text-zinc-100">{title}</Text>
    <Text className="mt-1 text-xs text-zinc-300">{value}</Text>
    <Text className="mt-2 text-xs leading-5 text-zinc-400">{description}</Text>
  </View>
);

const ActionButton = ({
  title,
  loading,
  loadingLabel,
  onPress,
  maxFontSizeMultiplier,
}: {
  title: string;
  loading: boolean;
  loadingLabel: string;
  onPress: () => void;
  maxFontSizeMultiplier: number;
}) => (
  <Pressable className="mt-6 rounded-2xl bg-emerald-500 px-4 py-3" disabled={loading} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
    <Text className="text-center font-semibold text-white" maxFontSizeMultiplier={maxFontSizeMultiplier}>{loading ? loadingLabel : title}</Text>
  </Pressable>
);
