import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch } from 'react-redux';
import { disconnectAccount, refreshAccountToken } from '../../../features/social/socialAccountsSlice';

const SocialAccountCard = ({ account, platform }) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const platformColors = {
    facebook: '#4267B2',
    instagram: '#E4405F',
    linkedin: '#0077B5',
    twitter: '#1DA1F2'
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Account',
      `Are you sure you want to disconnect ${account.accountName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              await dispatch(disconnectAccount(account.id)).unwrap();
              Alert.alert('Success', 'Account disconnected successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to disconnect account');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRefreshToken = async () => {
    try {
      setIsLoading(true);
      await dispatch(refreshAccountToken(account.id)).unwrap();
      Alert.alert('Success', 'Account refreshed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to refresh account connection');
    } finally {
      setIsLoading(false);
    }
  };

  const getAccountTypeLabel = (type) => {
    switch (type) {
      case 'page':
        return 'Page';
      case 'business':
        return 'Business';
      case 'personal':
        return 'Personal';
      default:
        return 'Account';
    }
  };

  const getLastConnectedText = (lastConnected) => {
    const now = new Date();
    const connected = new Date(lastConnected);
    const diffInHours = Math.floor((now - connected) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  return (
    <View style={styles.accountCard}>
      <View style={styles.accountHeader}>
        <View style={styles.accountInfo}>
          {account.profilePicture ? (
            <Image
              source={{ uri: account.profilePicture }}
              style={styles.profilePicture}
            />
          ) : (
            <View style={[styles.profilePicture, styles.defaultAvatar]}>
              <Icon
                name={platform}
                size={24}
                color={platformColors[platform]}
              />
            </View>
          )}

          <View style={styles.accountDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.accountName} numberOfLines={1}>
                {account.accountName}
              </Text>
              {account.isVerified && (
                <Icon name="check-decagram" size={16} color="#1DA1F2" />
              )}
            </View>

            {account.username && (
              <Text style={styles.username}>@{account.username}</Text>
            )}

            <View style={styles.metaRow}>
              <View style={styles.accountTypeTag}>
                <Text style={styles.accountTypeText}>
                  {getAccountTypeLabel(account.accountType)}
                </Text>
              </View>

              <Text style={styles.lastConnected}>
                {getLastConnectedText(account.lastConnected)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.accountActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRefreshToken}
            disabled={isLoading}
          >
            <Icon
              name={isLoading ? "loading" : "refresh"}
              size={20}
              color="#666"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.disconnectButton]}
            onPress={handleDisconnect}
            disabled={isLoading}
          >
            <Icon name="close" size={20} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Permissions */}
      {account.permissions && account.permissions.length > 0 && (
        <View style={styles.permissionsSection}>
          <Text style={styles.permissionsTitle}>Permissions:</Text>
          <View style={styles.permissionsList}>
            {account.permissions.slice(0, 3).map((permission, index) => (
              <View key={index} style={styles.permissionTag}>
                <Text style={styles.permissionText}>{permission}</Text>
              </View>
            ))}
            {account.permissions.length > 3 && (
              <Text style={styles.morePermissions}>
                +{account.permissions.length - 3} more
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  accountCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#6200ee',
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  accountInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  profilePicture: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  defaultAvatar: {
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  accountName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginRight: 8,
    flex: 1,
  },
  username: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountTypeTag: {
    backgroundColor: '#e8f4fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  accountTypeText: {
    fontSize: 12,
    color: '#2980b9',
    fontWeight: '600',
  },
  lastConnected: {
    fontSize: 12,
    color: '#95a5a6',
  },
  accountActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disconnectButton: {
    backgroundColor: '#fdf2f2',
  },
  permissionsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  permissionsTitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
    fontWeight: '600',
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  permissionTag: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  permissionText: {
    fontSize: 11,
    color: '#5a6c7d',
  },
  morePermissions: {
    fontSize: 11,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
});

export default SocialAccountCard;