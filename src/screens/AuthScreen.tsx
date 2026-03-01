// === HeatWave PvP — Auth Screen ===
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS } from '../constants';
import { StarField } from '../components/shared/StarField';
import { AuthService } from '../services/AuthService';

interface AuthScreenProps {
  onAuth: () => void;
}

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password required');
      return;
    }

    setLoading(true);
    setError(null);

    const result = isSignUp
      ? await AuthService.signUp(email.trim(), password)
      : await AuthService.signIn(email.trim(), password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      onAuth();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StarField starCount={50} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.titleSection}>
          <Text style={styles.title}>HEATWAVE</Text>
          <Text style={styles.subtitle}>PvP</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN'}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={COLORS.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            onPress={handleSubmit}
            style={[styles.button, loading && styles.buttonDisabled]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'SIGN UP' : 'SIGN IN'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => { setIsSignUp(!isSignUp); setError(null); }}>
            <Text style={styles.toggle}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: COLORS.accent,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accentGlow,
    letterSpacing: 6,
    marginTop: -4,
  },
  card: {
    backgroundColor: COLORS.surface + 'ee',
    borderRadius: 16,
    padding: 24,
    gap: 12,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 4,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },
  error: {
    color: COLORS.bust,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  toggle: {
    color: COLORS.textDim,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
