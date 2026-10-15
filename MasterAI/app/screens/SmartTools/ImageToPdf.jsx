import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ToolHeader from './ToolHeader';
import ResultAdFooter from './ResultAdFooter';
import { COLORS, sharedStyles } from './SmartToolsStyles';
import { shareFile } from '../../utils/fileExport';
import { maybeShowInterstitial, preloadInterstitial } from '../../utils/interstitial';
import { isUnlocked, watchAdToUnlock } from '../../utils/smartToolsUnlock';

const PAGE_WIDTH = 595; // A4 in points
const PAGE_HEIGHT = 842;
const MAX_IMAGE_WIDTH = 1600;

const buildHtml = (images, watermark) =>
  `<html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    @page { margin: 0; }
    body { margin: 0; }
    .page { width: 100%; height: 100vh; position: relative; display: flex;
            align-items: center; justify-content: center; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .wm { position: absolute; bottom: 8px; right: 12px; font: 11px sans-serif;
          color: #6C48EF; background: rgba(255,255,255,0.85); padding: 2px 6px;
          border-radius: 4px; }
  </style></head><body>
  ${images
    .map(
      b64 =>
        `<div class="page"><img src="data:image/jpeg;base64,${b64}"/>${
          watermark ? '<div class="wm">Made with Master AI</div>' : ''
        }</div>`,
    )
    .join('')}
  </body></html>`;

const ImageToPdf = () => {
  const [images, setImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [adBusy, setAdBusy] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);

  useEffect(() => {
    preloadInterstitial();
    isUnlocked().then(setUnlocked);
  }, []);

  const unlockWithAd = async () => {
    if (adBusy) return;
    setAdBusy(true);
    try {
      const result = await watchAdToUnlock();
      if (result.earned) {
        setUnlocked(true);
        Alert.alert('Unlocked', 'No watermark on your PDFs for the next 24 hours.');
      } else if (result.failed) {
        Alert.alert('Ad not available', 'Please try again in a moment.');
      }
    } finally {
      setAdBusy(false);
    }
  };

  const addFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!result.canceled) {
      setImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
    }
  };

  const addFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to capture pages.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (!result.canceled) {
      setImages(prev => [...prev, result.assets[0].uri]);
    }
  };

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;
    setImages(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const remove = index => setImages(prev => prev.filter((_, i) => i !== index));

  const createPdf = async () => {
    if (!images.length || busy) return;
    setBusy(true);
    try {
      // Downscale first so large camera photos don't blow up memory or PDF size.
      const encoded = [];
      for (const uri of images) {
        const out = await manipulateAsync(uri, [{ resize: { width: MAX_IMAGE_WIDTH } }], {
          compress: 0.8,
          format: SaveFormat.JPEG,
          base64: true,
        });
        encoded.push(out.base64);
      }
      // Re-check at export time so an expired unlock can't slip through.
      const watermark = !(await isUnlocked());
      const { uri } = await Print.printToFileAsync({
        html: buildHtml(encoded, watermark),
        width: PAGE_WIDTH,
        height: PAGE_HEIGHT,
      });
      setPdfUri(uri);
      await shareFile(uri, { mimeType: 'application/pdf', dialogTitle: 'Share PDF' });
      // Unlocked users get the ad-free experience they earned.
      if (watermark) maybeShowInterstitial();
    } catch (e) {
      Alert.alert('Could not create PDF', e?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top', 'left', 'right']}>
      <ToolHeader title="Image to PDF" />
      <ScrollView contentContainerStyle={sharedStyles.body}>
        <View style={sharedStyles.card}>
          <Text style={sharedStyles.title}>Add pages</Text>
          <Text style={sharedStyles.subtitle}>
            Pick photos or scan with the camera. Everything stays on your phone.
          </Text>
          <TouchableOpacity style={sharedStyles.primaryBtn} onPress={addFromLibrary}>
            <Text style={sharedStyles.primaryBtnText}>Choose from gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={sharedStyles.outlineBtn} onPress={addFromCamera}>
            <Text style={sharedStyles.outlineBtnText}>Take a photo</Text>
          </TouchableOpacity>
        </View>

        {images.map((uri, index) => (
          <View
            key={`${uri}-${index}`}
            style={[sharedStyles.card, { flexDirection: 'row', alignItems: 'center' }]}
          >
            <Image source={{ uri }} style={{ width: 64, height: 84, borderRadius: 8 }} contentFit="cover" />
            <Text style={[sharedStyles.title, { flex: 1, marginLeft: 12, marginBottom: 0 }]}>
              Page {index + 1}
            </Text>
            <TouchableOpacity onPress={() => move(index, -1)} disabled={index === 0}>
              <Icon name="arrow-upward" size={24} color={index === 0 ? '#CCC' : COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => move(index, 1)} disabled={index === images.length - 1}>
              <Icon
                name="arrow-downward"
                size={24}
                color={index === images.length - 1 ? '#CCC' : COLORS.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => remove(index)} style={{ marginLeft: 8 }}>
              <Icon name="delete" size={24} color={COLORS.danger} />
            </TouchableOpacity>
          </View>
        ))}

        {images.length > 0 && !unlocked && (
          <TouchableOpacity
            style={[sharedStyles.outlineBtn, adBusy && sharedStyles.disabled]}
            onPress={unlockWithAd}
            disabled={adBusy}
          >
            {adBusy ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={sharedStyles.outlineBtnText}>
                Remove watermark for 24h (watch a short ad)
              </Text>
            )}
          </TouchableOpacity>
        )}

        {images.length > 0 && (
          <TouchableOpacity
            style={[sharedStyles.primaryBtn, busy && sharedStyles.disabled]}
            onPress={createPdf}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={sharedStyles.primaryBtnText}>
                Create PDF ({images.length} {images.length === 1 ? 'page' : 'pages'})
              </Text>
            )}
          </TouchableOpacity>
        )}

        {pdfUri && (
          <View style={[sharedStyles.card, { marginTop: 14 }]}>
            <Text style={sharedStyles.title}>PDF created</Text>
            <Text style={sharedStyles.subtitle}>Your PDF is ready. Share it again any time.</Text>
            <TouchableOpacity
              style={sharedStyles.primaryBtn}
              onPress={() => shareFile(pdfUri, { mimeType: 'application/pdf', dialogTitle: 'Share PDF' })}
            >
              <Text style={sharedStyles.primaryBtnText}>Share PDF</Text>
            </TouchableOpacity>
            <ResultAdFooter onUnlocked={() => setUnlocked(true)} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ImageToPdf;
