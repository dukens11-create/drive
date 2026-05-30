import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useState } from 'react';

import { useAuth } from '../../src/context/AuthContext';
import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { useScreenTracking } from '../../src/hooks/useScreenTracking';
import { localeLabelByCode, supportedLocales } from '../../src/i18n/translations';
import { logError, logEvent } from '../../src/services/observability';
import { driverStatusMeta } from '../../src/utils/driveStatus';

export default function ProfileScreen() {
  const { profile } = useDriveRealtime();
  const router = useRouter();
  const { signOut, onboardingStep, onboardingProfile } = useAuth();
  const { t, locale, setLocale } = useLocale();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  useScreenTracking('profile');
  const [localeError, setLocaleError] = useState<string | null>(null);
  const documentsUploaded = (onboardingProfile?.documents ?? []).length;
  const verificationStatus =
    onboardingProfile?.verificationState === 'verified'
      ? t('profile.verificationStatus.verified')
      : onboardingProfile?.verificationState === 'rejected'
        ? t('profile.verificationStatus.needsReview')
        : onboardingProfile?.verificationState === 'kyc_pending'
          ? t('profile.verificationStatus.inProgress')
          : t('profile.verificationStatus.pending');

  const handleSignOut = async () => {
    setSignOutError(null);
    logEvent('profile_sign_out_tapped');
    try {
      await signOut();
    } catch (error) {
      logError('profile_sign_out_failed', error);
      setSignOutError(error instanceof Error ? error.message : 'Unable to sign out right now.');
    }
  };

  const handleLanguageChange = async (locale: (typeof supportedLocales)[number]) => {
    setLocaleError(null);
    try {
      await setLocale(locale);
    } catch (error) {
      setLocaleError(error instanceof Error ? error.message : t('language.updateError'));
    }
  };

  return (
    <View className="flex-1 bg-zinc-50 p-4 dark:bg-zinc-950">
      <View className="rounded-3xl bg-white p-5 shadow-soft dark:bg-zinc-900">
        <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{profile.name}</Text>
        {profile.email ? <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{profile.email}</Text> : null}
        <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{t('profile.status')}: {driverStatusMeta[profile.status].label}</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{t('profile.onboarding')}: {onboardingStep}</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{t('profile.vehicleHealth')}: {profile.vehicleStatus === 'good' ? t('profile.goodToDrive') : t('profile.serviceSoon')}</Text>
      </View>

      <View className="mt-4 rounded-3xl bg-white p-5 shadow-soft dark:bg-zinc-900">
        <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{t('profile.verification')}</Text>
        <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{t('profile.documentsUploaded')}: {documentsUploaded}</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{t('profile.reviewStatus')}: {verificationStatus}</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{t('profile.safetyTools')}</Text>
        {onboardingStep !== 'ready' ? (
          <Pressable
            className="mt-4 rounded-2xl bg-emerald-500 px-4 py-3"
            onPress={() => {
              logEvent('profile_continue_onboarding_tapped');
              router.push('/onboarding');
            }}
          >
            <Text className="text-center font-semibold text-white">{t('common.continueOnboarding')}</Text>
          </Pressable>
        ) : null}
        <View className="mt-4 rounded-2xl border border-zinc-200 p-3 dark:border-zinc-700">
          <Text className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{t('language.title')}</Text>
          <Text className="mt-1 text-xs text-zinc-500 dark:text-zinc-300">{t('language.current')}: {localeLabelByCode[locale]}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {supportedLocales.map((supportedLocale) => {
              const selected = supportedLocale === locale;
              return (
                <Pressable
                  key={supportedLocale}
                  className={`rounded-full px-3 py-2 ${selected ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                  onPress={() => void handleLanguageChange(supportedLocale)}
                >
                  <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-zinc-800 dark:text-zinc-100'}`}>{localeLabelByCode[supportedLocale]}</Text>
                </Pressable>
              );
            })}
          </View>
          {localeError ? <Text className="mt-2 text-xs text-rose-500 dark:text-rose-300">{localeError}</Text> : null}
        </View>
        <Pressable className="mt-4 rounded-2xl bg-zinc-200 px-4 py-3 dark:bg-zinc-800" onPress={() => void handleSignOut()}>
          <Text className="text-center font-semibold text-zinc-900 dark:text-zinc-100">{t('common.signOut')}</Text>
        </Pressable>
        {signOutError ? <Text className="mt-2 text-sm text-rose-500 dark:text-rose-300">{signOutError}</Text> : null}
      </View>
    </View>
  );
}
