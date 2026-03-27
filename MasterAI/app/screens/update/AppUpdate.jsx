import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

export default function UpdateBanner() {
  const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates();
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isUpdateAvailable) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      Updates.reloadAsync();
    }
  }, [isUpdateAvailable]);

  const handleUpdate = async () => {
    await Updates.fetchUpdateAsync();
    Updates.reloadAsync();
  };

  if (!isUpdateAvailable) return null; // Show nothing if no update is available

  return (
    <Animated.View style={[styles.banner, { opacity: fadeAnim }]}>
      <Text style={styles.bannerText}>New Update Available!</Text>
      <TouchableOpacity onPress={handleUpdate} style={styles.button}>
        <Text style={styles.buttonText}>
          {isUpdatePending ? 'Applying...' : 'Update Now'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    backgroundColor: '#007BFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  bannerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
  },
  button: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
