import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  Share,
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
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import {
  useFetchPostQuery,
  useApprovePostMutation,
} from '../../features/api/postsApiSlice';

const { width } = Dimensions.get('window');

const ApprovePost = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const currentUser = useSelector(selectCurrentUser);

  const { postId, post: routePost } = route.params || {};

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const {
    data: postData,
    isLoading: postLoading,
    isError: postError,
    refetch: refetchPost,
  } = useFetchPostQuery(postId, { skip: !postId || !!routePost });

  const [approvePost, { isLoading: approvingPost }] = useApprovePostMutation();

  const post = routePost || postData?.post;

  const buildShareText = () => {
    if (!post) return '';
    const tags = post.content?.hashtags?.length
      ? '\n\n' + post.content.hashtags.map(t => `#${t}`).join(' ')
      : '';
    return (post.content?.text || '') + tags;
  };

  const handleApproveAndShare = async () => {
    if (!post) return;
    const resolvedId = (post._id || post.id)?.toString();
    if (!resolvedId || resolvedId === 'undefined') {
      Alert.alert('Error', 'Cannot approve post: missing post ID');
      return;
    }
    try {
      await approvePost({
        postId: resolvedId,
        userId: (currentUser?._id || currentUser?.id)?.toString(),
        action: 'approve',
      }).unwrap();

      const shareText = buildShareText();
      const shareOptions = {
        message: shareText,
        ...(post.media?.[0]?.url ? { url: post.media[0].url } : {}),
      };

      const result = await Share.share(shareOptions);
      if (result.action === Share.sharedAction) {
        setSnackbarMessage('Post shared successfully!');
        setSnackbarVisible(true);
        setTimeout(() => navigation.goBack(), 1500);
      }
    } catch (error) {
      if (error?.message !== 'User did not share') {
        console.error('Failed to approve/share post:', error);
        setSnackbarMessage('Failed to approve post. Please try again.');
        setSnackbarVisible(true);
      }
    }
  };

  const handleShareOnly = async () => {
    try {
      const shareText = buildShareText();
      await Share.share({
        message: shareText,
        ...(post?.media?.[0]?.url ? { url: post.media[0].url } : {}),
      });
    } catch {}
  };

  if (postLoading) {
    return (
      <View style={styles.container}>
        <Header isBack title="Review Post" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      </View>
    );
  }

  if (postError || !post) {
    return (
      <View style={styles.container}>
        <Header isBack title="Review Post" />
        <View style={styles.centered}>
          <Icon name="alert-circle" size={48} color="#e74c3c" />
          <Text style={styles.errorText}>Failed to load post</Text>
          <Button mode="contained" onPress={() => refetchPost()}>Retry</Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header isBack title="Review Post" />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status */}
        <Card style={styles.card}>
          <Card.Content style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <Icon name="clock" size={14} color="#f39c12" />
              <Text style={styles.statusText}>PENDING APPROVAL</Text>
            </View>
            <Text style={styles.dateText}>
              {new Date(post.createdAt).toLocaleString()}
            </Text>
          </Card.Content>
        </Card>

        {/* Content */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Generated Content</Text>
            <Text style={styles.postText}>{post.content?.text}</Text>

            {post.content?.hashtags?.length > 0 && (
              <View style={styles.hashtagRow}>
                {post.content.hashtags.map((tag, i) => (
                  <Chip key={i} mode="outlined" compact textStyle={styles.chipText} style={styles.chip}>
                    #{tag}
                  </Chip>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Media */}
        {post.media?.length > 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Media</Text>
              <Image
                source={{ uri: post.media[0].url }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
              {post.media.length > 1 && (
                <View style={styles.mediaRow}>
                  {post.media.slice(1, 4).map((m, i) => (
                    <Image key={i} source={{ uri: m.url }} style={styles.thumbImage} resizeMode="cover" />
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Instructions */}
        <Card style={[styles.card, styles.infoCard]}>
          <Card.Content style={styles.infoRow}>
            <Icon name="information" size={22} color="#6c47ff" />
            <Text style={styles.infoText}>
              Tap <Text style={{ fontWeight: '700' }}>Approve & Share</Text> to mark this post as approved and open your device's share sheet to post it to any platform.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          style={styles.cancelBtn}
          disabled={approvingPost}
        >
          Back
        </Button>

        <Button
          mode="outlined"
          onPress={handleShareOnly}
          style={styles.shareBtn}
          icon="share-variant"
          disabled={approvingPost}
        >
          Share Only
        </Button>

        <Button
          mode="contained"
          onPress={handleApproveAndShare}
          disabled={approvingPost}
          style={styles.approveBtn}
          icon={approvingPost ? undefined : 'check'}
          loading={approvingPost}
        >
          {approvingPost ? 'Approving...' : 'Approve & Share'}
        </Button>
      </View>

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
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  errorText: { fontSize: 18, color: '#666', marginVertical: 16, textAlign: 'center' },
  scroll: { flex: 1, padding: 16 },
  card: { marginBottom: 14, borderRadius: 12 },

  // Status
  statusRow: { paddingVertical: 10 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff3cd', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 14, alignSelf: 'flex-start', marginBottom: 6,
  },
  statusText: { fontSize: 11, fontWeight: 'bold', color: '#f39c12', marginLeft: 5 },
  dateText: { fontSize: 13, color: '#888' },

  // Content
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2c3e50', marginBottom: 10 },
  postText: { fontSize: 15, lineHeight: 23, color: '#2c3e50', marginBottom: 12 },
  hashtagRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { marginRight: 6, marginBottom: 6 },
  chipText: { fontSize: 11 },

  // Media
  mediaImage: { width: '100%', height: width * 0.55, borderRadius: 10 },
  mediaRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  thumbImage: { flex: 1, height: 80, borderRadius: 8 },

  // Info
  infoCard: { backgroundColor: '#f0eeff' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoText: { flex: 1, fontSize: 13, color: '#555', lineHeight: 20 },

  // Actions
  actions: {
    flexDirection: 'row', padding: 12, paddingTop: 8,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e0e6ed', gap: 8,
  },
  cancelBtn: { flex: 1 },
  shareBtn: { flex: 1.2 },
  approveBtn: { flex: 1.8 },
});

export default ApprovePost;
