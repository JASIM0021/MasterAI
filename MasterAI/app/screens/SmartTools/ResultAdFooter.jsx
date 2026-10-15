import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { COLORS, sharedStyles } from './SmartToolsStyles';
import { getAdUnit } from '../../config/admobConfig';
import { isUnlocked, watchAdToUnlock } from '../../utils/smartToolsUnlock';

/**
 * Shown under every Smart Tool's successful result:
 *  - a banner ad
 *  - a rewarded-ad offer (hidden once the user has the 24h unlock)
 * `onUnlocked` lets the parent screen refresh anything that depends on the unlock.
 */
const ResultAdFooter = ({ rewardLabel = 'Unlock unlimited use & no watermark for 24h', onUnlocked }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);
  const bannerUnit = getAdUnit('banner');

  useEffect(() => {
    isUnlocked().then(setUnlocked);
  }, []);

  const watch = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await watchAdToUnlock();
      if (result.earned) {
        setUnlocked(true);
        onUnlocked?.();
        Alert.alert('Unlocked', 'Enjoy unlimited use and no watermark for the next 24 hours.');
      } else if (result.failed) {
        Alert.alert('Ad not available', 'Please try again in a moment.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ marginTop: 8 }}>
      {!unlocked && (
        <TouchableOpacity
          style={[sharedStyles.outlineBtn, busy && sharedStyles.disabled]}
          onPress={watch}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={sharedStyles.outlineBtnText}>{rewardLabel} (watch a short ad)</Text>
          )}
        </TouchableOpacity>
      )}
      {bannerUnit && !bannerFailed && (
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <BannerAd
            unitId={bannerUnit}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            onAdFailedToLoad={() => setBannerFailed(true)}
          />
        </View>
      )}
    </View>
  );
};

export default ResultAdFooter;
