import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Button, Text, useTheme, Portal, Modal } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const ImageUploader = ({ imageUri, setImageUri }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const theme = useTheme();

  const styles = StyleSheet.create({
    imageContainer: {
      width: '100%',
      height: width,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 16,
      backgroundColor: theme.colors.surface,
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
    modalContent: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      margin: 20,
      borderRadius: 8,
    },
    modalButton: {
      marginTop: 10,
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

  return (
    <>
      <TouchableOpacity
        style={styles.imageContainer}
        onPress={() => setIsModalVisible(true)}
      >
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <MaterialCommunityIcons
              name="image-plus"
              size={64}
              color={theme.colors.primary}
            />
            <Text>Tap to add a photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <Portal>
        <Modal
          visible={isModalVisible}
          onDismiss={() => setIsModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={{ marginBottom: 20 }}>Choose an option:</Text>
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
    </>
  );
};

export default ImageUploader;
