import { Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

export const shareFile = async (uri, { mimeType, dialogTitle } = {}) => {
  if (!(await Sharing.isAvailableAsync())) {
    Alert.alert('Sharing not available', 'Sharing is not supported on this device.');
    return false;
  }
  await Sharing.shareAsync(uri, { mimeType, dialogTitle });
  return true;
};

export const saveImageToGallery = async uri => {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Allow photo access to save images to your gallery.');
    return false;
  }
  await MediaLibrary.saveToLibraryAsync(uri);
  return true;
};

// Byte size of a base64 payload without touching the file system.
export const base64ByteSize = b64 => {
  if (!b64) return 0;
  const padding = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - padding;
};

export const formatBytes = bytes => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
