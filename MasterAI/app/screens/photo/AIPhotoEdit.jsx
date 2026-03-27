import React, { useCallback, useEffect, useState } from 'react';
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
  TextInput,
  useTheme,
  ActivityIndicator,
  Portal,
  Modal,
  FAB,
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

const { width, height } = Dimensions.get('window');

const AIPhotoEdit = () => {
  const [imageUri, setImageUri] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const theme = useTheme();
  const navigation = useNavigationHelper();

  const handleEdit = () => {
    // navigate to Edit screen
    if (imageUri) {
      navigation.push({
        screen: SCREEN_NAME.TraditionalPhotoEdit,
        data: { imageUri },
      });
    } else {
      setSnackbarMessage('Please select an image first');
      setSnackbarVisible(true);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      padding: 16,
    },
    imageContainer: {
      width: '100%',
      height: height * 0.5,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 24,
      backgroundColor: theme.colors.surface,
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
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      margin: 20,
      borderRadius: 12,
      elevation: 5,
    },
    modalButton: {
      marginTop: 10,
    },
    dropdown: {
      marginBottom: 16,
      height: 50,
      borderColor: theme.colors.primary,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 8,
    },
    input: {
      marginBottom: 16,
    },
    fab: {
      position: 'absolute',
      margin: 16,
      right: 0,
      bottom: 0,
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
      setSnackbarMessage('Image selected successfully!');
      setSnackbarVisible(true);
    }
    setIsModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor={theme.colors.primary}
        barStyle="light-content"
      />
      <Header isBack={true} title="AI Photo Edit" />
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
            <View style={styles.placeholderContainer}>
              <MaterialCommunityIcons
                name="image-plus"
                size={64}
                color={theme.colors.primary}
              />
              <Text style={{ marginTop: 8, color: theme.colors.primary }}>
                Tap to add a photo
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => setIsModalVisible(true)}
            style={styles.button}
            icon="camera"
          >
            Change Photo
          </Button>
          <Button
            mode="contained"
            onPress={handleEdit}
            style={styles.button}
            icon="magic-staff"
            loading={false}
            disabled={!imageUri}
          >
            Edit Now
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={isModalVisible}
          onDismiss={() => setIsModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={{ marginBottom: 20, fontSize: 18, fontWeight: 'bold' }}>
            Choose an option:
          </Text>
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
      <FAB
        style={styles.fab}
        icon="information"
        onPress={() => {
          setSnackbarMessage(
            'AI Photo Edit helps you enhance your photos with AI!',
          );
          setSnackbarVisible(true);
        }}
      />
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
      <Loader isAnalyzing={false} />
    </View>
  );
};

export default AIPhotoEdit;
