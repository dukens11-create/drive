import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { useAccessibilitySettings } from '../../src/context/AccessibilityContext';
import { useAuth } from '../../src/context/AuthContext';
import { useLocale } from '../../src/context/LocaleContext';
import { useScreenTracking } from '../../src/hooks/useScreenTracking';
import { logEvent } from '../../src/services/observability';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { signUp } = useAuth();
  const { maxFontSizeMultiplier } = useAccessibilitySettings();
  const { t } = useLocale();
  useScreenTracking('sign_up');
  const normalizedEmail = email.trim();
  const hasValidEmail = EMAIL_PATTERN.test(normalizedEmail);
  const canSubmit = hasValidEmail && password.length >= 6 && acceptedPolicies && !isSubmitting;

  const handleSubmit = async () => {
    if (!hasValidEmail) {
      setError('Enter a valid email address to create your driver account.');
      return;
    }
    if (password.length < 6) {
      setError('Use a password with at least 6 characters.');
      return;
    }
    if (!acceptedPolicies) {
      setError('Review and accept the driver safety and verification policies to continue.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    logEvent('sign_up_submit_tapped');
    try {
      await signUp(normalizedEmail, password);
      logEvent('sign_up_navigation_onboarding');
      router.replace('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-zinc-950" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 }}>
      <Text className="text-3xl font-bold text-zinc-100" accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('auth.signUpTitle')}</Text>
      <Text className="mt-2 text-sm text-zinc-400" maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('auth.signUpSubtitle')}</Text>

      <View className="mt-6 rounded-3xl bg-zinc-900 p-4">
        <Text className="text-sm font-semibold text-zinc-100">What you unlock after approval</Text>
        <Text className="mt-2 text-xs leading-5 text-zinc-300">• Home screen safety shortcuts for SOS, trip sharing, and support.</Text>
        <Text className="mt-2 text-xs leading-5 text-zinc-300">• Verification tracking for application, document upload, and KYC review.</Text>
        <Text className="mt-2 text-xs leading-5 text-zinc-300">• A clear record of notifications, earnings, and active trip updates.</Text>
      </View>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.emailPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        className="mt-6 rounded-2xl bg-zinc-900 px-4 py-3 text-zinc-100"
        placeholderTextColor="#71717A"
        accessibilityLabel="Email address"
        textContentType="emailAddress"
        maxFontSizeMultiplier={maxFontSizeMultiplier}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.passwordWithMinPlaceholder')}
        secureTextEntry
        className="mt-3 rounded-2xl bg-zinc-900 px-4 py-3 text-zinc-100"
        placeholderTextColor="#71717A"
        accessibilityLabel="Password"
        accessibilityHint="Use at least 6 characters"
        textContentType="newPassword"
        maxFontSizeMultiplier={maxFontSizeMultiplier}
      />

      <Pressable
        className={`mt-4 flex-row items-start rounded-2xl border px-4 py-3 ${acceptedPolicies ? 'border-emerald-400 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-900'}`}
        onPress={() => setAcceptedPolicies((current) => !current)}
        accessible
        accessibilityRole="switch"
        accessibilityState={{ checked: acceptedPolicies }}
        accessibilityLabel="Accept driver safety and verification policies"
      >
        <Switch
          value={acceptedPolicies}
          onValueChange={setAcceptedPolicies}
          accessibilityRole="switch"
          accessibilityHint="Enables agreement with identity review, document verification, and unsafe conduct policies."
          trackColor={{ false: '#71717A', true: '#22C55E' }}
          thumbColor="#FFFFFF"
        />
        <Text className="ml-3 flex-1 text-xs leading-5 text-zinc-300" maxFontSizeMultiplier={maxFontSizeMultiplier}>
          I understand Drive reviews my identity and documents before online access, and unsafe conduct can pause my account.
        </Text>
      </Pressable>

      {error ? <Text className="mt-3 text-sm text-rose-400">{error}</Text> : null}

      <Pressable
        className={`mt-5 rounded-2xl px-4 py-3 ${canSubmit ? 'bg-emerald-500' : 'bg-zinc-800'}`}
        disabled={!canSubmit}
        onPress={handleSubmit}
        accessibilityRole="button"
        accessibilityLabel="Create account"
      >
        <Text className="text-center font-semibold text-white" maxFontSizeMultiplier={maxFontSizeMultiplier}>{isSubmitting ? t('auth.creatingAccount') : t('auth.createAccount')}</Text>
      </Pressable>

      <Link href="/(auth)/sign-in" asChild>
        <Pressable className="mt-4" accessibilityRole="button" accessibilityLabel="Go to sign in">
          <Text className="text-center text-sm text-zinc-300" maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('auth.haveAccount')}</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
