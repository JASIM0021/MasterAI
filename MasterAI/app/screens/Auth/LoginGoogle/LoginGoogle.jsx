import React, { useState, useEffect } from 'react';
import { View, Button, Text, Alert, StyleSheet } from 'react-native';
import { GoogleSignin, GoogleSigninButton, statusCodes } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { AUTH_CONFIG } from '../../../config/authConfig';

const LoginGoogle = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: AUTH_CONFIG.google.webClientId, // Using webClientId from authConfig
      offlineAccess: AUTH_CONFIG.google.offlineAccess,
      hostedDomain: AUTH_CONFIG.google.hostedDomain,
      forceCodeForRefreshToken: AUTH_CONFIG.google.forceCodeForRefreshToken,
    });

    // Check if user is already signed in
    isSignedIn();
  }, []);

  const isSignedIn = async () => {
    const isSignedIn = await GoogleSignin.isSignedIn();
    if (isSignedIn) {
      getCurrentUserInfo();
    }
  };

  const getCurrentUserInfo = async () => {
    try {
      const userInfo = await GoogleSignin.signInSilently();
      setUser(userInfo);
    } catch (error) {
      console.log('Silent sign in failed:', error);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);

      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Get the users ID token
      const { idToken, user: googleUser } = await GoogleSignin.signIn();

      // Create a Google credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);

      // Sign-in the user with the credential
      const firebaseUser = await auth().signInWithCredential(googleCredential);

      // Send token to backend for verification and user creation/login
      await authenticateWithBackend(idToken, googleUser);

      setUser(googleUser);
      Alert.alert('Success', 'Signed in with Google successfully!');

      // Navigate to main app or dashboard
      // navigation.navigate('Dashboard'); // Uncomment and adjust route name as needed

    } catch (error) {
      setLoading(false);
      console.log('Google sign in error:', error);

      if (error?.code === statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Cancelled', 'Google sign in was cancelled');
      } else if (error?.code === statusCodes.IN_PROGRESS) {
        Alert.alert('In Progress', 'Google sign in is already in progress');
      } else if (error?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Play services not available or outdated');
      } else {
        Alert.alert('Error', `Google sign in failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const authenticateWithBackend = async (idToken, googleUser) => {
    try {
      const response = await axios.post('http://YOUR_BACKEND_URL/api/auth/google', {
        idToken,
        user: {
          id: googleUser.id,
          name: googleUser.name,
          email: googleUser.email,
          photo: googleUser.photo,
        }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'YOUR_API_KEY_HERE', // Replace with your actual API key
        }
      });

      if (response.data.success) {
        // Store user data and auth token
        await AsyncStorage.setItem('userToken', response.data.token);
        await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
        console.log('Backend authentication successful:', response.data);
      }
    } catch (error) {
      console.log('Backend authentication failed:', error);
      Alert.alert('Warning', 'Google sign in successful but backend authentication failed');
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);

      // Sign out from Google
      await GoogleSignin.signOut();

      // Sign out from Firebase
      await auth().signOut();

      // Clear stored data
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');

      setUser(null);
      Alert.alert('Success', 'Signed out successfully');

    } catch (error) {
      console.log('Sign out error:', error);
      Alert.alert('Error', 'Sign out failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google Sign In</Text>

      {!user ? (
        <View style={styles.signInContainer}>
          <GoogleSigninButton
            style={styles.googleButton}
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Dark}
            onPress={signInWithGoogle}
            disabled={loading}
          />

          <Button
            title={loading ? "Signing in..." : "Sign in with Google (Custom)"}
            onPress={signInWithGoogle}
            disabled={loading}
          />
        </View>
      ) : (
        <View style={styles.userContainer}>
          <Text style={styles.welcomeText}>Welcome, {user.name}!</Text>
          <Text style={styles.emailText}>Email: {user.email}</Text>
          <Text style={styles.idText}>ID: {user.id}</Text>

          <Button
            title={loading ? "Signing out..." : "Sign Out"}
            onPress={signOut}
            disabled={loading}
            color="#ff6b6b"
          />
        </View>
      )}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  signInContainer: {
    width: '100%',
    alignItems: 'center',
  },
  googleButton: {
    width: 192,
    height: 48,
    marginBottom: 20,
  },
  userContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  emailText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  idText: {
    fontSize: 14,
    marginBottom: 20,
    color: '#999',
  },
});

export default LoginGoogle;