import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from 'react-native';
import tokenManager from '../utils/tokenManager';
import { restoreAuthState, clearAuth, selectIsAuthenticated, selectCurrentUser, selectAuthToken } from '../features/auth/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const [isInitializing, setIsInitializing] = useState(true);
  const [persistentAuth, setPersistentAuth] = useState(false);

  // Redux selectors
  const reduxIsAuthenticated = useSelector(selectIsAuthenticated);
  const reduxUser = useSelector(selectCurrentUser);
  const reduxToken = useSelector(selectAuthToken);

  // Initialize authentication on mount
  const initializeAuth = useCallback(async () => {
    try {
      setIsInitializing(true);

      // Initialize tokenManager
      await tokenManager.initialize();

      // Check if we have valid persistent auth
      const isAuthenticated = tokenManager.isAuthenticated();
      setPersistentAuth(isAuthenticated);

      if (isAuthenticated) {
        // If we have valid persistent auth but Redux is not authenticated, restore it
        if (!reduxIsAuthenticated) {
          dispatch(restoreAuthState());
        }
      } else {
        // If no persistent auth, clear Redux state
        if (reduxIsAuthenticated) {
          dispatch(clearAuth());
        }
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setPersistentAuth(false);
      dispatch(clearAuth());
    } finally {
      setIsInitializing(false);
    }
  }, [dispatch, reduxIsAuthenticated]);

  // Initialize on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Listen to app state changes to refresh auth
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        // App became active, check auth status
        initializeAuth();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [initializeAuth]);

  // Sync persistent auth with Redux state changes
  useEffect(() => {
    if (reduxIsAuthenticated && reduxToken && reduxUser) {
      setPersistentAuth(true);
    } else if (!reduxIsAuthenticated && persistentAuth) {
      // Redux lost auth but we still have persistent auth, restore it
      const isAuthenticated = tokenManager.isAuthenticated();
      if (isAuthenticated) {
        dispatch(restoreAuthState());
      } else {
        setPersistentAuth(false);
      }
    }
  }, [reduxIsAuthenticated, reduxToken, reduxUser, persistentAuth, dispatch]);

  // Get auth data (prioritize tokenManager over Redux)
  const getAuthData = useCallback(() => {
    const token = tokenManager.getToken() || reduxToken;
    const userData = tokenManager.getUserData() || reduxUser;
    const isAuthenticated = tokenManager.isAuthenticated();

    return {
      token,
      user: userData,
      isAuthenticated,
      lastMethod: tokenManager.getLastMethod(),
    };
  }, [reduxToken, reduxUser]);

  // Sign out function
  const signOut = useCallback(async () => {
    try {
      await tokenManager.clearStorage();
      setPersistentAuth(false);
      dispatch(clearAuth());
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }, [dispatch]);

  // Get auth header for API calls
  const getAuthHeader = useCallback(() => {
    return tokenManager.getAuthHeader();
  }, []);

  // Check if auth is valid (doesn't rely on Redux)
  const isValidAuth = useCallback(() => {
    return tokenManager.isAuthenticated();
  }, []);

  // Refresh auth state
  const refreshAuth = useCallback(async () => {
    await initializeAuth();
  }, [initializeAuth]);

  const authData = getAuthData();

  return {
    // Auth state (reliable, persistent)
    isAuthenticated: persistentAuth && authData.isAuthenticated,
    user: authData.user,
    token: authData.token,
    lastMethod: authData.lastMethod,

    // Loading state
    isInitializing,

    // Methods
    signOut,
    getAuthHeader,
    isValidAuth,
    refreshAuth,

    // Redux fallbacks (for components that still use Redux)
    reduxIsAuthenticated,
    reduxUser,
    reduxToken,
  };
};

export default useAuth;