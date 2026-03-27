import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  useTheme,
  Button,
  Snackbar,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../Components/header/Header';
import SocialSharingModal from '../../Components/social/SocialSharingModal';
import {
  useFetchPostQuery,
  useApprovePostMutation,
} from '../../features/api/postsApiSlice';

const { width } = Dimensions.get('window');

const ApprovePost = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  // Get postId from route params
  const { postId, post: routePost } = route.params || {};

  // Component state
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [approvedPost, setApprovedPost] = useState(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // RTK Query hooks
  const {
    data: postData,
    isLoading: postLoading,
    isError: postError,
    refetch: refetchPost
  } = useFetchPostQuery(
    postId,
    { skip: !postId || !!routePost } // Skip if we have post from route
  );

  const [approvePost, { isLoading: approvingPost }] = useApprovePostMutation();

  // Use post from route or from query
  const post = routePost || postData?.post;

  const handleApprovePost = async () => {
    if (!post) return;

    try {
      const response = await approvePost(post.id).unwrap();

      if (response.sharingData) {
        // Show social sharing modal with the approved post
        setApprovedPost({
          ...post,
          ...response.post,
          sharingData: response.sharingData
        });
        setShowSharingModal(true);
      } else {
        // Just show success message if no sharing data
        setSnackbarMessage('Post approved successfully!');
        setSnackbarVisible(true);

        // Navigate back after short delay
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      }
    } catch (error) {
      console.error('Failed to approve post:', error);
      setSnackbarMessage('Failed to approve post. Please try again.');
      setSnackbarVisible(true);
    }
  };

  const handleSharingComplete = () => {
    setShowSharingModal(false);
    setApprovedPost(null);
    setSnackbarMessage('Post shared successfully!');
    setSnackbarVisible(true);

    // Navigate back to pending posts or dashboard
    setTimeout(() => {
      navigation.navigate('PendingPosts');
    }, 1500);
  };

  const handleSharingCancel = () => {
    setShowSharingModal(false);
    setApprovedPost(null);

    // Still navigate back since post was approved
    setTimeout(() => {
      navigation.goBack();
    }, 1000);
  };

  const renderMediaPreview = () => {
    if (!post.media || post.media.length === 0) return null;

    const mainMedia = post.media[0];

    return (
      <Card style={styles.mediaCard}>
        <Card.Content style={styles.mediaCardContent}>
          <Text style={styles.sectionTitle}>Media Content</Text>
          <View style={styles.mediaContainer}>
            <Image
              source={{ uri: mainMedia.url }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
            {post.media.length > 1 && (
              <View style={styles.mediaGrid}>
                {post.media.slice(1, 4).map((media, index) => (
                  <Image
                    key={index}
                    source={{ uri: media.url }}
                    style={styles.additionalMedia}
                    resizeMode="cover"
                  />
                ))}
                {post.media.length > 4 && (
                  <View style={styles.moreMediaOverlay}>
                    <Text style={styles.moreMediaText}>+{post.media.length - 4}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderPlatformPreview = (platform) => {
    const platformIcons = {
      facebook: 'facebook',
      instagram: 'instagram',
      twitter: 'twitter',
      linkedin: 'linkedin',
    };

    const platformColors = {
      facebook: '#1877F2',
      instagram: '#E4405F',
      twitter: '#1DA1F2',
      linkedin: '#0A66C2',
    };

    return (
      <Card key={platform.platform} style={[styles.platformPreview, { borderLeftColor: platformColors[platform.platform] }]}>
        <Card.Content style={styles.platformContent}>
          <View style={styles.platformHeader}>
            <Icon
              name={platformIcons[platform.platform]}
              size={24}
              color={platformColors[platform.platform]}
            />
            <View style={styles.platformInfo}>
              <Text style={styles.platformName}>{platform.accountName}</Text>
              <Text style={styles.platformStatus}>{platform.status}</Text>
            </View>
          </View>

          <Text style={styles.platformContentText} numberOfLines={3}>
            {post.content.text}
          </Text>

          {post.content.hashtags && post.content.hashtags.length > 0 && (
            <View style={styles.hashtagPreview}>
              {post.content.hashtags.slice(0, 3).map((tag, index) => (
                <Chip
                  key={index}
                  mode="outlined"
                  compact
                  textStyle={styles.chipText}
                  style={styles.hashtagChip}
                >
                  #{tag}
                </Chip>
              ))}
              {post.content.hashtags.length > 3 && (
                <Text style={styles.moreHashtags}>+{post.content.hashtags.length - 3} more</Text>
              )}
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (postLoading) {
    return (
      <View style={styles.container}>
        <Header isBack={true} title="Approve Post" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading post details...</Text>
        </View>
      </View>
    );
  }

  if (postError || !post) {
    return (
      <View style={styles.container}>
        <Header isBack={true} title="Approve Post" />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color="#e74c3c" />
          <Text style={styles.errorText}>Failed to load post details</Text>
          <Button mode="contained" onPress={() => refetchPost()}>
            Retry
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header isBack={true} title="Approve Post" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Post Status */}
        <Card style={styles.statusCard}>
          <Card.Content style={styles.statusContent}>
            <View style={styles.statusBadge}>
              <Icon name="clock" size={16} color="#f39c12" />
              <Text style={styles.statusText}>PENDING APPROVAL</Text>
            </View>
            <Text style={styles.createdDate}>
              Created {new Date(post.createdAt).toLocaleDateString()} at{' '}
              {new Date(post.createdAt).toLocaleTimeString()}
            </Text>
          </Card.Content>
        </Card>

        {/* Post Content */}
        <Card style={styles.contentCard}>
          <Card.Content style={styles.contentCardContent}>
            <Text style={styles.sectionTitle}>Post Content</Text>
            <Text style={styles.postText}>{post.content.text}</Text>

            {post.content.hashtags && post.content.hashtags.length > 0 && (
              <View style={styles.hashtagContainer}>
                <Text style={styles.hashtagLabel}>Hashtags:</Text>
                <View style={styles.hashtagsList}>
                  {post.content.hashtags.map((tag, index) => (
                    <Chip
                      key={index}
                      mode="outlined"
                      compact
                      textStyle={styles.chipText}
                      style={styles.hashtagChip}
                    >
                      #{tag}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Media Preview */}
        {renderMediaPreview()}

        {/* Platform Previews */}
        <View style={styles.platformSection}>
          <Text style={styles.sectionTitle}>Platform Previews</Text>
          <Text style={styles.sectionSubtitle}>
            Here's how your post will appear on each platform:
          </Text>

          {post.targetPlatforms.map((platform) => renderPlatformPreview(platform))}
        </View>

        {/* Scheduling Info */}
        {post.scheduling && post.scheduling.type !== 'immediate' && (
          <Card style={styles.schedulingCard}>
            <Card.Content style={styles.schedulingContent}>
              <Text style={styles.sectionTitle}>Scheduling Details</Text>
              <View style={styles.schedulingInfo}>
                <Icon name="calendar-clock" size={20} color={theme.colors.primary} />
                <View style={styles.schedulingText}>
                  <Text style={styles.schedulingType}>
                    Type: {post.scheduling.type.charAt(0).toUpperCase() + post.scheduling.type.slice(1)}
                  </Text>
                  {post.scheduling.scheduledAt && (
                    <Text style={styles.schedulingDate}>
                      Scheduled for: {new Date(post.scheduling.scheduledAt).toLocaleString()}
                    </Text>
                  )}
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}
          disabled={approvingPost}
        >
          Back
        </Button>

        <Button
          mode="contained"
          onPress={handleApprovePost}
          disabled={approvingPost}
          style={styles.approveButton}
          icon={approvingPost ? undefined : "check"}
          loading={approvingPost}
        >
          {approvingPost ? 'Approving...' : 'Approve & Share'}
        </Button>
      </View>

      {/* Social Sharing Modal */}
      {approvedPost && (
        <SocialSharingModal
          visible={showSharingModal}
          post={approvedPost}
          sharingData={approvedPost?.sharingData}
          onComplete={handleSharingComplete}
          onCancel={handleSharingCancel}
        />
      )}

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginVertical: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  statusContent: {
    paddingVertical: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f39c12',
    marginLeft: 6,
  },
  createdDate: {
    fontSize: 14,
    color: '#666',
  },
  contentCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  contentCardContent: {
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  postText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2c3e50',
    marginBottom: 16,
  },
  hashtagContainer: {
    marginTop: 8,
  },
  hashtagLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  hashtagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  hashtagChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    fontSize: 12,
  },
  mediaCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  mediaCardContent: {
    paddingVertical: 16,
  },
  mediaContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  mediaImage: {
    width: '100%',
    height: width * 0.6,
  },
  mediaGrid: {
    flexDirection: 'row',
    marginTop: 8,
  },
  additionalMedia: {
    width: (width - 80) / 3,
    height: 80,
    marginRight: 8,
    borderRadius: 8,
  },
  moreMediaOverlay: {
    width: (width - 80) / 3,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  moreMediaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  platformSection: {
    marginBottom: 16,
  },
  platformPreview: {
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  platformContent: {
    paddingVertical: 12,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  platformInfo: {
    marginLeft: 12,
    flex: 1,
  },
  platformName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  platformStatus: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  platformContentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#2c3e50',
    marginBottom: 8,
  },
  hashtagPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  moreHashtags: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  schedulingCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  schedulingContent: {
    paddingVertical: 12,
  },
  schedulingInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  schedulingText: {
    marginLeft: 12,
    flex: 1,
  },
  schedulingType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  schedulingDate: {
    fontSize: 14,
    color: '#666',
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e6ed',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  approveButton: {
    flex: 2,
  },
});

export default ApprovePost;