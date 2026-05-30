import { useRouter } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';
import { useState } from 'react';

import { TEXT_SCALE_OPTIONS, useAccessibilitySettings } from '../../src/context/AccessibilityContext';
import { useAuth } from '../../src/context/AuthContext';
import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';
import { useLocale } from '../../src/context/LocaleContext';
import { useScreenTracking } from '../../src/hooks/useScreenTracking';
import { localeLabelByCode, supportedLocales } from '../../src/i18n/translations';
import { logError, logEvent } from '../../src/services/observability';
import { driverStatusMeta } from '../../src/utils/driveStatus';

const textScaleLabel: Record<(typeof TEXT_SCALE_OPTIONS)[number], string> = {
  default: 'Default',
  large: 'Large',
  extraLarge: 'Extra large',
};

export default function ProfileScreen() {
  const { profile } = useDriveRealtime();
  const router = useRouter();
  const { signOut, onboardingStep, onboardingProfile } = useAuth();
  const { highContrastEnabled, setHighContrastEnabled, textScale, setTextScale, maxFontSizeMultiplier } = useAccessibilitySettings();
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
    <View className={`flex-1 p-4 ${highContrastEnabled ? 'bg-black' : 'bg-zinc-50 dark:bg-zinc-950'}`}>
      <View className={`rounded-3xl p-5 shadow-soft ${highContrastEnabled ? 'border border-white bg-black' : 'bg-white dark:bg-zinc-900'}`}>
        <Text className={`text-xl font-bold ${highContrastEnabled ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{profile.name}</Text>
        {profile.email ? <Text className={`mt-1 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{profile.email}</Text> : null}
        <Text className={`mt-2 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('profile.status')}: {driverStatusMeta[profile.status].label}</Text>
        <Text className={`mt-1 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('profile.onboarding')}: {onboardingStep}</Text>
        <Text className={`mt-1 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('profile.vehicleHealth')}: {profile.vehicleStatus === 'good' ? t('profile.goodToDrive') : t('profile.serviceSoon')}</Text>
      </View>

      <View className={`mt-4 rounded-3xl p-5 shadow-soft ${highContrastEnabled ? 'border border-white bg-black' : 'bg-white dark:bg-zinc-900'}`}>
        <Text className={`text-base font-semibold ${highContrastEnabled ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('profile.verification')}</Text>
        <Text className={`mt-2 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('profile.documentsUploaded')}: {documentsUploaded}</Text>
        <Text className={`mt-1 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('profile.reviewStatus')}: {verificationStatus}</Text>
        <Text className={`mt-1 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('profile.safetyTools')}</Text>
        <View className={`mt-4 rounded-2xl p-4 ${highContrastEnabled ? 'border border-white bg-black' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
          <Text className={`text-sm font-semibold ${highContrastEnabled ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>Accessibility</Text>
          <View className="mt-3 flex-row items-center justify-between">
            <Text className={`text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>High contrast mode</Text>
            <Switch
              value={highContrastEnabled}
              onValueChange={setHighContrastEnabled}
              accessibilityLabel="Enable high contrast mode"
              accessibilityRole="switch"
              trackColor={{ false: '#71717A', true: '#FACC15' }}
            />
          </View>
          <Text className={`mt-4 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>Text size</Text>
          <View className="mt-2 flex-row gap-2">
            {TEXT_SCALE_OPTIONS.map((option) => (
              <Pressable
                key={option}
                className={`flex-1 rounded-xl px-3 py-2 ${textScale === option ? 'bg-emerald-500' : highContrastEnabled ? 'border border-white bg-black' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                onPress={() => setTextScale(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: textScale === option }}
                accessibilityLabel={`Set text size to ${option}`}
              >
                <Text className={`text-center text-xs font-semibold ${textScale === option || highContrastEnabled ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  {textScaleLabel[option]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View className={`mt-4 rounded-2xl border p-3 ${highContrastEnabled ? 'border-white bg-black' : 'border-zinc-200 dark:border-zinc-700'}`}>
          <Text className={`text-sm font-semibold ${highContrastEnabled ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('language.title')}</Text>
          <Text className={`mt-1 text-xs ${highContrastEnabled ? 'text-white' : 'text-zinc-500 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('language.current')}: {localeLabelByCode[locale]}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {supportedLocales.map((supportedLocale) => {
              const selected = supportedLocale === locale;
              return (
                <Pressable
                  key={supportedLocale}
                  className={`rounded-full px-3 py-2 ${selected ? 'bg-emerald-500' : highContrastEnabled ? 'border border-white bg-black' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                  onPress={() => void handleLanguageChange(supportedLocale)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Set language to ${localeLabelByCode[supportedLocale]}`}
                >
                  <Text className={`text-xs font-semibold ${selected || highContrastEnabled ? 'text-white' : 'text-zinc-800 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{localeLabelByCode[supportedLocale]}</Text>
                </Pressable>
              );
            })}
          </View>
          {localeError ? <Text className="mt-2 text-xs text-rose-500 dark:text-rose-300" maxFontSizeMultiplier={maxFontSizeMultiplier}>{localeError}</Text> : null}
        </View>
        {onboardingStep !== 'ready' ? (
          <Pressable
            className="mt-4 rounded-2xl bg-emerald-500 px-4 py-3"
            onPress={() => {
              logEvent('profile_continue_onboarding_tapped');
              router.push('/onboarding');
            }}
            accessibilityRole="button"
            accessibilityLabel="Continue onboarding steps"
          >
            <Text className="text-center font-semibold text-white" maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('common.continueOnboarding')}</Text>
          </Pressable>
        ) : null}
        <Pressable className={`mt-4 rounded-2xl px-4 py-3 ${highContrastEnabled ? 'border border-white bg-black' : 'bg-zinc-200 dark:bg-zinc-800'}`} onPress={() => void handleSignOut()} accessibilityRole="button" accessibilityLabel="Sign out">
          <Text className={`text-center font-semibold ${highContrastEnabled ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('common.signOut')}</Text>
        </Pressable>
        {signOutError ? <Text className="mt-2 text-sm text-rose-500 dark:text-rose-300" maxFontSizeMultiplier={maxFontSizeMultiplier}>{signOutError}</Text> : null}
      </View>
    </View>
  );
}
