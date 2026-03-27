import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Alert } from 'react-native';
import {
  selectIsAuthenticated,
  selectCurrentUser,
  selectAuthLoading,
  restoreAuthState,
} from '../features/auth/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Custom hook for handling authentication requirements
 * @param {Object} options - Configuration options
 * @param {boolean} options.requireAuth - Whether authentication is required (default: true)
 * @param {string} options.redirectMessage - Message to show when redirecting to auth
 * @param {Function} options.onAuthRequired - Callback when auth is required
 * @param {Function} options.onAuthSuccess - Callback when user is authenticated
 *
 * @returns {Object} Authentication state and handlers
 */
const useAuthRequired = (options = {}) => {
  const {
    requireAuth = true,
    redirectMessage = "Please sign in to continue",
    onAuthRequired = null,
    onAuthSuccess = null,
  } = options;

  const dispatch = useDispatch();

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const authLoading = useSelector(selectAuthLoading);

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isAuthenticated && currentUser && onAuthSuccess) {
      onAuthSuccess(currentUser);
    }
  }, [isAuthenticated, currentUser]);

  const checkAuthStatus = async () => {
    try {
      setIsCheckingAuth(true);

      // Try to restore auth state from AsyncStorage
      const token = await AsyncStorage.getItem('userToken');
      const userData = await AsyncStorage.getItem('userData');

      if (token && userData && !isAuthenticated) {
        const user = JSON.parse(userData);
        const lastSignInMethod = await AsyncStorage.getItem('lastSignInMethod');

        dispatch(restoreAuthState({
          user,
          token,
          method: lastSignInMethod,
        }));
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const requireAuthentication = (action = null, customMessage = null) => {
    if (!isAuthenticated) {
      const message = customMessage || redirectMessage;

      if (onAuthRequired) {
        onAuthRequired(message);
      } else {
        Alert.alert(
          'Authentication Required',
          message,
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Sign In',
              onPress: () => setShowAuthPrompt(true),
            },
          ]
        );
      }
      return false;
    }

    // User is authenticated, execute the action
    if (action && typeof action === 'function') {
      action();
    }
    return true;
  };

  const executeWithAuth = async (asyncAction, customMessage = null) => {
    if (!isAuthenticated) {
      requireAuthentication(null, customMessage);
      return false;
    }

    if (asyncAction && typeof asyncAction === 'function') {
      try {
        await asyncAction();
        return true;
      } catch (error) {
        console.error('Error executing authenticated action:', error);
        return false;
      }
    }

    return true;
  };

  const checkPermission = (requiredPermission = null) => {
    if (!isAuthenticated) {
      return false;
    }

    // If no specific permission is required, just check authentication
    if (!requiredPermission) {
      return true;
    }

    // Check if user has the required permission
    if (currentUser?.role && requiredPermission) {
      const userRole = currentUser.role;
      const hasPermission = checkUserPermission(userRole, requiredPermission);
      return hasPermission;
    }

    return true; // Default to allowing if no role system is implemented
  };

  const checkUserPermission = (userRole, permission) => {
    // Define role hierarchy and permissions
    const rolePermissions = {
      admin: ['create', 'read', 'update', 'delete', 'manage_users', 'unlimited_generations'],
      premium: ['create', 'read', 'update', 'delete', 'unlimited_generations'],
      user: ['create', 'read', 'update', 'limited_generations'],
    };

    const userPermissions = rolePermissions[userRole] || rolePermissions.user;
    return userPermissions.includes(permission);
  };

  const getAuthState = () => ({
    isAuthenticated,
    user: currentUser,
    loading: authLoading || isCheckingAuth,
    hasValidSession: isAuthenticated && currentUser && !authLoading,
  });

  const getUserInfo = () => {
    if (!isAuthenticated || !currentUser) {
      return null;
    }

    return {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role || 'user',
      subscription: currentUser.subscription || { plan: 'free', isActive: false },
      authProvider: currentUser.authProvider,
      emailVerified: currentUser.emailVerified,
    };
  };

  const canUseFeature = (feature) => {
    const userInfo = getUserInfo();
    if (!userInfo) return false;

    // Define feature permissions based on subscription
    const featurePermissions = {
      unlimited_generations: ['premium', 'admin'],
      advanced_editing: ['premium', 'admin'],
      batch_processing: ['premium', 'admin'],
      priority_support: ['premium', 'admin'],
      custom_models: ['admin'],
    };

    const requiredRoles = featurePermissions[feature];
    if (!requiredRoles) return true; // Feature available to all authenticated users

    return requiredRoles.includes(userInfo.role);
  };

  return {
    // State
    isAuthenticated,
    currentUser,
    authLoading: authLoading || isCheckingAuth,
    showAuthPrompt,

    // Setters
    setShowAuthPrompt,

    // Methods
    requireAuthentication,
    executeWithAuth,
    checkPermission,
    checkAuthStatus,
    getAuthState,
    getUserInfo,
    canUseFeature,

    // Computed values
    isLoading: authLoading || isCheckingAuth,
    hasValidSession: isAuthenticated && currentUser && !authLoading && !isCheckingAuth,
    needsAuth: requireAuth && !isAuthenticated,
  };
};

export default useAuthRequired;