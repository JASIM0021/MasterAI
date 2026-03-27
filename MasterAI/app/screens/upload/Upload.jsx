import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Platform,
  Alert,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Pressable,
} from 'react-native';
import {
  Button,
  Text,
  Divider,
  useTheme,
  TouchableRipple,
  ActivityIndicator,
  Portal,
  Modal,
  FAB,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import Header from '../../Components/header/Header';
import CustomText from '../../Components/Text';
import { responsiveHeight, responsiveWidth } from '../../themes';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import GolbalStyle from '../../Style';
import { useDispatch } from 'react-redux';
import { useUploadPhotoMutation } from '../../features/api/upload/uploadPhoto';
import useNavigationHelper from '../helper/NavigationHelper';
import { SCREEN_NAME } from '../../Constant';
import BanneerAdd from '../Ads/BanneerAdd';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Loader from '../../Components/loader/Loader';

const { width, height } = Dimensions.get('window');

const UploadPhoto = () => {
  const [hasCameraPermission, setHasCameraPermission] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [camera, setCamera] = useState(null);
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const theme = useTheme();
  const navigation = useNavigationHelper();
  const router = useRoute().params;
  const dispatch = useDispatch();

  const [uploadPhotoApi, { isError, isLoading, data, isSuccess }] =
    useUploadPhotoMutation();

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
    modal: {
      margin: 20,
      backgroundColor: 'white',
      borderRadius: 20,
      padding: 35,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    },
    modalImage: {
      width: width - 70,
      height: width - 70,
      borderRadius: 15,
      marginBottom: 20,
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
  });

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (isSuccess) {
      navigation.push({
        screen: SCREEN_NAME.QuestionAnswerList,
        data: data,
      });
    }

    if (isError) {
      Alert.alert(
        'Oops!',
        "We couldn't process your image. Please make sure it's a clear photo of an educational question, not an object.",
        [{ text: 'OK', onPress: () => console.log('OK Pressed') }],
      );
    }
  }, [isSuccess, isError]);

  const handleCapturePhoto = async () => {
    if (camera) {
      const photo = await camera.takePictureAsync();
      setImageUri(photo.uri);
      setIsCameraVisible(false);
      dispatch(saveFile(photo));
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
      dispatch(saveFile(result.assets[0]));
    }
  };

  const uploadToGimini = async () => {
    console.log('Uploading to Gimini...');
    if (imageUri) {
      const fileName = imageUri.split('/').pop();
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        name: fileName,
        type: 'image/jpeg',
      });

      try {
        const response = await uploadPhotoApi(formData).unwrap();
        console.log('Upload successful:', response);
        // Handle successful upload here
      } catch (error) {
        console.error('Upload failed:', error);
        Alert.alert(
          'Upload Failed',
          'There was an error uploading your image. Please try again.',
          [{ text: 'OK', onPress: () => console.log('OK Pressed') }],
        );
      }
    } else {
      console.log('No image selected');
      Alert.alert('No Image', 'Please select an image before uploading.', [
        { text: 'OK', onPress: () => console.log('OK Pressed') },
      ]);
    }
  };

  if (hasCameraPermission === null) {
    return <ActivityIndicator size="large" color="#6200ee" />;
  }
  if (hasCameraPermission === false) {
    return (
      <Text
        style={{
          color: '#ffffff',
          textAlign: 'center',
          marginTop: 20,
          fontSize: 16,
        }}
      >
        Camera access is required to use this feature
      </Text>
    );
  }

  return (
    <LinearGradient colors={['#6200ee', '#9c27b0']} style={styles.container}>
      <Header isBack={true} title={router ? router?.title : 'Upload Photo'} />

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
                  resizeMode="cover"
                />
              </View>
            ) : (
              <LinearGradient
                colors={['#7b1fa2', '#6200ea']}
                style={styles.placeholderContainer}
              >
                <MaterialCommunityIcons
                  name="image-plus"
                  size={80}
                  color="#ffffff"
                />
                <Text style={styles.placeholderText}>
                  Tap here to add an image of your question
                </Text>
              </LinearGradient>
            )}
          </TouchableOpacity>

          <BanneerAdd.BannerTest
            bottom={140}
            bannerAdSize={BannerAdSize.FULL_BANNER}
          />

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
              <Text style={{ color: '#ffffff', fontSize: 16 }}>Take Photo</Text>
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
              <Text style={{ color: '#ffffff', fontSize: 16 }}>
                Choose from Gallery
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.uploadButton,
              (!imageUri || isLoading) && { opacity: 0.7 },
            ]}
            onPress={() => {
              uploadToGimini();
            }}
            disabled={!imageUri || isLoading}
          >
            <MaterialCommunityIcons
              name="cloud-upload"
              size={28}
              color="white"
            />
            <Text style={styles.uploadButtonText}>
              {imageUri ? 'Upload Image' : 'Select an image'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      <Portal>
        <Modal
          visible={isModalVisible}
          onDismiss={() => setIsModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.modalImage}
            resizeMode="contain"
          />
          <Button
            mode="contained"
            onPress={() => setIsModalVisible(false)}
            style={{ marginTop: 10 }}
          >
            Close
          </Button>
        </Modal>
      </Portal>
      <Loader isAnalyzing={isLoading} />
    </LinearGradient>
  );
};

export default UploadPhoto;
