import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { GoogleSignin, GoogleSigninButton, statusCodes } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

// Redux imports
import { useGoogleSignInMutation } from '../../features/api/authApiSlice';
import {
  authStart,
  authSuccess,
  authFailure,
  clearAuth,
  selectCurrentUser,
  selectAuthLoading,
  selectAuthError,
  selectIsAuthenticated,
} from '../../features/auth/authSlice';

const LoginGoogleRedux = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  // Redux state
  const currentUser = useSelector(selectCurrentUser);
  const isLoading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // RTK Query mutation
  const [googleSignIn, { isLoading: mutationLoading }] = useGoogleSignInMutation();

  // Local state
  const [googleConfigured, setGoogleConfigured] = useState(false);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const configureGoogleSignIn = async () => {
    try {
      GoogleSignin.configure({
        webClientId: '926562855734-rfabjjj7hb7g035eaq1u9jn305uj7lh6.apps.googleusercontent.com', // Web Client ID from google-services.json
        offlineAccess: true,
        hostedDomain: '',
        forceCodeForRefreshToken: true,
      });
      setGoogleConfigured(true);
    } catch (error) {
      console.error('Google Sign-In configuration error:', error);
      Alert.alert('Configuration Error', 'Failed to configure Google Sign-In');
    }
  };

  const handleGoogleSignIn = async () => {
    if (!googleConfigured) {
      Alert.alert('Error', 'Google Sign-In is not configured yet');
      return;
    }

    try {
      dispatch(authStart());

      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Get the user's ID token
      const { idToken, user: googleUser } = await GoogleSignin.signIn();

      // Optional: Sign in with Firebase
      try {
        const googleCredential = auth.GoogleAuthProvider.credential(idToken);
        await auth().signInWithCredential(googleCredential);
      } catch (firebaseError) {
        console.warn('Firebase authentication failed:', firebaseError);
        // Continue with backend authentication even if Firebase fails
      }

      // Authenticate with backend using RTK Query
      const result = await googleSignIn({
        idToken,
        user: {
          id: googleUser.id,
          name: googleUser.name,
          email: googleUser.email,
          photo: googleUser.photo,
        },
      }).unwrap();

      if (result.success) {
        // Dispatch success action to Redux store
        dispatch(authSuccess({
          user: result.user,
          token: result.token,
          method: 'google',
        }));

        Alert.alert('Success', 'Signed in with Google successfully!');

        // Navigate to main app
        // navigation.reset({
        //   index: 0,
        //   routes: [{ name: 'Dashboard' }], // Replace with your main screen
        // });

      } else {
        dispatch(authFailure(result.message || 'Authentication failed'));
        Alert.alert('Error', result.message || 'Authentication failed');
      }

    } catch (error) {
      console.error('Google Sign-In Error:', error);

      let errorMessage = 'An unexpected error occurred';

      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Sign in was cancelled';
      } else if (error?.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Sign in is already in progress';
      } else if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services is not available or outdated';
      } else if (error?.message) {
        errorMessage = error?.message;
      }

      dispatch(authFailure(errorMessage));
      Alert.alert('Error', errorMessage);
    }
  };

  const handleSignOut = async () => {
    try {
      dispatch(authStart());

      // Sign out from Google
      await GoogleSignin.signOut();

      // Sign out from Firebase
      await auth().signOut();

      // Clear Redux state and AsyncStorage
      dispatch(clearAuth());

      Alert.alert('Success', 'Signed out successfully');

    } catch (error) {
      console.error('Sign out error:', error);
      Alert.alert('Error', 'Sign out failed');
      dispatch(authFailure('Sign out failed'));
    }
  };

  const renderSignedInView = () => (
    <View style={styles.signedInContainer}>
      <Text style={styles.welcomeText}>Welcome, {currentUser?.name}!</Text>
      <Text style={styles.emailText}>Email: {currentUser?.email}</Text>
      <Text style={styles.providerText}>
        Signed in with: {currentUser?.authProvider}
      </Text>
      {currentUser?.emailVerified && (
        <Text style={styles.verifiedText}>✓ Email Verified</Text>
      )}

      <View style={styles.userInfoContainer}>
        <Text style={styles.infoLabel}>User ID:</Text>
        <Text style={styles.infoValue}>{currentUser?.id}</Text>

        <Text style={styles.infoLabel}>Role:</Text>
        <Text style={styles.infoValue}>{currentUser?.role || 'user'}</Text>

        <Text style={styles.infoLabel}>Last Login:</Text>
        <Text style={styles.infoValue}>
          {currentUser?.lastLogin ? new Date(currentUser.lastLogin).toLocaleString() : 'N/A'}
        </Text>
      </View>

      <GoogleSigninButton
        style={styles.signOutButton}
        size={GoogleSigninButton.Size.Wide}
        color={GoogleSigninButton.Color.Light}
        onPress={handleSignOut}
        disabled={isLoading || mutationLoading}
      />
    </View>
  );

  const renderSignInView = () => (
    <View style={styles.signInContainer}>
      <Text style={styles.title}>Google Sign In</Text>
      <Text style={styles.subtitle}>Sign in to access Master AI features</Text>

      <GoogleSigninButton
        style={styles.googleButton}
        size={GoogleSigninButton.Size.Wide}
        color={GoogleSigninButton.Color.Dark}
        onPress={handleGoogleSignIn}
        disabled={isLoading || mutationLoading || !googleConfigured}
      />

      {!googleConfigured && (
        <Text style={styles.configText}>Configuring Google Sign-In...</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {(isLoading || mutationLoading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>
            {isLoading ? 'Authenticating...' : 'Please wait...'}
          </Text>
        </View>
      )}

      {authError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {authError}</Text>
        </View>
      )}

      {isAuthenticated && currentUser ? renderSignedInView() : renderSignInView()}
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
  loadingOverlay: {
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
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  signInContainer: {
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  googleButton: {
    width: 192,
    height: 48,
    marginBottom: 20,
  },
  signOutButton: {
    width: 192,
    height: 48,
    marginTop: 20,
  },
  configText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  signedInContainer: {
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  emailText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
    textAlign: 'center',
  },
  providerText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#999',
    textAlign: 'center',
  },
  verifiedText: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: '600',
    marginBottom: 15,
  },
  userInfoContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 15,
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
});

export default LoginGoogleRedux;