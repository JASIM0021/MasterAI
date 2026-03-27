import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute } from '@react-navigation/native';
import Header from '../../Components/header/Header';

const WebViewTools = () => {
  const navigation = useNavigation();
  const { url, name } = useRoute().params;

  // State to manage the loading spinner
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Simulate a loading delay of 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false); // Hide the loader after 10 seconds
    }, 5000);

    return () => clearTimeout(timer); // Cleanup the timer on unmount
  }, []);

  // Handle loading start and end
  const handleLoadStart = () => {
    setLoading(true); // Show the loader when the page starts loading
    setError(false); // Reset the error state
  };

  const handleLoadEnd = () => {
    setLoading(false); // Hide the loader when the page finishes loading
  };

  // Handle WebView error
  const handleError = () => {
    setLoading(false); // Hide the loader if there's an error
    setError(true); // Set the error state to true
  };

  return (
    <>
      <Header title={name} isBack={true} />

      <View style={styles.container}>
        {/* Show loader when loading */}
        {loading && !error && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator
              size="large"
              color="#007bff"
              style={styles.loader}
            />
            <Text style={styles.loadingText}>Loading content...</Text>
          </View>
        )}

        {/* Show error message if failed to load */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              Oops! Something went wrong while loading the content.
            </Text>
            <TouchableOpacity
              onPress={() => setLoading(true)}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <WebView
          source={{ uri: url }}
          style={styles.webview}
          onLoadStart={handleLoadStart} // Trigger when the loading starts
          onLoadEnd={handleLoadEnd} // Trigger when the loading ends
          onError={handleError} // Trigger if there's an error
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  webview: {
    flex: 1,
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  loaderContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    zIndex: 9999,
  },
  loader: {
    marginBottom: 10,
  },
  loadingText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -50 }, { translateY: -50 }],
  },
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 5,
    marginVertical: 20,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default WebViewTools;
