import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { tokenManager } from '../utils/tokenManager';
import { RNPushService } from '../service/notificationService';
// App open ad service removed per user request
import Logger, { perf } from '../utils/logger';

// Initialization phases
const PHASES = {
  STARTING: 'starting',
  AUTH_INIT: 'auth_init',
  CORE_READY: 'core_ready',
  BACKGROUND_SERVICES: 'background_services',
  COMPLETE: 'complete'
};

const PHASE_MESSAGES = {
  [PHASES.STARTING]: 'Initializing...',
  [PHASES.AUTH_INIT]: 'Setting up authentication...',
  [PHASES.CORE_READY]: 'Loading application...',
  [PHASES.BACKGROUND_SERVICES]: 'Starting background services...',
  [PHASES.COMPLETE]: 'Ready!'
};

const AppBootstrap = ({ children, onInitializationComplete }) => {
  const [currentPhase, setCurrentPhase] = useState(PHASES.STARTING);
  const [error, setError] = useState(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const phaseStartTime = useRef(Date.now());

  const logPhaseTime = (phase) => {
    const duration = Date.now() - phaseStartTime.current;
    perf(`Phase ${phase}`, phaseStartTime.current);
    phaseStartTime.current = Date.now();
  };

  const initializeAuth = async () => {
    try {
      setCurrentPhase(PHASES.AUTH_INIT);

      // Initialize token manager (AsyncStorage read)
      await tokenManager.initialize();

      // Check and refresh token if needed (but don't block on network)
      tokenManager.checkAndRefreshToken().catch(err => {
        if (__DEV__) console.log('Token refresh will continue in background:', err);
      });

      logPhaseTime(PHASES.AUTH_INIT);
      setCurrentPhase(PHASES.CORE_READY);

    } catch (error) {
      Logger.error('Auth initialization failed:', error);
      setError(error);
    }
  };

  const initializeBackgroundServices = async () => {
    try {
      setCurrentPhase(PHASES.BACKGROUND_SERVICES);

      // Start background services without blocking
      const backgroundTasks = [
        // Push notifications - non-blocking
        RNPushService.initializeAsync().catch(err => {
          Logger.warn('Push service will retry later:', err);
        }),

        // // App Open Ad service - non-blocking
        // (() => {
        //   try {
        //     const appOpenAdService = getAppOpenAdService();
        //     appOpenAdService.initAsync();
        //     return Promise.resolve();
        //   } catch (err) {
        //     Logger.warn('App Open Ad service will retry later:', err);
        //     return Promise.resolve();
        //   }
        // })(),

        // Other background initializations can go here
        // e.g., analytics, crash reporting, etc.
      ];

      // Don't await these - let them run in background
      Promise.allSettled(backgroundTasks).then((results) => {
        Logger.debug('Background services initialization results:', results);
      });

      logPhaseTime(PHASES.BACKGROUND_SERVICES);
      setCurrentPhase(PHASES.COMPLETE);

    } catch (error) {
      Logger.error('Background services initialization failed:', error);
      // Don't fail the app for background service errors
      setCurrentPhase(PHASES.COMPLETE);
    }
  };

  const handleInitializationComplete = () => {
    // Fade out the loading screen
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onInitializationComplete();
    });
  };

  useEffect(() => {
    const runInitialization = async () => {
      try {
        // Phase 1: Authentication (critical path)
        await initializeAuth();

        // Small delay to show the user we're progressing
        await new Promise(resolve => setTimeout(resolve, 100));

        // Phase 2: Background services (non-critical)
        await initializeBackgroundServices();

        // Complete initialization
        handleInitializationComplete();

      } catch (error) {
        Logger.error('App initialization failed:', error);
        setError(error);
      }
    };

    runInitialization();
  }, []);

  // If initialization is complete, render the app
  if (currentPhase === PHASES.COMPLETE && !error) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {children}
      </Animated.View>
    );
  }

  // Show loading screen during initialization
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {error ? 'Something went wrong...' : PHASE_MESSAGES[currentPhase]}
        </Text>

        {error && (
          <Text style={styles.errorText}>
            Please restart the app
          </Text>
        )}

        {__DEV__ && (
          <Text style={styles.debugText}>
            Phase: {currentPhase}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
  },
  debugText: {
    marginTop: 16,
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});

export default AppBootstrap;