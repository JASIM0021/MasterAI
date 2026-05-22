import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { Text, ActivityIndicator, FAB } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import Header from '../../Components/header/Header';
import { responsiveWidth } from '../../themes';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch } from 'react-redux';
import useNavigationHelper from '../helper/NavigationHelper';
import { SCREEN_NAME } from '../../Constant';
import AdBanner from '../../Components/ads/AdBanner';
import useInterstitialAd from '../../hooks/useInterstitialAd';
import { LinearGradient } from 'expo-linear-gradient';
import Loader from '../../Components/loader/Loader';
import { useMathSolverMutation } from '../../features/api/upload/uploadPhoto';
import { Dropdown } from 'react-native-element-dropdown';

const { width } = Dimensions.get('window');

const AIMathSolver = () => {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [camera, setCamera] = useState(null);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const navigation = useNavigationHelper();
  const dispatch = useDispatch();

  const [uploadMathQuestion, { isError, isLoading, data, isSuccess }] =
    useMathSolverMutation();
  const { showAd } = useInterstitialAd();

  const [language, setLanguage] = useState('');

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

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (isSuccess) {
      navigation.push({
        screen: SCREEN_NAME.AIMathSolverDetails,
        data: data,
      });
    }

    if (isError) {
      Alert.alert(
        'Error',
        "We couldn't process your math question. Please make sure it's a clear photo of a math problem.",
        [{ text: 'OK', onPress: () => console.log('OK Pressed') }],
      );
    }
  }, [isSuccess, isError]);

  const handleCapturePhoto = async () => {
    if (camera) {
      const photo = await camera.takePictureAsync();
      setImageUri(photo.uri);
      setIsCameraVisible(false);
    }
  };

  const handleUploadFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const uploadMathProblem = async () => {
    if (imageUri) {
      const fileName = imageUri.split('/').pop();
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: fileName,
        type: 'image/jpeg',
      });
      formData.append('language', language);

      try {
        await uploadMathQuestion(formData).unwrap();
        await showAd();
      } catch (error) {
        console.error('Upload failed:', error);
        Alert.alert(
          'Upload Failed',
          'There was an error uploading your math question. Please try again.',
          [{ text: 'OK', onPress: () => console.log('OK Pressed') }],
        );
      }
    } else {
      Alert.alert(
        'No Image',
        'Please select an image of a math question before uploading.',
        [{ text: 'OK', onPress: () => console.log('OK Pressed') }],
      );
    }
  };

  if (hasCameraPermission === null) {
    return <ActivityIndicator size="large" color="#6200ee" />;
  }
  if (hasCameraPermission === false) {
    return (
      <Text style={styles.errorText}>
        Camera access is required to use this feature
      </Text>
    );
  }

  return (
    <LinearGradient colors={['#6200ee', '#9c27b0']} style={styles.container}>
      <Header isBack={true} title="AI Math Solver" />

      {isCameraVisible ? (
        <Camera style={styles.camera} ref={setCamera}>
          <View style={styles.cameraControls}>
            <FAB
              icon="camera"
              onPress={handleCapturePhoto}
              color="#ffffff"
              style={{ backgroundColor: '#6200ee' }}
            />
            <FAB
              icon="close"
              onPress={() => setIsCameraVisible(false)}
              color="#ffffff"
              style={{ backgroundColor: '#9c27b0' }}
            />
          </View>
        </Camera>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity onPress={() => handleUploadFromGallery()}>
            {imageUri ? (
              <View style={styles.imagePreview}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  resizeMode="center"
                  resizeMethod="resize"
                />
              </View>
            ) : (
              <LinearGradient
                colors={['#7b1fa2', '#6200ea']}
                style={styles.placeholderContainer}
              >
                <MaterialCommunityIcons
                  name="math-compass"
                  size={80}
                  color="#ffffff"
                />
                <Text style={styles.placeholderText}>
                  Tap here to add an image of your math question
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          <AdBanner />

          <View style={styles.uploadOptions}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => setIsCameraVisible(true)}
            >
              <LinearGradient
                colors={['#7b1fa2', '#6200ea']}
                style={styles.optionIcon}
              >
                <MaterialCommunityIcons name="camera" size={28} color="white" />
              </LinearGradient>
              <Text style={styles.optionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleUploadFromGallery}
            >
              <LinearGradient
                colors={['#7b1fa2', '#6200ea']}
                style={styles.optionIcon}
              >
                <MaterialCommunityIcons name="image" size={28} color="white" />
              </LinearGradient>
              <Text style={styles.optionText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>

          <LinearGradient
            colors={['#7b1fa2', '#6200ea']}
            style={styles.dropdownContainer}
          >
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              inputSearchStyle={styles.dropdownSearch}
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

          <TouchableOpacity
            style={[
              styles.uploadButton,
              (!imageUri || !language || isLoading) && { opacity: 0.7 },
            ]}
            onPress={uploadMathProblem}
            disabled={!imageUri || !language || isLoading}
          >
            <MaterialCommunityIcons name="calculator" size={28} color="white" />
            <Text style={styles.uploadButtonText}>
              {imageUri && language
                ? 'Solve Math Problem'
                : 'Select an image and language'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
      <Loader isAnalyzing={isLoading} />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  imagePreview: {
    width: width - 40,
    height: width - 40,
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    alignSelf: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  image: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  uploadOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignContent: 'center',
    marginBottom: 30,
  },
  optionButton: {
    alignItems: 'center',
  },
  optionIcon: {
    padding: 18,
    borderRadius: 50,
    marginBottom: 10,
    elevation: 3,
  },
  optionText: {
    color: '#ffffff',
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  uploadButton: {
    backgroundColor: '#6200ee',
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 25,
    elevation: 4,
    width: '100%',
  },
  uploadButtonText: {
    color: '#ffffff',
    marginLeft: 12,
    fontSize: 18,
    fontWeight: 'bold',
  },
  placeholderContainer: {
    width: width - 40,
    height: width - 40,
    borderRadius: 20,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  placeholderText: {
    marginTop: 12,
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  dropdownContainer: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffffff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdown: {
    height: 50,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingBottom: 7,
  },
  dropdownPlaceholder: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dropdownSelectedText: {
    color: 'white',
  },
  dropdownSearch: {
    color: 'white',
  },
});

export default AIMathSolver;
