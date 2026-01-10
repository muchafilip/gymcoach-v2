import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';

export default function LoginScreen() {
  const { signInWithGoogle, isLoading } = useAuthStore();
  const { colors } = useThemeStore();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Sign-In Error', `Failed to sign in with Google: ${message}`);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Signing in...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>GymCoach</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your personal workout companion</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.googleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleGoogleSignIn}
        >
          <Image
            source={require('../../assets/google-logo.png')}
            style={styles.googleLogo}
          />
          <Text style={[styles.googleButtonText, { color: colors.text }]}>Continue with Google</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  googleButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  googleLogo: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  disclaimer: {
    position: 'absolute',
    bottom: 40,
    textAlign: 'center',
    fontSize: 12,
    paddingHorizontal: 24,
  },
});
