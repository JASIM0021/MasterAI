import { useEffect, useRef, useCallback } from 'react';
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { INTERSTITIAL_AD_UNIT } from '../config/admobConfig';

/**
 * useInterstitialAd — loads an interstitial ad and exposes showAd().
 *
 * Usage:
 *   const { showAd } = useInterstitialAd();
 *   // After AI result is ready:
 *   await showAd();   // resolves when ad closes (or immediately if not loaded)
 *   navigate('Results', { data });
 */
const useInterstitialAd = () => {
  const adRef = useRef(null);
  const loadedRef = useRef(false);
  const listenersRef = useRef([]);

  const cleanup = () => {
    listenersRef.current.forEach(unsub => unsub?.());
    listenersRef.current = [];
    adRef.current = null;
    loadedRef.current = false;
  };

  const loadAd = useCallback(() => {
    cleanup();
    const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT);
    adRef.current = ad;

    listenersRef.current.push(
      ad.addAdEventListener(AdEventType.LOADED, () => {
        loadedRef.current = true;
        if (__DEV__) console.log('[InterstitialAd] loaded');
      }),
      ad.addAdEventListener(AdEventType.ERROR, () => {
        loadedRef.current = false;
      }),
    );

    ad.load();
  }, []);

  useEffect(() => {
    loadAd();
    return cleanup;
  }, [loadAd]);

  /**
   * Show the ad if loaded, then reload for next use.
   * Returns a Promise that resolves when the ad is dismissed (or skipped if not loaded).
   */
  const showAd = useCallback(() => {
    return new Promise(resolve => {
      if (!adRef.current || !loadedRef.current) {
        resolve();
        loadAd();
        return;
      }

      const closeUnsub = adRef.current.addAdEventListener(AdEventType.CLOSED, () => {
        closeUnsub();
        resolve();
        loadAd(); // preload next
      });

      adRef.current.show().catch(() => {
        resolve();
        loadAd();
      });
    });
  }, [loadAd]);

  return { showAd, isLoaded: loadedRef.current };
};

export default useInterstitialAd;
