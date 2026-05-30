import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useEffect, useState } from 'react';

import { useAuth } from '../../src/context/AuthContext';
import { useDriveRealtime } from '../../src/context/DriveRealtimeContext';
import { marketplaceApi } from '../../src/services/api/marketplaceApi';
import { driverStatusMeta } from '../../src/utils/driveStatus';

export default function ProfileScreen() {
  const { profile, updatePreferences } = useDriveRealtime();
  const router = useRouter();
  const { signOut, onboardingStep, onboardingProfile, session } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [minimumRatingText, setMinimumRatingText] = useState(profile.preferences.minimumRiderRating.toFixed(1));
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralSummary, setReferralSummary] = useState<{ count: number; totalBonusCents: number }>({ count: 0, totalBonusCents: 0 });
  const [activePromos, setActivePromos] = useState<string[]>([]);
  const [promoError, setPromoError] = useState<string | null>(null);
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
    <ScrollView className="flex-1 bg-zinc-50 p-4 dark:bg-zinc-950" contentContainerStyle={{ paddingBottom: 28 }}>
      <View className="rounded-3xl bg-white p-5 shadow-soft dark:bg-zinc-900">
        <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{profile.name}</Text>
        {profile.email ? <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{profile.email}</Text> : null}
        <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Status: {driverStatusMeta[profile.status].label}</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Trust score: {profile.trustScore ?? 80}</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Badge: {profile.verificationBadge === 'verified' ? 'Verified driver' : 'Pending verification'}</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Onboarding: {onboardingStep}</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">Vehicle health: {profile.vehicleStatus === 'good' ? 'Good to drive' : 'Service soon'}</Text>
      </View>

      <View className="mt-4 rounded-3xl bg-white p-5 shadow-soft dark:bg-zinc-900">
        <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Driving preferences</Text>
        <Text className="mt-2 text-xs text-zinc-500 dark:text-zinc-300">Preferred ride types</Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          {(['standard', 'comfort', 'xl'] as const).map((rideType) => {
            const selected = profile.preferences.rideTypes.includes(rideType);
            return (
              <Pressable
                key={rideType}
                className={`rounded-full px-3 py-1.5 ${selected ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                onPress={() => {
                  const next = selected
                    ? profile.preferences.rideTypes.filter((item) => item !== rideType)
                    : [...profile.preferences.rideTypes, rideType];
                  updatePreferences({ rideTypes: next.length > 0 ? next : ['standard'] });
                }}
              >
                <Text className={`text-xs font-semibold uppercase ${selected ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'}`}>{rideType}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="mt-3 text-xs text-zinc-500 dark:text-zinc-300">Minimum rider rating</Text>
        <View className="mt-1 flex-row items-center gap-2">
          <TextInput
            value={minimumRatingText}
            onChangeText={setMinimumRatingText}
            keyboardType="decimal-pad"
            className="flex-1 rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <Pressable
            className="rounded-xl bg-zinc-900 px-3 py-2 dark:bg-zinc-100"
            onPress={() => {
              const next = Number(minimumRatingText);
              if (Number.isFinite(next)) {
                updatePreferences({ minimumRiderRating: Math.min(5, Math.max(1, next)) });
                setMinimumRatingText(Math.min(5, Math.max(1, next)).toFixed(1));
              }
            }}
          >
            <Text className="text-xs font-semibold text-white dark:text-zinc-900">Save</Text>
          </Pressable>
        </View>
        <Text className="mt-3 text-xs text-zinc-500 dark:text-zinc-300">Direction preference</Text>
        <View className="mt-2 flex-row gap-2">
          {(['any', 'toward_downtown', 'away_from_downtown'] as const).map((direction) => {
            const selected = profile.preferences.directionPreference === direction;
            return (
              <Pressable
                key={direction}
                className={`rounded-xl px-3 py-2 ${selected ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'}`}
                onPress={() => updatePreferences({ directionPreference: direction })}
              >
                <Text className={`text-[11px] font-semibold ${selected ? 'text-white' : 'text-zinc-700 dark:text-zinc-200'}`}>
                  {direction.replaceAll('_', ' ')}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text className="mt-3 text-xs text-zinc-500 dark:text-zinc-300">
          Scheduled windows: {(profile.preferences.availabilityWindows ?? []).map((window) => `${window.day} ${window.start}-${window.end}`).join(' · ')}
        </Text>
      </View>

      <View className="mt-4 rounded-3xl bg-white p-5 shadow-soft dark:bg-zinc-900">
        <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Referrals & incentives</Text>
        <Text className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Your referral code: {referralCode ?? 'Loading…'}</Text>
        <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Successful referrals: {referralSummary.count} · Bonus earned ${(referralSummary.totalBonusCents / 100).toFixed(2)}
        </Text>
        <Text className="mt-2 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-300">Active promos</Text>
        {activePromos.length > 0 ? (
          <Text className="mt-1 text-sm text-zinc-700 dark:text-zinc-200">{activePromos.join(' · ')}</Text>
        ) : (
          <Text className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">No active promotions right now.</Text>
        )}
        {promoError ? <Text className="mt-2 text-sm text-rose-500 dark:text-rose-300">{promoError}</Text> : null}
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
    </ScrollView>
  );
}
