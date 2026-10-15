import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { getAdUnit } from '../config/admobConfig';

// Show an interstitial after every Nth successful export so free tools
// earn ad revenue without annoying users.
const SHOW_EVERY_N_EXPORTS = 2;

let ad = null;
let loaded = false;
let loading = false;
let exportCount = 0;

const load = () => {
  if (loading || loaded) return;
  const unitId = getAdUnit('interstitial');
  if (!unitId) return;

  loading = true;
  ad = InterstitialAd.createForAdRequest(unitId);
  ad.addAdEventListener(AdEventType.LOADED, () => {
    loaded = true;
    loading = false;
  });
  ad.addAdEventListener(AdEventType.ERROR, () => {
    loaded = false;
    loading = false;
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    loaded = false;
    loading = false;
    load();
  });
  ad.load();
};

export const preloadInterstitial = () => {
  try {
    load();
  } catch (e) {
    // Ads must never break a free tool.
  }
};

export const maybeShowInterstitial = () => {
  try {
    exportCount += 1;
    if (exportCount % SHOW_EVERY_N_EXPORTS === 0 && loaded && ad) {
      ad.show();
    } else {
      load();
    }
  } catch (e) {
    // Ignore ad failures.
  }
};
