import React from 'react';
import AuthGuard from './AuthGuard';

/**
 * Higher-Order Component (HOC) that requires authentication
 * Wraps components that need user authentication
 *
 * @param {React.Component} WrappedComponent - Component to protect
 * @param {Object} options - Configuration options
 * @param {string} options.message - Custom message to show when auth required
 * @param {boolean} options.showModal - Whether to show auth modal (default: true)
 * @param {React.Component} options.fallback - Custom fallback component
 *
 * @returns {React.Component} Protected component
 */
const withAuthRequired = (WrappedComponent, options = {}) => {
  const AuthRequiredComponent = (props) => {
    const {
      message = "Sign in to access this AI-powered feature and unlock unlimited generations.",
      showModal = true,
      fallback = null,
    } = options;

    return (
      <AuthGuard
        requireAuth={true}
        showModal={showModal}
        customMessage={message}
        fallbackComponent={fallback}
      >
        <WrappedComponent {...props} />
      </AuthGuard>
    );
  };

  // Set display name for debugging
  AuthRequiredComponent.displayName = `withAuthRequired(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return AuthRequiredComponent;
};

export default withAuthRequired;