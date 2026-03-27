// App Open Ad Service
// Manages app open ad lifecycle, loading, and display logic

import { AppState } from 'react-native';
import {
  AppOpenAd,
  AdEventType,
  TestIds
} from 'react-native-google-mobile-ads';
import { APP_OPEN_AD_UNIT, AD_CONFIG, isDevelopment } from '../config/admobConfig';

class AppOpenAdService {
  constructor() {
    this.appOpenAd = null;
    this.isLoadingAd = false;
    this.isShowingAd = false;
    this.loadTime = 0;
    this.appStateSubscription = null;
    this.currentAppState = AppState.currentState;

    // Callbacks
    this.onAdLoaded = null;
    this.onAdFailedToLoad = null;
    this.onAdShown = null;
    this.onAdDismissed = null;
    this.onAdFailedToShow = null;

    // Don't auto-initialize to improve startup performance
    // this.init();
  }

  init() {
    console.log('AppOpenAdService: Initializing...');
    this.loadAd();
    this.setupAppStateListener();

    // Show ad on first launch after a short delay
    if (AD_CONFIG.appOpen.showOnEveryLaunch) {
      setTimeout(() => {
        console.log('AppOpenAdService: Attempting to show ad on app launch');
        this.showAdIfAvailable();
      }, 2000); // 2 second delay to allow ad to load
    }
  }

  // Non-blocking initialization for performance optimization
  initAsync() {
    if (__DEV__) console.log('🚀 AppOpenAdService: Starting async initialization...');

    // Delay initialization to not block app startup
    setTimeout(() => {
      this.setupAppStateListener();

      // Start loading ad but don't wait for it
      setTimeout(() => {
        this.loadAd();
      }, 1000);

      // Show ad on first launch after app is fully loaded
      if (AD_CONFIG.appOpen.showOnEveryLaunch) {
        setTimeout(() => {
          if (__DEV__) console.log('🎯 AppOpenAdService: Attempting to show ad on app launch (async)');
          this.showAdIfAvailable();
        }, 5000); // Longer delay to ensure app is fully ready
      }
    }, 3000); // Delay entire initialization
  }

  setupAppStateListener() {
    const handleAppStateChange = (nextAppState) => {
      console.log('AppOpenAdService: App state changed from', this.currentAppState, 'to', nextAppState);

      // Show ad when app becomes active from any previous state
      if (nextAppState === 'active' && (AD_CONFIG.appOpen.showOnEveryLaunch || AD_CONFIG.appOpen.showOnEveryForeground)) {
        console.log('AppOpenAdService: App became active, showing ad if available');
        // Add a configurable delay to ensure the app is fully active
        setTimeout(() => {
          this.showAdIfAvailable();
        }, AD_CONFIG.appOpen.showDelay);
      }

      this.currentAppState = nextAppState;
    };

    // Use the modern event listener API
    this.appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
  }

  loadAd() {
    if (this.isLoadingAd || this.isAdAvailable()) {
      console.log('AppOpenAdService: Ad already loading or available');
      return;
    }

    this.isLoadingAd = true;
    console.log('AppOpenAdService: Loading app open ad...');

    // Create new app open ad instance
    this.appOpenAd = AppOpenAd.createForAdRequest(APP_OPEN_AD_UNIT, {
      requestNonPersonalizedAdsOnly: false,
    });

    // Set up event listeners
    this.appOpenAd.addAdEventsListener(({ type, payload }) => {
      switch (type) {
        case AdEventType.LOADED:
          console.log('AppOpenAdService: Ad loaded successfully');
          this.isLoadingAd = false;
          this.loadTime = Date.now();
          if (this.onAdLoaded) this.onAdLoaded();
          break;

        case AdEventType.ERROR:
          console.log('AppOpenAdService: Ad failed to load:', payload?.message);
          this.isLoadingAd = false;
          if (this.onAdFailedToLoad) this.onAdFailedToLoad(payload);
          // Retry loading after a shorter delay for better availability
          setTimeout(() => {
            console.log('AppOpenAdService: Retrying ad load after error');
            this.loadAd();
          }, 3000); // Reduced from 5000 to 3000ms
          break;

        case AdEventType.OPENED:
          console.log('AppOpenAdService: Ad opened');
          this.isShowingAd = true;
          if (this.onAdShown) this.onAdShown();
          break;

        case AdEventType.CLOSED:
          console.log('AppOpenAdService: Ad closed');
          this.isShowingAd = false;
          if (this.onAdDismissed) this.onAdDismissed();
          // Immediately load a new ad for the next opportunity
          setTimeout(() => {
            this.loadAd();
          }, 500); // Short delay before loading next ad
          break;

        case AdEventType.PAID:
          console.log('AppOpenAdService: Ad paid:', payload);
          break;

        default:
          break;
      }
    });

    // Load the ad
    this.appOpenAd.load();

    // Set timeout for loading
    setTimeout(() => {
      if (this.isLoadingAd) {
        console.log('AppOpenAdService: Ad loading timeout');
        this.isLoadingAd = false;
        if (this.onAdFailedToLoad) this.onAdFailedToLoad({ message: 'Loading timeout' });
      }
    }, AD_CONFIG.appOpen.loadTimeout);
  }

  isAdAvailable() {
    return this.appOpenAd &&
           !this.isLoadingAd &&
           !this.isShowingAd &&
           this.isAdNotExpired();
  }

  isAdNotExpired() {
    // App open ads expire after 4 hours
    const FOUR_HOURS_IN_MS = 4 * 60 * 60 * 1000;
    return (Date.now() - this.loadTime) < FOUR_HOURS_IN_MS;
  }

  async showAdIfAvailable() {
    console.log('AppOpenAdService: showAdIfAvailable called', {
      isAdAvailable: this.isAdAvailable(),
      isLoadingAd: this.isLoadingAd,
      isShowingAd: this.isShowingAd,
      hasAppOpenAd: !!this.appOpenAd,
      appState: this.currentAppState
    });

    // Don't show ad if app is not active
    if (this.currentAppState !== 'active') {
      console.log('AppOpenAdService: App not active, skipping ad display');
      return false;
    }

    if (!this.isAdAvailable()) {
      console.log('AppOpenAdService: No ad available to show');

      // If no ad is available, try to load one for next time
      if (!this.isLoadingAd) {
        console.log('AppOpenAdService: Loading new ad for next time');
        this.loadAd();
      }
      return false;
    }

    if (this.isShowingAd) {
      console.log('AppOpenAdService: Ad is already showing');
      return false;
    }

    try {
      console.log('AppOpenAdService: Showing app open ad');
      await this.appOpenAd.show();
      return true;
    } catch (error) {
      console.log('AppOpenAdService: Failed to show ad:', error);
      if (this.onAdFailedToShow) this.onAdFailedToShow(error);
      // Load a new ad since this one failed
      setTimeout(() => {
        this.loadAd();
      }, 1000);
      return false;
    }
  }

  // Public method to manually trigger ad display (useful for testing)
  async showAd() {
    return await this.showAdIfAvailable();
  }

  // Force load and show ad (useful for testing)
  async forceShowAd() {
    console.log('AppOpenAdService: Force showing ad requested');

    // If no ad is available, load one first
    if (!this.isAdAvailable() && !this.isLoadingAd) {
      console.log('AppOpenAdService: Loading ad before force show');
      this.loadAd();

      // Wait for ad to load (with timeout)
      return new Promise((resolve) => {
        const checkForAd = () => {
          if (this.isAdAvailable()) {
            console.log('AppOpenAdService: Ad loaded, now showing');
            this.showAdIfAvailable().then(resolve);
          } else if (!this.isLoadingAd) {
            console.log('AppOpenAdService: Ad failed to load');
            resolve(false);
          } else {
            // Keep checking
            setTimeout(checkForAd, 500);
          }
        };

        // Start checking after initial delay
        setTimeout(checkForAd, 1000);

        // Timeout after 10 seconds
        setTimeout(() => {
          console.log('AppOpenAdService: Force show timeout');
          resolve(false);
        }, 10000);
      });
    }

    return await this.showAdIfAvailable();
  }

  // Set callback functions
  setCallbacks({
    onAdLoaded,
    onAdFailedToLoad,
    onAdShown,
    onAdDismissed,
    onAdFailedToShow
  }) {
    this.onAdLoaded = onAdLoaded;
    this.onAdFailedToLoad = onAdFailedToLoad;
    this.onAdShown = onAdShown;
    this.onAdDismissed = onAdDismissed;
    this.onAdFailedToShow = onAdFailedToShow;
  }

  // Get current status
  getStatus() {
    return {
      isLoadingAd: this.isLoadingAd,
      isShowingAd: this.isShowingAd,
      isAdAvailable: this.isAdAvailable(),
      isAdNotExpired: this.isAdNotExpired(),
      loadTime: this.loadTime,
      timeSinceLoad: this.loadTime ? Date.now() - this.loadTime : 0,
      hasAppOpenAd: !!this.appOpenAd,
      currentAppState: this.currentAppState,
      isDevelopment: isDevelopment(),
      adUnit: APP_OPEN_AD_UNIT,
      showOnEveryLaunch: AD_CONFIG.appOpen.showOnEveryLaunch
    };
  }

  // Cleanup method
  destroy() {
    console.log('AppOpenAdService: Destroying service');

    if (this.appStateSubscription) {
      this.appStateSubscription?.remove();
      this.appStateSubscription = null;
    }

    if (this.appOpenAd) {
      // Note: react-native-google-mobile-ads doesn't have explicit destroy method
      // The ad will be garbage collected when the reference is removed
      this.appOpenAd = null;
    }

    this.isLoadingAd = false;
    this.isShowingAd = false;
    this.loadTime = 0;
  }
}

// Create singleton instance
let appOpenAdServiceInstance = null;

export const getAppOpenAdService = () => {
  if (!appOpenAdServiceInstance) {
    appOpenAdServiceInstance = new AppOpenAdService();
  }
  return appOpenAdServiceInstance;
};

export const destroyAppOpenAdService = () => {
  if (appOpenAdServiceInstance) {
    appOpenAdServiceInstance.destroy();
    appOpenAdServiceInstance = null;
  }
};

export default AppOpenAdService;