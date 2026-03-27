import React from 'react';

/**
 * Navigation Reference for Push Notifications
 *
 * This provides a global navigation reference that can be used
 * by services like push notifications to navigate between screens
 * even when they're not within a React component context.
 */

export const navigationRef = React.createRef();

/**
 * Navigate to a screen using the global navigation reference
 * @param {string} name - Screen name
 * @param {object} params - Navigation parameters
 */
export function navigate(name, params) {
  if (navigationRef.current?.isReady()) {
    console.log(`🧭 Global navigation to: ${name}`, params);
    navigationRef.current.navigate(name, params);
  } else {
    console.warn('❌ Navigation ref not ready, cannot navigate to:', name);
  }
}

/**
 * Go back using the global navigation reference
 */
export function goBack() {
  if (navigationRef.current?.isReady()) {
    console.log('🧭 Global navigation: Going back');
    navigationRef.current.goBack();
  } else {
    console.warn('❌ Navigation ref not ready, cannot go back');
  }
}

/**
 * Check if navigation is ready
 */
export function isReady() {
  return navigationRef.current?.isReady() ?? false;
}

/**
 * Get current route name
 */
export function getCurrentRoute() {
  if (navigationRef.current?.isReady()) {
    return navigationRef.current.getCurrentRoute();
  }
  return null;
}