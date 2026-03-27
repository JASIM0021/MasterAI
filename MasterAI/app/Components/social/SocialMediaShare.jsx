import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Static platform configurations with deep linking support
const SOCIAL_PLATFORMS = [
  {
    id: 'facebook',
    name: 'Facebook',
    displayName: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    shareUrl: 'https://www.facebook.com/sharer/sharer.php',
    deepLinkUrl: 'fb://sharer',
    params: {
      text: 'quote',
      url: 'u',
      image: 'picture'
    },
    supportsText: true,
    supportsImage: true,
    supportsUrl: true,
  },
  {
    id: 'twitter',
    name: 'Twitter',
    displayName: 'Twitter',
    icon: 'twitter',
    color: '#1DA1F2',
    shareUrl: 'https://twitter.com/intent/tweet',
    deepLinkUrl: 'twitter://post',
    params: {
      text: 'text',
      url: 'url',
      hashtags: 'hashtags'
    },
    supportsText: true,
    supportsImage: false, // Twitter handles images differently
    supportsUrl: true,
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    displayName: 'X',
    icon: 'twitter', // Using twitter icon until X icon is available
    color: '#000000',
    shareUrl: 'https://x.com/intent/tweet',
    deepLinkUrl: 'twitter://post', // X still uses Twitter deep links
    params: {
      text: 'text',
      url: 'url',
      hashtags: 'hashtags'
    },
    supportsText: true,
    supportsImage: false,
    supportsUrl: true,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    displayName: 'LinkedIn',
    icon: 'linkedin',
    color: '#0A66C2',
    shareUrl: 'https://www.linkedin.com/sharing/share-offsite/',
    deepLinkUrl: 'linkedin://sharing/share-offsite/',
    params: {
      text: 'summary',
      url: 'url',
      title: 'title'
    },
    supportsText: true,
    supportsImage: false, // LinkedIn handles images through URL
    supportsUrl: true,
  },
  {
    id: 'instagram',
    name: 'Instagram',
    displayName: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    shareUrl: null, // Instagram doesn't support web sharing with content
    deepLinkUrl: 'instagram://camera',
    params: {},
    supportsText: false, // Instagram doesn't support pre-filled text
    supportsImage: true,
    supportsUrl: false,
    isNativeOnly: true,
    note: 'Content will be copied to clipboard. Paste in Instagram.'
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    displayName: 'WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    shareUrl: 'https://wa.me/',
    deepLinkUrl: 'whatsapp://send',
    params: {
      text: 'text'
    },
    supportsText: true,
    supportsImage: false,
    supportsUrl: true,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    displayName: 'Telegram',
    icon: 'telegram',
    color: '#0088CC',
    shareUrl: 'https://t.me/share/url',
    deepLinkUrl: 'tg://msg_url',
    params: {
      text: 'text',
      url: 'url'
    },
    supportsText: true,
    supportsImage: false,
    supportsUrl: true,
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    displayName: 'Pinterest',
    icon: 'pinterest',
    color: '#BD081C',
    shareUrl: 'https://pinterest.com/pin/create/button/',
    deepLinkUrl: 'pinterest://create/',
    params: {
      text: 'description',
      url: 'url',
      image: 'media'
    },
    supportsText: true,
    supportsImage: true,
    supportsUrl: true,
  },
  {
    id: 'reddit',
    name: 'Reddit',
    displayName: 'Reddit',
    icon: 'reddit',
    color: '#FF4500',
    shareUrl: 'https://reddit.com/submit',
    deepLinkUrl: 'reddit://submit',
    params: {
      text: 'title',
      url: 'url'
    },
    supportsText: true,
    supportsImage: false,
    supportsUrl: true,
  },
];

const SocialMediaShare = ({
  visible,
  onClose,
  content = {},
  title = "Share Content"
}) => {
  const [isSharing, setIsSharing] = useState(false);

  const buildShareUrl = (platform, content) => {
    const { text = '', url = '', image = '', hashtags = [] } = content;

    let shareUrl = platform.shareUrl;
    if (!shareUrl) return null;

    const params = new URLSearchParams();

    // Add parameters based on platform configuration
    if (platform.supportsText && text && platform.params.text) {
      params.append(platform.params.text, text);
    }

    if (platform.supportsUrl && url && platform.params.url) {
      params.append(platform.params.url, url);
    }

    if (platform.supportsImage && image && platform.params.image) {
      params.append(platform.params.image, image);
    }

    if (platform.params.hashtags && hashtags.length > 0) {
      params.append(platform.params.hashtags, hashtags.join(','));
    }

    if (platform.params.title && content.title) {
      params.append(platform.params.title, content.title);
    }

    return `${shareUrl}?${params.toString()}`;
  };

  const buildDeepLinkUrl = (platform, content) => {
    const { text = '', url = '', hashtags = [] } = content;

    let deepLinkUrl = platform.deepLinkUrl;
    if (!deepLinkUrl) return null;

    const params = new URLSearchParams();

    // Add parameters based on platform configuration
    if (platform.supportsText && text && platform.params.text) {
      params.append(platform.params.text, text);
    }

    if (platform.supportsUrl && url && platform.params.url) {
      params.append(platform.params.url, url);
    }

    if (platform.params.hashtags && hashtags.length > 0) {
      params.append(platform.params.hashtags, hashtags.join(','));
    }

    return `${deepLinkUrl}?${params.toString()}`;
  };

  const copyToClipboard = async (text) => {
    try {
      const Clipboard = require('@react-native-clipboard/clipboard');
      Clipboard.setString(text);
      Alert.alert('Copied!', 'Content copied to clipboard');
    } catch (error) {
      console.error('Clipboard error:', error);
      Alert.alert('Copy Error', 'Could not copy to clipboard');
    }
  };

  const handlePlatformShare = async (platform) => {
    if (isSharing) return;

    setIsSharing(true);

    try {
      // Special handling for Instagram
      if (platform.id === 'instagram') {
        const textToCopy = `${content.text || ''} ${content.hashtags?.map(tag => `#${tag}`).join(' ') || ''}`.trim();
        if (textToCopy) {
          await copyToClipboard(textToCopy);
        }

        const deepLinkUrl = platform.deepLinkUrl;
        const canOpenDeepLink = await Linking.canOpenURL(deepLinkUrl);

        if (canOpenDeepLink) {
          await Linking.openURL(deepLinkUrl);
        } else {
          Alert.alert(
            'Instagram Not Found',
            'Please install Instagram app to share content.',
            [{ text: 'OK' }]
          );
        }

        setIsSharing(false);
        return;
      }

      // Try deep link first on mobile
      if (Platform.OS !== 'web') {
        const deepLinkUrl = buildDeepLinkUrl(platform, content);
        if (deepLinkUrl) {
          const canOpenDeepLink = await Linking.canOpenURL(deepLinkUrl);
          if (canOpenDeepLink) {
            await Linking.openURL(deepLinkUrl);
            setIsSharing(false);
            return;
          }
        }
      }

      // Fall back to web share URL
      const webShareUrl = buildShareUrl(platform, content);
      if (webShareUrl) {
        const canOpen = await Linking.canOpenURL(webShareUrl);
        if (canOpen) {
          await Linking.openURL(webShareUrl);
        } else {
          Alert.alert('Error', `Cannot open ${platform.displayName}`);
        }
      } else {
        Alert.alert('Error', `${platform.displayName} sharing not supported`);
      }

    } catch (error) {
      console.error(`Error sharing to ${platform.name}:`, error);
      Alert.alert('Error', `Failed to share to ${platform.displayName}`);
    } finally {
      setIsSharing(false);
    }
  };

  const renderPlatformButton = (platform) => {
    return (
      <TouchableOpacity
        key={platform.id}
        style={styles.platformButton}
        onPress={() => handlePlatformShare(platform)}
        activeOpacity={0.8}
        disabled={isSharing}
      >
        <LinearGradient
          colors={[platform.color, `${platform.color}CC`]}
          style={styles.platformGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons
            name={platform.icon}
            size={28}
            color="white"
            style={styles.platformIcon}
          />
          <Text style={styles.platformName}>{platform.displayName}</Text>

          {platform.note && (
            <Text style={styles.platformNote}>{platform.note}</Text>
          )}

          {platform.isNativeOnly && (
            <View style={styles.nativeBadge}>
              <MaterialCommunityIcons name="cellphone" size={12} color="#ff9800" />
              <Text style={styles.nativeBadgeText}>App Only</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Content Preview */}
          {content && (content.text || content.image) && (
            <View style={styles.contentPreview}>
              <Text style={styles.previewTitle}>Content to Share:</Text>

              {content.text && (
                <Text style={styles.previewText} numberOfLines={3}>
                  {content.text}
                </Text>
              )}

              {content.hashtags && content.hashtags.length > 0 && (
                <Text style={styles.previewHashtags}>
                  {content.hashtags.map(tag => `#${tag}`).join(' ')}
                </Text>
              )}

              {content.image && (
                <View style={styles.imagePreview}>
                  <Image
                    source={{ uri: content.image }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                </View>
              )}
            </View>
          )}

          <ScrollView style={styles.platformsContainer}>
            <Text style={styles.platformsTitle}>Choose Platform:</Text>

            <View style={styles.platformsList}>
              {SOCIAL_PLATFORMS.map(renderPlatformButton)}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  contentPreview: {
    margin: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  previewHashtags: {
    fontSize: 12,
    color: '#6200ee',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  imagePreview: {
    alignItems: 'center',
    marginTop: 8,
  },
  previewImage: {
    width: width * 0.6,
    height: width * 0.3,
    borderRadius: 8,
  },
  platformsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  platformsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  platformsList: {
    paddingBottom: 20,
  },
  platformButton: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  platformGradient: {
    padding: 16,
    position: 'relative',
    minHeight: 80,
    justifyContent: 'center',
  },
  platformIcon: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  platformName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  platformNote: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontStyle: 'italic',
  },
  nativeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  nativeBadgeText: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 2,
  },
});

export default SocialMediaShare;