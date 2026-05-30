import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { useAuth } from '../../src/context/AuthContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { signUp } = useAuth();
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
    try {
      await signUp(normalizedEmail, password);
      router.replace('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-zinc-950" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 40 }}>
      <Text className="text-3xl font-bold text-zinc-100">Create driver account</Text>
      <Text className="mt-2 text-sm text-zinc-400">Sign up as a driver and complete onboarding before going online.</Text>

      <View className="mt-6 rounded-3xl bg-zinc-900 p-4">
        <Text className="text-sm font-semibold text-zinc-100">What you unlock after approval</Text>
        <Text className="mt-2 text-xs leading-5 text-zinc-300">• Home screen safety shortcuts for SOS, trip sharing, and support.</Text>
        <Text className="mt-2 text-xs leading-5 text-zinc-300">• Verification tracking for application, document upload, and KYC review.</Text>
        <Text className="mt-2 text-xs leading-5 text-zinc-300">• A clear record of notifications, earnings, and active trip updates.</Text>
      </View>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        className="mt-6 rounded-2xl bg-zinc-900 px-4 py-3 text-zinc-100"
        placeholderTextColor="#71717A"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password (min 6 chars)"
        secureTextEntry
        className="mt-3 rounded-2xl bg-zinc-900 px-4 py-3 text-zinc-100"
        placeholderTextColor="#71717A"
      />

      <Pressable
        className={`mt-4 flex-row rounded-2xl border px-4 py-3 ${acceptedPolicies ? 'border-emerald-400 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-900'}`}
        onPress={() => setAcceptedPolicies((current) => !current)}
      >
        <View className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${acceptedPolicies ? 'border-emerald-400 bg-emerald-500' : 'border-zinc-500'}`}>
          {acceptedPolicies ? <Text className="text-xs font-bold text-white">✓</Text> : null}
        </View>
        <Text className="ml-3 flex-1 text-xs leading-5 text-zinc-300">
          I understand Drive reviews my identity and documents before online access, and unsafe conduct can pause my account.
        </Text>
      </Pressable>

      {error ? <Text className="mt-3 text-sm text-rose-400">{error}</Text> : null}

      <Pressable
        className={`mt-5 rounded-2xl px-4 py-3 ${canSubmit ? 'bg-emerald-500' : 'bg-zinc-800'}`}
        disabled={!canSubmit}
        onPress={handleSubmit}
      >
        <Text className="text-center font-semibold text-white">{isSubmitting ? 'Creating account...' : 'Create account'}</Text>
      </Pressable>

      <Link href="/(auth)/sign-in" asChild>
        <Pressable className="mt-4">
          <Text className="text-center text-sm text-zinc-300">Already have an account? Sign in</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}
