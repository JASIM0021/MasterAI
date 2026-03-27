import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Button,
  Image,
  Alert,
  TextInput,
  Text,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';

const PhotoEditor = () => {
  const [imageUri, setImageUri] = useState(null);
  const [text, setText] = useState('');
  const [editedImage, setEditedImage] = useState(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const applyFilter = async filterType => {
    if (!imageUri) return;

    const actions = [];

    switch (filterType) {
      case 'brighten':
        actions.push({ brightness: 0.5 });
        break;
      case 'contrast':
        actions.push({ contrast: 1.5 });
        break;
      case 'sepia':
        actions.push({ sepia: 1 });
        break;
      case 'rotate':
        actions.push({ rotate: 90 });
        break;
      case 'flip':
        actions.push({ flip: ImageManipulator.FlipType.Horizontal });
        break;
      default:
        return;
    }

    const edited = await ImageManipulator.manipulateAsync(imageUri, actions, {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    setEditedImage(edited.uri);
  };

  const saveImage = async () => {
    if (!editedImage) return;

    try {
      await MediaLibrary.saveToLibraryAsync(editedImage);
      Alert.alert(
        'Image Saved!',
        'Your edited photo has been saved to your gallery.',
      );
    } catch (error) {
      Alert.alert('Error', 'Could not save the image. Try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Pick an Image" onPress={pickImage} />

      {imageUri && (
        <>
          <Image
            source={{ uri: editedImage || imageUri }}
            style={styles.image}
          />
          <TextInput
            style={styles.input}
            placeholder="Add Text"
            value={text}
            onChangeText={setText}
          />

          <View style={styles.buttons}>
            <Button title="Brighten" onPress={() => applyFilter('brighten')} />
            <Button title="Contrast" onPress={() => applyFilter('contrast')} />
            <Button title="Sepia" onPress={() => applyFilter('sepia')} />
            <Button title="Rotate" onPress={() => applyFilter('rotate')} />
            <Button title="Flip" onPress={() => applyFilter('flip')} />
          </View>

          <Button title="Save Image" onPress={saveImage} />
        </>
      )}

      {text ? <Text style={styles.overlayText}>{text}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    marginTop: 50,
  },
  image: {
    width: 300,
    height: 300,
    marginVertical: 20,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    padding: 8,
    width: '80%',
    marginVertical: 10,
  },
  overlayText: {
    position: 'absolute',
    top: 280,
    left: 30,
    color: 'white',
    fontSize: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 5,
  },
});

export default PhotoEditor;
