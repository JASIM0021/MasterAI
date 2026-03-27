import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  FlatList,
  RefreshControl,
  Share,
  Linking,
} from 'react-native';
import {
  Appbar,
  Text,
  Card,
  Button,
  Chip,
  Portal,
  Dialog,
  ActivityIndicator,
  Menu,
  IconButton,
  ProgressBar,
  Surface,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { Video } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';
import { ShowAlertMsg } from '../../helper/ShowAlert';

// Redux hooks
import {
  useGetMyVideosQuery,
  useDeleteVideoMutation,
  useCheckVideoStatusQuery
} from '../../features/api/videosApiSlice';

// Constants and themes
import { SCREEN_NAME } from '../../Constant';
import { responsiveHeight, responsiveWidth } from '../../themes';

const { width, height } = Dimensions.get('window');

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const MyVideosScreen = () => {
  const navigation = useNavigation();

  // Local state
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [menuVisible, setMenuVisible] = useState({});

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // API hooks
  const {
    data: videosData,
    isLoading: videosLoading,
    refetch: refetchVideos
  } = useGetMyVideosQuery({
    status: selectedFilter === 'all' ? undefined : selectedFilter,
    limit: 50,
    skip: 0,
  });
  const [deleteVideo] = useDeleteVideoMutation();

  // Animation setup
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Auto refresh for processing videos
  useEffect(() => {
    const hasProcessingVideos = videosData?.videos?.some(
      video => video.status === 'processing' || video.status === 'pending'
    );

    if (hasProcessingVideos) {
      const interval = setInterval(() => {
        refetchVideos();
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [videosData, refetchVideos]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchVideos();
    setRefreshing(false);
  };

  const handleDeleteVideo = async () => {
    if (!selectedVideo) return;

    try {
      await deleteVideo(selectedVideo.id).unwrap();
      setShowDeleteDialog(false);
      setSelectedVideo(null);
      refetchVideos();
      ShowAlertMsg.showSuccess('Video deleted successfully!');
    } catch (error) {
      console.error('Error deleting video:', error);
      ShowAlertMsg.showError('Failed to delete video. Please try again.');
    }
  };

  const handleShareVideo = async (video) => {
    if (!video.video?.url) {
      ShowAlertMsg.showWarn(`Video is currently ${video.status}. Sharing will be available once generation is completed.`);
      return;
    }

    try {
      ShowAlertMsg.showWarn('Preparing video for sharing...');

      // Download video to temp location for sharing
      const videoFileName = `MasterAI_${Date.now()}.mp4`;
      const localUri = `${FileSystem.documentDirectory}${videoFileName}`;

      // Download video file
      const downloadResult = await FileSystem.downloadAsync(video.video.url, localUri);

      if (!downloadResult.uri) {
        throw new Error('Failed to download video file');
      }

      // Create MasterAI branded share message
      const shareMessage = `🎬 Amazing AI-Generated Video!\n\n` +
        `📝 Prompt: "${video.prompt?.original || 'Custom video'}"\n` +
        `⏱️ Duration: ${video.config?.duration || 'N/A'}s\n` +
        `🎭 Model: ${video.config?.model === 'fast' ? 'Fast AI' : 'Premium AI'}\n\n` +
        `✨ Created with MasterAI - The Ultimate AI Video Generator!\n\n` +
        `📱 Download MasterAI: https://play.google.com/store/apps/details?id=com.masterai.video\n` +
        `🔗 Get it now and create your own AI videos!\n\n` +
        `#AIVideo #MasterAI #VideoGeneration #AI`;

      // Share the actual video file with branded message
      await Share.share({
        message: shareMessage,
        url: downloadResult.uri,
        title: 'MasterAI - AI Video Generator'
      });

      // Clean up temp file after sharing
      setTimeout(async () => {
        try {
          await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
        } catch (cleanupError) {
          console.log('Cleanup error (non-critical):', cleanupError);
        }
      }, 5000);

    } catch (error) {
      console.error('Error sharing video:', error);
      ShowAlertMsg.showError('Unable to share video file. Please check your internet connection and try again.');
    }
  };

  const handleDownloadVideo = async (video) => {
    if (!video.video?.url) {
      ShowAlertMsg.showWarn(`Video is currently ${video.status}. Download will be available once generation is completed.`);
      return;
    }

    try {
      // Request notification permissions
      const notificationStatus = await Notifications.requestPermissionsAsync();

      // Request media library permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        ShowAlertMsg.showError('Please grant media library permission to download videos to your device.');
        return;
      }

      // Create unique filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const videoFileName = `MasterAI_Video_${timestamp}.mp4`;
      const localUri = `${FileSystem.documentDirectory}${videoFileName}`;

      // Show download started notification
      if (notificationStatus.granted) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '📥 Video Download Started',
            body: 'Your AI video is being downloaded...',
            data: { type: 'download_started' },
          },
          trigger: null,
        });
      }

      // Show download progress toast
      ShowAlertMsg.showWarn('Downloading video... Please wait');

      // Download the video file with progress tracking
      const downloadResumable = FileSystem.createDownloadResumable(
        video.video.url,
        localUri,
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          console.log(`Download progress: ${Math.round(progress * 100)}%`);
        }
      );

      const downloadResult = await downloadResumable.downloadAsync();

      if (!downloadResult || !downloadResult.uri) {
        throw new Error('Download failed - no file received');
      }

      // Save to device media library (gallery/photos app)
      const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);

      // Optionally create/add to MasterAI album
      try {
        let album = await MediaLibrary.getAlbumAsync('MasterAI Videos');
        if (!album) {
          album = await MediaLibrary.createAlbumAsync('MasterAI Videos', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
      } catch (albumError) {
        console.log('Album creation error (non-critical):', albumError);
      }

      // Clean up temp file
      await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });

      // Show download complete notification
      if (notificationStatus.granted) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '✅ Video Downloaded Successfully!',
            body: `${videoFileName} saved to your gallery`,
            data: { type: 'download_complete', filename: videoFileName },
          },
          trigger: null,
        });
      }

      // Show success message
      ShowAlertMsg.showSuccess(`🎉 Download Complete! Video saved as ${videoFileName}`);

    } catch (error) {
      console.error('Error downloading video:', error);

      // Show download failed notification
      const notificationStatus = await Notifications.getPermissionsAsync();
      if (notificationStatus.granted) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '❌ Video Download Failed',
            body: 'Please check your connection and try again',
            data: { type: 'download_failed' },
          },
          trigger: null,
        });
      }

      ShowAlertMsg.showError('Download Failed. Please check your internet connection and storage space, then try again.');
    }
  };

  const toggleMenu = (videoId) => {
    setMenuVisible(prev => ({
      ...prev,
      [videoId]: !prev[videoId]
    }));
  };

  // Helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#27ae60';
      case 'processing':
        return '#f39c12';
      case 'pending':
        return '#3498db';
      case 'failed':
        return '#e74c3c';
      default:
        return '#7f8c8d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'processing':
        return 'cog';
      case 'pending':
        return 'clock';
      case 'failed':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  const getProgressValue = (status, progress) => {
    if (status === 'completed') return 1;
    if (status === 'failed') return 0;
    return progress || 0;
  };

  // Filter options
  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'completed', label: 'Completed' },
    { value: 'processing', label: 'Processing' },
    { value: 'pending', label: 'Pending' },
    { value: 'failed', label: 'Failed' },
  ];

  // Render functions
  const renderHeader = () => (
    <Appbar.Header style={styles.header}>
      <Appbar.BackAction onPress={() => navigation.goBack()} color="#FFFFFF" />
      <Appbar.Content
        title="My Videos"
        titleStyle={styles.headerTitle}
      />
      <Appbar.Action
        icon="plus"
        iconColor="#FFFFFF"
        onPress={() => navigation.navigate(SCREEN_NAME.VideoGeneration)}
      />
    </Appbar.Header>
  );

  const renderFilters = () => (
    <Animated.View
      style={[
        styles.filtersContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersList}
      >
        {filterOptions.map((filter) => (
          <Chip
            key={filter.value}
            mode={selectedFilter === filter.value ? 'flat' : 'outlined'}
            selected={selectedFilter === filter.value}
            onPress={() => setSelectedFilter(filter.value)}
            style={[
              styles.filterChip,
              selectedFilter === filter.value && styles.selectedFilterChip
            ]}
            textStyle={
              selectedFilter === filter.value ? styles.selectedFilterText : styles.filterText
            }
          >
            {filter.label}
          </Chip>
        ))}
      </ScrollView>
    </Animated.View>
  );

  const renderVideoCard = ({ item: video }) => (
    <Surface style={styles.videoCard} elevation={3}>
      <View style={styles.cardContent}>
        {/* Video thumbnail/player */}
        <View style={styles.videoContainer}>
          {video.status === 'completed' && video.video?.url ? (
            <Video
              source={{ uri: video.video.url }}
              style={styles.video}
              useNativeControls
              resizeMode="contain"
              isLooping={false}
            />
          ) : (
            <LinearGradient
              colors={
                video.status === 'processing' ? ['#4facfe', '#00f2fe'] :
                video.status === 'pending' ? ['#667eea', '#764ba2'] :
                video.status === 'failed' ? ['#ff4757', '#ff3838'] :
                ['#2c3e50', '#34495e']
              }
              style={styles.videoPlaceholder}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons
                name={getStatusIcon(video.status)}
                size={48}
                color="#FFFFFF"
              />
              <Text style={styles.placeholderText}>
                {video.status === 'processing' ? 'AI is creating your video...' :
                 video.status === 'pending' ? 'Waiting in queue...' :
                 video.status === 'failed' ? 'Generation failed' : 'Loading...'}
              </Text>
              {video.status === 'processing' && (
                <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 8 }} />
              )}
            </LinearGradient>
          )}

          {/* Enhanced Status overlay */}
          <View style={styles.statusOverlay}>
            <LinearGradient
              colors={[getStatusColor(video.status), `${getStatusColor(video.status)}dd`]}
              style={styles.statusChipGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialCommunityIcons
                name={getStatusIcon(video.status)}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.statusText}>
                {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
              </Text>
            </LinearGradient>
          </View>

          {/* Menu button */}
          <Menu
            visible={menuVisible[video.id]}
            onDismiss={() => toggleMenu(video.id)}
            anchor={
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => toggleMenu(video.id)}
              >
                <LinearGradient
                  colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)']}
                  style={styles.menuButtonGradient}
                >
                  <MaterialCommunityIcons
                    name="dots-vertical"
                    size={24}
                    color="#FFFFFF"
                  />
                </LinearGradient>
              </TouchableOpacity>
            }
          >
            {video.status === 'completed' && (
              <>
                <Menu.Item
                  onPress={() => {
                    toggleMenu(video.id);
                    handleShareVideo(video);
                  }}
                  title="Share Video"
                  leadingIcon="share"
                />
                <Menu.Item
                  onPress={() => {
                    toggleMenu(video.id);
                    handleDownloadVideo(video);
                  }}
                  title="Download"
                  leadingIcon="download"
                />
              </>
            )}
            <Menu.Item
              onPress={() => {
                toggleMenu(video.id);
                setSelectedVideo(video);
                setShowDeleteDialog(true);
              }}
              title="Delete"
              leadingIcon="delete"
            />
          </Menu>
        </View>

        {/* Video info */}
        <View style={styles.videoInfo}>
          <Text style={styles.videoPrompt} numberOfLines={2}>
            {video.prompt.original}
          </Text>

          {/* Video details */}
          <View style={styles.videoDetails}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="aspect-ratio" size={14} color="#7f8c8d" />
              <Text style={styles.detailText}>{video.config.aspectRatio}</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="clock" size={14} color="#7f8c8d" />
              <Text style={styles.detailText}>{video.config.duration}s</Text>
            </View>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="quality-high" size={14} color="#7f8c8d" />
              <Text style={styles.detailText}>{video.config.quality}</Text>
            </View>
          </View>

          {/* Template info */}
          {video.template && (
            <View style={styles.templateInfo}>
              <MaterialCommunityIcons name="view-grid" size={14} color="#667eea" />
              <Text style={styles.templateText}>{video.template.name}</Text>
            </View>
          )}

          {/* Progress bar for processing videos */}
          {(video.status === 'processing' || video.status === 'pending') && (
            <View style={styles.progressContainer}>
              <ProgressBar
                progress={getProgressValue(video.status, video.progress)}
                color="#667eea"
                style={styles.progressBar}
              />
              <Text style={styles.progressText}>
                {video.progress ? `${Math.round(video.progress * 100)}%` : 'Waiting...'}
              </Text>
            </View>
          )}

          {/* Enhanced Action buttons */}
          <View style={styles.actionButtons}>
            {video.status === 'completed' && (
              <>
                <TouchableOpacity
                  style={[styles.modernActionBtn, styles.shareBtn]}
                  onPress={() => handleShareVideo(video)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#667eea', '#764ba2']}
                    style={styles.actionBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialCommunityIcons name="share" size={20} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Share</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modernActionBtn, styles.downloadBtn]}
                  onPress={() => handleDownloadVideo(video)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#4facfe', '#00f2fe']}
                    style={styles.actionBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialCommunityIcons name="download" size={20} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>Download</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.modernActionBtn, styles.deleteActionBtn]}
              onPress={() => {
                setSelectedVideo(video);
                setShowDeleteDialog(true);
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#ff4757', '#ff3838']}
                style={styles.actionBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons name="delete" size={20} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Delete</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Generation date */}
          <Text style={styles.dateText}>
            {new Date(video.createdAt).toLocaleDateString()} at{' '}
            {new Date(video.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    </Surface>
  );

  const renderEmptyState = () => (
    <Animated.View
      style={[
        styles.emptyState,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <MaterialCommunityIcons name="video-off" size={80} color="#bdc3c7" />
      <Text style={styles.emptyStateTitle}>No Videos Found</Text>
      <Text style={styles.emptyStateText}>
        {selectedFilter === 'all'
          ? "You haven't generated any videos yet"
          : `No ${selectedFilter} videos found`
        }
      </Text>
      <Button
        mode="contained"
        onPress={() => navigation.navigate(SCREEN_NAME.VideoGeneration)}
        style={styles.generateButton}
        buttonColor="#667eea"
      >
        Generate Your First Video
      </Button>
    </Animated.View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color="#667eea" />
      <Text style={styles.loadingText}>Loading your videos...</Text>
    </View>
  );

  const renderDeleteDialog = () => (
    <Portal>
      <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
        <Dialog.Title>Delete Video</Dialog.Title>
        <Dialog.Content>
          <Text>Are you sure you want to delete this video? This action cannot be undone.</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button onPress={handleDeleteVideo} textColor="#e74c3c">Delete</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const videos = videosData?.videos || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      {renderHeader()}

      <View style={styles.content}>
        {renderFilters()}

        {videosLoading ? (
          renderLoadingState()
        ) : videos.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={videos}
            renderItem={renderVideoCard}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.videosList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#667eea']}
                tintColor="#667eea"
              />
            }
          />
        )}
      </View>

      {renderDeleteDialog()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#667eea',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filtersList: {
    paddingHorizontal: 16,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderColor: '#e1e8ed',
  },
  selectedFilterChip: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterText: {
    color: '#7f8c8d',
    fontSize: 12,
  },
  selectedFilterText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  videosList: {
    padding: 16,
  },
  videoCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
  },
  videoContainer: {
    position: 'relative',
    height: 200,
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  statusOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  statusChipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  menuButton: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  menuButtonGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoInfo: {
    padding: 16,
  },
  videoPrompt: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    lineHeight: 22,
  },
  videoDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 4,
    fontWeight: '500',
  },
  templateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateText: {
    fontSize: 12,
    color: '#667eea',
    marginLeft: 4,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  progressText: {
    fontSize: 11,
    color: '#7f8c8d',
    textAlign: 'right',
  },
  dateText: {
    fontSize: 11,
    color: '#bdc3c7',
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  generateButton: {
    borderRadius: 12,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    gap: 8,
  },
  modernActionBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  shareBtn: {
    marginRight: 4,
  },
  downloadBtn: {
    marginHorizontal: 4,
  },
  deleteActionBtn: {
    marginLeft: 4,
  },
});

export default MyVideosScreen;