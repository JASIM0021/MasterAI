import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { restoreAuthState } from '../../features/auth/authSlice';
import tokenManager from '../../utils/tokenManager';
import useAuth from '../../hooks/useAuth';
import { RNPushService } from '../../service/notificationService';

/**
 * AuthInitializer Component
 * Handles authentication state restoration using tokenManager
 */
const AuthInitializer = ({ children }) => {
  const { refreshAuth, isAuthenticated } = useAuth();

  useEffect(() => {
    // Initialize authentication state when app starts
    initializeAuth();
  }, []);

  // Register FCM token when user becomes authenticated
  useEffect(() => {
    if (isAuthenticated) {
      console.log('User authenticated, registering FCM token...');
      RNPushService.registerTokenAfterLogin();
    }
  }, [isAuthenticated]);

  const initializeAuth = async () => {
    try {
      // Initialize tokenManager and restore auth state
      await tokenManager.initialize();

      // Refresh auth to sync with Redux if needed
      await refreshAuth();

      console.log('Auth initialization completed');
    } catch (error) {
      console.log('Failed to initialize auth:', error);
      // Don't throw error, just continue with unauthenticated state
    }
  };

  // This component doesn't render anything, it just handles initialization
  return children;
};

export default AuthInitializer;