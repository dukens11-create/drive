import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useAuth } from '../../src/context/AuthContext';

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { signUp } = useAuth();

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await signUp(email.trim(), password);
      router.replace('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-zinc-950 px-6">
      <Text className="text-3xl font-bold text-zinc-100">Create driver account</Text>
      <Text className="mt-2 text-sm text-zinc-400">Sign up as a driver and complete onboarding before going online.</Text>

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

      {error ? <Text className="mt-3 text-sm text-rose-400">{error}</Text> : null}

      <Pressable className="mt-5 rounded-2xl bg-emerald-500 px-4 py-3" disabled={isSubmitting} onPress={handleSubmit}>
        <Text className="text-center font-semibold text-white">{isSubmitting ? 'Creating account...' : 'Create account'}</Text>
      </Pressable>

      <Link href="/(auth)/sign-in" asChild>
        <Pressable className="mt-4">
          <Text className="text-center text-sm text-zinc-300">Already have an account? Sign in</Text>
        </Pressable>
      </Link>
    </View>
  );
}
