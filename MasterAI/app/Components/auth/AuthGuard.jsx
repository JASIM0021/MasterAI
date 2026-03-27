import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  ImageBackground,
} from 'react-native';
import {
  Button,
  Text,
  Card,
  Portal,
  Modal,
  useTheme,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import auth components and state
import SimpleAuthPrompt from './SimpleAuthPrompt';
import {
  selectIsAuthenticated,
  selectCurrentUser,
  selectAuthLoading,
  restoreAuthState,
} from '../../features/auth/authSlice';

const { width, height } = Dimensions.get('window');

const AuthGuard = ({
  children,
  fallbackComponent = null,
  requireAuth = true,
  showModal = true,
  customMessage = null
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const authLoading = useSelector(selectAuthLoading);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsCheckingAuth(true);

      // Try to restore auth state from storage
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');

      if (token && userData && !isAuthenticated) {
        // Restore auth state if we have stored data but not in Redux
        dispatch(restoreAuthState());
      }

      setIsCheckingAuth(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsCheckingAuth(false);
    }
  };

  const handleAuthRequired = () => {
    if (showModal) {
      setShowAuthModal(true);
    }
  };

  const AuthPrompt = () => (
    <SimpleAuthPrompt
      customMessage={customMessage}
      onAuthSuccess={() => {
        // Auth success is handled by Redux, component will re-render
        console.log('Authentication successful');
      }}
    />
  );

  const LoadingScreen = () => (
    <View style={styles.loadingContainer}>
      <MaterialCommunityIcons
        name="loading"
        size={40}
        color={theme.colors.primary}
      />
      <Text style={styles.loadingText}>Checking authentication...</Text>
    </View>
  );

  // Show loading while checking auth
  if (isCheckingAuth || authLoading) {
    return <LoadingScreen />;
  }

  // If auth is required but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return (
      <>
        {fallbackComponent || <AuthPrompt />}

        <Portal>
          <Modal
            visible={showAuthModal}
            onDismiss={() => setShowAuthModal(false)}
            contentContainerStyle={styles.modalContent}
          >
            <SimpleAuthPrompt
              customMessage={customMessage}
              onAuthSuccess={() => setShowAuthModal(false)}
            />
          </Modal>
        </Portal>
      </>
    );
  }

  // User is authenticated or auth is not required
  return children;
};

const styles = StyleSheet.create({
  authPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 0,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
});

export default AuthGuard;