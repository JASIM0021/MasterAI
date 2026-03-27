import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Button,
  Text,
  TextInput,
  useTheme,
  ActivityIndicator,
  Portal,
  Modal,
  Snackbar,
} from 'react-native-paper';
import { Dropdown } from 'react-native-element-dropdown';
import * as ImagePicker from 'expo-image-picker';
import Header from '../../Components/header/Header';
import { responsiveHeight, responsiveWidth } from '../../themes';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  useAnalyzeFeelingsMutation,
  useGenerateCaptionMutation,
  useUploadPhotoMutation,
} from '../../features/api/upload/uploadPhoto';
import useNavigationHelper from '../helper/NavigationHelper';
import { SCREEN_NAME } from '../../Constant';
import Loader from '../../Components/loader/Loader';
import { useInterstitialAd } from 'react-native-google-mobile-ads';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const AnalyzeUserFeelings = () => {
  const [imageUri, setImageUri] = useState(null);
  const [language, setLanguage] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [personName, setPersonName] = useState('');
  const [personAge, setPersonAge] = useState('');
  const [personGender, setPersonGender] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const theme = useTheme();
  const navigation = useNavigationHelper();

  const [uploadPhotoApi, { isLoading, isSuccess, isError, data, error }] =
    useAnalyzeFeelingsMutation();

  console.log({ isLoading, isSuccess, isError, data, error });

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    gradientBackground: {
      flex: 1,
    },
    content: {
      padding: 16,
    },
    imageContainer: {
      width: '100%',
      height: width,
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 24,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    placeholderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    placeholderIcon: {
      marginBottom: 12,
    },
    placeholderText: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 16,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    captionInput: {
      marginBottom: 16,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    button: {
      flex: 1,
      marginHorizontal: 4,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    modalContent: {
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: 20,
      margin: 20,
      borderRadius: 15,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.34,
      shadowRadius: 6.27,
    },
    modalButton: {
      marginTop: 10,
    },
    dropdown: {
      marginBottom: 16,
      height: 50,
      borderColor: 'rgba(255, 255, 255, 0.5)',
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    input: {
      marginBottom: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      // elevation: 3,
      // shadowColor: '#000',
      // shadowOffset: { width: 0, height: 1 },
      // shadowOpacity: 0.22,
      // shadowRadius: 2.22,
    },
  });

  const handleImagePick = async useCamera => {
    let result;
    if (useCamera) {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
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
      formData.append('personName', personName);
      formData.append('personAge', personAge);
      formData.append('personGender', personGender);

      try {
        await uploadPhotoApi(formData).unwrap();
      } catch (error) {
        console.error('Upload failed:', error);
        setErrorMessage('Failed to analyze feelings. Please try again.');
        setSnackbarVisible(true);
      }
    }
  };

  useEffect(() => {
    console.log('data', data);
    if (isSuccess) {
      navigation.push({
        screen: SCREEN_NAME.AnalyzeUserFeelingsDetailView,
        data: { data: data?.response?.response, image: imageUri },
      });
    }
  }, [isSuccess]);

  useEffect(() => {
    if (isError) {
      setErrorMessage('An error occurred. Please try again.');
      setSnackbarVisible(true);
    }
  }, [isError]);

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

  const genders = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ];

  return (
    <LinearGradient
      colors={['#4158D0', '#C850C0', '#FFCC70']}
      style={styles.gradientBackground}
    >
      <ScrollView>
        <View style={styles.container}>
          <Header isBack={true} title="Analyze User Feelings" />
          <ScrollView style={styles.content}>
            <TouchableOpacity
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
                    size={64}
                    color="rgba(255, 255, 255, 0.8)"
                    style={styles.placeholderIcon}
                  />
                  <Text style={styles.placeholderText}>
                    Tap to add a photo of the person
                  </Text>
                </LinearGradient>
              )}
            </TouchableOpacity>

            <TextInput
              label="Person's Name"
              value={personName}
              onChangeText={setPersonName}
              style={styles.input}
              theme={{
                colors: {
                  text: 'white',
                  placeholder: 'rgba(255, 255, 255, 0.8)',
                  primary: 'white',
                },
              }}
            />

            <TextInput
              label="Person's Age"
              value={personAge}
              onChangeText={setPersonAge}
              keyboardType="numeric"
              style={styles.input}
              theme={{
                colors: {
                  text: 'white',
                  placeholder: 'rgba(255, 255, 255, 0.8)',
                  primary: 'white',
                },
              }}
            />

            <Dropdown
              style={styles.dropdown}
              placeholderStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
              selectedTextStyle={{ color: 'white' }}
              inputSearchStyle={{ color: 'white' }}
              data={genders}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select Gender"
              value={personGender}
              onChange={item => {
                setPersonGender(item.value);
              }}
            />

            <Dropdown
              style={styles.dropdown}
              placeholderStyle={{ color: 'rgba(255, 255, 255, 0.8)' }}
              selectedTextStyle={{ color: 'white' }}
              inputSearchStyle={{ color: 'white' }}
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

            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={() => setIsModalVisible(true)}
                style={styles.button}
                icon="camera"
                color="#3498db"
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
                disabled={
                  !imageUri ||
                  isLoading ||
                  !language ||
                  !personName ||
                  !personAge ||
                  !personGender
                }
                color="#2ecc71"
              >
                Analyze Feelings
              </Button>
            </View>
          </ScrollView>

          <Portal>
            <Modal
              visible={isModalVisible}
              onDismiss={() => setIsModalVisible(false)}
              contentContainerStyle={styles.modalContent}
            >
              <LinearGradient
                colors={['#4158D0', '#C850C0', '#FFCC70']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 20, borderRadius: 15 }}
              >
                <Text
                  style={{
                    marginBottom: 20,
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: 18,
                  }}
                >
                  Choose an option:
                </Text>
                <Button
                  mode="contained"
                  onPress={() => handleImagePick(true)}
                  style={[styles.modalButton, { marginBottom: 10 }]}
                  icon="camera"
                  color="#3498db"
                >
                  Take Photo
                </Button>
                <Button
                  mode="contained"
                  onPress={() => handleImagePick(false)}
                  style={[styles.modalButton, { marginBottom: 10 }]}
                  icon="image"
                  color="#2ecc71"
                >
                  Choose from Gallery
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setIsModalVisible(false)}
                  style={styles.modalButton}
                  color="white"
                >
                  Cancel
                </Button>
              </LinearGradient>
            </Modal>
          </Portal>
          <Loader isAnalyzing={isLoading} />
          <Snackbar
            visible={snackbarVisible}
            onDismiss={() => setSnackbarVisible(false)}
            action={{
              label: 'OK',
              onPress: () => setSnackbarVisible(false),
            }}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          >
            {errorMessage}
          </Snackbar>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default AnalyzeUserFeelings;
