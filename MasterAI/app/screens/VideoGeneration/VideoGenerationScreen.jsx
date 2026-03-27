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
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

// Redux hooks
import { useGetCategoriesQuery, useGetRecentTemplatesQuery } from '../../features/api/videosApiSlice';
import { useFetchUserCreditsQuery } from '../../features/api/creditsApiSlice';

// Constants and themes
import { SCREEN_NAME } from '../../Constant/screenNames';
import { responsiveHeight, responsiveWidth } from '../../themes';

const { width, height } = Dimensions.get('window');

const VideoGenerationScreen = () => {
  const navigation = useNavigation();

  // Local state
  const [selectedMode, setSelectedMode] = useState(null);
  const [showCreditDialog, setShowCreditDialog] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // API queries
  const { data: categoriesData, isLoading: categoriesLoading } = useGetCategoriesQuery();
  const { data: recentData, isLoading: recentLoading } = useGetRecentTemplatesQuery({ limit: 3 });
  const { data: creditsData, isLoading: creditsLoading } = useFetchUserCreditsQuery();

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
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Navigation handlers
  const handleCustomPrompt = () => {
    if (!hasEnoughCredits()) {
      setShowCreditDialog(true);
      return;
    }
    navigation.navigate(SCREEN_NAME.VideoCustomPrompt);
  };

  const handleTemplateSelection = () => {
    navigation.navigate(SCREEN_NAME.TemplateSelection);
  };

  const handleMyVideos = () => {
    navigation.navigate(SCREEN_NAME.MyVideos);
  };

  const handleRecentTemplate = (template) => {
    if (!hasEnoughCredits()) {
      setShowCreditDialog(true);
      return;
    }
    navigation.navigate(SCREEN_NAME.VideoCustomPrompt, {
      template,
      mode: 'template'
    });
  };

  // Helper functions
  const hasEnoughCredits = () => {
    return creditsData?.globalCredits?.balance >= 20;
  };

  const getAvailableCredits = () => {
    return creditsData?.globalCredits?.balance || 0;
  };

  // Render functions
  const renderHeader = () => (
    <Appbar.Header style={styles.header}>
      <Appbar.BackAction onPress={() => navigation.goBack()} color="#FFFFFF" />
      <Appbar.Content
        title="AI Video Generation"
        titleStyle={styles.headerTitle}
      />
      <Appbar.Action
        icon="video"
        iconColor="#FFFFFF"
        onPress={() => navigation.navigate(SCREEN_NAME.MyVideos)}
      />
      <Appbar.Action
        icon="credit-card"
        iconColor="#FFFFFF"
        onPress={() => setShowCreditDialog(true)}
      />
    </Appbar.Header>
  );

  const renderCreditBanner = () => (
    <Animated.View
      style={[
        styles.creditBanner,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.creditGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.creditContent}>
          <View style={styles.creditInfo}>
            <MaterialCommunityIcons name="wallet" size={24} color="#FFFFFF" />
            <Text style={styles.creditText}>
              {creditsLoading ? 'Loading...' : `${getAvailableCredits()} Credits`}
            </Text>
          </View>
          <Text style={styles.creditSubtext}>
            Video generation costs 20 credits
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderGenerationModes = () => (
    <Animated.View
      style={[
        styles.modesContainer,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Text style={styles.sectionTitle}>Choose Generation Mode</Text>

      {/* Custom Prompt Mode */}
      <TouchableOpacity
        style={styles.modeCard}
        onPress={handleCustomPrompt}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#4facfe', '#00f2fe']}
          style={styles.modeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.modeContent}>
            <View style={styles.modeHeader}>
              <MaterialCommunityIcons name="text-box-edit" size={32} color="#FFFFFF" />
              <Text style={styles.modeTitle}>Custom Prompt</Text>
            </View>
            <Text style={styles.modeDescription}>
              Create unique videos with your own creative prompt
            </Text>
            <View style={styles.modeFeatures}>
              <Chip icon="check" style={styles.featureChip} textStyle={styles.featureText}>
                Any concept
              </Chip>
              <Chip icon="check" style={styles.featureChip} textStyle={styles.featureText}>
                Full control
              </Chip>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Template Mode */}
      <TouchableOpacity
        style={styles.modeCard}
        onPress={handleTemplateSelection}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#fa709a', '#fee140']}
          style={styles.modeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.modeContent}>
            <View style={styles.modeHeader}>
              <MaterialCommunityIcons name="view-grid" size={32} color="#FFFFFF" />
              <Text style={styles.modeTitle}>Use Templates</Text>
            </View>
            <Text style={styles.modeDescription}>
              Choose from 20+ professional video templates
            </Text>
            <View style={styles.modeFeatures}>
              <Chip icon="check" style={styles.featureChip} textStyle={styles.featureText}>
                Pre-designed
              </Chip>
              <Chip icon="check" style={styles.featureChip} textStyle={styles.featureText}>
                Quick start
              </Chip>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Photo + Template Mode */}
      <TouchableOpacity
        style={styles.modeCard}
        onPress={() => navigation.navigate(SCREEN_NAME.TemplateSelection, { photoMode: true })}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#a8edea', '#fed6e3']}
          style={styles.modeGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.modeContent}>
            <View style={styles.modeHeader}>
              <MaterialCommunityIcons name="camera-plus" size={32} color="#FFFFFF" />
              <Text style={styles.modeTitle}>Photo + Template</Text>
            </View>
            <Text style={styles.modeDescription}>
              Upload your photo and combine with templates
            </Text>
            <View style={styles.modeFeatures}>
              <Chip icon="check" style={styles.featureChip} textStyle={styles.featureText}>
                Personal touch
              </Chip>
              <Chip icon="check" style={styles.featureChip} textStyle={styles.featureText}>
                Professional
              </Chip>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderRecentTemplates = () => {
    if (recentLoading || !recentData?.recent?.length) return null;

    return (
      <Animated.View
        style={[
          styles.recentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.sectionTitle}>Recent Templates</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {recentData.recent.map((template, index) => (
            <TouchableOpacity
              key={template.id}
              style={styles.recentCard}
              onPress={() => handleRecentTemplate(template)}
            >
              <Image
                source={{ uri: template.thumbnail.url }}
                style={styles.recentThumbnail}
                resizeMode="cover"
              />
              <Text style={styles.recentTitle} numberOfLines={2}>
                {template.name}
              </Text>
              <Text style={styles.recentCategory}>
                {template.category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

  const renderQuickActions = () => (
    <Animated.View
      style={[
        styles.actionsContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.sectionTitle}>Quick Actions</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleMyVideos}
        >
          <MaterialCommunityIcons name="video-box" size={24} color="#667eea" />
          <Text style={styles.actionText}>My Videos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate(SCREEN_NAME.VideoFavorites)}
        >
          <MaterialCommunityIcons name="heart" size={24} color="#fa709a" />
          <Text style={styles.actionText}>Favorites</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate(SCREEN_NAME.CreditPurchase)}
        >
          <MaterialCommunityIcons name="plus-circle" size={24} color="#4facfe" />
          <Text style={styles.actionText}>Buy Credits</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderCreditDialog = () => (
    <Portal>
      <Dialog visible={showCreditDialog} onDismiss={() => setShowCreditDialog(false)}>
        <Dialog.Title>Insufficient Credits</Dialog.Title>
        <Dialog.Content>
          <Text>
            You need 20 credits to generate a video. You currently have {getAvailableCredits()} credits.
          </Text>
          <Text style={{ marginTop: 10 }}>
            Would you like to purchase more credits?
          </Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setShowCreditDialog(false)}>Cancel</Button>
          <Button
            onPress={() => {
              setShowCreditDialog(false);
              navigation.navigate(SCREEN_NAME.CreditPurchase);
            }}
          >
            Buy Credits
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      {renderHeader()}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderCreditBanner()}
        {renderGenerationModes()}
        {renderRecentTemplates()}
        {renderQuickActions()}
      </ScrollView>

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  creditBanner: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  creditGradient: {
    padding: 16,
  },
  creditContent: {
    flexDirection: 'column',
  },
  creditInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  creditText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  creditSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  modesContainer: {
    marginBottom: 24,
  },
  modeCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  modeGradient: {
    padding: 20,
  },
  modeContent: {
    flex: 1,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  modeDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 12,
    lineHeight: 20,
  },
  modeFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  featureChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 8,
    marginBottom: 4,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  recentContainer: {
    marginBottom: 24,
  },
  recentCard: {
    width: 120,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recentThumbnail: {
    width: '100%',
    height: 80,
    borderRadius: 6,
    marginBottom: 8,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  recentCategory: {
    fontSize: 10,
    color: '#7f8c8d',
    textTransform: 'capitalize',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionText: {
    fontSize: 12,
    color: '#2c3e50',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default VideoGenerationScreen;