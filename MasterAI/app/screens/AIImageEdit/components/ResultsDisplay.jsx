import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  IconButton,
  Surface,
  Chip,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

const ResultsDisplay = ({
  originalImage,
  editedImage,
  editOptions,
  feedback,
  creditsUsed,
  onStartNewEdit,
  onEditAgain
}) => {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState('split'); // 'split', 'before', 'after'
  const [saving, setSaving] = useState(false);

  const imageWidth = width - 32;
  const imageHeight = imageWidth * 0.75; // 4:3 aspect ratio

  const saveImageToGallery = async () => {
    try {
      setSaving(true);

      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Permission to access media library is required to save images.');
        return;
      }

      // Convert base64 to file
      const base64Code = editedImage.split('data:image/')[1].split(';base64,')[1];
      const filename = `ai_edited_image_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, base64Code, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Save to gallery
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      const album = await MediaLibrary.getAlbumAsync('AI Image Edit');

      if (album === null) {
        await MediaLibrary.createAlbumAsync('AI Image Edit', asset, false);
      } else {
        await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      }

      Alert.alert('Success', 'Image saved to gallery successfully!');
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'Failed to save image to gallery');
    } finally {
      setSaving(false);
    }
  };

  const shareImage = async () => {
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      // Convert base64 to file
      const base64Code = editedImage.split('data:image/')[1].split(';base64,')[1];
      const filename = `ai_edited_image_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, base64Code, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await Sharing.shareAsync(fileUri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Share AI Edited Image',
      });
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', 'Failed to share image');
    }
  };

  const renderEditOptionsSummary = () => {
    const appliedOptions = [];

    if (editOptions.textBasedEdit) appliedOptions.push('Text Instructions');
    if (editOptions.styleTransfer) appliedOptions.push('Style Transfer');
    if (editOptions.objectManipulation) appliedOptions.push('Object Manipulation');
    if (editOptions.enhancement && editOptions.enhancement.length > 0) appliedOptions.push('Enhancement');
    if (editOptions.customPrompt) appliedOptions.push('Custom Prompt');

    return (
      <View style={styles.editSummaryContainer}>
        <Text style={styles.editSummaryTitle}>Applied Edits:</Text>
        <View style={styles.editChipsContainer}>
          {appliedOptions.map((option, index) => (
            <Chip key={index} style={styles.editChip} textStyle={styles.editChipText}>
              {option}
            </Chip>
          ))}
        </View>
      </View>
    );
  };

  const renderViewModeButtons = () => (
    <View style={styles.viewModeContainer}>
      <Button
        mode={viewMode === 'split' ? 'contained' : 'outlined'}
        onPress={() => setViewMode('split')}
        style={styles.viewModeButton}
        compact
      >
        Split
      </Button>
      <Button
        mode={viewMode === 'before' ? 'contained' : 'outlined'}
        onPress={() => setViewMode('before')}
        style={styles.viewModeButton}
        compact
      >
        Before
      </Button>
      <Button
        mode={viewMode === 'after' ? 'contained' : 'outlined'}
        onPress={() => setViewMode('after')}
        style={styles.viewModeButton}
        compact
      >
        After
      </Button>
    </View>
  );

  const renderImages = () => {
    switch (viewMode) {
      case 'split':
        return (
          <View style={styles.splitContainer}>
            <View style={styles.imageSection}>
              <Text style={styles.imageLabel}>Original</Text>
              <Image
                source={{ uri: originalImage }}
                style={[styles.image, styles.splitImage]}
                resizeMode="cover"
              />
            </View>
            <View style={styles.imageDivider} />
            <View style={styles.imageSection}>
              <Text style={styles.imageLabel}>AI Edited</Text>
              <Image
                source={{ uri: editedImage }}
                style={[styles.image, styles.splitImage]}
                resizeMode="cover"
              />
            </View>
          </View>
        );
      case 'before':
        return (
          <View style={styles.fullImageContainer}>
            <Text style={styles.imageLabel}>Original Image</Text>
            <Image
              source={{ uri: originalImage }}
              style={[styles.image, styles.fullImage]}
              resizeMode="cover"
            />
          </View>
        );
      case 'after':
        return (
          <View style={styles.fullImageContainer}>
            <Text style={styles.imageLabel}>AI Edited Image</Text>
            <Image
              source={{ uri: editedImage }}
              style={[styles.image, styles.fullImage]}
              resizeMode="cover"
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
            <Text style={styles.title}>Edit Complete!</Text>
          </View>

          <Text style={styles.subtitle}>
            Your image has been successfully edited using AI.
            {creditsUsed && ` Used ${creditsUsed} credits.`}
          </Text>

          {/* View Mode Selector */}
          {renderViewModeButtons()}

          {/* Image Display */}
          <Surface style={styles.imageContainer} elevation={2}>
            {renderImages()}
          </Surface>

          {/* Edit Options Summary */}
          {renderEditOptionsSummary()}

          {/* Feedback */}
          {feedback && (
            <View style={styles.feedbackContainer}>
              <MaterialCommunityIcons name="information" size={16} color={theme.colors.primary} />
              <Text style={styles.feedbackText}>{feedback}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={saveImageToGallery}
              icon="download"
              style={styles.actionButton}
              loading={saving}
              disabled={saving}
            >
              Save to Gallery
            </Button>
            <Button
              mode="outlined"
              onPress={shareImage}
              icon="share"
              style={styles.actionButton}
            >
              Share
            </Button>
          </View>

          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={onEditAgain}
              icon="refresh"
              style={styles.actionButton}
            >
              Edit Again
            </Button>
            <Button
              mode="contained"
              onPress={onStartNewEdit}
              icon="plus"
              style={[styles.actionButton, styles.newEditButton]}
            >
              New Edit
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#4CAF50',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  viewModeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'center',
  },
  viewModeButton: {
    marginHorizontal: 4,
    flex: 1,
  },
  imageContainer: {
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
  },
  splitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageSection: {
    flex: 1,
    alignItems: 'center',
  },
  imageDivider: {
    width: 2,
    height: '80%',
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  fullImageContainer: {
    alignItems: 'center',
  },
  imageLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  image: {
    borderRadius: 8,
  },
  splitImage: {
    width: (width - 64) / 2 - 8,
    height: ((width - 64) / 2 - 8) * 0.75,
  },
  fullImage: {
    width: width - 64,
    height: (width - 64) * 0.75,
  },
  editSummaryContainer: {
    marginBottom: 16,
  },
  editSummaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  editChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editChip: {
    backgroundColor: '#E8F5E8',
  },
  editChipText: {
    fontSize: 12,
    color: '#2E7D32',
  },
  feedbackContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  feedbackText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  newEditButton: {
    backgroundColor: '#4CAF50',
  },
});

export default ResultsDisplay;