/**
 * Optimized logging utility for React Native
 * Automatically handles __DEV__ checks for performance optimization
 */

const Logger = {
  /**
   * Log general information - only in development
   */
  log: (...args) => {
    if (__DEV__) {
      console.log(...args);
    }
  },

  /**
   * Log information with emoji for better readability
   */
  info: (...args) => {
    if (__DEV__) {
      console.log('ℹ️', ...args);
    }
  },

  /**
   * Log success messages
   */
  success: (...args) => {
    if (__DEV__) {
      console.log('✅', ...args);
    }
  },

  /**
   * Log warnings - shows in both dev and production for important issues
   */
  warn: (...args) => {
    if (__DEV__) {
      console.warn('⚠️', ...args);
    } else {
      // In production, still log warnings but without emoji
      console.warn(...args);
    }
  },

  /**
   * Log errors - always shown as they're critical
   */
  error: (...args) => {
    console.error('❌', ...args);
  },

  /**
   * Log debug information - only in development
   */
  debug: (...args) => {
    if (__DEV__) {
      console.log('🐛', ...args);
    }
  },

  /**
   * Log performance metrics
   */
  perf: (label, startTime) => {
    if (__DEV__) {
      const duration = Date.now() - startTime;
      console.log(`⚡ ${label} completed in ${duration}ms`);
    }
  },

  /**
   * Log network requests - only in development
   */
  network: (method, url, data) => {
    if (__DEV__) {
      console.log(`🌐 ${method} ${url}`, data ? data : '');
    }
  },

  /**
   * Log Redux actions - only in development
   */
  redux: (action, payload) => {
    if (__DEV__) {
      console.log(`🔄 Redux: ${action}`, payload || '');
    }
  },

  /**
   * Log navigation events - only in development
   */
  navigation: (action, screen) => {
    if (__DEV__) {
      console.log(`🧭 Navigation: ${action} -> ${screen}`);
    }
  },

  /**
   * Log authentication events
   */
  auth: (...args) => {
    if (__DEV__) {
      console.log('🔐', ...args);
    }
  },

  /**
   * Log FCM/notification events
   */
  fcm: (...args) => {
    if (__DEV__) {
      console.log('🔔', ...args);
    }
  },

  /**
   * Log ad service events
   */
  ads: (...args) => {
    if (__DEV__) {
      console.log('📺', ...args);
    }
  },

  /**
   * Group related logs together
   */
  group: (label, callback) => {
    if (__DEV__) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  },

  /**
   * Measure execution time of a function
   */
  time: (label, fn) => {
    if (__DEV__) {
      console.time(label);
      const result = fn();
      console.timeEnd(label);
      return result;
    }
    return fn();
  },

  /**
   * Conditional logging
   */
  logIf: (condition, ...args) => {
    if (__DEV__ && condition) {
      console.log(...args);
    }
  },
};

export default Logger;

// Export individual methods for convenience
export const { log, info, success, warn, error, debug, perf, network, redux, navigation, auth, fcm, ads } = Logger;