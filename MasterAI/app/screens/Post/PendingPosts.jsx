import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  useTheme,
  IconButton,
  Button,
  Snackbar,
  ActivityIndicator,
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../Components/header/Header';
import SocialSharingModal from '../../Components/social/SocialSharingModal';
import {
  useFetchPostsQuery,
  useApprovePostMutation,
} from '../../features/api/postsApiSlice';
import { selectIsAuthenticated } from '../../features/auth/authSlice';

const { width } = Dimensions.get('window');

const PendingPosts = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Component state
  const [selectedPost, setSelectedPost] = useState(null);
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // RTK Query hooks
  const {
    data: postsData,
    isLoading: postsLoading,
    isError: postsError,
    refetch: refetchPosts
  } = useFetchPostsQuery(
    { status: 'pending_approval', limit: 50 },
    { skip: !isAuthenticated }
  );

  const [approvePost, { isLoading: approvingPost }] = useApprovePostMutation();

  // Derived data
  const pendingPosts = postsData?.posts || [];

  const handleApprovePost = async (post) => {
    try {
      const response = await approvePost(post.id).unwrap();

      if (response.sharingData) {
        // Show social sharing modal with the approved post
        setSelectedPost({
          ...post,
          ...response.post,
          sharingData: response.sharingData
        });
        setShowSharingModal(true);
      } else {
        // Just show success message if no sharing data
        setSnackbarMessage('Post approved successfully!');
        setSnackbarVisible(true);
      }

      // Refresh the posts list
      refetchPosts();
    } catch (error) {
      console.error('Failed to approve post:', error);
      setSnackbarMessage('Failed to approve post. Please try again.');
      setSnackbarVisible(true);
    }
  };

  const handlePreviewPost = (post) => {
    navigation.navigate('ApprovePost', {
      postId: post.id,
      post: post
    });
  };

  const handleSharingComplete = () => {
    setShowSharingModal(false);
    setSelectedPost(null);
    setSnackbarMessage('Post shared successfully!');
    setSnackbarVisible(true);
  };

  const handleSharingCancel = () => {
    setShowSharingModal(false);
    setSelectedPost(null);
  };

  const renderPostItem = ({ item: post }) => {
    const hasMedia = post.media && post.media.length > 0;
    const mainMedia = hasMedia ? post.media[0] : null;

    return (
      <Card style={styles.postCard}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View style={styles.pendingBadge}>
            <Icon name="clock" size={12} color="#f39c12" />
            <Text style={styles.pendingText}>PENDING APPROVAL</Text>
          </View>
          <Text style={styles.postDate}>
            {new Date(post.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Post Content */}
        <Text style={styles.postContent}>{post.content.text}</Text>

        {/* Hashtags */}
        {post.content.hashtags && post.content.hashtags.length > 0 && (
          <View style={styles.hashtagContainer}>
            {post.content.hashtags.map((tag, index) => (
              <Text key={index} style={styles.hashtag}>#{tag}</Text>
            ))}
          </View>
        )}

        {/* Media Preview */}
        {mainMedia && (
          <View style={styles.mediaContainer}>
            <Image
              source={{ uri: mainMedia.url }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
            {post.media.length > 1 && (
              <View style={styles.mediaCount}>
                <Text style={styles.mediaCountText}>+{post.media.length - 1}</Text>
              </View>
            )}
          </View>
        )}

        {/* Target Platforms */}
        <View style={styles.platformsContainer}>
          <Text style={styles.platformsLabel}>Target Platforms:</Text>
          <View style={styles.platformsList}>
            {post.targetPlatforms.map((platform, index) => (
              <View key={index} style={styles.platformTag}>
                <Icon
                  name={platform.platform}
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.platformTagText}>{platform.accountName}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Button
            mode="outlined"
            onPress={() => handlePreviewPost(post)}
            style={styles.previewButton}
            labelStyle={styles.previewButtonText}
            icon="eye"
          >
            Preview
          </Button>

          <Button
            mode="contained"
            onPress={() => handleApprovePost(post)}
            disabled={approvingPost}
            style={styles.approveButton}
            labelStyle={styles.approveButtonText}
            icon={approvingPost ? undefined : "check"}
            loading={approvingPost}
          >
            {approvingPost ? 'Approving...' : 'Approve & Share'}
          </Button>
        </View>
      </Card>
    );
  };

  if (postsLoading) {
    return (
      <View style={styles.container}>
        <Header isBack={true} title="Pending Posts" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading pending posts...</Text>
        </View>
      </View>
    );
  }

  if (postsError) {
    return (
      <View style={styles.container}>
        <Header isBack={true} title="Pending Posts" />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color="#e74c3c" />
          <Text style={styles.errorText}>Failed to load pending posts</Text>
          <Button mode="contained" onPress={() => refetchPosts()}>
            Retry
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header isBack={true} title="Pending Posts" />

      {pendingPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="check-all" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Pending Posts</Text>
          <Text style={styles.emptySubtitle}>
            All your generated content has been reviewed!
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('SocialAutomate')}
            style={styles.backButton}
          >
            Back to Dashboard
          </Button>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {pendingPosts.length} post{pendingPosts.length !== 1 ? 's' : ''} waiting for approval
            </Text>
          </View>

          <FlatList
            data={pendingPosts}
            renderItem={renderPostItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshing={postsLoading}
            onRefresh={refetchPosts}
          />
        </>
      )}

      {/* Social Sharing Modal */}
      <SocialSharingModal
        visible={showSharingModal}
        post={selectedPost}
        sharingData={selectedPost?.sharingData}
        onComplete={handleSharingComplete}
        onCancel={handleSharingCancel}
      />

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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e6ed',
  },
  headerText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  postCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#f39c12',
    marginLeft: 4,
  },
  postDate: {
    fontSize: 12,
    color: '#666',
  },
  postContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2c3e50',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  hashtagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  hashtag: {
    color: '#3498db',
    marginRight: 8,
    marginBottom: 4,
    fontSize: 14,
  },
  mediaContainer: {
    position: 'relative',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  mediaImage: {
    width: '100%',
    height: width * 0.5,
    borderRadius: 8,
  },
  mediaCount: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mediaCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  platformsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  platformsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  platformsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  platformTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  platformTagText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  previewButton: {
    flex: 1,
  },
  previewButtonText: {
    fontSize: 12,
  },
  approveButton: {
    flex: 2,
  },
  approveButtonText: {
    fontSize: 12,
  },
});

export default PendingPosts;