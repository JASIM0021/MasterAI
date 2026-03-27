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
import { useNavigation, useRoute } from '@react-navigation/native';

// Redux hooks
import {
  useGetCategoriesQuery,
  useGetTemplatesQuery,
  useToggleFavoriteMutation
} from '../../features/api/videosApiSlice';
import { useFetchUserCreditsQuery } from '../../features/api/creditsApiSlice';

// Constants and themes
import { SCREEN_NAME } from '../../Constant';
import { responsiveHeight, responsiveWidth } from '../../themes';

const { width, height } = Dimensions.get('window');

const TemplateSelectionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Get photoMode from navigation params
  const { photoMode } = route.params || {};

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('popular');
  const [refreshing, setRefreshing] = useState(false);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [showSortDialog, setShowSortDialog] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // API hooks
  const { data: categoriesData, isLoading: categoriesLoading } = useGetCategoriesQuery();
  const {
    data: templatesData,
    isLoading: templatesLoading,
    refetch: refetchTemplates
  } = useGetTemplatesQuery({
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    search: searchQuery || undefined,
    sort: selectedSort,
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
    await refetchTemplates();
    setRefreshing(false);
  };

  const handleTemplateSelect = (template) => {
    if (!hasEnoughCredits()) {
      setShowCreditDialog(true);
      return;
    }

    // Check if template supports user photo and implement browse-then-upload workflow
    if (template.supportsUserPhoto) {
      navigation.navigate(SCREEN_NAME.VideoCustomPrompt, {
        template,
        mode: 'template',
        photoMode: true, // Force photo mode for templates that support photos
        showPhotoUploadFirst: true, // Flag to show photo upload prominently
      });
    } else {
      navigation.navigate(SCREEN_NAME.VideoCustomPrompt, {
        template,
        mode: 'template',
        photoMode: false,
      });
    }
  };

  const handleToggleFavorite = async (templateId, isFavorited) => {
    try {
      await toggleFavorite({ templateId }).unwrap();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Render functions
  const renderHeader = () => (
    <Appbar.Header style={styles.header}>
      <Appbar.BackAction onPress={() => navigation.goBack()} color="#FFFFFF" />
      <Appbar.Content
        title={photoMode ? 'Photo Templates' : 'Video Templates'}
        titleStyle={styles.headerTitle}
      />
      <Appbar.Action
        icon="sort"
        iconColor="#FFFFFF"
        onPress={() => setShowSortDialog(true)}
      />
      <Appbar.Action
        icon="credit-card"
        iconColor="#FFFFFF"
        onPress={() => setShowCreditDialog(true)}
      />
    </Appbar.Header>
  );

  const renderSearchAndFilter = () => (
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
        placeholder="Search templates..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#667eea"
      />

      {/* Category filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <Chip
          mode={selectedCategory === 'all' ? 'flat' : 'outlined'}
          selected={selectedCategory === 'all'}
          onPress={() => setSelectedCategory('all')}
          style={[styles.categoryChip, selectedCategory === 'all' && styles.selectedChip]}
          textStyle={selectedCategory === 'all' ? styles.selectedChipText : styles.chipText}
        >
          All
        </Chip>

        {categoriesData?.categories?.map((category) => (
          <Chip
            key={category.id || category.name}
            mode={selectedCategory === category.name ? 'flat' : 'outlined'}
            selected={selectedCategory === category.name}
            onPress={() => setSelectedCategory(category.name)}
            style={[styles.categoryChip, selectedCategory === category.name && styles.selectedChip]}
            textStyle={selectedCategory === category.name ? styles.selectedChipText : styles.chipText}
          >
            {category.name} ({category.templateCount || 0})
          </Chip>
        ))}
      </ScrollView>
    </Animated.View>
  );

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
              source={{ uri: template.thumbnail?.url }}
              style={styles.thumbnail}
              resizeMode="cover"
            />

            {/* Status badges */}
            <View style={styles.badgesContainer}>
              {template.isNew && (
                <View style={[styles.statusBadge, styles.newBadge]}>
                  <Text style={styles.badgeText}>NEW</Text>
                </View>
              )}
              {template.isTrending && (
                <View style={[styles.statusBadge, styles.trendingBadge]}>
                  <MaterialCommunityIcons name="trending-up" size={12} color="#FFFFFF" />
                  <Text style={styles.badgeText}>HOT</Text>
                </View>
              )}
              {template.isPremium && (
                <View style={[styles.statusBadge, styles.premiumBadge]}>
                  <MaterialCommunityIcons name="crown" size={12} color="#FFFFFF" />
                  <Text style={styles.badgeText}>PRO</Text>
                </View>
              )}
            </View>

            {/* Favorite button */}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => handleToggleFavorite(template.id, template.isFavorited)}
            >
              <MaterialCommunityIcons
                name={template.isFavorited ? 'heart' : 'heart-outline'}
                size={22}
                color={template.isFavorited ? '#e74c3c' : '#FFFFFF'}
              />
            </TouchableOpacity>

            {/* Play overlay */}
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <MaterialCommunityIcons name="play" size={24} color="#FFFFFF" />
              </View>
            </View>

            {/* Photo support indicator */}
            {template.supportsUserPhoto && (
              <View style={styles.photoSupportIndicator}>
                <MaterialCommunityIcons name="camera" size={14} color="#FFFFFF" />
                <Text style={styles.photoSupportText}>Photo</Text>
              </View>
            )}
          </View>

          {/* Template info */}
          <View style={styles.templateInfo}>
            <Text style={styles.templateName} numberOfLines={1}>
              {template.name}
            </Text>
            <Text style={styles.templateCategory}>
              {template.category}
            </Text>
            <Text style={styles.templateDescription} numberOfLines={3}>
              {template.description}
            </Text>

            {/* Template stats */}
            <View style={styles.templateStats}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="heart" size={16} color="#e74c3c" />
                <Text style={styles.statText}>{template.favoriteCount || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="play" size={16} color="#667eea" />
                <Text style={styles.statText}>{template.usageCount || 0}</Text>
              </View>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="clock" size={16} color="#7f8c8d" />
                <Text style={styles.statText}>{template.duration || 8}s</Text>
              </View>
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
      <MaterialCommunityIcons name="video-off" size={80} color="#bdc3c7" />
      <Text style={styles.emptyStateTitle}>No Templates Found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery
          ? `No templates match "${searchQuery}"`
          : 'No templates available in this category'
        }
      </Text>
      {searchQuery && (
        <Button
          mode="outlined"
          onPress={() => setSearchQuery('')}
          style={styles.clearSearchButton}
        >
          Clear Search
        </Button>
      )}
    </Animated.View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingState}>
      <ActivityIndicator size="large" color="#667eea" />
      <Text style={styles.loadingText}>Loading templates...</Text>
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

  const renderSortDialog = () => {
    const sortOptions = [
      { value: 'popular', label: 'Most Popular', icon: 'fire' },
      { value: 'newest', label: 'Newest First', icon: 'new-box' },
      { value: 'trending', label: 'Trending', icon: 'trending-up' },
      { value: 'alphabetical', label: 'A to Z', icon: 'sort-alphabetical-ascending' },
      { value: 'favorites', label: 'Most Liked', icon: 'heart' },
    ];

    return (
      <Portal>
        <Dialog visible={showSortDialog} onDismiss={() => setShowSortDialog(false)}>
          <Dialog.Title>Sort Templates</Dialog.Title>
          <Dialog.Content>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOption,
                  selectedSort === option.value && styles.selectedSortOption
                ]}
                onPress={() => {
                  setSelectedSort(option.value);
                  setShowSortDialog(false);
                }}
              >
                <MaterialCommunityIcons
                  name={option.icon}
                  size={20}
                  color={selectedSort === option.value ? '#667eea' : '#7f8c8d'}
                />
                <Text style={[
                  styles.sortOptionText,
                  selectedSort === option.value && styles.selectedSortOptionText
                ]}>
                  {option.label}
                </Text>
                {selectedSort === option.value && (
                  <MaterialCommunityIcons name="check" size={20} color="#667eea" />
                )}
              </TouchableOpacity>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSortDialog(false)}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    );
  };

  const templates = templatesData?.templates || [];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      {renderHeader()}

      <View style={styles.content}>
        {renderSearchAndFilter()}

        {templatesLoading ? (
          renderLoadingState()
        ) : templates.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={templates}
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

      {/* Floating Action Button for Favorites */}
      <FAB
        style={styles.fab}
        icon="heart"
        onPress={() => navigation.navigate(SCREEN_NAME.VideoFavorites)}
        color="#FFFFFF"
      />

      {renderCreditDialog()}
      {renderSortDialog()}
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
    marginBottom: 12,
  },
  searchInput: {
    fontSize: 14,
  },
  categoryScroll: {
    marginBottom: -16,
  },
  categoryContainer: {
    paddingBottom: 16,
  },
  categoryChip: {
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderColor: '#e1e8ed',
  },
  selectedChip: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  chipText: {
    color: '#7f8c8d',
    fontSize: 12,
  },
  selectedChipText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  templatesList: {
    padding: 16,
    paddingTop: 8,
  },
  templateRow: {
    justifyContent: 'space-between',
  },
  templateCard: {
    flex: 1,
    marginBottom: 20,
    marginHorizontal: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    elevation: 4,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardContent: {
    flex: 1,
  },
  thumbnailContainer: {
    position: 'relative',
    height: 180,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  badgesContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  newBadge: {
    backgroundColor: '#27ae60',
  },
  trendingBadge: {
    backgroundColor: '#e74c3c',
  },
  premiumBadge: {
    backgroundColor: '#f39c12',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  playButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 30,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  photoSupportIndicator: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(102, 126, 234, 0.9)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoSupportText: {
    color: '#FFFFFF',
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '600',
  },
  templateInfo: {
    padding: 16,
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
    lineHeight: 20,
  },
  templateCategory: {
    fontSize: 11,
    color: '#667eea',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  templateDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    lineHeight: 18,
    marginBottom: 12,
  },
  templateStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  statText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 4,
    fontWeight: '600',
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
    marginBottom: 20,
  },
  clearSearchButton: {
    borderColor: '#667eea',
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
    backgroundColor: '#fa709a',
  },
  // Sort dialog styles
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
  },
  selectedSortOption: {
    backgroundColor: '#f0f3ff',
  },
  sortOptionText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
    flex: 1,
  },
  selectedSortOptionText: {
    color: '#667eea',
    fontWeight: '600',
  },
});

export default TemplateSelectionScreen;