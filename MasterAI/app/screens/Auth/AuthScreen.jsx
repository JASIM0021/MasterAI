import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import LoginFB from './LoginFB/LoginFB';
import AUTH_CONFIG from '../../config/authConfig';
import useAuth from '../../hooks/useAuth';
import tokenManager from '../../utils/tokenManager';

// Import RTK Query auth mutation and Redux actions
import { useGoogleSignInMutation } from '../../features/api/authApiSlice';
import { authSuccess } from '../../features/auth/authSlice';

// Import your existing theme
// import { colors, fonts } from '../../themes';

const AuthScreen = () => {
  const [authMode, setAuthMode] = useState('main'); // 'main', 'google', 'facebook'
  const navigation = useNavigation();
  const dispatch = useDispatch();

  // Use our custom auth hook
  const { isAuthenticated, isInitializing, signOut } = useAuth();

  // RTK Query mutation hook
  const [googleSignIn, { isLoading: loading }] = useGoogleSignInMutation();

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure(AUTH_CONFIG.google);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isInitializing) {
      // User is already authenticated, navigate to main app
      // navigation.replace('Dashboard'); // Uncomment and replace with your main screen
      console.log('User is already authenticated');
    }
  }, [isAuthenticated, isInitializing]);

  const signInWithGoogle = async () => {
    try {
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Get user info and ID token
      const { idToken, user } = await GoogleSignin.signIn();
      console.log('idToken, user', idToken, user)

      // Sign in with Firebase (optional - if you want Firebase integration)
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      console.log('googleCredential', googleCredential)
      await auth().signInWithCredential(googleCredential);

      // Authenticate with your backend using RTK Query
      const response = await googleSignIn({
        idToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          photo: user.photo,
        },
      }).unwrap();

      if (response.success) {
        // Update Redux state with authentication data
        dispatch(authSuccess({
          user: response?.user,
          token: response?.token,
          method: 'google'
        }));

        Alert.alert('Success', 'Signed in successfully!');

        // Navigate to main app screen
        // navigation.navigate('Dashboard'); // Replace with your main screen

      } else {
        Alert.alert('Error', 'Authentication failed');
      }

    } catch (error) {
      console.log('Google Sign-In Error:', error);
      Alert.alert('Error', `Sign in failed: ${error.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      // Sign out from Google
      await GoogleSignin.signOut();

      // Sign out from Firebase
      await auth().signOut();

      // Use our custom signOut method which handles tokenManager
      await signOut();

      Alert.alert('Success', 'Signed out successfully');

    } catch (error) {
      console.log('Sign out error:', error);
      Alert.alert('Error', 'Sign out failed');
    }
  };

  const checkAuthStatus = async () => {
    try {
      // Use tokenManager for debugging
      const debugInfo = await tokenManager.debugInfo();
      const isAuth = tokenManager.isAuthenticated();

      Alert.alert(
        'Auth Status',
        isAuth ? 'User is signed in' : 'User is not signed in',
        [
          {
            text: 'Details',
            onPress: () => console.log('Auth Debug Info:', debugInfo)
          },
          { text: 'OK' }
        ]
      );

    } catch (error) {
      console.log('Auth check error:', error);
    }
  };

  if (authMode === 'facebook') {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setAuthMode('main')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <LoginFB />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Master AI Authentication</Text>
      <Text style={styles.subtitle}>Choose your preferred sign-in method</Text>

      {(loading || isInitializing) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>
            {isInitializing ? 'Checking auth status...' : 'Signing in...'}
          </Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        {/* Google Sign-In Button */}
        <GoogleSigninButton
          style={styles.googleButton}
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Dark}
          onPress={signInWithGoogle}
          disabled={loading}
        />

        {/* Custom Google Button */}
        <TouchableOpacity
          style={[styles.customButton, styles.googleButtonCustom]}
          onPress={signInWithGoogle}
          disabled={loading}
        >
          <Text style={styles.customButtonText}>Sign in with Google</Text>
        </TouchableOpacity>

        {/* Facebook Sign-In Button */}
        <TouchableOpacity
          style={[styles.customButton, styles.facebookButton]}
          onPress={() => setAuthMode('facebook')}
          disabled={loading}
        >
          <Text style={styles.customButtonText}>Sign in with Facebook</Text>
        </TouchableOpacity>

        {/* Utility Buttons for Testing */}
        <View style={styles.utilityButtons}>
          <TouchableOpacity
            style={[styles.customButton, styles.utilityButton]}
            onPress={checkAuthStatus}
          >
            <Text style={styles.utilityButtonText}>Check Auth Status</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.customButton, styles.utilityButton]}
            onPress={handleSignOut}
          >
            <Text style={styles.utilityButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.footer}>
        By signing in, you agree to our Terms of Service and Privacy Policy
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4285F4',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  googleButton: {
    width: '100%',
    height: 48,
    marginBottom: 20,
  },
  customButton: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  googleButtonCustom: {
    backgroundColor: '#4285F4',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  customButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  utilityButtons: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  utilityButton: {
    backgroundColor: '#6c757d',
    height: 40,
    marginBottom: 10,
  },
  utilityButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4285F4',
    fontWeight: '600',
  },
  footer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
    lineHeight: 18,
  },
});

export default AuthScreen;