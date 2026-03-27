import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Alert,
} from 'react-native';
import {
  Button,
  Text,
  TextInput,
  useTheme,
  ActivityIndicator,
  Portal,
  Modal,
  IconButton,
  Card,
} from 'react-native-paper';
import { Dropdown } from 'react-native-element-dropdown';
import * as ImagePicker from 'expo-image-picker';
import Header from '../../Components/header/Header';
import { responsiveHeight, responsiveWidth } from '../../themes';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  useGenerateCaptionMutation,
  useUploadPhotoMutation,
} from '../../features/api/upload/uploadPhoto';
import useNavigationHelper from '../helper/NavigationHelper';
import { SCREEN_NAME } from '../../Constant';
import BanneerAdd from '../Ads/BanneerAdd';
import {
  BannerAdSize,
  useInterstitialAd,
} from 'react-native-google-mobile-ads';
import Loader from '../../Components/loader/Loader';
import { LinearGradient } from 'expo-linear-gradient';

// Auth components
import withAuthRequired from '../../Components/auth/withAuthRequired';
import useAuthRequired from '../../hooks/useAuthRequired';

const { width, height } = Dimensions.get('window');

const CaptionProtected = () => {
  const [imageUri, setImageUri] = useState(null);
  const [language, setLanguage] = useState('');
  const [captionCategory, setCaptionCategory] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const theme = useTheme();
  const navigation = useNavigationHelper();

  // Auth hook for additional checks
  const {
    isAuthenticated,
    currentUser,
    requireAuthentication,
    canUseFeature,
    getUserInfo,
  } = useAuthRequired();

  const [uploadPhotoApi, { isLoading, isSuccess, isError, data }] =
    useGenerateCaptionMutation();

  console.log({ isLoading, isSuccess, isError, data });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: 20,
    },
    imageContainer: {
      width: '100%',
      height: height * 0.4,
      borderRadius: 24,
      overflow: 'hidden',
      marginBottom: 24,
      backgroundColor: theme.colors.surface,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      elevation: 8,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholderContainer: {
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    dropdown: {
      marginBottom: 20,
      height: 56,
      borderColor: theme.colors.primary,
      borderWidth: 2,
      borderRadius: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      elevation: 5,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    dropdownText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '500',
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 20,
    },
    button: {
      flex: 1,
      marginHorizontal: 6,
      borderRadius: 16,
      elevation: 5,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      padding: 24,
      margin: 20,
      borderRadius: 24,
      elevation: 8,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    modalButton: {
      marginTop: 16,
      borderRadius: 16,
      elevation: 3,
    },
    userInfoCard: {
      marginBottom: 20,
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
    featureHighlight: {
      backgroundColor: theme.colors.secondaryContainer,
      padding: 15,
      borderRadius: 12,
      marginBottom: 20,
    },
    featureText: {
      color: theme.colors.onSecondaryContainer,
      fontSize: 14,
      textAlign: 'center',
      fontWeight: '500',
    },
  });

  const checkUserQuota = () => {
    const userInfo = getUserInfo();
    if (!userInfo) return false;

    // Check if user has exceeded their quota
    if (userInfo.subscription?.plan === 'free') {
      const monthlyLimit = 15; // Free users get 15 caption generations per month
      const currentUsage = userInfo.apiUsage?.currentMonthUsage || 0;

      if (currentUsage >= monthlyLimit) {
        Alert.alert(
          'Monthly Limit Reached',
          `You've reached your monthly limit of ${monthlyLimit} caption generations. Upgrade to Premium for unlimited access!`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigation.push({ screen: 'Subscription' }) },
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
      "Please sign in to generate captions and save your content."
    );

    if (!canProceed) return;

    let result;
    if (useCamera) {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
    }

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
    setIsModalVisible(false);
  };

  const handleUpload = async () => {
    // Double-check authentication
    const canProceed = requireAuthentication(
      null,
      "Please sign in to generate captions and save your content."
    );

    if (!canProceed) return;

    // Check user quota
    if (!checkUserQuota()) return;

    // Check if user can use unlimited generations
    const hasUnlimitedAccess = canUseFeature('unlimited_generations');

    if (!hasUnlimitedAccess) {
      const userInfo = getUserInfo();
      const currentUsage = userInfo?.apiUsage?.currentMonthUsage || 0;
      const remaining = 15 - currentUsage;

      if (remaining <= 3) {
        Alert.alert(
          'Generation Limit Notice',
          `You have ${remaining} caption generations remaining this month. Consider upgrading for unlimited access.`,
          [
            { text: 'Continue', onPress: () => proceedWithGeneration() },
            { text: 'Upgrade', onPress: () => navigation.push({ screen: 'Subscription' }) },
          ]
        );
        return;
      }
    }

    proceedWithGeneration();
  };

  const proceedWithGeneration = async () => {
    if (imageUri) {
      const fileName = imageUri.split('/').pop();
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: fileName,
        type: 'image/jpeg',
      });
      formData.append('language', language);
      formData.append('category', captionCategory);

      // Add user information for tracking
      formData.append('userId', currentUser?.id);
      formData.append('userPlan', currentUser?.subscription?.plan || 'free');

      try {
        await uploadPhotoApi(formData).unwrap();
      } catch (error) {
        console.error('Upload failed:', error);
        Alert.alert('Error', 'Failed to generate caption. Please try again.');
      }
    }
  };

  useEffect(() => {
    console.log('data', data);
    if (isSuccess) {
      navigation.push({
        screen: SCREEN_NAME.CaptionDetailsList,
        data: { data: data?.response?.response, image: imageUri },
      });
    }
  }, [isSuccess]);

  const languages = [
    { label: 'English', value: 'english' },
    { label: 'Hindi', value: 'hindi' },
    { label: 'Bengali', value: 'bengali' },
    { label: 'Urdu', value: 'urdu' },
    { label: 'Marathi', value: 'marathi' },
    { label: 'Tamil', value: 'tamil' },
    { label: 'Telugu', value: 'telugu' },
    { label: 'Gujarati', value: 'gujarati' },
    { label: 'Kannada', value: 'kannada' },
    { label: 'Odia', value: 'odia' },
  ];

  const captionCategories = [
    { label: 'Positive', value: 'positive' },
    { label: 'Fancy', value: 'fancy' },
    { label: 'Hater', value: 'hater' },
    { label: 'Inspirational', value: 'inspirational' },
    { label: 'Funny', value: 'funny' },
    { label: 'Romantic', value: 'romantic' },
    { label: 'Sarcastic', value: 'sarcastic' },
    { label: 'Motivational', value: 'motivational' },
    { label: 'Thoughtful', value: 'thoughtful' },
    { label: 'Quirky', value: 'quirky' },
  ];

  const renderUserInfo = () => {
    if (!currentUser) return null;

    const userInfo = getUserInfo();
    const hasUnlimitedAccess = canUseFeature('unlimited_generations');

    return (
      <Card style={styles.userInfoCard}>
        <Text style={styles.userInfo}>
          Welcome back, {currentUser.name}! 🎯
        </Text>
        <Text style={styles.userInfo}>
          Plan: {userInfo?.subscription?.plan || 'Free'}
          {hasUnlimitedAccess && ' ✨ Unlimited'}
        </Text>
        {!hasUnlimitedAccess && (
          <Text style={styles.userInfo}>
            Caption generations: {15 - (userInfo?.apiUsage?.currentMonthUsage || 0)} remaining
          </Text>
        )}
      </Card>
    );
  };

  const renderQuotaWarning = () => {
    const userInfo = getUserInfo();
    if (!userInfo || canUseFeature('unlimited_generations')) return null;

    const currentUsage = userInfo.apiUsage?.currentMonthUsage || 0;
    const remaining = 15 - currentUsage;

    if (remaining <= 0) {
      return (
        <View style={styles.quotaWarning}>
          <Text style={styles.quotaText}>
            ⚠️ Monthly limit reached! Upgrade to Premium for unlimited caption generations.
          </Text>
        </View>
      );
    }

    if (remaining <= 5) {
      return (
        <View style={[styles.quotaWarning, { backgroundColor: theme.colors.tertiary }]}>
          <Text style={[styles.quotaText, { color: theme.colors.onTertiary }]}>
            ⚡ Only {remaining} caption generations left this month!
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderFeatureHighlight = () => {
    const hasUnlimitedAccess = canUseFeature('unlimited_generations');

    if (hasUnlimitedAccess) {
      return (
        <View style={styles.featureHighlight}>
          <Text style={styles.featureText}>
            🚀 Premium User: Enjoy unlimited AI-powered captions in {languages.length} languages!
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.featureHighlight}>
        <Text style={styles.featureText}>
          💡 Create engaging captions in {languages.length} languages with AI magic!
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient
        colors={['#4158D0', '#C850C0', '#FFCC70']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Header isBack={true} title="Create Caption" />
        <ScrollView style={styles.content}>
          {/* {renderUserInfo()} */}
          {/* {renderQuotaWarning()} */}
          {renderFeatureHighlight()}

          <Card
            style={styles.imageContainer}
            onPress={() => setIsModalVisible(true)}
          >
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={['#4158D0', '#C850C0', '#FFCC70']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.placeholderContainer}
              >
                <MaterialCommunityIcons
                  name="image-plus"
                  size={80}
                  color={theme.colors.primary}
                />
                <Text
                  style={{
                    color: theme.colors.primary,
                    marginTop: 12,
                    fontSize: 18,
                    fontWeight: 'bold',
                  }}
                >
                  Tap to add a photo
                </Text>
              </LinearGradient>
            )}
          </Card>

          <Dropdown
            style={styles.dropdown}
            placeholderStyle={{
              color: theme.colors.placeholder,
              fontSize: 16,
              fontWeight: '500',
            }}
            selectedTextStyle={styles.dropdownText}
            inputSearchStyle={styles.dropdownText}
            data={languages}
            search
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="Select Language"
            searchPlaceholder="Search..."
            value={language}
            onChange={item => {
              setLanguage(item.value);
            }}
          />

          <Dropdown
            style={styles.dropdown}
            placeholderStyle={{
              color: theme.colors.placeholder,
              fontSize: 16,
              fontWeight: '500',
            }}
            selectedTextStyle={styles.dropdownText}
            inputSearchStyle={styles.dropdownText}
            data={captionCategories}
            search
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="Select Caption Category"
            searchPlaceholder="Search..."
            value={captionCategory}
            onChange={item => {
              setCaptionCategory(item.value);
            }}
          />

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={() => setIsModalVisible(true)}
              style={styles.button}
              icon="camera"
              labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
            >
              Change Photo
            </Button>
            <Button
              mode="contained"
              onPress={handleUpload}
              style={styles.button}
              icon={({ color }) => (
                <MaterialCommunityIcons name="post" size={24} color={color} />
              )}
              loading={isLoading}
              disabled={!imageUri || isLoading || !language || !captionCategory}
              labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
            >
              Generate Caption
            </Button>
          </View>
        </ScrollView>

        <Portal>
          <Modal
            visible={isModalVisible}
            onDismiss={() => setIsModalVisible(false)}
            contentContainerStyle={styles.modalContent}
          >
            <Text
              style={{
                marginBottom: 24,
                fontSize: 20,
                fontWeight: 'bold',
                textAlign: 'center',
              }}
            >
              Choose an option
            </Text>
            <Button
              mode="contained"
              onPress={() => handleImagePick(true)}
              style={styles.modalButton}
              icon="camera"
              labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
            >
              Take Photo
            </Button>
            <Button
              mode="contained"
              onPress={() => handleImagePick(false)}
              style={styles.modalButton}
              icon="image"
              labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
            >
              Choose from Gallery
            </Button>
            <Button
              mode="outlined"
              onPress={() => setIsModalVisible(false)}
              style={[styles.modalButton, { marginTop: 24 }]}
              labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
            >
              Cancel
            </Button>
          </Modal>
        </Portal>
        <Loader isAnalyzing={isLoading} />

        <BanneerAdd.BannerTest bannerAdSize={BannerAdSize.FULL_BANNER} />
      </LinearGradient>
    </SafeAreaView>
  );
};

// Export with authentication requirement
export default withAuthRequired(CaptionProtected, {
  message: "Sign in to create AI-powered captions and grow your social media presence!",
  showModal: true,
});