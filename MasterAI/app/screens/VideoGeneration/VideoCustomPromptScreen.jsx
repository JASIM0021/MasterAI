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
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Appbar,
  Text,
  Card,
  Button,
  TextInput,
  Chip,
  Portal,
  Dialog,
  ActivityIndicator,
  SegmentedButtons,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

// Redux hooks
import { useSelector } from 'react-redux';
import { useGenerateVideoMutation, useCalculateVideoCostMutation } from '../../features/api/videosApiSlice';
import { useFetchUserCreditsQuery } from '../../features/api/creditsApiSlice';
import {
  selectCurrentUser,
  selectIsAuthenticated,
} from '../../features/auth/authSlice';

// Constants and themes
import { SCREEN_NAME } from '../../Constant/screenNames';
import { responsiveHeight, responsiveWidth } from '../../themes';
import SimpleAuthPrompt from '../../Components/auth/SimpleAuthPrompt';

const { width, height } = Dimensions.get('window');

const VideoCustomPromptScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // Get template and mode from navigation params
  const { template, mode, photoMode, showPhotoUploadFirst } = route.params || {};

  // Local state
  const [prompt, setPrompt] = useState(template?.prompt || '');
  const [aspectRatio, setAspectRatio] = useState(template?.aspectRatio || '16:9');
  const [duration, setDuration] = useState(template?.duration || 8); // Use template duration or default to 8
  const [quality, setQuality] = useState(template?.quality || 'standard');
  const [resolution, setResolution] = useState('720p'); // Always use 720p for mobile
  const [model, setModel] = useState('fast'); // 'fast' or 'standard'
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [creditCost, setCreditCost] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // API hooks
  const [generateVideo] = useGenerateVideoMutation();
  const [calculateCost] = useCalculateVideoCostMutation();
  const { data: creditsData, isLoading: creditsLoading } = useFetchUserCreditsQuery();

  // Authentication state
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);

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

  // Calculate cost when duration or model changes
  useEffect(() => {
    const calculateCurrentCost = async () => {
      try {
        const result = await calculateCost({ duration, model }).unwrap();
        setCreditCost(result.cost.totalCost);
        setEstimatedTime(result.estimatedTime);
      } catch (error) {
        console.error('Failed to calculate cost:', error);
        // Fallback to basic calculation
        const baseCost = duration * 3;
        const totalCost = model === 'standard' ? Math.ceil(baseCost * 1.5) : baseCost;
        setCreditCost(totalCost);
      }
    };

    calculateCurrentCost();
  }, [duration, model, calculateCost]);

  // Helper functions
  const hasEnoughCredits = () => {
    return creditsData?.globalCredits?.balance >= creditCost;
  };

  const getAvailableCredits = () => {
    return creditsData?.globalCredits?.balance || 0;
  };

  // Aspect ratio options
  const aspectRatioOptions = [
    { value: '16:9', label: '16:9', labelStyle: { color: '#667eea' } },
    { value: '9:16', label: '9:16', labelStyle: { color: '#667eea' } },
    { value: '1:1', label: '1:1', labelStyle: { color: '#667eea' } },
  ];

  // Quality options
  const qualityOptions = [
    { value: 'standard', label: 'Standard', labelStyle: { color: '#667eea' } },
    { value: 'high', label: 'High', labelStyle: { color: '#667eea' } },
  ];

  // Resolution options
  const resolutionOptions = [
    { value: '720p', label: '720p', labelStyle: { color: '#667eea' } },
    { value: '1080p', label: '1080p', labelStyle: { color: '#667eea' } },
  ];

  // Model options
  const modelOptions = [
    {
      value: 'fast',
      label: 'Fast Model',
      labelStyle: { color: '#667eea' },
      description: 'Quick generation (2-3 min), good quality'
    },
    {
      value: 'standard',
      label: 'Standard Model',
      labelStyle: { color: '#667eea' },
      description: 'High quality (5-10 min), best results'
    },
  ];

  // Validate resolution/duration combination
  const isValidResolutionDuration = () => {
    if (resolution === '1080p' && duration !== 8) {
      return false;
    }
    return true;
  };

  // Image picker
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to pick images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: aspectRatio === '16:9' ? [16, 9] : aspectRatio === '9:16' ? [9, 16] : [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedPhoto(result.assets[0]);
    }
  };

  // Helper function to convert image to base64
  const convertImageToBase64 = async (uri) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw new Error('Failed to process image');
    }
  };

  // Generate video handler
  const handleGenerateVideo = async () => {
    if (!prompt.trim()) {
      Alert.alert('Error', 'Please enter a prompt for your video.');
      return;
    }

    if (!hasEnoughCredits()) {
      setShowCreditDialog(true);
      return;
    }

    if (photoMode && !selectedPhoto) {
      Alert.alert('Error', 'Please select a photo for photo+template mode.');
      return;
    }

    if (!isValidResolutionDuration()) {
      Alert.alert('Error', '1080p resolution requires 8-second duration. Please adjust your settings.');
      return;
    }

    try {
      setIsGenerating(true);

      // Create JSON payload instead of FormData
      const payload = {
        prompt: prompt.trim(),
        config: {
          aspectRatio,
          duration,
          quality,
          resolution,
          model,
        }
      };

      // Add template ID if template is selected
      if (template) {
        payload.templateId = template.id;
      }

      // Convert photo to base64 if selected
      if (selectedPhoto) {
        try {
          const base64Image = await convertImageToBase64(selectedPhoto.uri);
          payload.userImageBase64 = base64Image;
        } catch (error) {
          Alert.alert('Error', 'Failed to process the selected image. Please try again.');
          return;
        }
      }

      const result = await generateVideo(payload).unwrap();

      Alert.alert(
        'Video Generation Started!',
        `Your video is being generated with the ${model} model. You'll receive a notification when it's ready! Estimated time: ${estimatedTime ? `${Math.round(estimatedTime.average / 60)} minutes` : '2-10 minutes'}.`,
        [
          {
            text: 'View My Videos',
            onPress: () => navigation.navigate(SCREEN_NAME.MyVideos),
          },
          {
            text: 'Generate Another',
            style: 'cancel',
          },
        ]
      );

    } catch (error) {
      console.error('Error generating video:', error);
      Alert.alert(
        'Generation Failed',
        error?.data?.message || 'Failed to start video generation. Please try again.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Render functions
  const renderHeader = () => (
    <Appbar.Header style={styles.header}>
      <Appbar.BackAction onPress={() => navigation.goBack()} color="#FFFFFF" />
      <Appbar.Content
        title={mode === 'template' ? 'Template Video' : photoMode ? 'Photo + Template' : 'Custom Video'}
        titleStyle={styles.headerTitle}
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
            Video generation costs {creditCost} credits
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );

  const renderTemplateInfo = () => {
    if (!template) return null;

    return (
      <Animated.View
        style={[
          styles.templateInfo,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Card style={styles.templateCard}>
          <View style={styles.templateContent}>
            <Image
              source={{ uri: template.thumbnail.url }}
              style={styles.templateThumbnail}
              resizeMode="cover"
            />
            <View style={styles.templateDetails}>
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.templateCategory}>{template.category}</Text>
              <Text style={styles.templateDescription} numberOfLines={2}>
                {template.description}
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>
    );
  };

  const renderPhotoSelector = () => {
    if (!photoMode) return null;

    const isPhotoRequired = template?.supportsUserPhoto && showPhotoUploadFirst;
    const sectionStyle = isPhotoRequired
      ? [styles.section, styles.prioritySection]
      : styles.section;

    return (
      <Animated.View
        style={[
          sectionStyle,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <Text style={[
            styles.sectionTitle,
            isPhotoRequired && styles.prioritySectionTitle
          ]}>
            {isPhotoRequired ? '📸 Add Your Photo' : 'Select Photo'}
          </Text>
          {isPhotoRequired && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredBadgeText}>RECOMMENDED</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.photoSelector,
            isPhotoRequired && styles.priorityPhotoSelector
          ]}
          onPress={pickImage}
        >
          {selectedPhoto ? (
            <View style={styles.photoSelectedContainer}>
              <Image
                source={{ uri: selectedPhoto.uri }}
                style={styles.selectedPhoto}
                resizeMode="cover"
              />
              <View style={styles.photoOverlay}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#27ae60" />
                <Text style={styles.photoSelectedText}>Photo Selected</Text>
              </View>
            </View>
          ) : (
            <View style={[
              styles.photoPlaceholder,
              isPhotoRequired && styles.priorityPhotoPlaceholder
            ]}>
              <MaterialCommunityIcons
                name="camera-plus"
                size={isPhotoRequired ? 64 : 48}
                color={isPhotoRequired ? "#667eea" : "#bdc3c7"}
              />
              <Text style={[
                styles.photoPlaceholderText,
                isPhotoRequired && styles.priorityPhotoPlaceholderText
              ]}>
                {isPhotoRequired
                  ? 'Tap to add your photo for personalized video'
                  : 'Tap to select photo'
                }
              </Text>
              {isPhotoRequired && (
                <Text style={styles.photoHelperText}>
                  This template works best with your photo to create amazing personalized videos!
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderPromptInput = () => (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.sectionTitle}>Video Prompt</Text>
      <TextInput
        mode="outlined"
        label="Describe your video..."
        value={prompt}
        onChangeText={setPrompt}
        multiline
        numberOfLines={4}
        style={styles.promptInput}
        outlineColor="#e1e8ed"
        activeOutlineColor="#667eea"
        placeholder="E.g., A serene sunset over a calm lake with gentle waves"
      />
      <Text style={styles.promptHelper}>
        Tip: Be specific about what you want to see, including colors, movements, and atmosphere.
      </Text>
    </Animated.View>
  );

  const renderAspectRatio = () => (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.sectionTitle}>Aspect Ratio</Text>
      <SegmentedButtons
        value={aspectRatio}
        onValueChange={setAspectRatio}
        buttons={aspectRatioOptions}
        style={styles.segmentedButtons}
      />
    </Animated.View>
  );

  const renderDuration = () => {
    // Hide duration control for template mode (auto 8 seconds)
    if (template && mode === 'template') return null;

    return (
      <Animated.View
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.sectionTitle}>Duration: {duration} seconds</Text>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>1s</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={8}
            value={duration}
            onValueChange={setDuration}
            step={1}
            minimumTrackTintColor="#667eea"
            maximumTrackTintColor="#e1e8ed"
            thumbTintColor="#667eea"
          />
          <Text style={styles.sliderLabel}>8s</Text>
        </View>
      </Animated.View>
    );
  };

  const renderQuality = () => (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.sectionTitle}>Quality</Text>
      <SegmentedButtons
        value={quality}
        onValueChange={setQuality}
        buttons={qualityOptions}
        style={styles.segmentedButtons}
      />
    </Animated.View>
  );

  const renderResolution = () => {
    // Hide resolution control for template mode (auto mobile resolution 720p)
    if (template && mode === 'template') return null;

    return (
      <Animated.View
        style={[
          styles.section,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.sectionTitle}>Resolution</Text>
        <SegmentedButtons
          value={resolution}
          onValueChange={setResolution}
          buttons={resolutionOptions}
          style={styles.segmentedButtons}
        />
        {resolution === '1080p' && duration !== 8 && (
          <Text style={styles.resolutionWarning}>
            ⚠️ 1080p resolution requires 8-second duration
          </Text>
        )}
      </Animated.View>
    );
  };

  const renderModelSelection = () => (
    <Animated.View
      style={[
        styles.section,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.sectionTitle}>Generation Model</Text>
      <SegmentedButtons
        value={model}
        onValueChange={setModel}
        buttons={modelOptions}
        style={styles.segmentedButtons}
      />
      <View style={styles.modelDescription}>
        <Text style={styles.modelDescriptionText}>
          {model === 'fast' ? 'Quick generation (2-3 min), good quality' : 'High quality (5-10 min), best results'}
        </Text>
        <Text style={styles.creditCostText}>
          Credits: {creditCost} ({model === 'standard' ? '+50% for premium quality' : 'base cost'})
        </Text>
        {estimatedTime && (
          <Text style={styles.timeEstimateText}>
            Estimated time: {Math.round(estimatedTime.average / 60)} minutes
          </Text>
        )}
      </View>
    </Animated.View>
  );

  const renderGenerateButton = () => (
    <Animated.View
      style={[
        styles.generateContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Button
        mode="contained"
        onPress={handleGenerateVideo}
        disabled={isGenerating || !prompt.trim()}
        loading={isGenerating}
        style={styles.generateButton}
        buttonColor="#667eea"
        contentStyle={styles.generateButtonContent}
      >
        {isGenerating ? 'Generating Video...' : `Generate Video (${creditCost} Credits)`}
      </Button>
    </Animated.View>
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
            Video generation costs {creditCost} credits per video.
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

  // Authentication check - show login prompt if user is not authenticated
  if (!isAuthenticated) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        {renderHeader()}
        <SimpleAuthPrompt
          customMessage="Sign in to generate amazing videos with AI. Create custom prompts, use templates, and upload your photos to bring your ideas to life."
          onAuthSuccess={() => {
            console.log('User successfully authenticated from video generation screen');
          }}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      {renderHeader()}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {renderCreditBanner()}
        {renderTemplateInfo()}
        {renderPhotoSelector()}
        {renderPromptInput()}
        {renderAspectRatio()}
        {renderDuration()}
        {renderQuality()}
        {renderResolution()}
        {renderModelSelection()}
        {renderGenerateButton()}
      </ScrollView>

      {renderCreditDialog()}
    </KeyboardAvoidingView>
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
  templateInfo: {
    marginBottom: 20,
  },
  templateCard: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  templateContent: {
    flexDirection: 'row',
    padding: 16,
  },
  templateThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  templateDetails: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  templateCategory: {
    fontSize: 12,
    color: '#667eea',
    textTransform: 'capitalize',
    marginBottom: 8,
  },
  templateDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
  },
  photoSelector: {
    borderWidth: 2,
    borderColor: '#e1e8ed',
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
    height: 200,
  },
  selectedPhoto: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  photoPlaceholderText: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 8,
  },
  // Enhanced browse-then-upload styles
  prioritySection: {
    backgroundColor: '#f8f9fb',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#667eea',
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  prioritySectionTitle: {
    fontSize: 18,
    color: '#667eea',
    fontWeight: 'bold',
  },
  requiredBadge: {
    backgroundColor: '#27ae60',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  requiredBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  priorityPhotoSelector: {
    borderColor: '#667eea',
    borderWidth: 3,
    height: 250,
  },
  priorityPhotoPlaceholder: {
    backgroundColor: '#ffffff',
  },
  priorityPhotoPlaceholderText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  photoHelperText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
    fontStyle: 'italic',
  },
  photoSelectedContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoSelectedText: {
    marginLeft: 6,
    color: '#27ae60',
    fontSize: 12,
    fontWeight: '600',
  },
  promptInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  promptHelper: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  segmentedButtons: {
    backgroundColor: '#FFFFFF',
  },
  resolutionWarning: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 8,
    fontStyle: 'italic',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  slider: {
    flex: 1,
    marginHorizontal: 16,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  generateContainer: {
    marginTop: 20,
  },
  generateButton: {
    borderRadius: 12,
    elevation: 4,
  },
  generateButtonContent: {
    paddingVertical: 8,
  },
  modelDescription: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  modelDescriptionText: {
    fontSize: 14,
    color: '#2c3e50',
    marginBottom: 4,
  },
  creditCostText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 2,
  },
  timeEstimateText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
});

export default VideoCustomPromptScreen;