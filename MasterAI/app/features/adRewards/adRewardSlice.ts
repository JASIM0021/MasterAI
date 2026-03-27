import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AdSession {
  sessionId: string;
  adType: 'rewarded' | 'rewarded_interstitial';
  adUnitId: string;
  source: 'profile' | 'credit_purchase' | 'low_credit_warning' | 'main_screen' | 'ai_generation';
  status: 'initiated' | 'loading' | 'playing' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  watchDuration: number;
  creditsToEarn: number;
  creditsAwarded?: number;
  completionRate?: number;
  error?: {
    code: string;
    message: string;
  };
}

export interface AdEligibility {
  isEligible: boolean;
  reason?: string;
  creditsPerAd: number;
  stats?: {
    period: string;
    ads: {
      totalWatched: number;
      completed: number;
      failed: number;
      averageCompletionRate: number;
      totalWatchTime: number;
    };
    credits: {
      totalEarned: number;
      averagePerAd: number;
      averageDaily: number;
    };
    engagement: {
      totalWatchTimeMinutes: number;
      averageWatchTimePerAd: number;
    };
  };
}

export interface AdRewardState {
  // Current session
  currentSession: AdSession | null;
  isLoading: boolean;

  // Eligibility
  eligibility: AdEligibility | null;
  eligibilityLoading: boolean;
  eligibilityLastChecked: number | null;

  // Statistics
  userStats: AdEligibility['stats'] | null;
  statsLoading: boolean;
  statsLastUpdated: number | null;

  // UI State
  showLowCreditBanner: boolean;
  bannerDismissed: boolean;
  bannerDismissedAt: number | null;

  // Recent activity
  recentSessions: AdSession[];
  recentCreditsEarned: number;

  // Error handling
  error: string | null;
  lastError: {
    sessionId?: string;
    error: string;
    timestamp: number;
  } | null;

  // Configuration
  config: {
    creditsPerAd: number;
    lowCreditThreshold: number;
    bannerAutoDismissTime: number; // milliseconds
    maxRecentSessions: number;
  };
}

const initialState: AdRewardState = {
  currentSession: null,
  isLoading: false,

  eligibility: null,
  eligibilityLoading: false,
  eligibilityLastChecked: null,

  userStats: null,
  statsLoading: false,
  statsLastUpdated: null,

  showLowCreditBanner: false,
  bannerDismissed: false,
  bannerDismissedAt: null,

  recentSessions: [],
  recentCreditsEarned: 0,

  error: null,
  lastError: null,

  config: {
    creditsPerAd: 5,
    lowCreditThreshold: 10,
    bannerAutoDismissTime: 300000, // 5 minutes
    maxRecentSessions: 10,
  },
};

const adRewardSlice = createSlice({
  name: 'adReward',
  initialState,
  reducers: {
    // Session Management
    startAdSession: (state, action: PayloadAction<Omit<AdSession, 'status' | 'startTime' | 'watchDuration'>>) => {
      state.currentSession = {
        ...action.payload,
        status: 'initiated',
        startTime: Date.now(),
        watchDuration: 0,
      };
      state.isLoading = true;
      state.error = null;
    },

    updateAdSessionStatus: (state, action: PayloadAction<{
      sessionId: string;
      status: AdSession['status'];
      watchDuration?: number;
    }>) => {
      if (state.currentSession?.sessionId === action.payload.sessionId) {
        state.currentSession.status = action.payload.status;
        if (action.payload.watchDuration !== undefined) {
          state.currentSession.watchDuration = action.payload.watchDuration;
        }
        if (action.payload.status === 'completed' || action.payload.status === 'failed') {
          state.currentSession.endTime = Date.now();
          state.isLoading = false;
        }
      }
    },

    completeAdSession: (state, action: PayloadAction<{
      sessionId: string;
      creditsAwarded: number;
      completionRate: number;
      watchDuration: number;
    }>) => {
      if (state.currentSession?.sessionId === action.payload.sessionId) {
        state.currentSession.status = 'completed';
        state.currentSession.creditsAwarded = action.payload.creditsAwarded;
        state.currentSession.completionRate = action.payload.completionRate;
        state.currentSession.watchDuration = action.payload.watchDuration;
        state.currentSession.endTime = Date.now();
        state.isLoading = false;

        // Add to recent sessions
        state.recentSessions.unshift({
          ...state.currentSession,
        });

        // Keep only max recent sessions
        if (state.recentSessions.length > state.config.maxRecentSessions) {
          state.recentSessions = state.recentSessions.slice(0, state.config.maxRecentSessions);
        }

        // Update recent credits earned
        state.recentCreditsEarned += action.payload.creditsAwarded;

        // Clear current session
        state.currentSession = null;

        // Hide low credit banner temporarily after successful ad
        if (state.showLowCreditBanner && action.payload.creditsAwarded > 0) {
          state.bannerDismissed = true;
          state.bannerDismissedAt = Date.now();
        }
      }
    },

    failAdSession: (state, action: PayloadAction<{
      sessionId: string;
      error: { code: string; message: string };
      watchDuration?: number;
    }>) => {
      if (state.currentSession?.sessionId === action.payload.sessionId) {
        state.currentSession.status = 'failed';
        state.currentSession.error = action.payload.error;
        state.currentSession.endTime = Date.now();
        if (action.payload.watchDuration !== undefined) {
          state.currentSession.watchDuration = action.payload.watchDuration;
        }
        state.isLoading = false;

        // Add to recent sessions
        state.recentSessions.unshift({
          ...state.currentSession,
        });

        // Keep only max recent sessions
        if (state.recentSessions.length > state.config.maxRecentSessions) {
          state.recentSessions = state.recentSessions.slice(0, state.config.maxRecentSessions);
        }

        // Set error
        state.error = action.payload.error.message;
        state.lastError = {
          sessionId: action.payload.sessionId,
          error: action.payload.error.message,
          timestamp: Date.now(),
        };

        // Clear current session
        state.currentSession = null;
      }
    },

    clearCurrentSession: (state) => {
      state.currentSession = null;
      state.isLoading = false;
    },

    // Eligibility Management
    setEligibilityLoading: (state, action: PayloadAction<boolean>) => {
      state.eligibilityLoading = action.payload;
    },

    setEligibility: (state, action: PayloadAction<AdEligibility>) => {
      state.eligibility = action.payload;
      state.eligibilityLoading = false;
      state.eligibilityLastChecked = Date.now();
    },

    setEligibilityError: (state, action: PayloadAction<string>) => {
      state.eligibilityLoading = false;
      state.error = action.payload;
    },

    // Statistics Management
    setStatsLoading: (state, action: PayloadAction<boolean>) => {
      state.statsLoading = action.payload;
    },

    setUserStats: (state, action: PayloadAction<AdEligibility['stats']>) => {
      state.userStats = action.payload;
      state.statsLoading = false;
      state.statsLastUpdated = Date.now();
    },

    setStatsError: (state, action: PayloadAction<string>) => {
      state.statsLoading = false;
      state.error = action.payload;
    },

    // Banner Management
    showLowCreditBanner: (state) => {
      state.showLowCreditBanner = true;
      state.bannerDismissed = false;
    },

    hideLowCreditBanner: (state) => {
      state.showLowCreditBanner = false;
    },

    dismissBanner: (state) => {
      state.bannerDismissed = true;
      state.bannerDismissedAt = Date.now();
    },

    checkBannerAutoDismiss: (state) => {
      if (state.bannerDismissed && state.bannerDismissedAt) {
        const timeSinceDismiss = Date.now() - state.bannerDismissedAt;
        if (timeSinceDismiss >= state.config.bannerAutoDismissTime) {
          state.bannerDismissed = false;
          state.bannerDismissedAt = null;
        }
      }
    },

    // Error Management
    clearError: (state) => {
      state.error = null;
    },

    clearLastError: (state) => {
      state.lastError = null;
    },

    // Configuration
    updateConfig: (state, action: PayloadAction<Partial<AdRewardState['config']>>) => {
      state.config = { ...state.config, ...action.payload };
    },

    // Recent Activity
    clearRecentCredits: (state) => {
      state.recentCreditsEarned = 0;
    },

    clearRecentSessions: (state) => {
      state.recentSessions = [];
    },

    // Reset State
    resetAdRewardState: (state) => {
      return {
        ...initialState,
        config: state.config, // Preserve configuration
      };
    },
  },
});

export const {
  startAdSession,
  updateAdSessionStatus,
  completeAdSession,
  failAdSession,
  clearCurrentSession,
  setEligibilityLoading,
  setEligibility,
  setEligibilityError,
  setStatsLoading,
  setUserStats,
  setStatsError,
  showLowCreditBanner,
  hideLowCreditBanner,
  dismissBanner,
  checkBannerAutoDismiss,
  clearError,
  clearLastError,
  updateConfig,
  clearRecentCredits,
  clearRecentSessions,
  resetAdRewardState,
} = adRewardSlice.actions;

// Selectors
export const selectCurrentSession = (state: { adReward: AdRewardState }) => state.adReward.currentSession;
export const selectIsLoading = (state: { adReward: AdRewardState }) => state.adReward.isLoading;
export const selectEligibility = (state: { adReward: AdRewardState }) => state.adReward.eligibility;
export const selectUserStats = (state: { adReward: AdRewardState }) => state.adReward.userStats;
export const selectShowLowCreditBanner = (state: { adReward: AdRewardState }) =>
  state.adReward.showLowCreditBanner && !state.adReward.bannerDismissed;
export const selectRecentSessions = (state: { adReward: AdRewardState }) => state.adReward.recentSessions;
export const selectRecentCreditsEarned = (state: { adReward: AdRewardState }) => state.adReward.recentCreditsEarned;
export const selectError = (state: { adReward: AdRewardState }) => state.adReward.error;
export const selectLastError = (state: { adReward: AdRewardState }) => state.adReward.lastError;
export const selectConfig = (state: { adReward: AdRewardState }) => state.adReward.config;

// Computed selectors
export const selectCanWatchAd = (state: { adReward: AdRewardState }) => {
  const eligibility = state.adReward.eligibility;
  const isLoading = state.adReward.isLoading;
  const currentSession = state.adReward.currentSession;

  return eligibility?.isEligible && !isLoading && !currentSession;
};

export const selectSessionProgress = (state: { adReward: AdRewardState }) => {
  const session = state.adReward.currentSession;
  if (!session || session.status !== 'playing') return null;

  const elapsed = Date.now() - session.startTime;
  const expectedDuration = 30000; // 30 seconds default
  const progress = Math.min(elapsed / expectedDuration, 1);

  return {
    progress,
    elapsed: Math.floor(elapsed / 1000),
    remaining: Math.max(0, 30 - Math.floor(elapsed / 1000)),
  };
};

export const selectEligibilityNeedsRefresh = (state: { adReward: AdRewardState }) => {
  const lastChecked = state.adReward.eligibilityLastChecked;
  if (!lastChecked) return true;

  const cacheTime = 5 * 60 * 1000; // 5 minutes
  return Date.now() - lastChecked > cacheTime;
};

export const selectStatsNeedsRefresh = (state: { adReward: AdRewardState }) => {
  const lastUpdated = state.adReward.statsLastUpdated;
  if (!lastUpdated) return true;

  const cacheTime = 10 * 60 * 1000; // 10 minutes
  return Date.now() - lastUpdated > cacheTime;
};

export default adRewardSlice.reducer;