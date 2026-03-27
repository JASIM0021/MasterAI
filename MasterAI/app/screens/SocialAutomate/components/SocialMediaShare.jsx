import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import Share from 'react-native-share';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const SocialMediaShare = ({ visible, sharingData, onClose, onComplete, title = "Share Your Post" }) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [isSharing, setIsSharing] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // Toast notification function
  const showToast = (message, type = 'success') => {
    setToast({ visible: true, message, type });
    setTimeout(() => {
      setToast({ visible: false, message: '', type: 'success' });
    }, 3000);
  };

  const platformConfigs = {
    native: {
      name: 'Native Share',
      icon: 'share-variant',
      color: '#6200ee',
      primaryColor: '#6200ee',
      secondaryColor: '#3700b3',
      description: 'Use your device\'s native sharing options'
    },
    facebook: {
      name: 'Facebook',
      icon: 'facebook',
      color: '#1877F2',
      primaryColor: '#1877F2',
      secondaryColor: '#4267B2',
      description: 'Share to Facebook feed or story'
    },
    instagram: {
      name: 'Instagram',
      icon: 'instagram',
      color: '#E4405F',
      primaryColor: '#E4405F',
      secondaryColor: '#FD5949',
      description: 'Share to Instagram feed or story'
    },
    linkedin: {
      name: 'LinkedIn',
      icon: 'linkedin',
      color: '#0A66C2',
      primaryColor: '#0A66C2',
      secondaryColor: '#004182',
      description: 'Share to LinkedIn professional network'
    },
    twitter: {
      name: 'Twitter/X',
      icon: 'twitter',
      color: '#1DA1F2',
      primaryColor: '#1DA1F2',
      secondaryColor: '#0d8bd9',
      description: 'Share to Twitter/X timeline'
    },
    whatsapp: {
      name: 'WhatsApp',
      icon: 'whatsapp',
      color: '#25D366',
      primaryColor: '#25D366',
      secondaryColor: '#128C7E',
      description: 'Share via WhatsApp messages'
    },
    telegram: {
      name: 'Telegram',
      icon: 'telegram',
      color: '#0088CC',
      primaryColor: '#0088CC',
      secondaryColor: '#006699',
      description: 'Share via Telegram messages'
    },
    copy: {
      name: 'Copy Content',
      icon: 'content-copy',
      color: '#666666',
      primaryColor: '#666666',
      secondaryColor: '#555555',
      description: 'Copy content to clipboard'
    }
  };

  const handlePlatformSelect = (platform) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter(p => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  // Prepare content for sharing
  const prepareShareContent = () => {
    let content = '';

    if (sharingData?.content?.text) {
      content += sharingData.content.text;
    }

    if (sharingData?.content?.hashtags && sharingData.content.hashtags.length > 0) {
      const hashtags = sharingData.content.hashtags.map(tag => `#${tag}`).join(' ');
      content += content ? `\n\n${hashtags}` : hashtags;
    }

    return content.trim();
  };

  // Download image to local storage with debugging
  const downloadImageToLocal = async (imageUrl) => {
    try {
      if (!imageUrl) {
        console.log('No image URL provided');
        return null;
      }

      console.log('Downloading image from:', imageUrl);
      const fileName = `shared_image_${Date.now()}.jpg`;
      const localUri = `${FileSystem.cacheDirectory}${fileName}`;
      console.log('Downloading to:', localUri);

      // Download image to local storage
      const downloadResult = await FileSystem.downloadAsync(imageUrl, localUri);
      console.log('Download result:', downloadResult);

      // Check if file exists
      const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
      console.log('File info after download:', fileInfo);

      if (fileInfo.exists) {
        console.log('Image downloaded successfully to:', downloadResult.uri);
        return downloadResult.uri;
      } else {
        console.log('File does not exist after download');
        return null;
      }
    } catch (error) {
      console.error('Failed to download image:', error);
      return null;
    }
  };

  // Prepare sharing options for react-native-share with debugging
const getShareOptions = async (platform) => {
    const content = prepareShareContent();
    const platformName = platformConfigs[platform]?.name || platform;

    const options = {
      title: 'Master AI',
      message: content,
    };

    console.log('Preparing share options for platform:', platform);
    console.log('Text content:', content);

    // Download and add image if available
    if (sharingData?.media && sharingData.media.length > 0) {
      console.log('Media found, attempting to download:', sharingData.media[0].url);

      const localImageUri = await downloadImageToLocal(sharingData.media[0].url);
      if (localImageUri) {
        console.log('Adding image to share options:', localImageUri);
        options.url = localImageUri;

        // Also try adding urls array for Android compatibility
        options.urls = [localImageUri];
      } else {
        console.log('Image download failed, sharing text only');
        // Fallback: try sharing the original URL directly
        console.log('Trying original image URL as fallback:', sharingData.media[0].url);
        options.url = sharingData.media[0].url;
      }
    } else {
      console.log('No media found, sharing text only');
    }

    console.log('Final share options:', options);
    return options;
  };

  const handleShareToPlatform = async (platform) => {
    try {
      setIsSharing(true);

      // Handle copy content action
      if (platform === 'copy') {
        const content = prepareShareContent();
        await Clipboard.setStringAsync(content);
        showToast('Content copied to clipboard! 📋');
        return;
      }

      const shareOptions = await getShareOptions(platform);
      console.log('Final shareOptions for', platform, ':', shareOptions);

      // Try multiple sharing approaches based on content
      if (shareOptions.url && shareOptions.url.startsWith('file://')) {
        // Local file approach
        console.log('Sharing with local file URI');
        await Share.open(shareOptions);
      } else if (shareOptions.url && shareOptions.url.startsWith('http')) {
        // Remote URL approach - try both message + URL and just URL
        console.log('Sharing with remote URL');

        try {

         
          // First try: include both text and image URL
          await Share.open(shareOptions);
        } catch (error) {
          console.log('Primary share failed, trying URL only:', error);
          // Fallback: try sharing just the image URL without text
          await Share.open({
            url: shareOptions.url,
            title: shareOptions.title
          });
        }
      } else {
        // Text only approach
        console.log('Sharing text only');
        await Share.open({
          message: shareOptions.message,
          title: shareOptions.title
        });
      }

      // Show success toast based on platform
      const platformName = platformConfigs[platform]?.name || platform;
      showToast(`Shared to ${platformName}! 📤`);

    } catch (error) {
      // Handle user cancellation gracefully
      if (error.message && error.message.includes('User did not share')) {
        showToast('Sharing cancelled');
      } else {
        console.error('Failed to share:', error);
        showToast(`Failed to share to ${platformConfigs[platform]?.name || platform}`, 'error');
      }
    } finally {
      setIsSharing(false);
    }

    const content = prepareShareContent();
    await Clipboard.setStringAsync(content);
    showToast('Content copied to clipboard! 📋');
  };

  const handleShareSelected = async () => {
    if (selectedPlatforms?.length === 0) {
      showToast('Please select at least one platform to share to', 'error');
      return;
    }

    try {
      showToast(`Sharing to ${selectedPlatforms.length} platform(s)...`);

      for (const platform of selectedPlatforms) {
        await handleShareToPlatform(platform);
        // Add small delay between shares
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      showToast(`Shared to ${selectedPlatforms.length} platform(s) successfully! 🎉`);

      // Auto-close after successful sharing
      setTimeout(() => {
        if (onComplete) onComplete();
        if (onClose) onClose();
      }, 2000);

    } catch (error) {
      console.error('Error sharing to selected platforms:', error);
      showToast('Failed to share to some platforms', 'error');
    }
  };

  const handleShareAll = async () => {
    const allPlatforms = getPlatformList().filter(p => p !== 'copy'); // Exclude copy option

    try {
      setSelectedPlatforms(allPlatforms);
      showToast(`Sharing to all ${allPlatforms.length} platforms...`);

      for (const platform of allPlatforms) {
        await handleShareToPlatform(platform);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      showToast(`Shared to all ${allPlatforms.length} platforms successfully! 🎉`);

      // Auto-close after successful sharing
      setTimeout(() => {
        if (onComplete) onComplete();
        if (onClose) onClose();
      }, 2000);

    } catch (error) {
      console.error('Error sharing to all platforms:', error);
      showToast('Failed to share to some platforms', 'error');
    }
  };

  // Get static platform list
  const getPlatformList = () => {
    return Object.keys(platformConfigs);
  };

  if (!sharingData) return null;

  return (
    <SafeAreaView>
      <Modal
        visible={visible}
        // animationType="slide"
        // presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Success Message */}
            <View style={styles.successCard}>
              <Icon name="check-circle" size={32} color="#27ae60" />
              <Text style={styles.successTitle}>Post Approved!</Text>
              <Text style={styles.successMessage}>
                Your content is ready to share. Select the platforms you want to share to.
              </Text>
            </View>

            {/* Content Preview */}
            <View style={styles.contentPreview}>
              <Text style={styles.previewTitle}>Content to Share</Text>
              <View style={styles.previewCard}>
                {sharingData?.content?.text && (
                  <Text style={styles.previewText} numberOfLines={4}>
                    {sharingData.content.text}
                  </Text>
                )}

                {sharingData?.content?.hashtags && sharingData.content.hashtags.length > 0 && (
                  <Text style={styles.previewHashtags}>
                    {sharingData.content.hashtags.map(tag => `#${tag}`).join(' ')}
                  </Text>
                )}

                {/* Image Preview */}
                {sharingData?.media && sharingData.media.length > 0 && (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: sharingData.media[0].url }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />
                    {sharingData.media.length > 1 && (
                      <View style={styles.imageCountBadge}>
                        <Text style={styles.imageCountText}>+{sharingData.media.length - 1}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Platform Selection */}
            <View style={styles.platformSection}>
              <Text style={styles.sectionTitle}>Select Platforms</Text>
              <View style={styles.platformGrid}>
                {getPlatformList().map((platform) => {
                  const config = platformConfigs[platform];
                  const isSelected = selectedPlatforms.includes(platform);

                  return (
                    <TouchableOpacity
                      key={platform}
                      style={[
                        styles.platformCard,
                        isSelected && styles.platformCardSelected,
                        { borderColor: config.color }
                      ]}
                      onPress={() => handlePlatformSelect(platform)}
                      disabled={isSharing}
                    >
                      <LinearGradient
                        colors={isSelected ? [config.primaryColor, config.secondaryColor] : ['#ffffff', '#ffffff']}
                        style={styles.platformCardGradient}
                      >
                        <Icon
                          name={config.icon}
                          size={28}
                          color={isSelected ? '#ffffff' : config.color}
                        />
                        <Text style={[
                          styles.platformName,
                          { color: isSelected ? '#ffffff' : config.color }
                        ]}>
                          {config.name}
                        </Text>

                        {/* Selection indicator */}
                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <Icon name="check" size={16} color="#ffffff" />
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Individual Platform Actions */}
            <View style={styles.platformSection}>
              <Text style={styles.sectionTitle}>Or Share to Individual Platforms</Text>
              <View style={styles.individualPlatforms}>
                {getPlatformList().map((platform) => {
                  const config = platformConfigs[platform];

                  return (
                    <TouchableOpacity
                      key={platform}
                      style={styles.individualPlatformCard}
                      onPress={() => handleShareToPlatform(platform)}
                      disabled={isSharing}
                    >
                      <Icon name={config.icon} size={24} color={config.color} />
                      <View style={styles.individualPlatformInfo}>
                        <Text style={styles.individualPlatformName}>{config.name}</Text>
                        <Text style={styles.individualPlatformHint}>
                          {config.description}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="#666" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsCard}>
              <Icon name="information" size={24} color="#3498db" />
              <View style={styles.instructionsContent}>
                <Text style={styles.instructionsTitle}>How it works</Text>
                <Text style={styles.instructionsText}>
                  • Use "Native Share" for the best device sharing experience{'\n'}
                  • Select specific platforms for targeted sharing{'\n'}
                  • Images and text content are handled automatically{'\n'}
                  • Content is copied to clipboard when needed{'\n'}
                  • Choose multiple platforms or share individually
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.shareAllButton}
              onPress={handleShareAll}
              disabled={isSharing}
            >
              <Icon name="share-variant" size={20} color="#6200ee" />
              <Text style={styles.shareAllText}>Share to All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.shareSelectedButton,
                selectedPlatforms.length === 0 && styles.shareSelectedButtonDisabled
              ]}
              onPress={handleShareSelected}
              disabled={selectedPlatforms.length === 0 || isSharing}
            >
              <LinearGradient
                colors={selectedPlatforms.length > 0 ? ['#27ae60', '#2ecc71'] : ['#bdc3c7', '#95a5a6']}
                style={styles.shareSelectedGradient}
              >
                <Icon name="check-all" size={20} color="#ffffff" />
                <Text style={styles.shareSelectedText}>
                  Share Selected ({selectedPlatforms.length})
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Toast Notification */}
          {toast.visible && (
            <View style={[styles.toastContainer, toast.type === 'error' && styles.toastError]}>
              <Icon
                name={toast.type === 'success' ? 'check-circle' : 'alert-circle'}
                size={16}
                color="#fff"
              />
              <Text style={styles.toastText}>{toast.message}</Text>
            </View>
          )}
        </View>
      </Modal>
   </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e6ed',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginTop: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
    marginTop: 8,
    marginBottom: 4,
  },
  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  contentPreview: {
    marginTop: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  previewText: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 22,
    marginBottom: 8,
  },
  previewHashtags: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    marginTop: 12,
    position: 'relative',
    alignItems: 'center',
  },
  imagePreview: {
    width: width * 0.6,
    height: width * 0.3,
    borderRadius: 8,
  },
  imageCountBadge: {
    position: 'absolute',
    top: 8,
    right: (width * 0.2) / 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  platformSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  platformGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  platformCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  platformCardSelected: {
    borderWidth: 2,
  },
  platformCardGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minHeight: 80,
  },
  platformName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  individualPlatforms: {
    gap: 8,
  },
  individualPlatformCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  individualPlatformInfo: {
    flex: 1,
    marginLeft: 12,
  },
  individualPlatformName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  individualPlatformHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  instructionsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  instructionsContent: {
    flex: 1,
    marginLeft: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e6ed',
    gap: 12,
  },
  shareAllButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#6200ee',
  },
  shareAllText: {
    fontSize: 16,
    color: '#6200ee',
    fontWeight: '600',
    marginLeft: 6,
  },
  shareSelectedButton: {
    flex: 2,
  },
  shareSelectedButtonDisabled: {
    opacity: 0.6,
  },
  shareSelectedGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#27ae60',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shareSelectedText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  // Toast styles
  toastContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#27ae60',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000,
  },
  toastError: {
    backgroundColor: '#e74c3c',
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
});

export default SocialMediaShare;