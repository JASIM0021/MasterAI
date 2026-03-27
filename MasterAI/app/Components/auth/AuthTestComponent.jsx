import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, Card, Text, useTheme } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectIsAuthenticated,
  selectCurrentUser,
  selectAuthLoading,
  clearAuth,
} from '../../features/auth/authSlice';
import useAuthRequired from '../../hooks/useAuthRequired';
import AuthScreen from '../../screens/Auth/AuthScreen';

/**
 * AuthTestComponent
 * A test component to verify authentication functionality
 * You can use this to test the auth system before integrating it fully
 */
const AuthTestComponent = () => {
  const theme = useTheme();
  const dispatch = useDispatch();

  // Redux selectors
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const authLoading = useSelector(selectAuthLoading);

  // Auth hook
  const {
    requireAuthentication,
    canUseFeature,
    getUserInfo,
    hasValidSession,
  } = useAuthRequired();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: theme.colors.background,
    },
    card: {
      marginBottom: 16,
      padding: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
      color: theme.colors.primary,
    },
    infoText: {
      fontSize: 14,
      marginBottom: 8,
      color: theme.colors.onSurface,
    },
    button: {
      marginBottom: 8,
    },
    statusText: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 16,
      textAlign: 'center',
    },
  });

  const testGenerationFeature = () => {
    const canProceed = requireAuthentication(
      () => {
        Alert.alert('Success', 'You can use this generation feature!');
      },
      "Please sign in to test this generation feature."
    );

    if (!canProceed) {
      console.log('Authentication required for generation feature');
    }
  };

  const testQuotaCheck = () => {
    const userInfo = getUserInfo();
    if (userInfo) {
      const hasUnlimited = canUseFeature('unlimited_generations');
      Alert.alert(
        'Quota Info',
        `Plan: ${userInfo.subscription?.plan || 'Free'}\n` +
        `Unlimited access: ${hasUnlimited ? 'Yes' : 'No'}\n` +
        `Current usage: ${userInfo.apiUsage?.currentMonthUsage || 0}`
      );
    } else {
      Alert.alert('Error', 'User not authenticated');
    }
  };

  const handleLogout = () => {
    dispatch(clearAuth());
    Alert.alert('Success', 'Logged out successfully');
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.statusText}>🔒 Not Authenticated</Text>
        <Text style={[styles.infoText, { textAlign: 'center', marginBottom: 20 }]}>
          Sign in to test the authentication features
        </Text>
        <AuthScreen />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.statusText, { color: theme.colors.primary }]}>
        ✅ Authenticated Successfully!
      </Text>

      <Card style={styles.card}>
        <Text style={styles.title}>User Information</Text>
        <Text style={styles.infoText}>Name: {currentUser?.name}</Text>
        <Text style={styles.infoText}>Email: {currentUser?.email}</Text>
        <Text style={styles.infoText}>
          Plan: {currentUser?.subscription?.plan || 'Free'}
        </Text>
        <Text style={styles.infoText}>
          Provider: {currentUser?.authProvider}
        </Text>
        <Text style={styles.infoText}>
          Verified: {currentUser?.emailVerified ? 'Yes' : 'No'}
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.title}>Authentication Tests</Text>

        <Button
          mode="contained"
          onPress={testGenerationFeature}
          style={styles.button}
          icon="test-tube"
        >
          Test Generation Feature Access
        </Button>

        <Button
          mode="outlined"
          onPress={testQuotaCheck}
          style={styles.button}
          icon="chart-line"
        >
          Check Quota Information
        </Button>

        <Button
          mode="text"
          onPress={() => Alert.alert('Session Status', `Valid session: ${hasValidSession}`)}
          style={styles.button}
          icon="shield-check"
        >
          Check Session Status
        </Button>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.title}>Feature Access Tests</Text>

        <Text style={styles.infoText}>
          Unlimited Generations: {canUseFeature('unlimited_generations') ? '✅' : '❌'}
        </Text>
        <Text style={styles.infoText}>
          Advanced Editing: {canUseFeature('advanced_editing') ? '✅' : '❌'}
        </Text>
        <Text style={styles.infoText}>
          Batch Processing: {canUseFeature('batch_processing') ? '✅' : '❌'}
        </Text>
      </Card>

      <Button
        mode="contained"
        onPress={handleLogout}
        style={[styles.button, { backgroundColor: theme.colors.error }]}
        icon="logout"
      >
        Logout
      </Button>
    </View>
  );
};

export default AuthTestComponent;