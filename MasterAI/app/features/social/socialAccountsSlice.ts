import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Simplified platform preference interface - no OAuth needed
interface PlatformPreference {
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter';
  isEnabled: boolean;
  displayName: string;
  accountName?: string; // User can set custom name
  color: string;
  icon: string;
  lastUsed?: string;
}

interface SocialPlatformsState {
  platforms: { [platform: string]: PlatformPreference };
  selectedPlatforms: string[]; // For workflow creation
  isLoading: boolean;
  error: string | null;
}

const initialState: SocialPlatformsState = {
  platforms: {
    facebook: {
      platform: 'facebook',
      isEnabled: true,
      displayName: 'Facebook',
      color: '#1877F2',
      icon: 'facebook',
    },
    instagram: {
      platform: 'instagram',
      isEnabled: true,
      displayName: 'Instagram',
      color: '#E4405F',
      icon: 'instagram',
    },
    twitter: {
      platform: 'twitter',
      isEnabled: true,
      displayName: 'Twitter',
      color: '#1DA1F2',
      icon: 'twitter',
    },
    linkedin: {
      platform: 'linkedin',
      isEnabled: true,
      displayName: 'LinkedIn',
      color: '#0A66C2',
      icon: 'linkedin',
    },
  },
  selectedPlatforms: [],
  isLoading: false,
  error: null,
};

// No async thunks needed - everything is local state management

const socialPlatformsSlice = createSlice({
  name: 'socialPlatforms',
  initialState,
  reducers: {
    // Toggle platform enable/disable
    togglePlatform: (state, action: PayloadAction<string>) => {
      const platform = action.payload;
      if (state.platforms[platform]) {
        state.platforms[platform].isEnabled = !state.platforms[platform].isEnabled;
      }
    },

    // Update platform settings
    updatePlatform: (state, action: PayloadAction<{ platform: string; updates: Partial<PlatformPreference> }>) => {
      const { platform, updates } = action.payload;
      if (state.platforms[platform]) {
        Object.assign(state.platforms[platform], updates);
      }
    },

    // Set selected platforms for workflow creation
    setSelectedPlatforms: (state, action: PayloadAction<string[]>) => {
      state.selectedPlatforms = action.payload;
    },

    // Toggle platform selection
    togglePlatformSelection: (state, action: PayloadAction<string>) => {
      const platform = action.payload;
      const index = state.selectedPlatforms.indexOf(platform);

      if (index >= 0) {
        state.selectedPlatforms.splice(index, 1);
      } else {
        state.selectedPlatforms.push(platform);
      }
    },

    // Mark platform as used
    markPlatformUsed: (state, action: PayloadAction<string>) => {
      const platform = action.payload;
      if (state.platforms[platform]) {
        state.platforms[platform].lastUsed = new Date().toISOString();
      }
    },

    // Clear selections
    clearSelections: (state) => {
      state.selectedPlatforms = [];
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Set error
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  togglePlatform,
  updatePlatform,
  setSelectedPlatforms,
  togglePlatformSelection,
  markPlatformUsed,
  clearSelections,
  setLoading,
  setError,
  clearError,
} = socialPlatformsSlice.actions;

export default socialPlatformsSlice.reducer;

// Selectors
export const selectSocialPlatforms = (state: { socialPlatforms: SocialPlatformsState }) => state.socialPlatforms.platforms;
export const selectSocialPlatformsLoading = (state: { socialPlatforms: SocialPlatformsState }) => state.socialPlatforms.isLoading;
export const selectSocialPlatformsError = (state: { socialPlatforms: SocialPlatformsState }) => state.socialPlatforms.error;
export const selectSelectedPlatforms = (state: { socialPlatforms: SocialPlatformsState }) => state.socialPlatforms.selectedPlatforms;

export const selectPlatformByName = (platform: string) =>
  (state: { socialPlatforms: SocialPlatformsState }) =>
    state?.socialPlatforms?.platforms[platform];

export const selectEnabledPlatforms = (state: { socialPlatforms: SocialPlatformsState }) =>
  Object.values(state?.socialPlatforms?.platforms).filter(platform => platform.isEnabled);

export const selectAvailablePlatforms = (state: { socialPlatforms: SocialPlatformsState }) =>
  Object.values(state?.socialPlatforms?.platforms? state?.socialPlatforms?.platforms:'fb') ;

export const selectHasSelectedPlatforms = (state: { socialPlatforms: SocialPlatformsState }) =>
  state?.socialPlatforms?.selectedPlatforms?.length > 0;