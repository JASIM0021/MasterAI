import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
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

const { width, height } = Dimensions.get('window');

const CreateCaption = () => {
  const [imageUri, setImageUri] = useState(null);
  const [language, setLanguage] = useState('');
  const [captionCategory, setCaptionCategory] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const theme = useTheme();
  const navigation = useNavigationHelper();

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
      // flex: 1,
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      // backgroundColor: theme.colors.background,
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
  });

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

  const handleUpload = async () => {
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

      try {
        await uploadPhotoApi(formData).unwrap();
      } catch (error) {
        console.error('Upload failed:', error);
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

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <LinearGradient
        colors={['#4158D0', '#C850C0', '#FFCC70']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <Header isBack={true} title="Create Post" />
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

export default CreateCaption;
