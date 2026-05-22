import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import {
  Button,
  Text,
  useTheme,
  Card,
  Portal,
  Modal,
} from 'react-native-paper';
import { Dropdown } from 'react-native-element-dropdown';
import Header from '../../Components/header/Header';
import useNavigationHelper from '../helper/NavigationHelper';
import { SCREEN_NAME } from '../../Constant';
import { usePostCaptionMutation } from '../../features/api/upload/uploadPhoto';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AdBanner from '../../Components/ads/AdBanner';
import Loader from '../../Components/loader/Loader';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

// Auth components
import withAuthRequired from '../../Components/auth/withAuthRequired';
import useAuthRequired from '../../hooks/useAuthRequired';

// Credit components
import CreditDisplay from '../../Components/credits/CreditDisplay';
import useCredits from '../../hooks/useCredits';

const { width, height } = Dimensions.get('window');

const PostCreationProtected = ({ route }) => {
  const { platform, imageUri: img } = route.params;
  const [imageUri, setImageUri] = useState(img);
  const [language, setLanguage] = useState('');
  const theme = useTheme();
  const navigation = useNavigationHelper();
  const [isModalVisible, setIsModalVisible] = useState(false);

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
  } = useCredits('postGeneration');

  const [generatePost, { isLoading, isSuccess, isError, data }] =
    usePostCaptionMutation();

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
      backgroundColor: theme.colors.background,
    },
    dropdown: {
      marginBottom: 20,
      height: 56,
      borderColor: theme.colors.primary,
      borderRadius: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      elevation: 5,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    button: {
      flex: 1,
      marginHorizontal: 4,
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
  });

  const getPlatformIcon = () => {
    switch (platform) {
      case 'LinkedIn':
        return 'linkedin';
      case 'Facebook':
        return 'facebook';
      case 'Twitter':
        return 'twitter';
      default:
        return 'post';
    }
  };

  const checkUserQuota = () => {
    const userInfo = getUserInfo();
    if (!userInfo) return false;

    // Check if user has exceeded their quota
    if (userInfo.subscription?.plan === 'free') {
      const monthlyLimit = 10; // Free users get 10 generations per month
      const currentUsage = userInfo.apiUsage?.currentMonthUsage || 0;

      if (currentUsage >= monthlyLimit) {
        Alert.alert(
          'Monthly Limit Reached',
          `You've reached your monthly limit of ${monthlyLimit} generations. Upgrade to Premium for unlimited access!`,
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

  const handleGeneratePost = async () => {
    // Check authentication and credits
    const hasAccess = await checkAccess();
    if (!hasAccess) return;

    // Show warning for low credits
    const warningMessage = getWarningMessage();
    if (warningMessage && remainingCredits <= 3 && remainingCredits !== -1) {
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
    if (imageUri) {
      const fileName = imageUri.split('/').pop();
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: fileName,
        type: 'image/jpeg',
      });
      formData.append('platform', platform);
      formData.append('language', language);

      // Add user information for tracking
      formData.append('userId', currentUser?.id);
      formData.append('userPlan', currentUser?.subscription?.plan || 'free');

      try {
        // Deduct credit before generation
        const creditUsed = await useCredit();
        if (!creditUsed) {
          return; // Credit deduction failed, stop generation
        }

        await generatePost(formData).unwrap();
      } catch (error) {
        console.error('Post generation failed:', error);
        Alert.alert('Error', 'Failed to generate post. Please try again.');
      }
    }
  };

  useEffect(() => {
    if (isSuccess) {
      console.log('data', data);
      navigation.push({
        screen: SCREEN_NAME.PostDetailsList,
        data: { data: data?.response?.response, image: imageUri, platform },
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

  const handleImagePick = async useCamera => {
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

  const renderUserInfo = () => {
    if (!currentUser) return null;

    const userInfo = getUserInfo();
    const hasUnlimitedAccess = canUseFeature('unlimited_generations');

    return (
      <Card style={styles.userInfoCard}>
        <Text style={styles.userInfo}>
          Welcome, {currentUser.name}! 👋
        </Text>
        <Text style={styles.userInfo}>
          Plan: {userInfo?.subscription?.plan || 'Free'}
          {hasUnlimitedAccess && ' ✨ Unlimited'}
        </Text>
        {!hasUnlimitedAccess && (
          <Text style={styles.userInfo}>
            Remaining: {10 - (userInfo?.apiUsage?.currentMonthUsage || 0)} generations this month
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
            ⚠️ Monthly limit reached! Upgrade to Premium for unlimited generations.
          </Text>
        </View>
      );
    }

    if (remaining <= 3) {
      return (
        <View style={[styles.quotaWarning, { backgroundColor: theme.colors.tertiary }]}>
          <Text style={[styles.quotaText, { color: theme.colors.onTertiary }]}>
            ⚡ Only {remaining} generations left this month!
          </Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient
        colors={['#4158D0', '#C850C0', '#FFCC70']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Header isBack={true} title={`Create ${platform} Post`} />
        <AdBanner />
        <ScrollView style={styles.content}>
          {renderUserInfo()}
          {renderQuotaWarning()}

          {/* Credit Display */}
          <CreditDisplay
            service="postGeneration"
            showUpgrade={true}
            style={{ marginBottom: 16 }}
          />

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

          <LinearGradient
            colors={['#7b1fa2', '#6200ea']}
            style={styles.dropdown}
          >
            <Dropdown
              style={{ width: '100%', height: '100%' }}
              placeholderStyle={{
                color: theme.colors.placeholder,
                fontSize: 16,
                fontWeight: '500',
              }}
              selectedTextStyle={{
                color: theme.colors.text,
                fontSize: 16,
                fontWeight: '500',
              }}
              inputSearchStyle={{ color: theme.colors.text }}
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
          </LinearGradient>

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
              onPress={handleGeneratePost}
              style={styles.button}
              icon={({ color }) => (
                <MaterialCommunityIcons
                  name={getPlatformIcon()}
                  size={24}
                  color={color}
                />
              )}
              loading={isLoading}
              disabled={!imageUri || isLoading || !language}
              labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
            >
              Generate Post
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
        <AdBanner />
        <Loader isAnalyzing={isLoading} />
      </LinearGradient>
    </SafeAreaView>
  );
};

// Export with authentication requirement
export default withAuthRequired(PostCreationProtected, {
  message: "Sign in to create AI-powered social media posts and join thousands of content creators!",
  showModal: true,
});