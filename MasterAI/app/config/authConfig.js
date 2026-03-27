import { Platform } from 'react-native';
import { API_URL, IP_ADDRESS } from '../features/api/globalApiSlice';

/**
 * Authentication Configuration
 * Centralized configuration for authentication settings
 */

export const AUTH_CONFIG = {
  // Google OAuth Configuration
  google: {
    // Replace with your actual Google Web Client ID from Google Cloud Console
    webClientId: '926562855734-rfabjjj7hb7g035eaq1u9jn305uj7lh6.apps.googleusercontent.com',
    offlineAccess: true,
    hostedDomain: '',
    forceCodeForRefreshToken: true,
    accountName: '', // Optional
    iosClientId: '', // Add iOS client ID if you have one
    googleServicePlistPath: '', // Optional for iOS
    openIdConnect: true, // Request OpenID Connect ID Token
    requestIdToken: true, // Explicitly request ID token
    requestProfile: true, // Request user profile info
  },

  // Backend API Configuration
  api: {
    baseUrl: Platform.OS === "web"
      ? "http://localhost:3000/api/"
      : API_URL,

    authBaseUrl: Platform.OS === "web"
      ? "http://localhost:3000/api/auth/"
      : `${API_URL}auth/`,
  },

  // Session Configuration
  session: {
    // Session timeout in milliseconds (24 hours)
    timeout: 24 * 60 * 60 * 1000,

    // Activity timeout in milliseconds (30 minutes of inactivity)
    activityTimeout: 30 * 60 * 1000,

    // Warning time before session expires (5 minutes)
    warningTime: 5 * 60 * 1000,
  },

  // Quota Configuration for Free Users
  quotas: {
    free: {
      postGeneration: 50,
      captionGeneration: 50,
      aiImageEdit: 50,
      aiImageGeneration: 50,
      general: 50,
    },

    // Premium users have unlimited access (-1 means unlimited)
    premium: {
      postGeneration: -1,
      captionGeneration: -1,
      aiImageEdit: -1,
      aiImageGeneration: -1,
      general: -1,
    },
  },

  // Feature flags
  features: {
    enableSessionMonitoring: true,
    enableQuotaWarnings: true,
    enableUpgradePrompts: true,
    enableUsageTracking: true,
  },

  // Error messages
  messages: {
    authRequired: "Please sign in to access this feature",
    quotaExceeded: "Monthly limit reached! Upgrade to Premium for unlimited access.",
    sessionExpired: "Your session has expired. Please sign in again.",
    networkError: "Unable to connect. Please check your internet connection.",
    genericError: "Something went wrong. Please try again.",
  },
};

/**
 * Get quota limit for a specific feature and user plan
 * @param {string} feature - Feature name
 * @param {string} plan - User plan (free, premium, admin)
 * @returns {number} Quota limit (-1 for unlimited)
 */
export const getQuotaLimit = (feature, plan = 'free') => {
  const quotas = AUTH_CONFIG.quotas;
  const planQuotas = quotas[plan] || quotas.free;
  return planQuotas[feature] || quotas.free.general;
};

/**
 * Check if a feature requires authentication
 * @param {string} feature - Feature name
 * @returns {boolean}
 */
export const requiresAuth = (feature) => {
  const protectedFeatures = [
    'postGeneration',
    'captionGeneration',
    'aiImageEdit',
    'aiImageGeneration',
  ];

  return protectedFeatures.includes(feature);
};

/**
 * Get authentication message for a specific feature
 * @param {string} feature - Feature name
 * @returns {string}
 */
export const getAuthMessage = (feature) => {
  const messages = {
    postGeneration: "Sign in to create AI-powered social media posts and join thousands of content creators!",
    captionGeneration: "Sign in to create AI-powered captions and grow your social media presence!",
    aiImageEdit: "Sign in to unlock powerful AI image editing features and transform your photos!",
    aiImageGeneration: "Sign in to unleash AI image generation and create stunning visuals!",
  };

  return messages[feature] || AUTH_CONFIG.messages.authRequired;
};

/**
 * Validate configuration
 * @returns {Object} Validation result
 */
export const validateConfig = () => {
  const issues = [];

  // Check Google Client ID
  if (AUTH_CONFIG.google.webClientId === 'YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com') {
    issues.push('Google Web Client ID not configured');
  }

  // Check API URLs
  if (AUTH_CONFIG.api.baseUrl.includes('YOUR_IP')) {
    issues.push('API base URL not configured');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
};

export default AUTH_CONFIG;