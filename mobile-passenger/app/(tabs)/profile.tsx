import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';
import { useEffect, useState } from 'react';

import { TEXT_SCALE_OPTIONS, useAccessibilitySettings } from '../../src/context/AccessibilityContext';
import { useAuth } from '../../src/context/AuthContext';
import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';
import { marketplaceApi } from '../../src/services/api/marketplaceApi';
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
  const { profile, updatePreferences } = useDriveRealtime();
  const router = useRouter();
  const { signOut, onboardingStep, onboardingProfile, session } = useAuth();
  const { highContrastEnabled, setHighContrastEnabled, textScale, setTextScale, maxFontSizeMultiplier } = useAccessibilitySettings();
  const { t, locale, setLocale } = useLocale();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [minimumRatingText, setMinimumRatingText] = useState(profile.preferences.minimumRiderRating.toFixed(1));
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralSummary, setReferralSummary] = useState<{ count: number; totalBonusCents: number }>({ count: 0, totalBonusCents: 0 });
  const [activePromos, setActivePromos] = useState<string[]>([]);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [localeError, setLocaleError] = useState<string | null>(null);
  useScreenTracking('profile');
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

  useEffect(() => {
    let cancelled = false;
    const loadRewards = async () => {
      try {
        const [code, referrals, promos] = await Promise.all([
          marketplaceApi.getReferralCode(),
          marketplaceApi.listReferrals(),
          marketplaceApi.listPromos(),
        ]);
        if (cancelled) {
          return;
        }
        setReferralCode(code.referralCode);
        setReferralSummary({ count: referrals.referrals.length, totalBonusCents: referrals.totalBonusCents });
        setActivePromos(promos.promos.map((promo) => promo.code).slice(0, 3));
        setPromoError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setPromoError(error instanceof Error ? error.message : 'Unable to load referral and promo data.');
      }
    };
    void loadRewards();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  return (
    <ScrollView className={`flex-1 p-4 ${highContrastEnabled ? 'bg-black' : 'bg-zinc-50 dark:bg-zinc-950'}`} contentContainerStyle={{ paddingBottom: 28 }}>
      <View className={`rounded-3xl p-5 shadow-soft ${highContrastEnabled ? 'border border-white bg-black' : 'bg-white dark:bg-zinc-900'}`}>
        <Text className={`text-xl font-bold ${highContrastEnabled ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{profile.name}</Text>
        {profile.email ? <Text className={`mt-1 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{profile.email}</Text> : null}
        <Text className={`mt-2 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('profile.status')}: {driverStatusMeta[profile.status].label}</Text>
        <Text className={`mt-1 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>Trust score: {profile.trustScore ?? 80}</Text>
        <Text className={`mt-1 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>Badge: {profile.verificationBadge === 'verified' ? 'Verified driver' : 'Pending verification'}</Text>
        <Text className={`mt-1 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('profile.onboarding')}: {onboardingStep}</Text>
        <Text className={`mt-1 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('profile.vehicleHealth')}: {profile.vehicleStatus === 'good' ? t('profile.goodToDrive') : t('profile.serviceSoon')}</Text>
      </View>

      <View className={`mt-4 rounded-3xl p-5 shadow-soft ${highContrastEnabled ? 'border border-white bg-black' : 'bg-white dark:bg-zinc-900'}`}>
        <Text className={`text-base font-semibold ${highContrastEnabled ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>Driving preferences</Text>
        <Text className={`mt-2 text-xs ${highContrastEnabled ? 'text-white' : 'text-zinc-500 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>Preferred ride types</Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {(['standard', 'comfort', 'xl'] as const).map((rideType) => {
            const selected = profile.preferences.rideTypes.includes(rideType);
            return (
              <Pressable
                key={rideType}
                className={`rounded-full px-3 py-1.5 ${selected ? 'bg-emerald-500' : highContrastEnabled ? 'border border-white bg-black' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                onPress={() => {
                  const next = selected
                    ? profile.preferences.rideTypes.filter((item) => item !== rideType)
                    : [...profile.preferences.rideTypes, rideType];
                  updatePreferences({ rideTypes: next.length > 0 ? next : ['standard'] });
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Toggle ${rideType} ride type`}
              >
                <Text className={`text-xs font-semibold uppercase ${selected || highContrastEnabled ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{rideType}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text className={`mt-3 text-xs ${highContrastEnabled ? 'text-white' : 'text-zinc-500 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>Minimum rider rating</Text>
        <View className="mt-1 flex-row items-center gap-2">
          <TextInput
            value={minimumRatingText}
            onChangeText={setMinimumRatingText}
            keyboardType="decimal-pad"
            className={`flex-1 rounded-xl px-3 py-2 text-sm ${highContrastEnabled ? 'bg-zinc-800 text-white' : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'}`}
          />
          <Pressable
            className={`rounded-xl px-3 py-2 ${highContrastEnabled ? 'border border-white bg-black' : 'bg-zinc-900 dark:bg-zinc-100'}`}
            onPress={() => {
              const next = Number(minimumRatingText);
              if (Number.isFinite(next)) {
                const clampedRating = Math.min(5, Math.max(1, next));
                updatePreferences({ minimumRiderRating: clampedRating });
                setMinimumRatingText(clampedRating.toFixed(1));
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Save minimum rider rating"
          >
            <Text className={`text-xs font-semibold ${highContrastEnabled ? 'text-white' : 'text-white dark:text-zinc-900'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>Save</Text>
          </Pressable>
        </View>
        <Text className={`mt-3 text-xs ${highContrastEnabled ? 'text-white' : 'text-zinc-500 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>Direction preference</Text>
        <View className="mt-2 flex-row gap-2">
          {(['any', 'toward_downtown', 'away_from_downtown'] as const).map((direction) => {
            const selected = profile.preferences.directionPreference === direction;
            return (
              <Pressable
                key={direction}
                className={`rounded-xl px-3 py-2 ${selected ? 'bg-emerald-500' : highContrastEnabled ? 'border border-white bg-black' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                onPress={() => updatePreferences({ directionPreference: direction })}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text className={`text-[11px] font-semibold ${selected || highContrastEnabled ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>
                  {direction.replace(/_/g, ' ')}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text className={`mt-3 text-xs ${highContrastEnabled ? 'text-white' : 'text-zinc-500 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          Scheduled windows: {(profile.preferences.availabilityWindows ?? []).map((window) => `${window.day} ${window.start}-${window.end}`).join(' · ')}
        </Text>
      </View>

      <View className={`mt-4 rounded-3xl p-5 shadow-soft ${highContrastEnabled ? 'border border-white bg-black' : 'bg-white dark:bg-zinc-900'}`}>
        <Text className={`text-base font-semibold ${highContrastEnabled ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>Referrals & incentives</Text>
        <Text className={`mt-2 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>Your referral code: {referralCode ?? 'Loading…'}</Text>
        <Text className={`mt-1 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-600 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>
          Successful referrals: {referralSummary.count} · Bonus earned ${(referralSummary.totalBonusCents / 100).toFixed(2)}
        </Text>
        <Text className={`mt-2 text-xs uppercase tracking-wide ${highContrastEnabled ? 'text-white' : 'text-zinc-500 dark:text-zinc-300'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>Active promos</Text>
        {activePromos.length > 0 ? (
          <Text className={`mt-1 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>{activePromos.join(' · ')}</Text>
        ) : (
          <Text className={`mt-1 text-sm ${highContrastEnabled ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`} maxFontSizeMultiplier={maxFontSizeMultiplier}>No active promotions right now.</Text>
        )}
        {promoError ? <Text className="mt-2 text-sm text-rose-500 dark:text-rose-300" maxFontSizeMultiplier={maxFontSizeMultiplier}>{promoError}</Text> : null}
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
    </ScrollView>
  );
}
