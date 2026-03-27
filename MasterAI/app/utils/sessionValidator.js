import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

/**
 * Session validation utility for Master AI
 * Handles token validation, expiration, and user session management
 */

class SessionValidator {
  constructor() {
    this.tokenKey = 'userToken';
    this.userDataKey = 'userData';
    this.sessionExpiryKey = 'sessionExpiry';
    this.lastActivityKey = 'lastActivity';

    // Session timeout in milliseconds (24 hours)
    this.sessionTimeout = 24 * 60 * 60 * 1000;

    // Activity timeout in milliseconds (30 minutes of inactivity)
    this.activityTimeout = 30 * 60 * 1000;
  }

  /**
   * Validate current user session
   * @returns {Promise<{isValid: boolean, user: object|null, token: string|null, reason?: string}>}
   */
  async validateSession() {
    try {
      const token = await AsyncStorage.getItem(this.tokenKey);
      const userData = await AsyncStorage.getItem(this.userDataKey);
      const sessionExpiry = await AsyncStorage.getItem(this.sessionExpiryKey);
      const lastActivity = await AsyncStorage.getItem(this.lastActivityKey);

      // Check if essential data exists
      if (!token || !userData) {
        return {
          isValid: false,
          user: null,
          token: null,
          reason: 'missing_credentials'
        };
      }

      const user = JSON.parse(userData);
      const now = Date.now();

      // Check session expiry
      if (sessionExpiry && now > parseInt(sessionExpiry)) {
        await this.clearSession();
        return {
          isValid: false,
          user: null,
          token: null,
          reason: 'session_expired'
        };
      }

      // Check activity timeout
      if (lastActivity && now - parseInt(lastActivity) > this.activityTimeout) {
        await this.clearSession();
        return {
          isValid: false,
          user: null,
          token: null,
          reason: 'inactivity_timeout'
        };
      }

      // Update last activity
      await this.updateActivity();

      return {
        isValid: true,
        user,
        token,
      };

    } catch (error) {
      console.error('Session validation error:', error);
      return {
        isValid: false,
        user: null,
        token: null,
        reason: 'validation_error'
      };
    }
  }

  /**
   * Create a new session
   * @param {object} user - User data
   * @param {string} token - Authentication token
   * @param {number} customTimeout - Custom session timeout (optional)
   */
  async createSession(user, token, customTimeout = null) {
    try {
      const now = Date.now();
      const expiryTime = now + (customTimeout || this.sessionTimeout);

      await Promise.all([
        AsyncStorage.setItem(this.tokenKey, token),
        AsyncStorage.setItem(this.userDataKey, JSON.stringify(user)),
        AsyncStorage.setItem(this.sessionExpiryKey, expiryTime.toString()),
        AsyncStorage.setItem(this.lastActivityKey, now.toString()),
      ]);

      return true;
    } catch (error) {
      console.error('Session creation error:', error);
      return false;
    }
  }

  /**
   * Update last activity timestamp
   */
  async updateActivity() {
    try {
      await AsyncStorage.setItem(this.lastActivityKey, Date.now().toString());
    } catch (error) {
      console.error('Activity update error:', error);
    }
  }

  /**
   * Clear current session
   */
  async clearSession() {
    try {
      await Promise.all([
        AsyncStorage.removeItem(this.tokenKey),
        AsyncStorage.removeItem(this.userDataKey),
        AsyncStorage.removeItem(this.sessionExpiryKey),
        AsyncStorage.removeItem(this.lastActivityKey),
        AsyncStorage.removeItem('lastSignInMethod'),
      ]);
      return true;
    } catch (error) {
      console.error('Session clear error:', error);
      return false;
    }
  }

  /**
   * Extend current session
   * @param {number} additionalTime - Additional time in milliseconds
   */
  async extendSession(additionalTime = null) {
    try {
      const currentExpiry = await AsyncStorage.getItem(this.sessionExpiryKey);
      if (currentExpiry) {
        const newExpiry = parseInt(currentExpiry) + (additionalTime || this.sessionTimeout);
        await AsyncStorage.setItem(this.sessionExpiryKey, newExpiry.toString());
        return true;
      }
      return false;
    } catch (error) {
      console.error('Session extension error:', error);
      return false;
    }
  }

  /**
   * Check if session is about to expire
   * @param {number} warningTime - Time in milliseconds before expiry to warn (default: 5 minutes)
   * @returns {Promise<{isExpiring: boolean, timeLeft: number}>}
   */
  async checkSessionExpiry(warningTime = 5 * 60 * 1000) {
    try {
      const sessionExpiry = await AsyncStorage.getItem(this.sessionExpiryKey);
      if (!sessionExpiry) {
        return { isExpiring: false, timeLeft: 0 };
      }

      const now = Date.now();
      const expiryTime = parseInt(sessionExpiry);
      const timeLeft = expiryTime - now;

      return {
        isExpiring: timeLeft <= warningTime && timeLeft > 0,
        timeLeft: Math.max(0, timeLeft)
      };
    } catch (error) {
      console.error('Session expiry check error:', error);
      return { isExpiring: false, timeLeft: 0 };
    }
  }

  /**
   * Get session information
   * @returns {Promise<object>}
   */
  async getSessionInfo() {
    try {
      const [token, userData, sessionExpiry, lastActivity] = await Promise.all([
        AsyncStorage.getItem(this.tokenKey),
        AsyncStorage.getItem(this.userDataKey),
        AsyncStorage.getItem(this.sessionExpiryKey),
        AsyncStorage.getItem(this.lastActivityKey),
      ]);

      return {
        hasToken: !!token,
        hasUserData: !!userData,
        sessionExpiry: sessionExpiry ? new Date(parseInt(sessionExpiry)) : null,
        lastActivity: lastActivity ? new Date(parseInt(lastActivity)) : null,
        user: userData ? JSON.parse(userData) : null,
      };
    } catch (error) {
      console.error('Get session info error:', error);
      return {
        hasToken: false,
        hasUserData: false,
        sessionExpiry: null,
        lastActivity: null,
        user: null,
      };
    }
  }

  /**
   * Show session expiry warning to user
   * @param {number} timeLeft - Time left in milliseconds
   * @param {Function} onExtend - Callback when user chooses to extend
   * @param {Function} onLogout - Callback when user chooses to logout
   */
  showExpiryWarning(timeLeft, onExtend, onLogout) {
    const minutes = Math.ceil(timeLeft / (60 * 1000));

    Alert.alert(
      'Session Expiring',
      `Your session will expire in ${minutes} minute${minutes !== 1 ? 's' : ''}. Would you like to extend your session?`,
      [
        {
          text: 'Logout',
          style: 'destructive',
          onPress: onLogout,
        },
        {
          text: 'Extend Session',
          onPress: onExtend,
        },
      ],
      { cancelable: false }
    );
  }

  /**
   * Auto-refresh session periodically
   * @param {Function} onSessionInvalid - Callback when session becomes invalid
   * @param {number} checkInterval - How often to check in milliseconds (default: 1 minute)
   */
  startSessionMonitoring(onSessionInvalid, checkInterval = 60 * 1000) {
    const intervalId = setInterval(async () => {
      const { isValid, reason } = await this.validateSession();

      if (!isValid) {
        clearInterval(intervalId);
        if (onSessionInvalid) {
          onSessionInvalid(reason);
        }
        return;
      }

      // Check if session is about to expire
      const { isExpiring, timeLeft } = await this.checkSessionExpiry();
      if (isExpiring) {
        this.showExpiryWarning(
          timeLeft,
          () => this.extendSession(),
          () => {
            this.clearSession();
            if (onSessionInvalid) {
              onSessionInvalid('user_logout');
            }
          }
        );
      }
    }, checkInterval);

    return intervalId;
  }

  /**
   * Validate token format (basic validation)
   * @param {string} token - Token to validate
   * @returns {boolean}
   */
  isValidTokenFormat(token) {
    if (!token || typeof token !== 'string') return false;

    // Basic token format validation
    // You can customize this based on your token format
    return token.length > 10 && !token.includes(' ');
  }

  /**
   * Get user permissions based on session data
   * @returns {Promise<Array<string>>}
   */
  async getUserPermissions() {
    const { isValid, user } = await this.validateSession();
    if (!isValid || !user) return [];

    // Define permissions based on user role
    const rolePermissions = {
      admin: ['create', 'read', 'update', 'delete', 'manage_users', 'unlimited_generations'],
      premium: ['create', 'read', 'update', 'delete', 'unlimited_generations'],
      user: ['create', 'read', 'update', 'limited_generations'],
    };

    return rolePermissions[user.role] || rolePermissions.user;
  }

  /**
   * Check if user has specific permission
   * @param {string} permission - Permission to check
   * @returns {Promise<boolean>}
   */
  async hasPermission(permission) {
    const permissions = await this.getUserPermissions();
    return permissions.includes(permission);
  }
}

// Create singleton instance
const sessionValidator = new SessionValidator();

export default sessionValidator;