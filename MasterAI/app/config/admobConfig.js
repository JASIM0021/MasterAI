// AdMob Configuration for Master AI App
// Centralized ad unit IDs for test and production environments

// Test Ad Unit IDs (for development)
const TEST_AD_UNITS = {
  banner: 'ca-app-pub-3940256099942544/6300978111',
  appOpen: 'ca-app-pub-3940256099942544/5575463023',
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
  rewardedInterstitial: 'ca-app-pub-3940256099942544/5354046379'
};
// ca - app - pub - 4304822949261068~8870208991 
// Production Ad Unit IDs
const PRODUCTION_AD_UNITS = {
  banner: 'ca-app-pub-4304822949261068/4233877253',
  appOpen: 'ca-app-pub-4304822949261068/2074760924', // TODO: Replace with actual app open ad unit
  interstitial: 'ca-app-pub-4304822949261068/6449120206', // TODO: Add if needed
  rewarded: 'ca-app-pub-4304822949261068/5035966188', // TODO: Add if needed
  rewardedInterstitial: 'ca-app-pub-4304822949261068/1444205530' // TODO: Add if needed
};

// App IDs
const APP_IDS = {
  android: 'ca-app-pub-4304822949261068~8870208991',
  ios: 'ca-app-pub-4304822949261068~2277816262'
};

// Get ad units based on environment
export const getAdUnits = () => {
  return __DEV__ ? TEST_AD_UNITS : PRODUCTION_AD_UNITS;
};

// Get specific ad unit by type
export const getAdUnit = (adType) => {
  const adUnits = getAdUnits();
  return adUnits[adType] || null;
};

// Check if in development mode
export const isDevelopment = () => __DEV__;

// Export individual configurations
export const AD_UNITS = getAdUnits();
export const BANNER_AD_UNIT = getAdUnit('banner');
export const APP_OPEN_AD_UNIT = getAdUnit('appOpen');
export const INTERSTITIAL_AD_UNIT = getAdUnit('interstitial');
export const REWARDED_AD_UNIT = getAdUnit('rewarded');
export const REWARDED_INTERSTITIAL_AD_UNIT = getAdUnit('rewardedInterstitial');

export { APP_IDS, TEST_AD_UNITS, PRODUCTION_AD_UNITS };

// Ad configuration settings
export const AD_CONFIG = {
  // App Open Ad settings
  appOpen: {
    // Show app open ad on every app launch
    showOnEveryLaunch: true,
    // Show ad on every app state change to active
    showOnEveryForeground: true,
    // Timeout for loading app open ad (milliseconds)
    loadTimeout: 8000,
    // Maximum time to show loading screen while waiting for ad
    maxLoadingTime: 3000,
    // Delay before showing ad when app becomes active (milliseconds)
    showDelay: 800
  },

  // Banner Ad settings
  banner: {
    size: 'ADAPTIVE_BANNER',
    position: 'bottom'
  },

  // General settings
  general: {
    // Enable debug logging in development
    debugLogging: __DEV__,
    // Retry attempts for failed ad loads
    maxRetryAttempts: 3
  }
};

export default {
  getAdUnits,
  getAdUnit,
  isDevelopment,
  AD_UNITS,
  BANNER_AD_UNIT,
  APP_OPEN_AD_UNIT,
  INTERSTITIAL_AD_UNIT,
  REWARDED_AD_UNIT,
  REWARDED_INTERSTITIAL_AD_UNIT,
  APP_IDS,
  AD_CONFIG
};