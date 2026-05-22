import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectAuthToken } from '../../../features/auth/authSlice';
import { API_URL } from '../../../features/api/globalApiSlice';

const ConnectAccountModal = ({ visible, onClose, onAccountConnected }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState(null);
  const user = useSelector(selectCurrentUser);
  const token = useSelector(selectAuthToken);

  const platforms = [
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'facebook',
      color: '#4267B2',
      description: 'Connect your Facebook personal account and pages'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'instagram',
      color: '#E4405F',
      description: 'Connect Instagram business accounts via Facebook'
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: 'linkedin',
      color: '#0077B5',
      description: 'Connect your LinkedIn personal or company profile'
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'twitter',
      color: '#1DA1F2',
      description: 'Connect your Twitter account'
    }
  ];

  const handleConnectPlatform = async (platform) => {
    if (!token) {
      Alert.alert('Error', 'Please login first to connect social accounts');
      return;
    }

    try {
      setIsConnecting(true);
      setConnectingPlatform(platform.id);

      // Pass JWT token so server can identify the user without exposing userId
      const authUrl = `${API_URL.replace('/api/', '')}api/social/auth/${platform.id}?token=${encodeURIComponent(token)}`;

      console.log('authUrl', authUrl);

      const supported = await Linking.canOpenURL(authUrl);

      if (supported) {
        // Open the OAuth URL in the browser
        await Linking.openURL(authUrl);

        // Listen for the deep link callback: masterai://social-connect?success=true&platform=...
        const subscription = Linking.addEventListener('url', ({ url }) => {
          if (!url || !url.startsWith('masterai://social-connect')) return;

          subscription.remove();
          clearTimeout(timeoutId);

          const paramString = url.split('?')[1] || '';
          const params = {};
          paramString.split('&').forEach(pair => {
            const [k, v] = pair.split('=');
            if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
          });

          setIsConnecting(false);
          setConnectingPlatform(null);

          if (params.success === 'true') {
            Alert.alert(
              'Success',
              `${platform.name} account connected successfully!`,
              [{ text: 'OK', onPress: () => { onAccountConnected(); onClose(); } }]
            );
          } else {
            const errorMessage = params.error
              ? params.error.replace(/_/g, ' ')
              : 'Failed to connect account';
            Alert.alert('Connection Failed', errorMessage);
          }
        });

        // Timeout after 60 seconds
        const timeoutId = setTimeout(() => {
          subscription.remove();
          setIsConnecting(false);
          setConnectingPlatform(null);
        }, 60000);

      } else {
        Alert.alert('Error', 'Cannot open authentication URL');
        setIsConnecting(false);
        setConnectingPlatform(null);
      }
    } catch (error) {
      console.error('Connect platform error:', error);
      Alert.alert('Error', 'Failed to start connection process');
      setIsConnecting(false);
      setConnectingPlatform(null);
    }
  };

  const handleCancel = () => {
    setIsConnecting(false);
    setConnectingPlatform(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View style={styles.headerLeft}>
            <Icon name="link" size={24} color="#6200ee" />
            <Text style={styles.modalTitle}>Connect Social Account</Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleCancel}
            disabled={isConnecting}
          >
            <Icon name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          <Text style={styles.description}>
            Connect your social media accounts to start posting and scheduling content automatically.
          </Text>

          {isConnecting && (
            <View style={styles.connectingBanner}>
              <ActivityIndicator size="small" color="#6200ee" />
              <Text style={styles.connectingText}>
                Connecting to {platforms.find(p => p.id === connectingPlatform)?.name}...
              </Text>
              <Text style={styles.connectingSubtext}>
                Complete the authentication in your browser and return to the app.
              </Text>
            </View>
          )}

          <View style={styles.platformsList}>
            {platforms.map((platform) => (
              <TouchableOpacity
                key={platform.id}
                style={[
                  styles.platformItem,
                  isConnecting && connectingPlatform === platform.id && styles.connectingPlatform,
                  isConnecting && connectingPlatform !== platform.id && styles.disabledPlatform
                ]}
                onPress={() => handleConnectPlatform(platform)}
                disabled={isConnecting}
                activeOpacity={0.7}
              >
                <View style={styles.platformLeft}>
                  <View style={[styles.platformIcon, { backgroundColor: platform.color + '20' }]}>
                    <Icon
                      name={platform.icon}
                      size={28}
                      color={platform.color}
                    />
                  </View>

                  <View style={styles.platformInfo}>
                    <Text style={styles.platformName}>{platform.name}</Text>
                    <Text style={styles.platformDescription} numberOfLines={2}>
                      {platform.description}
                    </Text>
                  </View>
                </View>

                <View style={styles.platformRight}>
                  {isConnecting && connectingPlatform === platform.id ? (
                    <ActivityIndicator size="small" color={platform.color} />
                  ) : (
                    <Icon
                      name="chevron-right"
                      size={20}
                      color="#666"
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.helpSection}>
            <Text style={styles.helpTitle}>Need Help?</Text>
            <Text style={styles.helpText}>
              • Make sure you have admin access to pages you want to connect{'\n'}
              • Some platforms require business accounts for posting{'\n'}
              • You can disconnect accounts anytime from the Accounts tab
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e6ed',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 12,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  description: {
    fontSize: 16,
    color: '#5a6c7d',
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  connectingBanner: {
    backgroundColor: '#e8f4fd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  connectingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2980b9',
    marginTop: 8,
    marginBottom: 4,
  },
  connectingSubtext: {
    fontSize: 14,
    color: '#5a6c7d',
    textAlign: 'center',
  },
  platformsList: {
    flex: 1,
  },
  platformItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  connectingPlatform: {
    borderWidth: 2,
    borderColor: '#6200ee',
    backgroundColor: '#f8f4ff',
  },
  disabledPlatform: {
    opacity: 0.5,
  },
  platformLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  platformIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  platformInfo: {
    flex: 1,
  },
  platformName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  platformDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  platformRight: {
    marginLeft: 12,
  },
  helpSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    color: '#5a6c7d',
    lineHeight: 22,
  },
});

export default ConnectAccountModal;