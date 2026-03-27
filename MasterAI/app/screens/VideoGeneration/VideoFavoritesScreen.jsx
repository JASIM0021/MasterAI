import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Image,
  FlatList,
  RefreshControl,
} from 'react-native';
import {
  Appbar,
  Text,
  Card,
  Button,
  Searchbar,
  Chip,
  Portal,
  Dialog,
  ActivityIndicator,
  FAB,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

// Redux hooks
import {
  useGetFavoriteTemplatesQuery,
  useToggleFavoriteMutation
} from '../../features/api/videosApiSlice';
import { useFetchUserCreditsQuery } from '../../features/api/creditsApiSlice';

// Constants and themes
import { SCREEN_NAME } from '../../Constant';
import { responsiveHeight, responsiveWidth } from '../../themes';

const { width, height } = Dimensions.get('window');

const VideoFavoritesScreen = () => {
  const navigation = useNavigation();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showCreditDialog, setShowCreditDialog] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // API hooks
  const {
    data: favoritesData,
    isLoading: favoritesLoading,
    refetch: refetchFavorites
  } = useGetFavoriteTemplatesQuery({
    search: searchQuery || undefined,
    page: 1,
    limit: 50,
  });
  const { data: creditsData } = useFetchUserCreditsQuery();
  const [toggleFavorite] = useToggleFavoriteMutation();

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

  // Helper functions
  const hasEnoughCredits = () => {
    return creditsData?.globalCredits?.balance >= 20;
  };

  const getAvailableCredits = () => {
    return creditsData?.globalCredits?.balance || 0;
  };

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchFavorites();
    setRefreshing(false);
  };

  const handleTemplateSelect = (template) => {
    if (!hasEnoughCredits()) {
      setShowCreditDialog(true);
      return;
    }

    navigation.navigate(SCREEN_NAME.VideoCustomPrompt, {
      template,
      mode: 'template',
    });
  };

  const handleRemoveFromFavorites = async (templateId) => {
    try {
      await toggleFavorite({ templateId }).unwrap();
      refetchFavorites(); // Refresh the list after removing
    } catch (error) {
      console.error('Error removing from favorites:', error);
    }
  };

  const handlePhotoMode = (template) => {
    if (!hasEnoughCredits()) {
      setShowCreditDialog(true);
      return;
    }

    navigation.navigate(SCREEN_NAME.VideoCustomPrompt, {
      template,
      mode: 'template',
      photoMode: true,
    });
  };

  // Render functions
  const renderHeader = () => (
    <Appbar.Header style={styles.header}>
      <Appbar.BackAction onPress={() => navigation.goBack()} color="#FFFFFF" />
      <Appbar.Content
        title="Favorite Templates"
        titleStyle={styles.headerTitle}
      />
      <Appbar.Action
        icon="credit-card"
        iconColor="#FFFFFF"
        onPress={() => setShowCreditDialog(true)}
      />
    </Appbar.Header>
  );

  const renderSearchBar = () => (
    <Animated.View
      style={[
        styles.searchContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Searchbar
        placeholder="Search favorite templates..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#667eea"
      />
    </Animated.View>
  );

  const renderStatsCard = () => {
    const favoriteCount = favoritesData?.favorites?.length || 0;

    return (
      <Animated.View
        style={[
          styles.statsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={['#fa709a', '#fee140']}
          style={styles.statsGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statsContent}>
            <View style={styles.statsInfo}>
              <MaterialCommunityIcons name="heart" size={24} color="#FFFFFF" />
              <Text style={styles.statsText}>
                {favoriteCount} Favorite{favoriteCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={styles.statsSubtext}>
              Quick access to your preferred templates
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderTemplateCard = ({ item: template }) => (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={() => handleTemplateSelect(template)}
      activeOpacity={0.8}
    >
      <Card style={styles.card}>
        <View style={styles.cardContent}>
          {/* Template thumbnail */}
          <View style={styles.thumbnailContainer}>
            <Image
              source={{ uri: template.thumbnail.url }}
              style={styles.thumbnail}
              resizeMode="cover"
            />

            {/* Remove from favorites button */}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => handleRemoveFromFavorites(template.id)}
            >
              <MaterialCommunityIcons
                name="heart"
                size={20}
                color="#e74c3c"
              />
            </TouchableOpacity>

            {/* Play overlay */}
            <View style={styles.playOverlay}>
              <MaterialCommunityIcons name="play-circle" size={40} color="rgba(255, 255, 255, 0.8)" />
            </View>
          </View>

          {/* Template info */}
          <View style={styles.templateInfo}>
            <Text style={styles.templateName} numberOfLines={1}>
              {template.name}
            </Text>
            <Text style={styles.templateCategory}>
              {template.category}
            </Text>
            <Text style={styles.templateDescription} numberOfLines={2}>
              {template.description}
            </Text>

            {/* Template stats */}
            <View style={styles.templateStats}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="heart" size={14} color="#e74c3c" />
                <Text style={styles.statText}>{template.favoriteCount || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="play" size={14} color="#667eea" />
                <Text style={styles.statText}>{template.usageCount || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="clock" size={14} color="#7f8c8d" />
                <Text style={styles.statText}>{template.duration || 5}s</Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={() => handleTemplateSelect(template)}
                style={styles.actionButton}
                contentStyle={styles.actionButtonContent}
                labelStyle={styles.actionButtonLabel}
                compact
              >
                Generate
              </Button>
              <Button
                mode="outlined"
                onPress={() => handlePhotoMode(template)}
                style={[styles.actionButton, styles.photoButton]}
                contentStyle={styles.actionButtonContent}
                labelStyle={styles.photoButtonLabel}
                icon="camera"
                compact
              >
                Photo
              </Button>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
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
      <MaterialCommunityIcons name="heart-off" size={80} color="#bdc3c7" />
      <Text style={styles.emptyStateTitle}>No Favorite Templates</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery
          ? `No favorites match "${searchQuery}"`
          : 'You haven\'t added any templates to favorites yet.\nBrowse templates and tap the heart icon to save your favorites.'
        }
      </Text>
      {searchQuery ? (
        <Button
          mode="outlined"
          onPress={() => setSearchQuery('')}
          style={styles.clearSearchButton}
        >
          Clear Search
        </Button>
      ) : (
        <Button
          mode="contained"
          onPress={() => navigation.navigate(SCREEN_NAME.TemplateSelection)}
          style={styles.browseButton}
          buttonColor="#667eea"
        >
          Browse Templates
        </Button>
      )}
    </Animated.View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color="#667eea" />
      <Text style={styles.loadingText}>Loading favorite templates...</Text>
    </View>
  );

  const renderCreditDialog = () => (
    <Portal>
      <Dialog visible={showCreditDialog} onDismiss={() => setShowCreditDialog(false)}>
        <Dialog.Title>Credits Information</Dialog.Title>
        <Dialog.Content>
          <Text>
            Available Credits: {getAvailableCredits()}
          </Text>
          <Text style={{ marginTop: 10 }}>
            Video generation costs 20 credits per video.
          </Text>
          {!hasEnoughCredits() && (
            <Text style={{ marginTop: 10, color: '#e74c3c' }}>
              You need more credits to generate a video.
            </Text>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowCreditDialog(false)}>Close</Button>
          {!hasEnoughCredits() && (
            <Button
              onPress={() => {
                setShowCreditDialog(false);
                navigation.navigate(SCREEN_NAME.CreditPurchase);
              }}
            >
              Buy Credits
            </Button>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  const favorites = favoritesData?.favorites || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      {renderHeader()}

      <View style={styles.content}>
        {renderSearchBar()}
        {renderStatsCard()}

        {favoritesLoading ? (
          renderLoadingState()
        ) : favorites.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={favorites}
            renderItem={renderTemplateCard}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            contentContainerStyle={styles.templatesList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#667eea']}
                tintColor="#667eea"
              />
            }
            columnWrapperStyle={styles.templateRow}
          />
        )}
      </View>

      {/* Floating Action Button for browsing templates */}
      <FAB
        style={styles.fab}
        icon="view-grid"
        onPress={() => navigation.navigate(SCREEN_NAME.TemplateSelection)}
        label="Browse"
        color="#FFFFFF"
      />

      {renderCreditDialog()}
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
  searchContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchBar: {
    backgroundColor: '#f8f9fa',
    elevation: 0,
  },
  searchInput: {
    fontSize: 14,
  },
  statsContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  statsGradient: {
    padding: 16,
  },
  statsContent: {
    flexDirection: 'column',
  },
  statsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  statsSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  templatesList: {
    padding: 16,
    paddingTop: 0,
  },
  templateRow: {
    justifyContent: 'space-between',
  },
  templateCard: {
    flex: 1,
    marginBottom: 16,
    marginHorizontal: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    elevation: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
  },
  thumbnailContainer: {
    position: 'relative',
    height: 120,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    padding: 6,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  templateInfo: {
    padding: 12,
  },
  templateName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  templateCategory: {
    fontSize: 10,
    color: '#667eea',
    textTransform: 'uppercase',
    fontWeight: '500',
    marginBottom: 6,
  },
  templateDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    lineHeight: 16,
    marginBottom: 8,
  },
  templateStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 10,
    color: '#7f8c8d',
    marginLeft: 2,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 2,
    borderColor: '#667eea',
  },
  photoButton: {
    borderColor: '#fa709a',
  },
  actionButtonContent: {
    paddingVertical: 2,
  },
  actionButtonLabel: {
    fontSize: 11,
    color: '#667eea',
  },
  photoButtonLabel: {
    fontSize: 11,
    color: '#fa709a',
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
  clearSearchButton: {
    borderColor: '#667eea',
  },
  browseButton: {
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#667eea',
  },
});

export default VideoFavoritesScreen;