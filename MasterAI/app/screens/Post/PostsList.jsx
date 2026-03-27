import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  useTheme,
  IconButton,
  Button,
  Snackbar,
  ActivityIndicator,
  Menu,
  Chip,
  Searchbar,
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../Components/header/Header';
import SocialSharingModal from '../../Components/social/SocialSharingModal';
import {
  useFetchPostsQuery,
  useLazyFetchPostsQuery,
  useDeletePostMutation,
} from '../../features/api/postsApiSlice';
import { selectIsAuthenticated } from '../../features/auth/authSlice';
import SocialMediaShare from '../SocialAutomate/components/SocialMediaShare';

const { width } = Dimensions.get('window');

const PostsList = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Component state
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Handle route parameters for initial filter
  useEffect(() => {
    if (route.params?.statusFilter) {
      setStatusFilter(route.params.statusFilter);
    }
  }, [route.params?.statusFilter]);

  // RTK Query hooks
  const {
    data: postsData,
    isLoading: postsLoading,
    isError: postsError,
    refetch: refetchPosts
  } = useFetchPostsQuery(
    {
      status: statusFilter !== 'all' ? statusFilter : undefined,
      limit: 50
    },
    { skip: !isAuthenticated }
  );

  const [deletePost, { isLoading: deletingPost }] = useDeletePostMutation();

  // Derived data
  const posts = postsData?.posts || [];
  const filteredPosts = posts.filter(post => {
    if (searchQuery.trim()) {
      return post.content.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
             post.content.hashtags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return true;
  });

  const statusOptions = [
    { value: 'all', label: 'All Posts', icon: 'view-list', count: posts.length },
    { value: 'draft', label: 'Draft', icon: 'file-document-edit', count: posts.filter(p => p.status === 'draft').length },
    { value: 'pending_approval', label: 'Pending', icon: 'clock', count: posts.filter(p => p.status === 'pending_approval').length },
    { value: 'approved', label: 'Approved', icon: 'check-circle', count: posts.filter(p => p.status === 'approved').length },
    { value: 'scheduled', label: 'Scheduled', icon: 'calendar-clock', count: posts.filter(p => p.status === 'scheduled').length },
    { value: 'published', label: 'Published', icon: 'send', count: posts.filter(p => p.status === 'published').length },
  ];

  const handleResharePost = (post) => {
    setSelectedPost(post);
    setShowSharingModal(true);
  };

  const handleViewPost = (post) => {
    navigation.navigate('ApprovePost', {
      postId: post.id,
      post: post
    });
  };

  const handleDeletePost = async (postId) => {
    try {
      await deletePost(postId).unwrap();
      setSnackbarMessage('Post deleted successfully');
      setSnackbarVisible(true);
      refetchPosts();
    } catch (error) {
      console.error('Failed to delete post:', error);
      setSnackbarMessage('Failed to delete post. Please try again.');
      setSnackbarVisible(true);
    }
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

  const getStatusColor = (status) => {
    const colors = {
      draft: '#f39c12',
      pending_approval: '#e67e22',
      approved: '#27ae60',
      scheduled: '#3498db',
      published: '#2ecc71',
      failed: '#e74c3c',
      cancelled: '#95a5a6',
    };
    return colors[status] || '#666';
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: 'file-document-edit',
      pending_approval: 'clock',
      approved: 'check-circle',
      scheduled: 'calendar-clock',
      published: 'send',
      failed: 'alert-circle',
      cancelled: 'cancel',
    };
    return icons[status] || 'help-circle';
  };

  const renderPostActions = (post) => {
    const actions = [];

    // Always allow viewing
    actions.push(
      <IconButton
        key="view"
        icon="eye"
        size={20}
        iconColor={theme.colors.primary}
        onPress={() => handleViewPost(post)}
      />
    );

    // Allow resharing for approved posts
    if (post.status === 'approved') {
      actions.push(
        <IconButton
          key="reshare"
          icon="share"
          size={20}
          iconColor="#27ae60"
          onPress={() => handleResharePost(post)}
        />
      );
    }

    // Allow deletion for draft/failed posts
    if (['draft', 'failed', 'cancelled'].includes(post.status)) {
      actions.push(
        <IconButton
          key="delete"
          icon="delete"
          size={20}
          iconColor="#e74c3c"
          onPress={() => handleDeletePost(post.id)}
          disabled={deletingPost}
        />
      );
    }

    return actions;
  };

  const renderPostItem = ({ item: post }) => {
    const hasMedia = post.media && post.media.length > 0;
    const mainMedia = hasMedia ? post.media[0] : null;

    return (
      <Card style={styles.postCard}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(post.status) + '20' }]}>
            <Icon
              name={getStatusIcon(post.status)}
              size={12}
              color={getStatusColor(post.status)}
            />
            <Text style={[styles.statusText, { color: getStatusColor(post.status) }]}>
              {post.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.postDate}>
            {new Date(post.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* Post Content */}
        <TouchableOpacity onPress={() => handleViewPost(post)}>
          <Text style={styles.postContent} numberOfLines={3}>
            {post.content.text}
          </Text>

          {/* Hashtags */}
          {post.content.hashtags && post.content.hashtags.length > 0 && (
            <View style={styles.hashtagContainer}>
              {post.content.hashtags.slice(0, 3).map((tag, index) => (
                <Chip key={index} compact mode="outlined" style={styles.hashtagChip}>
                  #{tag}
                </Chip>
              ))}
              {post.content.hashtags.length > 3 && (
                <Text style={styles.moreHashtags}>+{post.content.hashtags.length - 3} more</Text>
              )}
            </View>
          )}

          {/* Media Preview */}
          {mainMedia && (
            <View style={styles.mediaContainer}>
              <Image
                source={{ uri: mainMedia.url }}
                style={styles.mediaPreview}
                resizeMode="cover"
              />
              {post.media.length > 1 && (
                <View style={styles.mediaCountBadge}>
                  <Text style={styles.mediaCountText}>+{post.media.length - 1}</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Target Platforms */}
        <View style={styles.platformsContainer}>
          <View style={styles.platformsList}>
            {post.targetPlatforms.slice(0, 4).map((platform, index) => (
              <View key={index} style={styles.platformTag}>
                <Icon
                  name={platform.platform}
                  size={14}
                  color={theme.colors.primary}
                />
                <Text style={styles.platformTagText}>{platform.accountName}</Text>
              </View>
            ))}
            {post.targetPlatforms.length > 4 && (
              <Text style={styles.morePlatforms}>+{post.targetPlatforms.length - 4} more</Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {renderPostActions(post)}
        </View>
      </Card>
    );
  };

  const renderFilterItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        statusFilter === item.value && styles.filterChipActive
      ]}
      onPress={() => {
        setStatusFilter(item.value);
        setShowFilterMenu(false);
      }}
    >
      <Icon
        name={item.icon}
        size={16}
        color={statusFilter === item.value ? '#fff' : theme.colors.primary}
      />
      <Text style={[
        styles.filterChipText,
        statusFilter === item.value && styles.filterChipTextActive
      ]}>
        {item.label} ({item.count})
      </Text>
    </TouchableOpacity>
  );

  if (postsLoading) {
    return (
      <View style={styles.container}>
        <Header isBack={true} title="Posts" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      </View>
    );
  }

  if (postsError) {
    return (
      <View style={styles.container}>
        <Header isBack={true} title="Posts" />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color="#e74c3c" />
          <Text style={styles.errorText}>Failed to load posts</Text>
          <Button mode="contained" onPress={() => refetchPosts()}>
            Retry
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header isBack={true} title="Posts" />

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search posts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
        />

        <Menu
          visible={showFilterMenu}
          onDismiss={() => setShowFilterMenu(false)}
          anchor={
            <IconButton
              icon="filter-variant"
              iconColor={theme.colors.primary}
              size={24}
              onPress={() => setShowFilterMenu(true)}
            />
          }
        >
          {statusOptions.map((option) => (
            <Menu.Item
              key={option.value}
              onPress={() => {
                setStatusFilter(option.value);
                setShowFilterMenu(false);
              }}
              title={`${option.label} (${option.count})`}
              leadingIcon={option.icon}
              titleStyle={statusFilter === option.value ? { color: theme.colors.primary } : {}}
            />
          ))}
        </Menu>
      </View>

      {/* Filter Chips */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={statusOptions}
          renderItem={renderFilterItem}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      {filteredPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="post" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No matching posts' : 'No posts found'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first automation workflow to generate posts'
            }
          </Text>
          {!searchQuery && (
            <Button
              mode="contained"
              onPress={() => navigation.navigate('CreateAutomation')}
              style={styles.createButton}
            >
              Create Automation
            </Button>
          )}
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''}
              {statusFilter !== 'all' && ` • ${statusOptions.find(o => o.value === statusFilter)?.label}`}
            </Text>
          </View>

          <FlatList
            data={filteredPosts}
            renderItem={renderPostItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={postsLoading}
                onRefresh={refetchPosts}
              />
            }
          />
        </>
      )}

      {/* Social Sharing Modal */}
      {selectedPost && (
        <SocialMediaShare
          visible={showSharingModal}
          sharingData={selectedPost}
          onComplete={handleSharingComplete}
          onClose={handleSharingCancel}
          title="Share Post Again"
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
  createButton: {
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e6ed',
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
    elevation: 0,
    backgroundColor: '#f5f7fa',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e6ed',
  },
  filtersContent: {
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f7fa',
    borderWidth: 1,
    borderColor: '#e0e6ed',
  },
  filterChipActive: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  filterChipText: {
    fontSize: 12,
    marginLeft: 6,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
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
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  hashtagChip: {
    marginRight: 6,
    marginBottom: 4,
  },
  moreHashtags: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  mediaContainer: {
    position: 'relative',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  mediaPreview: {
    width: '100%',
    height: width * 0.4,
    borderRadius: 8,
  },
  mediaCountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mediaCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  platformsContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  platformsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  platformTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 4,
  },
  platformTagText: {
    marginLeft: 4,
    fontSize: 10,
    color: '#666',
  },
  morePlatforms: {
    fontSize: 10,
    color: '#666',
    fontStyle: 'italic',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});

export default PostsList;