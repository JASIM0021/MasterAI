import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import useAuth from '../../hooks/useAuth';
import tokenManager from '../../utils/tokenManager';

const AuthStatus = ({ message = "Please sign in to continue" }) => {
  const navigation = useNavigation();
  const { isAuthenticated, isInitializing, signOut } = useAuth();

  const handleSignIn = () => {
    // Navigate to auth screen
    navigation.navigate('AuthScreen');
  };

  const handleDebugClear = async () => {
    if (__DEV__) {
      await signOut();
      console.log('Auth data cleared using new auth system.');
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.container}>
        <Icon name="loading" size={48} color="#6200ee" />
        <Text style={styles.title}>Loading...</Text>
        <Text style={styles.subtitle}>Checking authentication</Text>
      </View>
    );
  }

  if (isAuthenticated) {
    return null; // Don't show anything if authenticated
  }

  return (
    <View style={styles.container}>
      <Icon name="account-alert" size={48} color="#f39c12" />
      <Text style={styles.title}>Authentication Required</Text>
      <Text style={styles.subtitle}>{message}</Text>

      <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
        <Icon name="login" size={20} color="#ffffff" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Sign In</Text>
      </TouchableOpacity>

      {__DEV__ && (
        <TouchableOpacity style={styles.debugButton} onPress={handleDebugClear}>
          <Text style={styles.debugText}>Clear Auth Data (Debug)</Text>
        </TouchableOpacity>
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
    backgroundColor: '#f5f7fa',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6200ee',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugButton: {
    padding: 8,
    backgroundColor: '#e74c3c',
    borderRadius: 4,
  },
  debugText: {
    color: '#ffffff',
    fontSize: 12,
  },
});

export default AuthStatus;