import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Chip,
  Portal,
  Modal,
  ActivityIndicator,
  Snackbar,
  Card,
} from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../Components/header/Header';
import { useGenerateImageMutation } from '../../features/api/imageSlice';
import axios from 'axios';
import Loader from '../../Components/loader/Loader';
import { useNavigation } from '@react-navigation/native';
import { SCREEN_NAME } from '../../Constant';
import ReportContentModal from '../../Components/Model/ReportContentModal';
import { useReportMutation } from '../../features/api/upload/uploadPhoto';
import GolbalStyle from '../../Style';

// Auth components
import withAuthRequired from '../../Components/auth/withAuthRequired';
import useAuthRequired from '../../hooks/useAuthRequired';

// Credit components
import CreditDisplay from '../../Components/credits/CreditDisplay';
import useCredits from '../../hooks/useCredits';

const { width, height } = Dimensions.get('window');

const AIImageGenerationProtected = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [generatedImages, setGeneratedImages] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [currentImageId, setCurrentImageId] = useState(null);
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
  });

  const navigation = useNavigation();

  // Auth hook for additional checks
  const {
    isAuthenticated,
    currentUser,
    requireAuthentication,
    canUseFeature,
    getUserInfo,
  } = useAuthRequired();

  // Credits hook for credit management
  const {
    remainingCredits,
    canUseService,
    checkAccess,
    useCredit,
    getWarningMessage,
  } = useCredits('aiImageGeneration');

  const [generateImage, { isLoading }] = useGenerateImageMutation();
  const [reportContent] = useReportMutation();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#f5f5f5',
    },
    content: {
      padding: 16,
    },
    userInfoCard: {
      marginBottom: 16,
      padding: 15,
      backgroundColor: '#e3f2fd',
      borderRadius: 12,
    },
    userInfo: {
      fontSize: 14,
      color: '#1565c0',
      marginBottom: 5,
    },
    quotaWarning: {
      backgroundColor: '#ffebee',
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    quotaText: {
      color: '#c62828',
      fontSize: 14,
      textAlign: 'center',
    },
    promptInput: {
      marginBottom: 16,
      backgroundColor: 'white',
    },
    styleContainer: {
      marginBottom: 20,
    },
    styleLabel: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
      color: '#333',
    },
    styleGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    styleChip: {
      marginRight: 8,
      marginBottom: 8,
    },
    generateButton: {
      marginBottom: 20,
      backgroundColor: '#6200ea',
    },
    resultsContainer: {
      marginTop: 20,
    },
    resultsTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
      color: '#333',
    },
    imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    imageContainer: {
      width: (width - 48) / 2,
      height: (width - 48) / 2,
      marginBottom: 16,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: 'white',
      elevation: 3,
    },
    generatedImage: {
      width: '100%',
      height: '80%',
    },
    imageActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingVertical: 8,
    },
    modalContent: {
      backgroundColor: 'white',
      margin: 20,
      borderRadius: 16,
      padding: 20,
    },
    modalImage: {
      width: '100%',
      height: 300,
      borderRadius: 12,
      marginBottom: 20,
    },
  });

  const imageStyles = [
    'Realistic',
    'Anime',
    'Cartoon',
    'Oil Painting',
    'Watercolor',
    'Digital Art',
    'Sketch',
    'Abstract',
    'Pop Art',
    'Minimalist',
  ];

  const checkUserQuota = () => {
    const userInfo = getUserInfo();
    if (!userInfo) return false;

    // Check if user has exceeded their quota for image generation
    if (userInfo.subscription?.plan === 'free') {
      const monthlyLimit = 10; // Free users get 10 AI image generations per month
      const currentUsage = userInfo.apiUsage?.currentMonthUsage || 0;

      if (currentUsage >= monthlyLimit) {
        Alert.alert(
          'Monthly Limit Reached',
          `You've reached your monthly limit of ${monthlyLimit} AI image generations. Upgrade to Premium for unlimited access!`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') },
          ]
        );
        return false;
      }
    }

    return true;
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setSnackbar({
        visible: true,
        message: 'Please enter a description for your image',
      });
      return;
    }

    // Check authentication and credits
    const hasAccess = await checkAccess();
    if (!hasAccess) return;

    // Show warning for low credits
    const warningMessage = getWarningMessage();
    if (warningMessage && remainingCredits <= 5 && remainingCredits !== -1) {
      Alert.alert(
        'Credit Warning',
        warningMessage,
        [
          { text: 'Continue', onPress: () => proceedWithGeneration() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    proceedWithGeneration();
  };

  const proceedWithGeneration = async () => {
    try {
      const fullPrompt = selectedStyle
        ? `${prompt}, ${selectedStyle} style`
        : prompt;

      const response = await generateImage({
        prompt: fullPrompt,
        style: selectedStyle,
      }).unwrap();

      if (response.success && response.image) {
        // Add the generated image to the list
        const newImage = {
          id: Date.now().toString(),
          prompt: fullPrompt,
          image: response.image,
          style: selectedStyle || 'default',
        };

        setGeneratedImages(prev => [newImage, ...prev]);

        setSnackbar({
          visible: true,
          message: 'Image generated successfully!',
        });

        // Display credit info if available
        if (response.creditInfo) {
          console.log(`Credits remaining: ${response.creditInfo.remaining}/${response.creditInfo.total}`);
        }
      } else {
        throw new Error(response.message || 'Failed to generate image');
      }
    } catch (error) {
      console.error('Image generation failed:', error);
      setSnackbar({
        visible: true,
        message: error.data?.message || 'Failed to generate image. Please try again.',
      });
    }
  };

  const handleImagePress = (image) => {
    setSelectedImage(image);
    setIsModalVisible(true);
  };

  const handleReport = (imageId) => {
    setCurrentImageId(imageId);
    setReportModalVisible(true);
    setIsModalVisible(false);
  };

  const handleSubmitReport = async (reportData) => {
    try {
      await reportContent({
        contentId: currentImageId,
        ...reportData,
      }).unwrap();

      setSnackbar({
        visible: true,
        message: 'Report submitted successfully',
      });
    } catch (error) {
      setSnackbar({
        visible: true,
        message: 'Failed to submit report',
      });
    }
  };

  const handleUseImage = (image) => {
    setIsModalVisible(false);
    // Navigate to post creation with the generated image
    navigation.navigate(SCREEN_NAME.PostCreation, {
      imageUri: image.url,
      platform: 'AI Generated',
    });
  };

  const renderUserInfo = () => {
    if (!currentUser) return null;

    const userInfo = getUserInfo();
    const hasUnlimitedAccess = canUseFeature('unlimited_generations');

    return (
      <Card style={styles.userInfoCard}>
        <Text style={styles.userInfo}>
          Welcome, {currentUser.name}! 🎨
        </Text>
        <Text style={styles.userInfo}>
          Plan: {userInfo?.subscription?.plan || 'Free'}
          {hasUnlimitedAccess && ' ✨ Unlimited'}
        </Text>
        {!hasUnlimitedAccess && (
          <Text style={styles.userInfo}>
            Generations: {10 - (userInfo?.apiUsage?.currentMonthUsage || 0)} remaining
          </Text>
        )}
      </Card>
    );
  };

  const renderQuotaWarning = () => {
    const userInfo = getUserInfo();
    if (!userInfo || canUseFeature('unlimited_generations')) return null;

    const currentUsage = userInfo.apiUsage?.currentMonthUsage || 0;
    const remaining = 10 - currentUsage;

    if (remaining <= 0) {
      return (
        <View style={styles.quotaWarning}>
          <Text style={styles.quotaText}>
            ⚠️ Monthly limit reached! Upgrade to Premium for unlimited AI image generation.
          </Text>
        </View>
      );
    }

    if (remaining <= 3) {
      return (
        <View style={[styles.quotaWarning, { backgroundColor: '#fff3e0' }]}>
          <Text style={[styles.quotaText, { color: '#ef6c00' }]}>
            ⚡ Only {remaining} generation${remaining !== 1 ? 's' : ''} left this month!
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <Header isBack={true} title="AI Image Generation" />

      <ScrollView style={styles.content}>
        {renderUserInfo()}
        {renderQuotaWarning()}

        {/* Credit Display */}
        <CreditDisplay
          service="aiImageGeneration"
          showUpgrade={true}
          style={{ marginBottom: 16 }}
        />

        <TextInput
          label="Describe the image you want to create"
          value={prompt}
          onChangeText={setPrompt}
          style={styles.promptInput}
          multiline
          numberOfLines={3}
          placeholder="Example: A futuristic city at sunset with flying cars"
          maxLength={500}
          right={<TextInput.Affix text={`${prompt.length}/500`} />}
        />

        <View style={styles.styleContainer}>
          <Text style={styles.styleLabel}>Choose a style (optional):</Text>
          <View style={styles.styleGrid}>
            {imageStyles.map((style) => (
              <Chip
                key={style}
                selected={selectedStyle === style}
                onPress={() => setSelectedStyle(selectedStyle === style ? '' : style)}
                style={styles.styleChip}
              >
                {style}
              </Chip>
            ))}
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleGenerateImage}
          style={styles.generateButton}
          loading={isLoading}
          disabled={!prompt.trim() || isLoading}
          icon="auto-fix"
          contentStyle={{ height: 48 }}
          labelStyle={{ fontSize: 16 }}
        >
          {isLoading ? 'Generating...' : 'Generate Images'}
        </Button>

        {generatedImages.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Generated Images</Text>
            <View style={styles.imageGrid}>
              {generatedImages.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.imageContainer}
                  onPress={() => handleImagePress(image)}
                >
                  <Image
                    source={{ uri: image.url }}
                    style={styles.generatedImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageActions}>
                    <MaterialCommunityIcons name="eye" size={20} color="#666" />
                    <MaterialCommunityIcons name="download" size={20} color="#666" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <Portal>
        <Modal
          visible={isModalVisible}
          onDismiss={() => setIsModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          {selectedImage && (
            <>
              <Image
                source={{ uri: selectedImage.url }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <View style={GolbalStyle.row}>
                <Button
                  mode="contained"
                  onPress={() => handleUseImage(selectedImage)}
                  style={{ flex: 1, marginRight: 8 }}
                  icon="post"
                >
                  Create Post
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => handleReport(selectedImage.id)}
                  style={{ flex: 1, marginLeft: 8 }}
                  icon="flag"
                >
                  Report
                </Button>
              </View>
              <Button
                mode="text"
                onPress={() => setIsModalVisible(false)}
                style={{ marginTop: 16 }}
              >
                Close
              </Button>
            </>
          )}
        </Modal>
      </Portal>

      <ReportContentModal
        visible={isReportModalVisible}
        onDismiss={() => setReportModalVisible(false)}
        onSubmit={handleSubmitReport}
        contentType="AI Generated Image"
      />

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>

      <Loader isAnalyzing={isLoading} />
    </View>
  );
};

// Export with authentication requirement
export default withAuthRequired(AIImageGenerationProtected, {
  message: "Sign in to unleash AI image generation and create stunning visuals!",
  showModal: true,
});