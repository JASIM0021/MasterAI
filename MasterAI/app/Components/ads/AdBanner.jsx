import React, { useRef, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { BANNER_AD_UNIT } from '../../config/admobConfig';

/**
 * AdBanner — drop-in banner ad component.
 * Props:
 *   size       - BannerAdSize key (default: ANCHORED_ADAPTIVE_BANNER)
 *   style      - extra container styles
 *   collapsible - show as collapsible banner (default false)
 */
const AdBanner = ({ size = BannerAdSize.ANCHORED_ADAPTIVE_BANNER, style, collapsible = false }) => {
  const bannerRef = useRef();
  const [loaded, setLoaded] = useState(false);

  const requestOptions = collapsible
    ? { networkExtras: { collapsible: 'bottom' } }
    : {};

  return (
    <View style={[styles.container, !loaded && styles.hidden, style]}>
      <BannerAd
        ref={bannerRef}
        unitId={BANNER_AD_UNIT}
        size={Platform.OS === 'web' ? 'ANCHORED_ADAPTIVE_BANNER' : size}
        requestOptions={requestOptions}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setLoaded(false)}
        onPaid={event => {
          if (__DEV__) console.log(`[AdBanner] Paid: ${event.value} ${event.currency}`);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', alignItems: 'center' },
  hidden: { height: 0, overflow: 'hidden' },
});

export default AdBanner;
