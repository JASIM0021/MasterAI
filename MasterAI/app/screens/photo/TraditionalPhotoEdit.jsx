import React, { useState, useEffect } from 'react';
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
  // Slider,
  useTheme,
  Portal,
  Modal,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../../Components/header/Header';
// import Slider from '@react-native-community/slider';
// import { ProcessingManager } from 'react-native-image-filter-kit';

const { width, height } = Dimensions.get('window');

const TraditionalPhotoEdit = ({ route }) => {
  const { imageUri } = route.params?.data;
  const [editedImage, setEditedImage] = useState(imageUri);
  const [brightness, setBrightness] = useState(1);
  const [contrast, setContrast] = useState(1);
  const [saturation, setSaturation] = useState(1);
  const [hue, setHue] = useState(0);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  const theme = useTheme();

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
    controlsContainer: {
      marginBottom: 16,
    },
    sliderContainer: {
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
      alignItems: 'center',
    },
  });

  const applyEdits = async () => {
    try {
      // const result = await ProcessingManager.filter(editedImage, {
      //   filters: [
      //     {
      //       name: 'brightness',
      //       amount: brightness,
      //     },
      //     {
      //       name: 'contrast',
      //       amount: contrast,
      //     },
      //     {
      //       name: 'saturation',
      //       amount: saturation,
      //     },
      //     {
      //       name: 'hue',
      //       amount: hue,
      //     },
      //   ],
      // });
      setEditedImage(result);
    } catch (error) {
      console.error('Error applying edits:', error);
    }
  };

  const removeBg = async () => {
    setIsRemovingBg(true);
    // Implement background removal logic here
    // For now, we'll just show a modal
    setTimeout(() => {
      setIsRemovingBg(false);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <Header isBack={true} title="Advanced Photo Edit" />
      <ScrollView style={styles.content}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: editedImage }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>

        <View style={styles.controlsContainer}>
          <View style={styles.sliderContainer}>
            <Text>Brightness</Text>
            {/* <Slider
              value={brightness}
              onValueChange={setBrightness}
              minimumValue={0}
              maximumValue={2}
              step={0.1}
            /> */}
          </View>
          <View style={styles.sliderContainer}>
            <Text>Contrast</Text>
            {/* <Slider
              value={contrast}
              onValueChange={setContrast}
              minimumValue={0}
              maximumValue={2}
              step={0.1}
            /> */}
          </View>
          <View style={styles.sliderContainer}>
            <Text>Saturation</Text>
            <Slider
              value={saturation}
              onValueChange={setSaturation}
              minimumValue={0}
              maximumValue={2}
              step={0.1}
            />
          </View>
          <View style={styles.sliderContainer}>
            <Text>Hue</Text>
            {/* <Slider
              value={hue}
              onValueChange={setHue}
              minimumValue={-1}
              maximumValue={1}
              step={0.1}
            /> */}
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={removeBg}
            style={styles.button}
            icon="eraser"
          >
            Remove BG
          </Button>
          <Button
            mode="contained"
            onPress={applyEdits}
            style={styles.button}
            icon="content-save"
          >
            Apply Edits
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={isRemovingBg}
          onDismiss={() => setIsRemovingBg(false)}
          contentContainerStyle={styles.modalContent}
        >
          <MaterialCommunityIcons
            name="image-filter-center-focus"
            size={64}
            color={theme.colors.primary}
          />
          <Text style={{ marginTop: 16 }}>Removing background...</Text>
        </Modal>
      </Portal>
    </View>
  );
};

export default TraditionalPhotoEdit;
