import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import {
  Button,
  Text,
  TextInput,
  useTheme,
  Portal,
  Modal,
  Snackbar,
  ActivityIndicator,
  Card,
} from 'react-native-paper';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import Header from '../../Components/header/Header';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAiImageEditeMutation } from '../../features/api/upload/uploadPhoto';
import Loader from '../../Components/loader/Loader';
import GolbalStyle from '../../Style';
import { useNavigation } from '@react-navigation/native';
import { SCREEN_NAME } from '../../Constant';
import BanneerAdd from '../Ads/BanneerAdd';
import { BannerAdSize } from 'react-native-google-mobile-ads';

// Auth components
import withAuthRequired from '../../Components/auth/withAuthRequired';
import useAuthRequired from '../../hooks/useAuthRequired';

const { width, height } = Dimensions.get('window');

const AIImageEditsProtected = () => {
  const [imageUri, setImageUri] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImageShow, setIsImageShow] = useState(false);
  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setIsLoading] = useState(false);
  const [currentImageId, setCurrentImageId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'info',
  });

  // Auth hook for additional checks
  const {
    isAuthenticated,
    currentUser,
    requireAuthentication,
    canUseFeature,
    getUserInfo,
  } = useAuthRequired();

  const setSnackbarMessage = (message, type = 'info') => {
    setSnackbar({
      visible: true,
      message: message,
      type: type,
    });
  };

  const setSnackbarVisible = (visible) => {
    setSnackbar(prev => ({ ...prev, visible }));
  };

  const report = (reportData) => {
    // Report functionality implementation
    console.log('Report submitted:', reportData);
  };

  const [aiEditImage, { data, isLoading, isError, error }] =
    useAiImageEditeMutation();
  const [scaleValue] = useState(new Animated.Value(1));

  const GhibliArr = [
    'Make this image Ghibli style',
  ];
  const theme = useTheme();
  const navigation = useNavigation();

  const animatePress = () => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const checkUserQuota = () => {
    const userInfo = getUserInfo();
    if (!userInfo) return false;

    // Check if user has exceeded their quota for image editing
    if (userInfo.subscription?.plan === 'free') {
      const monthlyLimit = 5; // Free users get 5 AI image edits per month
      const currentUsage = userInfo.apiUsage?.currentMonthUsage || 0;

      if (currentUsage >= monthlyLimit) {
        Alert.alert(
          'Monthly Limit Reached',
          `You've reached your monthly limit of ${monthlyLimit} AI image edits. Upgrade to Premium for unlimited access!`,
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

  const handleImagePick = async useCamera => {
    // Check authentication before allowing image selection
    const canProceed = requireAuthentication(
      null,
      "Please sign in to use AI image editing and save your creations."
    );

    if (!canProceed) return;

    const permissionResult = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setSnackbarMessage('Permission to access camera/gallery was denied');
      setSnackbarVisible(true);
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 1,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 1,
        });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
    setIsModalVisible(false);
  };

  const handleEdit = async () => {
    if (!imageUri || !prompt.trim()) {
      setSnackbarMessage(
        'Please select an image and provide editing instructions',
      );
      setSnackbarVisible(true);
      return;
    }

    // Double-check authentication
    const canProceed = requireAuthentication(
      null,
      "Please sign in to use AI image editing features."
    );

    if (!canProceed) return;

    // Check user quota
    if (!checkUserQuota()) return;

    // Check if user can use unlimited generations
    const hasUnlimitedAccess = canUseFeature('unlimited_generations');

    if (!hasUnlimitedAccess) {
      const userInfo = getUserInfo();
      const currentUsage = userInfo?.apiUsage?.currentMonthUsage || 0;
      const remaining = 5 - currentUsage;

      if (remaining <= 2) {
        Alert.alert(
          'Generation Limit Notice',
          `You have ${remaining} AI image edit${remaining !== 1 ? 's' : ''} remaining this month. Consider upgrading for unlimited access.`,
          [
            { text: 'Continue', onPress: () => proceedWithEdit() },
            { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') },
          ]
        );
        return;
      }
    }

    proceedWithEdit();
  };

  const proceedWithEdit = async () => {
    setIsLoading(true);
    try {
      if (imageUri) {
        const fileName = imageUri.split('/').pop();
        const formData = new FormData();
        formData.append('image', {
          uri: imageUri,
          name: fileName,
          type: 'image/jpeg',
        });

        let tempprompt =
          prompt == 'Ghibli style'
            ? GhibliArr[Math.floor(Math.random() * GhibliArr.length)]
            : prompt;

        formData.append('prompt', tempprompt);

        // Add user information for tracking
        formData.append('userId', currentUser?.id);
        formData.append('userPlan', currentUser?.subscription?.plan || 'free');

        await aiEditImage(formData);
      }
      setIsLoading(false);
    } catch (error) {
      setSnackbarMessage('Failed to process image. Please try again.');
      setSnackbarVisible(true);
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (!generatedImage) {
        Alert.alert('Error', 'No image to download');
        return;
      }

      const { status, canAskAgain } = await MediaLibrary.getPermissionsAsync();
      if (status !== 'granted') {
        if (canAskAgain) {
          const { status: newStatus } =
            await MediaLibrary.requestPermissionsAsync();
          if (newStatus !== 'granted') {
            Alert.alert(
              'Permission required',
              'Please enable photo library access in settings',
            );
            return;
          }
        } else {
          Alert.alert(
            'Permission denied',
            'Please enable photo library access in device settings',
          );
          return;
        }
      }

      let fileUri;
      const fileName = `ai_edit_${Date.now()}.jpg`;
      const directory = FileSystem.cacheDirectory;

      if (generatedImage.startsWith('data:image')) {
        const base64Data = generatedImage.split(',')[1] || generatedImage;
        fileUri = `${directory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } else {
        fileUri = `${directory}${fileName}`;
        const { uri } = await FileSystem.downloadAsync(generatedImage, fileUri);
        fileUri = uri;
      }

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('File not created');
      }

      const asset = await MediaLibrary.createAssetAsync(fileUri);
      const album = await MediaLibrary.getAlbumAsync('Download');
      if (album) {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      } else {
        await MediaLibrary.createAlbumAsync('Download', asset, false);
      }

      Alert.alert('Success', 'Image saved to photo gallery!');
    } catch (error) {
      Alert.alert('Error', `Failed to save image: ${error.message}`);
      console.error('Download error details:', error);
    }
  };

  const handleGeneratePost = () => {
    setIsImageShow(false);
    if (generatedImage) {
      navigation.navigate(SCREEN_NAME.PostCreation, {
        imageUri: generatedImage,
        platform: 'AI Generated',
      });
    }
  };

  useEffect(() => {
    if (data) {
      setIsImageShow(true);
      setGeneratedImage(data?.image);
      console.log('error', error);
    }
    console.log('error', error);
  }, [data, isLoading, isError, error]);

  const renderUserInfo = () => {
    if (!currentUser) return null;

    const userInfo = getUserInfo();
    const hasUnlimitedAccess = canUseFeature('unlimited_generations');

    return (
      <Card style={styles.userInfoCard}>
        <Text style={styles.userInfo}>
          Welcome, {currentUser.name}! ✨
        </Text>
        <Text style={styles.userInfo}>
          Plan: {userInfo?.subscription?.plan || 'Free'}
          {hasUnlimitedAccess && ' 🚀 Unlimited'}
        </Text>
        {!hasUnlimitedAccess && (
          <Text style={styles.userInfo}>
            AI Edits: {5 - (userInfo?.apiUsage?.currentMonthUsage || 0)} remaining
          </Text>
        )}
      </Card>
    );
  };

  const renderQuotaWarning = () => {
    const userInfo = getUserInfo();
    if (!userInfo || canUseFeature('unlimited_generations')) return null;

    const currentUsage = userInfo.apiUsage?.currentMonthUsage || 0;
    const remaining = 5 - currentUsage;

    if (remaining <= 0) {
      return (
        <View style={styles.quotaWarning}>
          <Text style={styles.quotaText}>
            ⚠️ Monthly limit reached! Upgrade to Premium for unlimited AI image editing.
          </Text>
        </View>
      );
    }

    if (remaining <= 2) {
      return (
        <View style={[styles.quotaWarning, { backgroundColor: theme.colors.tertiary }]}>
          <Text style={[styles.quotaText, { color: theme.colors.onTertiary }]}>
            ⚡ Only {remaining} AI edit{remaining !== 1 ? 's' : ''} left this month!
          </Text>
        </View>
      );
    }

    return null;
  };

  const ExamplePrompts = () => (
    <View style={styles.examplePromptsContainer}>
      <Text style={styles.exampleTitle}>Try these examples:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[
          'Ghibli style',
          'Remove background',
          'Make it cartoon style',
          'Enhance image quality',
          'Add sunset background',
          'Convert to black and white',
        ].map((text, index) => (
          <TouchableOpacity
            key={index}
            style={styles.examplePrompt}
            onPress={() => setPrompt(text)}
          >
            <Text style={styles.exampleText}>{text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const ProcessingOverlay = () => (
    <View style={styles.processingOverlay}>
      <ActivityIndicator size={48} color={theme.colors.primary} />
      <Text style={styles.processingText}>Applying AI Magic...</Text>
      <Text style={styles.processingSubText}>This may take a few seconds</Text>
    </View>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
    },
    userInfoCard: {
      marginBottom: 16,
      padding: 15,
      backgroundColor: theme.colors.primaryContainer,
      borderRadius: 12,
    },
    userInfo: {
      fontSize: 14,
      color: theme.colors.onPrimaryContainer,
      marginBottom: 5,
    },
    quotaWarning: {
      backgroundColor: theme.colors.errorContainer,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    quotaText: {
      color: theme.colors.onErrorContainer,
      fontSize: 14,
      textAlign: 'center',
    },
    imageContainer: {
      width: '100%',
      height: height * 0.4,
      borderRadius: 16,
      overflow: 'hidden',
      marginBottom: 16,
      backgroundColor: theme.colors.surfaceVariant,
      borderWidth: 2,
      borderColor: theme.colors.outline,
      elevation: 4,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    promptInput: {
      marginBottom: 16,
      backgroundColor: theme.colors.surface,
    },
    examplePromptsContainer: {
      marginBottom: 20,
    },
    exampleTitle: {
      fontSize: 14,
      color: theme.colors.secondary,
      marginBottom: 8,
    },
    examplePrompt: {
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 20,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginRight: 8,
    },
    exampleText: {
      color: theme.colors.primary,
    },
    processingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    processingText: {
      color: 'white',
      fontSize: 18,
      marginTop: 16,
    },
    processingSubText: {
      color: 'white',
      fontSize: 14,
      marginTop: 8,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      margin: 20,
      borderRadius: 16,
    },
    modalButton: {
      marginBottom: 12,
      borderRadius: 8,
      paddingVertical: 8,
    },
    clearButton: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 20,
      padding: 6,
    },
    generatePostButton: {
      position: 'absolute',
      bottom: 16,
      left: 16,
      right: 16,
    },
  });

  return (
    <View style={styles.container}>
      <Header isBack={true} title="AI Image Editor" />

      <ScrollView style={styles.content}>
        {renderUserInfo()}
        {renderQuotaWarning()}

        <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
          <TouchableOpacity
            style={styles.imageContainer}
            onPressIn={animatePress}
            onPress={() => setIsModalVisible(true)}
            activeOpacity={0.8}
          >
            {imageUri ? (
              <>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setImageUri(null)}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.placeholderContainer}>
                <MaterialCommunityIcons
                  name="cloud-upload"
                  size={64}
                  color={theme.colors.primary}
                />
                <Text style={{ marginTop: 16, color: theme.colors.primary }}>
                  Tap to Upload Image
                </Text>
                <Text style={{ color: theme.colors.secondary, fontSize: 12 }}>
                  Supported formats: JPG, PNG
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        <ExamplePrompts />

        <TextInput
          label="Describe Your Creative Vision"
          value={prompt}
          onChangeText={setPrompt}
          style={styles.promptInput}
          multiline
          numberOfLines={3}
          placeholder="Example: 'Remove the background and replace it with a tropical beach'"
          right={<TextInput.Affix text={`${prompt.length}/500`} />}
          maxLength={500}
        />

        <Button
          mode="contained-tonal"
          onPress={handleEdit}
          icon="auto-fix"
          loading={isProcessing}
          disabled={!imageUri || !prompt.trim() || isProcessing}
          contentStyle={{ height: 48 }}
          labelStyle={{ fontSize: 16 }}
        >
          {isProcessing ? 'Processing...' : 'Generate Magic'}
        </Button>
      </ScrollView>

      {isProcessing && <ProcessingOverlay />}

      <Portal>
        <Modal
          visible={isModalVisible}
          onDismiss={() => setIsModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleMedium" style={{ marginBottom: 20 }}>
            Select Image Source
          </Text>
          <Button
            mode="contained-tonal"
            onPress={() => handleImagePick(true)}
            style={styles.modalButton}
            icon="camera"
            contentStyle={{ flexDirection: 'row-reverse' }}
          >
            Take Photo
          </Button>
          <Button
            mode="contained-tonal"
            onPress={() => handleImagePick(false)}
            style={styles.modalButton}
            icon="image"
            contentStyle={{ flexDirection: 'row-reverse' }}
          >
            Choose from Gallery
          </Button>
          <Button
            mode="outlined"
            onPress={() => setIsModalVisible(false)}
            style={styles.modalButton}
          >
            Cancel
          </Button>
        </Modal>
      </Portal>

      <Portal>
        <Modal
          visible={isImageShow}
          onDismiss={() => setIsImageShow(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Button
            mode="contained"
            onPress={handleDownload}
            style={{
              position: 'absolute',
              top: 2,
              right: 10,
              borderRadius: 20,
              elevation: 3,
              zIndex: 999,
            }}
            icon="download"
          >
            Download
          </Button>
          {generatedImage && (
            <Image
              source={{ uri: generatedImage }}
              style={{ width: '100%', height: 300, marginBottom: 20 }}
              resizeMode="contain"
            />
          )}

          <View style={GolbalStyle.column}>
            <Button mode="contained" onPress={() => handleEdit()}>
              {isProcessing ? 'Processing...' : 'Re-Generate'}
            </Button>
            <Button
              mode="contained"
              onPress={handleGeneratePost}
              icon="post"
            >
              Generate Post with This Image
            </Button>
            <Button mode="contained" onPress={() => setIsImageShow(false)}>
              Close
            </Button>
          </View>
        </Modal>
      </Portal>

      <Loader isAnalyzing={isLoading} />

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
        style={{
          backgroundColor:
            snackbar.type === 'error'
              ? theme.colors.errorContainer
              : theme.colors.surfaceVariant,
        }}
      >
        <Text
          style={{
            color:
              snackbar.type === 'error'
                ? theme.colors.error
                : theme.colors.onSurface,
          }}
        >
          {snackbar.message}
        </Text>
      </Snackbar>
      <BanneerAdd.BannerTest
        bannerAdSize={BannerAdSize.FULL_BANNER}
        bottom={0}
      />
    </View>
  );
};

// Export with authentication requirement
export default withAuthRequired(AIImageEditsProtected, {
  message: "Sign in to unlock powerful AI image editing features and transform your photos!",
  showModal: true,
});