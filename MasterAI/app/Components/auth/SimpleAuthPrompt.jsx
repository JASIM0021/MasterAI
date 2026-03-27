import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Button,
  Text,
  Card,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch } from 'react-redux';
import { authSuccess } from '../../features/auth/authSlice';
import AUTH_CONFIG from '../../config/authConfig';

const { width, height } = Dimensions.get('window');

const SimpleAuthPrompt = ({ customMessage = null, onAuthSuccess = null }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const configureGoogleSignIn = async () => {
    try {
      console.log('Configuring Google Sign-In...');

      GoogleSignin.configure(AUTH_CONFIG.google);

      console.log('Google Sign-In configured successfully');
      setGoogleConfigured(true);
    } catch (error) {
      console.error('Failed to configure Google Sign-In:', error);
      Alert.alert('Configuration Error', 'Failed to configure Google Sign-In. Please check your setup.');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!googleConfigured) {
      Alert.alert('Error', 'Google Sign-In is not configured yet');
      return;
    }

    try {
      setLoading(true);

      // Check if user is already signed in and sign out for fresh session
      try {
        const isSignedIn = await GoogleSignin.isSignedIn();
        console.log('User already signed in:', isSignedIn);

        if (isSignedIn) {
          // Sign out first to force a fresh sign-in
          await GoogleSignin.signOut();
          console.log('Signed out previous session');
        }
      } catch (checkError) {
        console.log('Could not check sign-in status:', checkError.message);
        // Continue anyway - this is not critical
      }

      // Check Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log('Google Play Services available');

      // Perform Google Sign-In
      console.log('Starting Google Sign-In...');
      const signInResult = await GoogleSignin.signIn();
      console.log('Google Sign-In Result:', signInResult);

      // Extract idToken and user from result
      const { idToken, user } = signInResult.data || {};
      console.log('idToken:', idToken ? 'Present' : 'MISSING');
      console.log('user:', user ? JSON.stringify(user, null, 2) : 'MISSING');

      if (!idToken) {
        throw new Error('Google Sign-In failed: No ID token received');
      }

      if (!user) {
        throw new Error('Google Sign-In failed: No user data received');
      }
      // Optional Firebase authentication
      try {
        const googleCredential = auth.GoogleAuthProvider.credential(idToken);
        await auth().signInWithCredential(googleCredential);



      } catch (firebaseError) {
        console.warn('Firebase auth failed:', firebaseError?.message || firebaseError);
        // Continue without Firebase - this is optional auth
      }

      // Authenticate with backend
      const response = await axios.post(
        `${AUTH_CONFIG.api.authBaseUrl}google`,
        {
          idToken,
          user: {
            id: user?.id,
            name: user?.name,
            email: user?.email,
            photo: user?.photo,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('response', response)

      if (response.data.success) {
        // Store authentication data
        await AsyncStorage.setItem('userToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
        await AsyncStorage.setItem('lastSignInMethod', 'google');

        // Update Redux state
        dispatch(authSuccess({
          user: response?.data?.user,
          token: response?.data?.token,
          method: 'google',
        }));

        // Call success callback
        if (onAuthSuccess) {
          onAuthSuccess(response?.data?.user);
        }

        Alert.alert('Success', 'Signed in successfully!');
      } else {
        Alert.alert('Error', response?.data?.message || 'Authentication failed');
      }

    } catch (error) {
      console.log('error', error)
      console.error('Google Sign-In Error Details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        fullError: error
      });

      let errorMessage = 'Sign in failed. Please try again.';

      if (error?.code === 'SIGN_IN_CANCELLED' || error?.code === 12501) {
        errorMessage = 'Sign in was cancelled by user';
      } else if (error?.code === 'IN_PROGRESS' || error?.code === 12502) {
        errorMessage = 'Sign in is already in progress';
      } else if (error?.code === 'PLAY_SERVICES_NOT_AVAILABLE' || error?.code === 2) {
        errorMessage = 'Google Play Services is not available';
      } else if (error?.code === 'SIGN_IN_REQUIRED' || error?.code === 4) {
        errorMessage = 'Google Sign-In is required but not configured properly';
      } else if (error?.code === 'INVALID_ACCOUNT' || error?.code === 5) {
        errorMessage = 'Invalid Google account selected';
      } else if (error?.code === 'NETWORK_ERROR' || error?.code === 7) {
        errorMessage = 'Network error. Please check your internet connection';
      } else if (error?.code === 'INTERNAL_ERROR' || error?.code === 8) {
        errorMessage = 'Internal error. Please try again later';
      } else if (error?.message?.includes('DEVELOPER_ERROR')) {
        errorMessage = 'Configuration error. Please check Google Sign-In setup';
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }

      Alert.alert('Google Sign-In Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.authPromptGradient}
      >
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>Signing in...</Text>
          </View>
        )}

        <MaterialCommunityIcons
          name="account-lock"
          size={80}
          color="white"
          style={styles.authIcon}
        />

        <Text style={styles.authTitle}>Sign In Required</Text>

        <Text style={styles.authMessage}>
          {customMessage ||
            "Please sign in to access AI generation features and save your creations."
          }
        </Text>

        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#4caf50" />
            <Text style={styles.featureText}>Unlimited AI generations</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#4caf50" />
            <Text style={styles.featureText}>Save and organize your content</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#4caf50" />
            <Text style={styles.featureText}>Sync across all devices</Text>
          </View>
          <View style={styles.featureItem}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#4caf50" />
            <Text style={styles.featureText}>Priority support</Text>
          </View>
        </View>

        {googleConfigured ? (
          <GoogleSigninButton
            style={styles.googleButton}
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Light}
            onPress={handleGoogleSignIn}
            disabled={loading}
          />
        ) : (
          <Button
            mode="contained"
            onPress={handleGoogleSignIn}
            style={styles.signInButton}
            contentStyle={styles.signInButtonContent}
            labelStyle={styles.signInButtonText}
            icon="login"
            disabled={loading}
          >
            Sign In with Google
          </Button>
        )}

        <Text style={styles.signUpPrompt}>
          Don't have an account? Sign in to create one instantly!
        </Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  authPromptGradient: {
    width: width * 0.9,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.34,
    shadowRadius: 6.27,
    position: 'relative',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    zIndex: 10,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  authIcon: {
    marginBottom: 20,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
    textAlign: 'center',
  },
  authMessage: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
    opacity: 0.9,
  },
  featuresList: {
    width: '100%',
    marginBottom: 25,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureText: {
    color: 'white',
    marginLeft: 10,
    fontSize: 14,
  },
  googleButton: {
    width: 192,
    height: 48,
    marginBottom: 20,
  },
  signInButton: {
    backgroundColor: 'white',
    marginBottom: 20,
    borderRadius: 25,
    elevation: 3,
  },
  signInButtonContent: {
    height: 50,
    paddingHorizontal: 20,
  },
  signInButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signUpPrompt: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default SimpleAuthPrompt;