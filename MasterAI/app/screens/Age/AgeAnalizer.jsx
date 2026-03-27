import React, { useEffect, useState } from 'react';
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
  useTheme,
  Portal,
  Modal,
  Snackbar,
  Surface,
  Card,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import Header from '../../Components/header/Header';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAnalyzeAgeMutation } from '../../features/api/upload/uploadPhoto';
import useNavigationHelper from '../helper/NavigationHelper';
import { SCREEN_NAME } from '../../Constant';
import Loader from '../../Components/loader/Loader';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const AgeAnalizer = () => {
  const [imageUri, setImageUri] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [gradientColors, setGradientColors] = useState([
    '#4158D0',
    '#C850C0',
    '#FFCC70',
  ]);
  const theme = useTheme();
  const navigation = useNavigationHelper();

  const [uploadPhotoApi, { isLoading, isSuccess, isError, data, error }] =
    useAnalyzeAgeMutation();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      padding: 20,
      paddingBottom: 40,
    },
    imageContainer: {
      width: '100%',
      height: width * 0.8,
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 24,
      backgroundColor: theme.colors.surface,
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
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    buttonContainer: {
      flexDirection: 'column',
      marginBottom: 24,
    },
    button: {
      marginVertical: 8,
      borderRadius: 12,
      elevation: 4,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      margin: 20,
      borderRadius: 8,
    },
    modalButton: {
      marginTop: 10,
    },
    gradientBackground: {
      flex: 1,
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
      setGradientColors(['#4158D0', '#C850C0', '#FFCC70']);
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
      try {
        await uploadPhotoApi(formData).unwrap();
      } catch (error) {
        console.error('Upload failed:', error);
        setErrorMessage('Failed to analyze age. Please try again.');
        setSnackbarVisible(true);
      }
    }
  };

  useEffect(() => {
    if (isSuccess) {
      navigation.push({
        screen: SCREEN_NAME.AgeDetailsScreen,
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

  return (
    <LinearGradient
      colors={gradientColors}
      style={styles.gradientBackground}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.container}>
        <Header isBack={true} title="Analyze User Age" />
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
                  color={theme.colors.primary}
                />
              </LinearGradient>
            )}
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleUpload}
              style={styles.button}
              icon={({ color }) => (
                <MaterialCommunityIcons name="post" size={24} color={color} />
              )}
              loading={isLoading}
              disabled={!imageUri || isLoading}
              labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
            >
              Analyze Age
            </Button>
          </View>
        </ScrollView>

        <Portal>
          <Modal
            visible={isModalVisible}
            onDismiss={() => setIsModalVisible(false)}
            contentContainerStyle={styles.modalContent}
          >
            <Button
              mode="contained"
              onPress={() => handleImagePick(true)}
              style={styles.modalButton}
              icon="camera"
            >
              Take Photo
            </Button>
            <Button
              mode="contained"
              onPress={() => handleImagePick(false)}
              style={styles.modalButton}
              icon="image"
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
        <Loader isAnalyzing={isLoading} />
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          action={{
            label: 'OK',
            onPress: () => setSnackbarVisible(false),
          }}
        >
          {errorMessage}
        </Snackbar>
      </View>
    </LinearGradient>
  );
};

export default AgeAnalizer;
