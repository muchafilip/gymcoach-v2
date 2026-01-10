import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { apiClient } from '../api/client';
import { AuthUser, AuthResponse } from '../types';
import { TOKEN_KEY, USER_KEY } from '../utils/auth';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  initialize: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
}

// Configure Google Sign-In
GoogleSignin.configure({
  iosClientId: '134788685128-hf55vdte7hbd9gkh6ji1mkqm6h14c8v3.apps.googleusercontent.com', // Replace with your iOS client ID
});

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);

      if (token && userJson) {
        const user = JSON.parse(userJson) as AuthUser;

        // Verify token is still valid
        try {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          await apiClient.get('/auth/verify');

          set({ user, token, isAuthenticated: true, isLoading: false });
        } catch {
          // Token expired or invalid, clear stored data
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(USER_KEY);
          delete apiClient.defaults.headers.common['Authorization'];
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false });
    }
  },

  signInWithGoogle: async () => {
    try {
      set({ isLoading: true });

      await GoogleSignin.hasPlayServices();
      const signInResult = await GoogleSignin.signIn();

      if (!signInResult.data?.idToken) {
        throw new Error('No ID token received from Google');
      }

      // Send token to our backend
      const response = await apiClient.post<AuthResponse>('/auth/google', {
        idToken: signInResult.data.idToken,
      });

      const { token, user } = response.data;

      // Store credentials
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

      // Set auth header for future requests
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error: unknown) {
      console.error('Google sign-in error:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  signInWithApple: async () => {
    try {
      set({ isLoading: true });

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      // Build name if provided (only on first sign-in)
      let name: string | undefined;
      if (credential.fullName?.givenName || credential.fullName?.familyName) {
        name = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ');
      }

      // Send token to our backend
      const response = await apiClient.post<AuthResponse>('/auth/apple', {
        idToken: credential.identityToken,
        name,
      });

      const { token, user } = response.data;

      // Store credentials
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

      // Set auth header for future requests
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error: unknown) {
      console.error('Apple sign-in error:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      // Clear stored credentials
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);

      // Remove auth header
      delete apiClient.defaults.headers.common['Authorization'];

      // Sign out from Google if applicable
      try {
        await GoogleSignin.signOut();
      } catch {
        // Ignore if not signed in with Google
      }

      set({ user: null, token: null, isAuthenticated: false });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },
}));

