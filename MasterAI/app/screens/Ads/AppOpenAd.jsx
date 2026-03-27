// App Open Ad Component
// Reusable component for displaying app open ads with proper state management

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { getAppOpenAdService } from '../../service/appOpenAdService';
import { isDevelopment } from '../../config/admobConfig';

const AppOpenAd = ({
  visible = false,
  onAdShown = () => {},
  onAdDismissed = () => {},
  onAdFailedToLoad = () => {},
  onAdFailedToShow = () => {},
  showLoadingIndicator = true,
  loadingText = 'Loading...',
  testMode = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adService] = useState(() => getAppOpenAdService());

  // Setup ad service callbacks
  useEffect(() => {
    const callbacks = {
      onAdLoaded: () => {
        console.log('AppOpenAd: Ad loaded callback');
        setIsLoading(false);
        setError(null);
      },
      onAdFailedToLoad: (err) => {
        console.log('AppOpenAd: Ad failed to load callback:', err);
        setIsLoading(false);
        setError(err?.message || 'Failed to load ad');
        onAdFailedToLoad(err);
      },
      onAdShown: () => {
        console.log('AppOpenAd: Ad shown callback');
        setIsLoading(false);
        onAdShown();
      },
      onAdDismissed: () => {
        console.log('AppOpenAd: Ad dismissed callback');
        setIsLoading(false);
        onAdDismissed();
      },
      onAdFailedToShow: (err) => {
        console.log('AppOpenAd: Ad failed to show callback:', err);
        setIsLoading(false);
        setError(err?.message || 'Failed to show ad');
        onAdFailedToShow(err);
      }
    };

    adService.setCallbacks(callbacks);

    return () => {
      // Clean up callbacks
      adService.setCallbacks({});
    };
  }, [adService, onAdShown, onAdDismissed, onAdFailedToLoad, onAdFailedToShow]);

  // Show ad when component becomes visible
  const showAd = useCallback(async () => {
    if (!visible) return;

    setIsLoading(true);
    setError(null);

    try {
      const success = await adService.showAd();
      if (!success) {
        setIsLoading(false);
        setError('No ad available');
      }
    } catch (err) {
      console.log('AppOpenAd: Error showing ad:', err);
      setIsLoading(false);
      setError(err.message || 'Failed to show ad');
    }
  }, [visible, adService]);

  useEffect(() => {
    if (visible) {
      showAd();
    }
  }, [visible, showAd]);

  // Get service status for debugging
  const getServiceStatus = () => {
    return adService.getStatus();
  };

  // Render loading state
  const renderLoading = () => (
    <Modal
      visible={visible && isLoading && showLoadingIndicator}
      transparent={true}
      animationType="fade"
    >
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>{loadingText}</Text>
          {isDevelopment() && (
            <Text style={styles.debugText}>
              {JSON.stringify(getServiceStatus(), null, 2)}
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );

  // Render error state (only in development)
  const renderError = () => {
    if (!error || !isDevelopment()) return null;

    return (
      <Modal
        visible={visible && !!error}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.errorContainer}>
          <SafeAreaView style={styles.errorContent}>
            <Text style={styles.errorTitle}>App Open Ad Error (Dev Only)</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <Text style={styles.debugText}>
              Service Status:{'\n'}
              {JSON.stringify(getServiceStatus(), null, 2)}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setError(null);
                showAd();
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => {
                setError(null);
                onAdDismissed();
              }}
            >
              <Text style={styles.dismissButtonText}>Dismiss</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    );
  };

  // Render test mode controls (development only)
  const renderTestControls = () => {
    if (!testMode || !isDevelopment()) return null;

    return (
      <View style={styles.testControls}>
        <Text style={styles.testTitle}>App Open Ad Test Controls</Text>
        <TouchableOpacity
          style={styles.testButton}
          onPress={showAd}
        >
          <Text style={styles.testButtonText}>Show Ad</Text>
        </TouchableOpacity>
        <Text style={styles.debugText}>
          Status: {JSON.stringify(getServiceStatus(), null, 2)}
        </Text>
      </View>
    );
  };

  return (
    <>
      {renderLoading()}
      {renderError()}
      {renderTestControls()}
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    maxWidth: '80%',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    maxWidth: '90%',
    maxHeight: '80%',
    borderColor: 'red',
    borderWidth: 1,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'red',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 5,
    borderRadius: 3,
    marginVertical: 5,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  retryButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  dismissButton: {
    backgroundColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  dismissButtonText: {
    color: '#333',
    textAlign: 'center',
  },
  testControls: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 5,
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  testTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 10,
  },
  testButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 5,
    marginBottom: 10,
  },
  testButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
  },
});

export default AppOpenAd;