import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import {
  Button,
  Text,
  useTheme,
  Portal,
  Modal,
  IconButton,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import Header from '../../Components/header/Header';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTreeAnalizeMutation } from '../../features/api/upload/uploadPhoto';
import useNavigationHelper from '../helper/NavigationHelper';
import { SCREEN_NAME } from '../../Constant';
import Loader from '../../Components/loader/Loader';
import BanneerAdd from '../Ads/BanneerAdd';
import { BannerAdSize } from 'react-native-google-mobile-ads';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const TreeAnalize = () => {
  const [imageUri, setImageUri] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const theme = useTheme();
  const navigation = useNavigationHelper();

  const [uploadPhotoApi, { isLoading, isSuccess, data }] =
    useTreeAnalizeMutation();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      padding: 20,
    },
    imageContainer: {
      width: '100%',
      height: height * 0.5,
      overflow: 'hidden',
      marginBottom: 24,
      borderRadius: 20,
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    image: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    placeholderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
    },
    buttonContainer: {
      flexDirection: 'column',
      marginBottom: 20,
    },
    button: {
      marginVertical: 8,
      borderRadius: 12,
      elevation: 4,
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      padding: 24,
      margin: 20,
      borderRadius: 20,
      elevation: 10,
    },
    modalButton: {
      marginTop: 16,
      borderRadius: 12,
    },
  });

  const handleImagePick = async useCamera => {
    let result;
    const options = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    };

    if (useCamera) {
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
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

      try {
        await uploadPhotoApi(formData).unwrap();
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  };

  useEffect(() => {
    if (isSuccess) {
      navigation.push({
        screen: SCREEN_NAME.TreeDetailsScreen,
        data: { data: data?.response?.response, image: imageUri },
      });
    }
  }, [isSuccess]);

  return (
    <LinearGradient
      colors={['#00b09b', '#96c93d', '#ffd194']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <StatusBar translucent backgroundColor="transparent" />
      <Header isBack={true} title="Analyze Tree" />
      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={() => setIsModalVisible(true)}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.image} />
          ) : (
            <View style={styles.placeholderContainer}>
              <MaterialCommunityIcons
                name="image-plus"
                size={80}
                color="#fff"
              />
              <Text style={{ color: '#fff', marginTop: 12, fontSize: 18 }}>
                Tap to add a photo
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => setIsModalVisible(true)}
            style={styles.button}
            icon="camera"
            contentStyle={{ height: 56 }}
            labelStyle={{ fontSize: 18 }}
            color="#00b894"
          >
            Change Photo
          </Button>
          <Button
            mode="contained"
            onPress={handleUpload}
            style={styles.button}
            icon="tree"
            loading={isLoading}
            disabled={!imageUri || isLoading}
            contentStyle={{ height: 56 }}
            labelStyle={{ fontSize: 18 }}
            color="#0984e3"
          >
            Analyze Tree
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
              color: '#2d3436',
              fontSize: 20,
              fontWeight: 'bold',
            }}
          >
            Choose an option:
          </Text>
          <Button
            mode="contained"
            onPress={() => handleImagePick(true)}
            style={styles.modalButton}
            icon="camera"
            contentStyle={{ height: 50 }}
            labelStyle={{ fontSize: 16 }}
            color="#00b894"
          >
            Take Photo
          </Button>
          <Button
            mode="contained"
            onPress={() => handleImagePick(false)}
            style={styles.modalButton}
            icon="image"
            contentStyle={{ height: 50 }}
            labelStyle={{ fontSize: 16 }}
            color="#0984e3"
          >
            Choose from Gallery
          </Button>
          <IconButton
            icon="close"
            size={30}
            onPress={() => setIsModalVisible(false)}
            style={{ position: 'absolute', top: 10, right: 10 }}
          />
        </Modal>
      </Portal>
      <Loader isAnalyzing={isLoading} />
      <BanneerAdd.BannerTest bannerAdSize={BannerAdSize.FULL_BANNER} />
    </LinearGradient>
  );
};

export default TreeAnalize;
