import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
  Image,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  Surface,
  IconButton,
  ProgressBar,
  Chip,
  Portal,
  Dialog,
  TextInput,
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import Header from '../../Components/header/Header';
import CreditDisplay from '../../Components/credits/CreditDisplay';
import { selectCurrentUser, selectIsAuthenticated } from '../../features/auth/authSlice';
import { useEditImageWithAIMutation, useGetUnifiedCreditBalanceQuery } from '../../features/api/creditsApiSlice';

// Import edit option components
import TextBasedEditOptions from './components/TextBasedEditOptions';
import StyleTransferOptions from './components/StyleTransferOptions';
import ObjectManipulationOptions from './components/ObjectManipulationOptions';
import EnhancementOptions from './components/EnhancementOptions';
import ResultsDisplay from './components/ResultsDisplay';

const { width, height } = Dimensions.get('window');

const AIImageEditScreen = ({ navigation }) => {
  const theme = useTheme();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);

  // State management
  const [selectedImage, setSelectedImage] = useState(null);
  const [editOptions, setEditOptions] = useState({
    textBasedEdit: '',
    styleTransfer: '',
    objectManipulation: '',
    enhancement: [],
    customPrompt: ''
  });
  const [editResult, setEditResult] = useState(null);
  const [showResultDialog, setShowResultDialog] = useState(false);

  // API hooks
  const [editImageWithAI, { isLoading: isEditingImage }] = useEditImageWithAIMutation();
  const { data: creditData } = useGetUnifiedCreditBalanceQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: 30000
  });

  // Available style options
  const styleOptions = [
    { label: 'Artistic', value: 'artistic painting style' },
    { label: 'Vintage', value: 'vintage retro style' },
    { label: 'Modern', value: 'modern sleek design' },
    { label: 'Cartoon', value: 'cartoon animation style' },
    { label: 'Watercolor', value: 'watercolor painting style' },
    { label: 'Oil Painting', value: 'oil painting style' },
  ];

  // Enhancement options
  const enhancementOptions = [
    { label: 'Brightness', value: 'improve brightness' },
    { label: 'Contrast', value: 'enhance contrast' },
    { label: 'Sharpness', value: 'increase sharpness' },
    { label: 'Color', value: 'enhance colors' },
    { label: 'Quality', value: 'improve overall quality' },
  ];

  // Check if user has enough credits
  const hasEnoughCredits = () => {
    if (currentUser?.subscription?.plan === 'premium') return true;
    if (!creditData?.credits) return false;

    const balance = creditData.credits.type === 'global'
      ? creditData.credits.balance
      : creditData.credits.services?.aiImageEdit?.remaining || 0;

    return balance >= 5;
  };

  // Image picker functions
  const pickImageFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
        setEditResult(null); // Clear previous results
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image from library');
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
        setEditResult(null); // Clear previous results
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();

      if (libraryStatus.status !== 'granted' || cameraStatus.status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera and photo library permissions to use this feature.');
        return false;
      }
    }
    return true;
  };

  const showImagePicker = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Alert.alert(
      'Select Image',
      'Choose how you want to select an image',
      [
        { text: 'Camera', onPress: takePhoto },
        { text: 'Photo Library', onPress: pickImageFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Edit option handlers
  const toggleEnhancement = (enhancement) => {
    setEditOptions(prev => ({
      ...prev,
      enhancement: prev.enhancement.includes(enhancement)
        ? prev.enhancement.filter(e => e !== enhancement)
        : [...prev.enhancement, enhancement]
    }));
  };

  const handleStyleSelect = (style) => {
    setEditOptions(prev => ({
      ...prev,
      styleTransfer: prev.styleTransfer === style ? '' : style
    }));
  };

  // Submit edit request
  const handleEditImage = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    if (!hasEnoughCredits()) {
      Alert.alert(
        'Insufficient Credits',
        'You need 5 credits to edit an image. Please purchase more credits or upgrade to premium.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Get Credits', onPress: () => navigation.navigate('CreditPurchase') },
        ]
      );
      return;
    }

    // Validate that at least one edit option is selected
    const hasEditOptions = editOptions.textBasedEdit.trim() ||
                          editOptions.styleTransfer ||
                          editOptions.objectManipulation.trim() ||
                          editOptions.enhancement.length > 0 ||
                          editOptions.customPrompt.trim();

    if (!hasEditOptions) {
      Alert.alert('Error', 'Please specify at least one edit option');
      return;
    }

    try {
      // Create file object for the API
      const imageFile = {
        uri: selectedImage.uri,
        type: selectedImage.mimeType || 'image/jpeg',
        name: selectedImage.fileName || 'image.jpg',
      };

      const editRequest = {
        image: imageFile,
        textBasedEdit: editOptions.textBasedEdit.trim() || undefined,
        styleTransfer: editOptions.styleTransfer || undefined,
        objectManipulation: editOptions.objectManipulation.trim() || undefined,
        enhancement: editOptions.enhancement.length > 0 ? editOptions.enhancement : undefined,
        customPrompt: editOptions.customPrompt.trim() || undefined,
      };

      const result = await editImageWithAI(editRequest).unwrap();

      if (result.success) {
        setEditResult(result);
        setShowResultDialog(true);
      } else {
        Alert.alert('Edit Failed', result.message || 'Failed to edit image');
      }
    } catch (error) {
      console.error('Image edit error:', error);
      Alert.alert('Error', 'Failed to edit image. Please try again.');
    }
  };

  const clearEditOptions = () => {
    setEditOptions({
      textBasedEdit: '',
      styleTransfer: '',
      objectManipulation: '',
      enhancement: [],
      customPrompt: ''
    });
  };

  const startNewEdit = () => {
    setSelectedImage(null);
    setEditResult(null);
    setShowResultDialog(false);
    clearEditOptions();
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Header title="AI Image Edit" />
        <View style={styles.notAuthenticatedContainer}>
          <MaterialCommunityIcons
            name="account-off"
            size={80}
            color={theme.colors.onSurface}
            style={styles.icon}
          />
          <Text style={styles.notAuthenticatedText}>
            Please sign in to use AI Image Edit
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="AI Image Edit" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Credit Display */}
        <View style={styles.creditsSection}>
          <CreditDisplay
            service="aiImageEdit"
            showUpgrade={currentUser?.subscription?.plan !== 'premium'}
            onUpgrade={() => navigation.navigate('Subscription')}
            style={styles.creditDisplay}
          />
        </View>

        {/* Image Selection Section */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="image" size={24} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Select Image</Text>
            </View>

            {selectedImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                <View style={styles.imageActions}>
                  <IconButton
                    icon="close"
                    size={20}
                    onPress={() => setSelectedImage(null)}
                    style={styles.removeImageButton}
                  />
                  <IconButton
                    icon="refresh"
                    size={20}
                    onPress={showImagePicker}
                    style={styles.changeImageButton}
                  />
                </View>
              </View>
            ) : (
              <Button
                mode="outlined"
                onPress={showImagePicker}
                icon="camera"
                style={styles.selectImageButton}
              >
                Select Image
              </Button>
            )}
          </Card.Content>
        </Card>

        {/* Edit Options */}
        {selectedImage && !editResult && (
          <>
            {/* Text-Based Editing */}
            <TextBasedEditOptions
              value={editOptions.textBasedEdit}
              onValueChange={(value) => setEditOptions(prev => ({ ...prev, textBasedEdit: value }))}
              disabled={isEditingImage}
            />

            {/* Style Transfer */}
            <StyleTransferOptions
              selectedStyle={editOptions.styleTransfer}
              onStyleSelect={(style) => setEditOptions(prev => ({
                ...prev,
                styleTransfer: prev.styleTransfer === style ? '' : style
              }))}
              disabled={isEditingImage}
            />

            {/* Object Manipulation */}
            <ObjectManipulationOptions
              value={editOptions.objectManipulation}
              onValueChange={(value) => setEditOptions(prev => ({ ...prev, objectManipulation: value }))}
              disabled={isEditingImage}
            />

            {/* Enhancement Options */}
            <EnhancementOptions
              selectedEnhancements={editOptions.enhancement}
              onToggleEnhancement={toggleEnhancement}
              disabled={isEditingImage}
            />

            {/* Custom Prompt */}
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="text-box-edit" size={24} color={theme.colors.primary} />
                  <Text style={styles.sectionTitle}>Custom Instructions</Text>
                </View>
                <Text style={styles.description}>
                  Add any additional custom instructions for your image edit.
                </Text>
                <TextInput
                  mode="outlined"
                  label="Custom prompt"
                  placeholder="Any additional instructions or specific requirements..."
                  value={editOptions.customPrompt}
                  onChangeText={(value) => setEditOptions(prev => ({ ...prev, customPrompt: value }))}
                  multiline
                  numberOfLines={2}
                  disabled={isEditingImage}
                />
              </Card.Content>
            </Card>
          </>
        )}

        {/* Results Display */}
        {editResult && (
          <ResultsDisplay
            originalImage={editResult.originalImage}
            editedImage={editResult.editedImage}
            editOptions={editResult.editOptions}
            feedback={editResult.feedback}
            creditsUsed={editResult.creditsUsed}
            onStartNewEdit={startNewEdit}
            onEditAgain={() => setEditResult(null)}
          />
        )}

        {/* Action Buttons */}
        {selectedImage && !editResult && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.actionButtons}>
                <Button
                  mode="outlined"
                  onPress={clearEditOptions}
                  icon="refresh"
                  style={[styles.actionButton, styles.clearButton]}
                  disabled={isEditingImage}
                >
                  Clear All
                </Button>

                <Button
                  mode="contained"
                  onPress={handleEditImage}
                  icon="magic-staff"
                  style={[styles.actionButton, styles.editButton]}
                  loading={isEditingImage}
                  disabled={!selectedImage || isEditingImage}
                >
                  {isEditingImage ? 'Editing...' : 'Edit Image (5 Credits)'}
                </Button>
              </View>

              {isEditingImage && (
                <View style={styles.progressSection}>
                  <Text style={styles.progressText}>Processing your image with AI...</Text>
                  <ProgressBar indeterminate color={theme.colors.primary} style={styles.progressBar} />
                </View>
              )}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Results Dialog */}
      <Portal>
        <Dialog visible={showResultDialog} onDismiss={() => setShowResultDialog(false)}>
          <Dialog.Title>Edit Complete!</Dialog.Title>
          <Dialog.Content>
            {editResult && (
              <>
                <Text style={styles.resultText}>
                  Your image has been successfully edited using AI.
                  {editResult.creditsUsed && ` Used ${editResult.creditsUsed} credits.`}
                </Text>
                {editResult.feedback && (
                  <Text style={styles.feedbackText}>{editResult.feedback}</Text>
                )}
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowResultDialog(false)}>View Result</Button>
            <Button onPress={startNewEdit}>New Edit</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  notAuthenticatedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  icon: {
    marginBottom: 20,
  },
  notAuthenticatedText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  creditsSection: {
    marginBottom: 16,
  },
  creditDisplay: {
    marginHorizontal: 0,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  imagePreview: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: 12,
    marginBottom: 12,
  },
  imageActions: {
    flexDirection: 'row',
    position: 'absolute',
    top: 8,
    right: 8,
  },
  removeImageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    margin: 0,
  },
  changeImageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    margin: 0,
    marginLeft: 8,
  },
  selectImageButton: {
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  clearButton: {
    borderColor: '#666',
  },
  editButton: {
    backgroundColor: '#4CAF50',
  },
  progressSection: {
    marginTop: 16,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
});

export default AIImageEditScreen;