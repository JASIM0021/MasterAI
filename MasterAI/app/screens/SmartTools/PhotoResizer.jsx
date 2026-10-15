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
import ToolHeader from './ToolHeader';
import ResultAdFooter from './ResultAdFooter';
import { sharedStyles } from './SmartToolsStyles';
import { compressToTarget } from '../../utils/compressToTarget';
import { formatBytes, saveImageToGallery, shareFile } from '../../utils/fileExport';
import { maybeShowInterstitial, preloadInterstitial } from '../../utils/interstitial';
import {
  FREE_DAILY_RESIZES,
  getRemainingFreeResizes,
  isUnlocked,
  recordResize,
  watchAdToUnlock,
} from '../../utils/smartToolsUnlock';

// Size limits used by common exam / job / government upload forms.
const SIZE_PRESETS = [
  { label: '20 KB', kb: 20 },
  { label: '50 KB', kb: 50 },
  { label: '100 KB', kb: 100 },
  { label: '200 KB', kb: 200 },
  { label: '500 KB', kb: 500 },
];

// Optional exact pixel sizes (cropped from the centre).
const DIMENSION_PRESETS = [
  { label: 'Keep original size', dimensions: null },
  { label: 'Passport 413×531', dimensions: { width: 413, height: 531 } },
  { label: 'Signature 280×120', dimensions: { width: 280, height: 120 } },
  { label: 'Square 512×512', dimensions: { width: 512, height: 512 } },
];

const Chip = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[sharedStyles.chip, active && sharedStyles.chipActive]}
    onPress={onPress}
  >
    <Text style={[sharedStyles.chipText, active && sharedStyles.chipTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const PhotoResizer = () => {
  const [source, setSource] = useState(null);
  const [kb, setKb] = useState(50);
  const [dimIndex, setDimIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(FREE_DAILY_RESIZES);

  const refreshRemaining = async () => setRemaining(await getRemainingFreeResizes());

  useEffect(() => {
    preloadInterstitial();
    refreshRemaining();
  }, []);

  const unlockWithAd = async () => {
    const adResult = await watchAdToUnlock();
    if (adResult.earned) {
      await refreshRemaining();
      Alert.alert('Unlocked', 'Unlimited resizes for the next 24 hours.');
    } else if (adResult.failed) {
      Alert.alert('Ad not available', 'Please try again in a moment.');
    }
  };

  const promptForLimit = () =>
    Alert.alert(
      'Daily free limit reached',
      `You get ${FREE_DAILY_RESIZES} free resizes a day. Watch a short ad for unlimited resizes for 24 hours.`,
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Watch ad', onPress: unlockWithAd },
      ],
    );

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (!res.canceled) {
      setSource(res.assets[0]);
      setResult(null);
    }
  };

  const run = async () => {
    if (!source || busy) return;
    // Check the live value, not state, so a stale screen can't bypass the limit.
    if ((await getRemainingFreeResizes()) <= 0) {
      promptForLimit();
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const out = await compressToTarget(
        source.uri,
        kb * 1024,
        DIMENSION_PRESETS[dimIndex].dimensions || undefined
      );
      setResult(out);
      const wasUnlocked = await isUnlocked();
      await recordResize();
      await refreshRemaining();
      if (!wasUnlocked) maybeShowInterstitial();
    } catch (e) {
      Alert.alert('Could not resize photo', e?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    try {
      if (await saveImageToGallery(result.uri)) {
        Alert.alert('Saved', 'The photo was saved to your gallery.');
      }
    } catch (e) {
      Alert.alert('Could not save', e?.message || 'Something went wrong.');
    }
  };

  return (
    <SafeAreaView style={sharedStyles.screen} edges={['top', 'left', 'right']}>
      <ToolHeader title="Photo Resizer" />
      <ScrollView contentContainerStyle={sharedStyles.body}>
        <View style={sharedStyles.card}>
          <Text style={sharedStyles.title}>1. Choose a photo</Text>
          {source && (
            <Image
              source={{ uri: source.uri }}
              style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 8 }}
              contentFit="contain"
            />
          )}
          <TouchableOpacity style={sharedStyles.outlineBtn} onPress={pick}>
            <Text style={sharedStyles.outlineBtnText}>
              {source ? 'Choose a different photo' : 'Choose from gallery'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={sharedStyles.card}>
          <Text style={sharedStyles.title}>2. Maximum file size</Text>
          <View style={sharedStyles.chipRow}>
            {SIZE_PRESETS.map(p => (
              <Chip key={p.kb} label={p.label} active={kb === p.kb} onPress={() => setKb(p.kb)} />
            ))}
          </View>
          <Text style={[sharedStyles.title, { marginTop: 10 }]}>3. Dimensions</Text>
          <View style={sharedStyles.chipRow}>
            {DIMENSION_PRESETS.map((p, i) => (
              <Chip key={p.label} label={p.label} active={dimIndex === i} onPress={() => setDimIndex(i)} />
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[sharedStyles.primaryBtn, (!source || busy) && sharedStyles.disabled]}
          onPress={run}
          disabled={!source || busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={sharedStyles.primaryBtnText}>Resize photo</Text>
          )}
        </TouchableOpacity>
        <Text style={[sharedStyles.subtitle, { textAlign: 'center', marginTop: 8 }]}>
          {remaining === Infinity
            ? 'Unlimited resizes unlocked'
            : `${remaining} free ${remaining === 1 ? 'resize' : 'resizes'} left today`}
        </Text>
        {remaining !== Infinity && remaining < FREE_DAILY_RESIZES && (
          <TouchableOpacity style={sharedStyles.outlineBtn} onPress={unlockWithAd}>
            <Text style={sharedStyles.outlineBtnText}>Unlimited for 24h (watch a short ad)</Text>
          </TouchableOpacity>
        )}

        {result && (
          <View style={[sharedStyles.card, { marginTop: 14 }]}>
            <Text style={sharedStyles.title}>
              {result.reachedTarget ? 'Done' : 'Smallest possible reached'}
            </Text>
            <Text style={sharedStyles.subtitle}>
              {formatBytes(result.bytes)} · {result.width}×{result.height}px
              {!result.reachedTarget
                ? ` (could not get below ${kb} KB without losing too much detail)`
                : ''}
            </Text>
            <Image
              source={{ uri: result.uri }}
              style={{ width: '100%', height: 200, borderRadius: 12, marginTop: 8 }}
              contentFit="contain"
            />
            <TouchableOpacity style={sharedStyles.primaryBtn} onPress={save}>
              <Text style={sharedStyles.primaryBtnText}>Save to gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={sharedStyles.outlineBtn}
              onPress={() => shareFile(result.uri, { mimeType: 'image/jpeg' })}
            >
              <Text style={sharedStyles.outlineBtnText}>Share</Text>
            </TouchableOpacity>
            <ResultAdFooter
              rewardLabel="Unlimited resizes for 24h"
              onUnlocked={refreshRemaining}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PhotoResizer;
