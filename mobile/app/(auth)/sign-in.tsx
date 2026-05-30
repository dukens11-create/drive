import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { useAccessibilitySettings } from '../../src/context/AccessibilityContext';
import { useAuth } from '../../src/context/AuthContext';
import { useLocale } from '../../src/context/LocaleContext';
import { useScreenTracking } from '../../src/hooks/useScreenTracking';
import { logEvent } from '../../src/services/observability';
import { setRememberMe } from '../../src/store/authPreferencesSlice';
import { useAppDispatch, useAppSelector } from '../../src/store';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { signIn } = useAuth();
  const dispatch = useAppDispatch();
  const rememberMe = useAppSelector((state) => state.authPreferences.rememberMe);
  const { maxFontSizeMultiplier } = useAccessibilitySettings();
  const { t } = useLocale();
  useScreenTracking('sign_in');
  const canSubmit = email.trim().length > 0 && password.length > 0 && !isSubmitting;

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      setError('Enter the email and password for your driver account.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    logEvent('sign_in_submit_tapped');
    try {
      await signIn(email.trim(), password, rememberMe);
      logEvent('sign_in_navigation_home');
      router.replace('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-zinc-950" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 }}>
      <Text className="text-3xl font-bold text-zinc-100" accessibilityRole="header" maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('auth.signInTitle')}</Text>
      <Text className="mt-2 text-sm text-zinc-400" maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('auth.signInSubtitle')}</Text>

      <View className="mt-6 rounded-3xl bg-zinc-900 p-4">
        <Text className="text-sm font-semibold text-zinc-100">Returning drivers can:</Text>
        <Text className="mt-2 text-xs leading-5 text-zinc-300">• Resume document review and KYC without restarting onboarding.</Text>
        <Text className="mt-2 text-xs leading-5 text-zinc-300">• Access emergency, trip share, and support shortcuts from Home after approval.</Text>
        <Text className="mt-2 text-xs leading-5 text-zinc-300">• Keep trip history, notifications, and earnings synced on this device.</Text>
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
        placeholder={t('auth.passwordPlaceholder')}
        secureTextEntry
        className="mt-3 rounded-2xl bg-zinc-900 px-4 py-3 text-zinc-100"
        placeholderTextColor="#71717A"
        accessibilityLabel="Password"
        textContentType="password"
        maxFontSizeMultiplier={maxFontSizeMultiplier}
      />
      <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-zinc-900 px-4 py-3">
        <Text className="text-sm text-zinc-200" maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('auth.rememberMe')}</Text>
        <Switch
          value={rememberMe}
          onValueChange={(value) => {
            dispatch(setRememberMe(value));
          }}
          accessibilityRole="switch"
          accessibilityLabel={t('auth.rememberMe')}
          trackColor={{ false: '#71717A', true: '#22C55E' }}
          thumbColor="#FFFFFF"
        />
      </View>

      {error ? <Text className="mt-3 text-sm text-rose-400">{error}</Text> : null}

      <Pressable
        className={`mt-5 rounded-2xl px-4 py-3 ${canSubmit ? 'bg-emerald-500' : 'bg-zinc-800'}`}
        disabled={!canSubmit}
        onPress={handleSubmit}
        accessibilityRole="button"
        accessibilityLabel="Sign in"
      >
        <Text className="text-center font-semibold text-white" maxFontSizeMultiplier={maxFontSizeMultiplier}>{isSubmitting ? t('auth.signingIn') : t('auth.signInButton')}</Text>
      </Pressable>

      <Link href="/(auth)/sign-up" asChild>
        <Pressable className="mt-4" accessibilityRole="button" accessibilityLabel="Create a new account">
          <Text className="text-center text-sm text-zinc-300" maxFontSizeMultiplier={maxFontSizeMultiplier}>{t('auth.needAccount')}</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
