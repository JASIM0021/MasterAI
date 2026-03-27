import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  Dimensions,
  Image,
  SafeAreaView,
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
import ImageUploader from '../../Components/Image/ImageUploader';
import BanneerAdd from '../Ads/BanneerAdd';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import Loader from '../../Components/loader/Loader';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { CompactLowCreditBanner } from '../../Components/ads/LowCreditBanner';

const { width, height } = Dimensions.get('window');

const PostCreation = ({ route }) => {
  const { platform, imageUri: img } = route.params;
  const [imageUri, setImageUri] = useState(img);
  const [language, setLanguage] = useState('');
  const theme = useTheme();
  const navigation = useNavigationHelper();
  const [isModalVisible, setIsModalVisible] = useState(false);

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
      // borderWidth: 2,
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

  const handleGeneratePost = async () => {
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

      try {
        await generatePost(formData).unwrap();
      } catch (error) {
        console.error('Post generation failed:', error);
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

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient
        colors={['#4158D0', '#C850C0', '#FFCC70']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Header isBack={true} title={`Create ${platform} Post`} />
        <CompactLowCreditBanner source="ai_generation" />
        <ScrollView style={styles.content}>
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
              // style={styles.dropdown}
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
        <BanneerAdd.BannerTest
          bannerAdSize={BannerAdSize.FULL_BANNER}
          bottom={100}
        />
        <Loader isAnalyzing={isLoading} />
      </LinearGradient>
    </SafeAreaView>
  );
};

export default PostCreation;
