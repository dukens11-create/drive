import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useAuth } from '../../src/context/AuthContext';
import { useLocale } from '../../src/context/LocaleContext';
import { useScreenTracking } from '../../src/hooks/useScreenTracking';
import { logEvent } from '../../src/services/observability';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { signIn } = useAuth();
  useScreenTracking('sign_in');
  const { t } = useLocale();
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
      await signIn(email.trim(), password);
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
    <Text className="text-3xl font-bold text-zinc-100">{t('auth.signInTitle')}</Text>
    <Text className="mt-2 text-sm text-zinc-400">{t('auth.signInSubtitle')}</Text>

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
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.passwordPlaceholder')}
        secureTextEntry
        className="mt-3 rounded-2xl bg-zinc-900 px-4 py-3 text-zinc-100"
        placeholderTextColor="#71717A"
      />

      {error ? <Text className="mt-3 text-sm text-rose-400">{error}</Text> : null}

      <Pressable
        className={`mt-5 rounded-2xl px-4 py-3 ${canSubmit ? 'bg-emerald-500' : 'bg-zinc-800'}`}
        disabled={!canSubmit}
        onPress={handleSubmit}
      >
        <Text className="text-center font-semibold text-white">{isSubmitting ? t('auth.signingIn') : t('auth.signInButton')}</Text>
      </Pressable>

      <Link href="/(auth)/sign-up" asChild>
        <Pressable className="mt-4">
          <Text className="text-center text-sm text-zinc-300">{t('auth.needAccount')}</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
