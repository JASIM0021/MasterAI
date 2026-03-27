import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector } from 'react-redux';
import { useLazyGenerateSharingUrlsQuery } from '../../features/api/socialAccountsApiSlice';
import { selectAvailablePlatforms } from '../../features/social/socialAccountsSlice';

const SocialSharingModal = ({
  visible,
  onClose,
  onComplete,
  onCancel,
  post,
  sharingData: propSharingData,
  onPlatformShared,
  title = "Share Your Post"
}) => {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [sharingData, setSharingData] = useState(null);
  const [showInstructions, setShowInstructions] = useState({});

  // Early safety check to prevent any platforms access errors
  if (visible && sharingData !== null && (typeof sharingData !== 'object' || sharingData === undefined)) {
    console.error('SocialSharingModal: Invalid sharingData detected:', sharingData);
    return null;
  }

  const availablePlatforms = useSelector(selectAvailablePlatforms);
  const [generateSharingUrls, { data, isLoading, error }] = useLazyGenerateSharingUrlsQuery();

  useEffect(() => {
    if (propSharingData) {
      // Use sharing data from props (e.g., from approval flow)
      setSharingData(propSharingData);
    } else if (visible && post?.id) {
      // Generate sharing URLs if not provided
      generateSharingUrls({ postId: post.id });
    }
  }, [visible, post?.id, propSharingData, generateSharingUrls]);

  useEffect(() => {
    if (data?.sharingData) {
      setSharingData(data.sharingData);
    }
  }, [data]);

  const handlePlatformSelect = (platform) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platform)) {
        return prev.filter(p => p !== platform);
      } else {
        return [...prev, platform];
      }
    });
  };

  const handleShare = async (platform) => {
    if (!sharingData?.platforms?.[platform]) {
      Alert.alert('Error', 'Sharing data not available for this platform');
      return;
    }

    const platformData = sharingData?.platforms?.[platform];
    if (!platformData) {
      Alert.alert('Error', 'Platform data not available');
      return;
    }
    const { webUrl, mobileDeepLink, instructions } = platformData;

    try {
      let urlToOpen = webUrl;

      // Try mobile deep link first on mobile devices
      if (Platform.OS !== 'web' && mobileDeepLink) {
        const canOpenDeepLink = await Linking.canOpenURL(mobileDeepLink);
        if (canOpenDeepLink) {
          urlToOpen = mobileDeepLink;
        }
      }

      // Show instructions for platforms that need manual content copying
      if (platformData.capabilities.requiresManualUpload) {
        setShowInstructions(prev => ({ ...prev, [platform]: true }));
        return;
      }

      const canOpen = await Linking.canOpenURL(urlToOpen);
      if (canOpen) {
        await Linking.openURL(urlToOpen);

        // Mark platform as shared
        if (onPlatformShared) {
          onPlatformShared(platform);
        }

        // Show success message
        setTimeout(() => {
          Alert.alert(
            'Shared Successfully',
            `Your post has been opened in ${platform}. Complete the sharing process in the app.`,
            [
              {
                text: 'Done',
                onPress: () => {
                  if (onComplete) {
                    onComplete();
                  }
                }
              }
            ]
          );
        }, 1000);
      } else {
        Alert.alert('Error', `Cannot open ${platform}. Please make sure the app is installed.`);
      }
    } catch (error) {
      console.error(`Error sharing to ${platform}:`, error);
      Alert.alert('Error', `Failed to open ${platform}. Please try again.`);
    }
  };

  const handleInstructionsClose = (platform) => {
    setShowInstructions(prev => ({ ...prev, [platform]: false }));

    // Still try to open the sharing URL
    handleShare(platform);
  };

  const copyToClipboard = async (text) => {
    try {
      // For React Native
      const Clipboard = require('@react-native-clipboard/clipboard');
      Clipboard.setString(text);
      Alert.alert('Copied!', 'Content copied to clipboard');
    } catch (error) {
      console.error('Clipboard error:', error);
      Alert.alert('Copy Error', 'Could not copy to clipboard');
    }
  };

  const renderPlatformButton = (platform) => {
    const platformInfo = availablePlatforms.find(p => p.platform === platform);
    const platformData = sharingData?.platforms?.[platform];

    if (!platformInfo || !platformData) return null;

    return (
      <TouchableOpacity
        key={platform}
        style={styles.platformButton}
        onPress={() => handleShare(platform)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[platformInfo.color, `${platformInfo.color}CC`]}
          style={styles.platformGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons
            name={platformInfo.icon}
            size={28}
            color="white"
            style={styles.platformIcon}
          />
          <Text style={styles.platformName}>{platformInfo.displayName}</Text>
          <Text style={styles.platformDescription}>{platformInfo.description}</Text>

          {platformData.capabilities.requiresManualUpload && (
            <View style={styles.manualBadge}>
              <MaterialCommunityIcons name="hand-pointing-up" size={12} color="#ff9800" />
              <Text style={styles.manualBadgeText}>Manual</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderInstructionsModal = (platform) => {
    const platformData = sharingData?.platforms?.[platform];
    const platformInfo = availablePlatforms.find(p => p.platform === platform);

    if (!platformData || !showInstructions[platform]) return null;

    const { instructions, formattedContent } = platformData;

    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowInstructions(prev => ({ ...prev, [platform]: false }))}
      >
        <View style={styles.instructionsOverlay}>
          <View style={styles.instructionsModal}>
            <View style={styles.instructionsHeader}>
              <MaterialCommunityIcons
                name={platformInfo.icon}
                size={24}
                color={platformInfo.color}
              />
              <Text style={styles.instructionsTitle}>
                Share to {platformInfo.displayName}
              </Text>
              <TouchableOpacity
                onPress={() => setShowInstructions(prev => ({ ...prev, [platform]: false }))}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.instructionsContent}>
              <Text style={styles.instructionsNote}>{instructions.note}</Text>

              <Text style={styles.stepsTitle}>Steps to Share:</Text>
              {instructions.steps.map((step, index) => (
                <View key={index} style={styles.stepContainer}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}

              <View style={styles.contentPreview}>
                <View style={styles.contentHeader}>
                  <Text style={styles.contentTitle}>Your Content:</Text>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(formattedContent.text)}
                    style={styles.copyButton}
                  >
                    <MaterialCommunityIcons name="content-copy" size={16} color="#6200ee" />
                    <Text style={styles.copyText}>Copy</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.contentBox}>
                  <Text style={styles.contentText}>{formattedContent.text}</Text>
                </View>

                {post?.media && post.media.length > 0 && (
                  <View style={styles.mediaInfo}>
                    <MaterialCommunityIcons name="image" size={16} color="#666" />
                    <Text style={styles.mediaText}>
                      {post.media.length} image{post.media.length > 1 ? 's' : ''} to upload manually
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.instructionsFooter}>
              <TouchableOpacity
                onPress={() => handleInstructionsClose(platform)}
                style={styles.continueButton}
              >
                <LinearGradient
                  colors={[platformInfo.color, `${platformInfo.color}CC`]}
                  style={styles.continueGradient}
                >
                  <Text style={styles.continueButtonText}>
                    Open {platformInfo.displayName}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (!visible) return null;

  // Comprehensive safety check to prevent platforms access errors
  if (visible && sharingData && (!sharingData.platforms || typeof sharingData.platforms !== 'object')) {
    console.warn('SocialSharingModal: sharingData exists but platforms is invalid:', sharingData);
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onCancel || onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onCancel || onClose} style={styles.modalCloseButton}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.loadingContainer}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#f44336" />
              <Text style={styles.loadingText}>Sharing data not available</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  try {
    return (
      <>
        <Modal
          visible={visible}
          transparent={true}
          animationType="slide"
          onRequestClose={onCancel || onClose}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity onPress={onCancel || onClose} style={styles.modalCloseButton}>
                  <MaterialCommunityIcons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {post && (
                <View style={styles.postPreview}>
                  <Text style={styles.postPreviewTitle}>Post Content:</Text>
                  <Text style={styles.postPreviewText} numberOfLines={3}>
                    {post.content?.text || 'No content available'}
                  </Text>
                  {post.media && post.media.length > 0 && (
                    <View style={styles.mediaPreview}>
                      <MaterialCommunityIcons name="image" size={16} color="#666" />
                      <Text style={styles.mediaPreviewText}>
                        {post.media.length} image{post.media.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <ScrollView style={styles.platformsContainer}>
                <Text style={styles.platformsTitle}>Choose Platform to Share:</Text>

                {isLoading && (
                  <View style={styles.loadingContainer}>
                    <MaterialCommunityIcons name="loading" size={24} color="#6200ee" />
                    <Text style={styles.loadingText}>Generating sharing links...</Text>
                  </View>
                )}

                {error && (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons name="alert-circle" size={20} color="#f44336" />
                    <Text style={styles.errorText}>
                      Failed to generate sharing links. Please try again.
                    </Text>
                  </View>
                )}

                {sharingData && sharingData.platforms && Object.keys(sharingData.platforms).length > 0 && (
                  <View style={styles.platformsList}>
                    {Object.keys(sharingData.platforms).map(renderPlatformButton)}
                  </View>
                )}

                {/* Done button for approval flow */}
                {(onComplete || onCancel) && (
                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      onPress={onComplete || onCancel}
                      style={styles.doneButton}
                    >
                      <Text style={styles.doneButtonText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Instructions modals for each platform */}
        {sharingData && sharingData.platforms && Object.keys(showInstructions).length > 0 && Object.keys(showInstructions).map(platform => renderInstructionsModal(platform))}
      </>
    );
  } catch (error) {
    console.error('SocialSharingModal render error:', error);
    console.error('SharingData:', sharingData);
    console.error('PropSharingData:', propSharingData);
    console.error('Post:', post);

    // Return a safe fallback
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onCancel || onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onCancel || onClose} style={styles.modalCloseButton}>
                <MaterialCommunityIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.loadingContainer}>
              <MaterialCommunityIcons name="alert-circle" size={24} color="#f44336" />
              <Text style={styles.loadingText}>Error loading sharing modal</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
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
    maxHeight: '80%',
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
  postPreview: {
    margin: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  postPreviewTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  postPreviewText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  mediaPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  mediaPreviewText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#f44336',
    marginLeft: 8,
    flex: 1,
  },
  platformsList: {
    paddingBottom: 20,
  },
  modalFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 16,
  },
  doneButton: {
    backgroundColor: '#6200ee',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    minWidth: 100,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  platformDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  manualBadge: {
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
  manualBadgeText: {
    fontSize: 10,
    color: '#fff',
    marginLeft: 2,
  },
  // Instructions modal styles
  instructionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  instructionsModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    maxWidth: 400,
    width: '100%',
    maxHeight: '80%',
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  instructionsContent: {
    flex: 1,
    padding: 16,
  },
  instructionsNote: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  stepsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stepNumber: {
    width: 20,
    fontSize: 14,
    fontWeight: '600',
    color: '#6200ee',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  contentPreview: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  contentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'white',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#6200ee',
  },
  copyText: {
    fontSize: 12,
    color: '#6200ee',
    marginLeft: 4,
  },
  contentBox: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  contentText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  mediaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  mediaText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  instructionsFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  continueButton: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  continueGradient: {
    padding: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default SocialSharingModal;