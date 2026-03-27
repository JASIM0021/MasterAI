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
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApprovePostMutation } from '../../../features/api/postsApiSlice';
import { selectCurrentUser } from '../../../features/auth/authSlice';
import { useSelector } from 'react-redux';
import SocialMediaShare from './SocialMediaShare';

const { width } = Dimensions.get('window');

const PendingPostPreview = ({ visible, post, onClose, onApproved }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingData, setSharingData] = useState(null);
  const [approvePost, { isLoading: isApproving }] = useApprovePostMutation();
  const currentUser = useSelector(selectCurrentUser);

  const handleApprove = async () => {
    try {
      const result = await approvePost({
        postId: post.id,
        userId: currentUser?._id || currentUser?.id,
        action: 'approve'
      }).unwrap();

      // Show success feedback
      Alert.alert(
        'Post Approved! 🎉',
        'Your post has been approved and is ready to share to social media platforms.',
        [
          {
            text: 'Share Now',
            onPress: () => {
              setSharingData(result.sharingData);
              setShowShareModal(true);
            }
          },
          {
            text: 'Share Later',
            style: 'cancel',
            onPress: () => {
              onApproved?.(result.post);
              onClose();
            }
          }
        ]
      );

    } catch (error) {
      console.error('Approval failed:', error);
      Alert.alert(
        'Approval Failed',
        error?.data?.message || 'Failed to approve post. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleReject = async () => {
    Alert.prompt(
      'Reject Post',
      'Please provide a reason for rejecting this post (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (reason) => {
            try {
              await approvePost({
                postId: post.id,
                userId: currentUser?._id || currentUser?.id,
                action: 'reject',
                rejectionReason: reason || 'No reason provided'
              }).unwrap();

              Alert.alert(
                'Post Rejected',
                'The post has been rejected and removed from your pending list.',
                [{ text: 'OK', onPress: () => { onApproved?.(null); onClose(); } }]
              );

            } catch (error) {
              console.error('Rejection failed:', error);
              Alert.alert(
                'Rejection Failed',
                error?.data?.message || 'Failed to reject post. Please try again.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      ],
      'plain-text'
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getPlatformIcon = (platform) => {
    const icons = {
      facebook: 'facebook',
      instagram: 'instagram',
      linkedin: 'linkedin',
      twitter: 'twitter',
    };
    return icons[platform] || 'web';
  };

  const getPlatformColor = (platform) => {
    const colors = {
      facebook: '#1877F2',
      instagram: '#E4405F',
      linkedin: '#0A66C2',
      twitter: '#1DA1F2',
    };
    return colors[platform] || '#666';
  };

  if (!post) return null;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Post Preview</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Post Status */}
            <View style={styles.statusCard}>
              <View style={styles.statusBadge}>
                <Icon name="clock-alert" size={16} color="#f39c12" />
                <Text style={styles.statusText}>PENDING APPROVAL</Text>
              </View>
              <Text style={styles.createdDate}>
                Generated on {formatDate(post.createdAt)}
              </Text>
            </View>

            {/* AI Generation Info */}
            {post.isAiGenerated && (
              <View style={styles.aiCard}>
                <View style={styles.aiHeader}>
                  <Icon name="robot" size={20} color="#6200ee" />
                  <Text style={styles.aiTitle}>AI Generated Content</Text>
                </View>
                <View style={styles.aiInfo}>
                  <Text style={styles.aiLabel}>Topic:</Text>
                  <Text style={styles.aiValue}>{post.aiGeneration?.topic || 'General'}</Text>
                </View>
                <View style={styles.aiInfo}>
                  <Text style={styles.aiLabel}>Tone:</Text>
                  <Text style={styles.aiValue}>{post.aiGeneration?.tone || 'Professional'}</Text>
                </View>
                {post.aiGeneration?.contentType && (
                  <View style={styles.aiInfo}>
                    <Text style={styles.aiLabel}>Type:</Text>
                    <Text style={styles.aiValue}>{post.aiGeneration.contentType}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Content Preview */}
            <View style={styles.contentCard}>
              <Text style={styles.cardTitle}>Content</Text>
              <View style={styles.postPreview}>
                <Text style={styles.postText}>{post.content.text}</Text>

                {/* Hashtags */}
                {post.content.hashtags && post.content.hashtags.length > 0 && (
                  <View style={styles.hashtagsContainer}>
                    {post.content.hashtags.map((hashtag, index) => (
                      <View key={index} style={styles.hashtagBubble}>
                        <Text style={styles.hashtagText}>{hashtag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Mentions */}
                {post.content.mentions && post.content.mentions.length > 0 && (
                  <View style={styles.mentionsContainer}>
                    {post.content.mentions.map((mention, index) => (
                      <Text key={index} style={styles.mentionText}>{mention}</Text>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Media Preview */}
            {post.media && post.media.length > 0 && (
              <View style={styles.contentCard}>
                <Text style={styles.cardTitle}>Media</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {post.media.map((mediaItem, index) => (
                    <View key={index} style={styles.mediaContainer}>
                      {mediaItem.type === 'image' ? (
                        <Image source={{ uri: mediaItem.url }} style={styles.mediaImage} />
                      ) : (
                        <View style={styles.mediaPlaceholder}>
                          <Icon name="play-circle" size={40} color="#666" />
                          <Text style={styles.mediaType}>{mediaItem.type.toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Target Platforms */}
            <View style={styles.contentCard}>
              <Text style={styles.cardTitle}>Target Platforms</Text>
              <View style={styles.platformsContainer}>
                {post.targetPlatforms.map((platform, index) => (
                  <View key={index} style={styles.platformCard}>
                    <Icon
                      name={getPlatformIcon(platform.platform)}
                      size={24}
                      color={getPlatformColor(platform.platform)}
                    />
                    <View style={styles.platformInfo}>
                      <Text style={styles.platformName}>{platform.platform}</Text>
                      <Text style={styles.accountName}>{platform.accountName}</Text>
                    </View>
                    <View style={[styles.statusDot, { backgroundColor: '#f39c12' }]} />
                  </View>
                ))}
              </View>
            </View>

            {/* Category and Tags */}
            <View style={styles.contentCard}>
              <Text style={styles.cardTitle}>Classification</Text>
              <View style={styles.classificationContainer}>
                <View style={styles.categoryContainer}>
                  <Text style={styles.label}>Category:</Text>
                  <View style={styles.categoryTag}>
                    <Text style={styles.categoryText}>{post.category}</Text>
                  </View>
                </View>
                {post.tags && post.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    <Text style={styles.label}>Tags:</Text>
                    <View style={styles.tagsRow}>
                      {post.tags.map((tag, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{tag}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.rejectButton}
              onPress={handleReject}
              disabled={isApproving}
            >
              <Icon name="close" size={20} color="#e74c3c" />
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.approveButton}
              onPress={handleApprove}
              disabled={isApproving}
            >
              <LinearGradient
                colors={['#27ae60', '#2ecc71']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.approveGradient}
              >
                {isApproving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Icon name="check" size={20} color="#ffffff" />
                )}
                <Text style={styles.approveText}>
                  {isApproving ? 'Approving...' : 'Approve & Share'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Social Media Share Modal */}
      <SocialMediaShare
        visible={showShareModal}
        sharingData={sharingData}
        onClose={() => {
          setShowShareModal(false);
          setSharingData(null);
          onApproved?.(post);
          onClose();
        }}
      />
    </>
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
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f39c12',
    marginLeft: 6,
  },
  createdDate: {
    fontSize: 12,
    color: '#666',
  },
  aiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6200ee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 8,
  },
  aiInfo: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  aiLabel: {
    fontSize: 14,
    color: '#666',
    width: 60,
    fontWeight: '500',
  },
  aiValue: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
    textTransform: 'capitalize',
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  postPreview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  postText: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 24,
    marginBottom: 12,
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  hashtagBubble: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  hashtagText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  mentionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  mentionText: {
    fontSize: 14,
    color: '#6200ee',
    marginRight: 8,
    fontWeight: '500',
  },
  mediaContainer: {
    marginRight: 12,
  },
  mediaImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  mediaPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e6ed',
  },
  mediaType: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  platformsContainer: {
    gap: 8,
  },
  platformCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e6ed',
  },
  platformInfo: {
    flex: 1,
    marginLeft: 12,
  },
  platformName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    textTransform: 'capitalize',
  },
  accountName: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  classificationContainer: {
    gap: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginRight: 8,
  },
  categoryTag: {
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    color: '#27ae60',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  tagsContainer: {
    gap: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    color: '#666',
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
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  rejectText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '600',
    marginLeft: 6,
  },
  approveButton: {
    flex: 2,
  },
  approveGradient: {
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
  approveText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default PendingPostPreview;