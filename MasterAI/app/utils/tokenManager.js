import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const TOKEN_KEY = 'userToken';
const USER_DATA_KEY = 'userData';
const LAST_METHOD_KEY = 'lastSignInMethod';
const TOKEN_REFRESH_KEY = 'tokenRefreshTime';

class TokenManager {
  constructor() {
    this.token = null;
    this.userData = null;
    this.lastMethod = null;
    this.tokenRefreshTime = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      await this.loadFromStorage();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize TokenManager:', error);
    }
  }

  async loadFromStorage() {
    try {
      const [token, userData, lastMethod, refreshTime] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_DATA_KEY),
        AsyncStorage.getItem(LAST_METHOD_KEY),
        AsyncStorage.getItem(TOKEN_REFRESH_KEY),
      ]);

      if (token && userData) {
        // Validate token format
        if (this.isValidTokenFormat(token)) {
          this.token = token;
          this.userData = JSON.parse(userData);
          this.lastMethod = lastMethod;
          this.tokenRefreshTime = refreshTime ? parseInt(refreshTime) : Date.now();

          // Check if token needs refresh
          await this.checkAndRefreshToken();

          return {
            token: this.token,
            userData: this.userData,
            lastMethod: this.lastMethod,
            isValid: true
          };
        } else {
          console.log('Invalid token format, clearing storage');
          await this.clearStorage();
        }
      }

      return { isValid: false };
    } catch (error) {
      console.error('Error loading from storage:', error);
      return { isValid: false };
    }
  }

  isValidTokenFormat(token) {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    return parts.length === 3;
  }

  async checkAndRefreshToken() {
    try {
      // Check if token is expired or near expiry
      if (this.isTokenExpired()) {
        console.log('Token expired or near expiry, attempting refresh...');

        if (this.lastMethod === 'google') {
          await this.refreshGoogleToken();
        }
        // Add other providers as needed
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.clearStorage();
    }
  }

  isTokenExpired() {
    if (!this.token) return true;

    try {
      const payload = JSON.parse(atob(this.token.split('.')[1]));
      const expTime = payload.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();

      // Use different buffer times based on the token's remaining time
      const timeLeft = expTime - currentTime;
      const oneHour = 60 * 60 * 1000;
      const oneDay = 24 * oneHour;

      // If token has more than 1 day left, use a 1-hour buffer
      // If token has more than 1 hour left, use a 5-minute buffer
      // Otherwise, consider it expired
      let bufferTime;
      if (timeLeft > oneDay) {
        bufferTime = oneHour;
      } else if (timeLeft > oneHour) {
        bufferTime = 5 * 60 * 1000; // 5 minutes
      } else {
        bufferTime = 0; // No buffer if less than 1 hour left
      }

      const isExpired = currentTime >= (expTime - bufferTime);

      if (isExpired) {
        console.log('Token expired. Time left:', Math.max(0, expTime - currentTime), 'ms');
      }

      return isExpired;
    } catch (error) {
      console.error('Error checking token expiry:', error);
      // If we can't parse the token, check if it was created recently
      if (this.tokenRefreshTime) {
        const timeSinceRefresh = Date.now() - this.tokenRefreshTime;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        return timeSinceRefresh > maxAge;
      }
      return true;
    }
  }

  async refreshGoogleToken() {
    try {
      // Check if user is still signed in with Google
      const isSignedIn = await GoogleSignin.isSignedIn();

      if (isSignedIn) {
        // Get fresh tokens silently
        const userInfo = await GoogleSignin.signInSilently();
        if (userInfo.idToken) {
          console.log('Google token refreshed successfully');

          // Here you would typically send the new idToken to your backend
          // to get a fresh JWT. For now, we'll update the refresh time
          // and keep the existing token structure.

          // In a real implementation, you would:
          // 1. Send userInfo.idToken to your backend
          // 2. Get a new JWT from your backend
          // 3. Update the token with the new JWT

          this.tokenRefreshTime = Date.now();
          await AsyncStorage.setItem(TOKEN_REFRESH_KEY, this.tokenRefreshTime.toString());

          console.log('Token refresh completed at:', new Date(this.tokenRefreshTime).toISOString());
          return true;
        }
      } else {
        throw new Error('User not signed in with Google');
      }
    } catch (error) {
      console.error('Google token refresh failed:', error);

      // If refresh fails, the user may need to sign in again
      if (error?.code === 'SIGN_IN_REQUIRED' || error?.code === 'SIGN_IN_CANCELLED') {
        console.log('User needs to sign in again');
        // Clear storage to force re-authentication
        await this.clearStorage();
      }

      throw error;
    }
  }

  async saveToken(token, userData, method = null) {
    try {
      this.token = token;
      this.userData = userData;
      this.lastMethod = method;
      this.tokenRefreshTime = Date.now();

      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, token),
        AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)),
        AsyncStorage.setItem(LAST_METHOD_KEY, method || ''),
        AsyncStorage.setItem(TOKEN_REFRESH_KEY, this.tokenRefreshTime.toString()),
      ]);

      console.log('Token saved successfully');
      return true;
    } catch (error) {
      console.error('Failed to save token:', error);
      return false;
    }
  }

  async updateToken(newToken) {
    if (!newToken) return false;

    try {
      this.token = newToken;
      this.tokenRefreshTime = Date.now();

      await Promise.all([
        AsyncStorage.setItem(TOKEN_KEY, newToken),
        AsyncStorage.setItem(TOKEN_REFRESH_KEY, this.tokenRefreshTime.toString()),
      ]);

      return true;
    } catch (error) {
      console.error('Failed to update token:', error);
      return false;
    }
  }

  async clearStorage() {
    try {
      this.token = null;
      this.userData = null;
      this.lastMethod = null;
      this.tokenRefreshTime = null;

      await Promise.all([
        AsyncStorage.removeItem(TOKEN_KEY),
        AsyncStorage.removeItem(USER_DATA_KEY),
        AsyncStorage.removeItem(LAST_METHOD_KEY),
        AsyncStorage.removeItem(TOKEN_REFRESH_KEY),
      ]);

      console.log('Storage cleared successfully');
      return true;
    } catch (error) {
      console.error('Failed to clear storage:', error);
      return false;
    }
  }

  getToken() {
    return this.token;
  }

  getUserData() {
    return this.userData;
  }

  getLastMethod() {
    return this.lastMethod;
  }

  isAuthenticated() {
    return !!(this.token && this.userData && !this.isTokenExpired());
  }

  // Get auth header for API calls
  getAuthHeader() {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  // Debug function
  async debugInfo() {
    const info = {
      hasToken: !!this.token,
      hasUserData: !!this.userData,
      lastMethod: this.lastMethod,
      tokenRefreshTime: this.tokenRefreshTime,
      isExpired: this.isTokenExpired(),
      isAuthenticated: this.isAuthenticated(),
    };

    if (this.token) {
      try {
        const payload = JSON.parse(atob(this.token.split('.')[1]));
        info.tokenExp = new Date(payload.exp * 1000);
      } catch (e) {
        info.tokenExp = 'Invalid';
      }
    }

    console.log('TokenManager Debug Info:', info);
    return info;
  }
}

// Create singleton instance
const tokenManager = new TokenManager();

export default tokenManager;