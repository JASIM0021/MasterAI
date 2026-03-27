import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Alert } from 'react-native';
import {
  selectRemainingCredits,
  selectCanUseService,
  selectCreditsLoading,
  deductCredit,
  deductCreditLocal,
  fetchUserCredits,
} from '../features/credits/creditsSlice';
import { selectIsAuthenticated, selectCurrentUser } from '../features/auth/authSlice';

/**
 * Custom hook for managing credits and checking service access
 * @param {string} service - The service name (postGeneration, captionGeneration, etc.)
 */
const useCredits = (service) => {
  const dispatch = useDispatch();

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);
  const remainingCredits = useSelector(selectRemainingCredits(service));
  const canUseService = useSelector(selectCanUseService(service));
  const creditsLoading = useSelector(selectCreditsLoading);

  const isPremium = currentUser?.subscription?.plan === 'premium';

  /**
   * Check if user can use the service
   * @returns {Promise<boolean>} Whether the user can use the service
   */
  const checkAccess = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert('Authentication Required', 'Please sign in to use this feature.');
      return false;
    }

    if (isPremium) {
      return true; // Premium users have unlimited access
    }

    if (!canUseService) {
      Alert.alert(
        'Credits Exhausted',
        `You've used all your ${getServiceDisplayName(service)} credits for this month. Upgrade to Premium for unlimited access.`,
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Upgrade Now', onPress: () => console.log('Navigate to upgrade') },
        ]
      );
      return false;
    }

    return true;
  }, [isAuthenticated, isPremium, canUseService, service]);

  /**
   * Use a credit for the service (deduct 1 credit)
   * @param {boolean} showSuccess - Whether to show success message
   * @returns {Promise<boolean>} Whether the credit was successfully deducted
   */
  const useCredit = useCallback(async (showSuccess = false) => {
    try {
      // First check if user can use the service
      const hasAccess = await checkAccess();
      if (!hasAccess) {
        return false;
      }

      // Premium users don't need credit deduction
      if (isPremium) {
        return true;
      }

      // Optimistic update for immediate UI feedback
      dispatch(deductCreditLocal({ service }));

      // Deduct credit from backend
      const result = await dispatch(deductCredit({ service })).unwrap();

      if (showSuccess) {
        const remaining = result.credits[service]?.total - result.credits[service]?.used;
        Alert.alert(
          'Success!',
          remaining > 0
            ? `Generation successful! ${remaining} credits remaining.`
            : 'Generation successful! This was your last credit for this month.'
        );
      }

      return true;
    } catch (error) {
      console.error('Failed to use credit:', error);

      // Refresh credits to get correct state
      dispatch(fetchUserCredits());

      Alert.alert(
        'Error',
        error.message || 'Failed to process your request. Please try again.'
      );
      return false;
    }
  }, [dispatch, service, checkAccess, isPremium]);

  /**
   * Refresh credits data
   */
  const refreshCredits = useCallback(async () => {
    if (isAuthenticated) {
      try {
        await dispatch(fetchUserCredits()).unwrap();
      } catch (error) {
        console.error('Failed to refresh credits:', error);
      }
    }
  }, [dispatch, isAuthenticated]);

  /**
   * Get warning message for low credits
   */
  const getWarningMessage = useCallback(() => {
    if (isPremium || remainingCredits === -1) {
      return null;
    }

    if (remainingCredits === 0) {
      return `No ${getServiceDisplayName(service).toLowerCase()} credits remaining this month.`;
    }

    if (remainingCredits <= 2) {
      return `Only ${remainingCredits} ${getServiceDisplayName(service).toLowerCase()} credits remaining!`;
    }

    if (remainingCredits <= 5) {
      return `${remainingCredits} ${getServiceDisplayName(service).toLowerCase()} credits remaining.`;
    }

    return null;
  }, [service, remainingCredits, isPremium]);

  /**
   * Show upgrade prompt
   */
  const showUpgradePrompt = useCallback(() => {
    Alert.alert(
      'Upgrade to Premium',
      `Get unlimited ${getServiceDisplayName(service).toLowerCase()} and all other AI features!`,
      [
        { text: 'Maybe Later', style: 'cancel' },
        { text: 'Upgrade Now', onPress: () => console.log('Navigate to subscription') },
      ]
    );
  }, [service]);

  return {
    // State
    isAuthenticated,
    isPremium,
    remainingCredits,
    canUseService,
    creditsLoading,

    // Actions
    checkAccess,
    useCredit,
    refreshCredits,
    showUpgradePrompt,

    // Helpers
    getWarningMessage,

    // Service info
    serviceName: getServiceDisplayName(service),
  };
};

/**
 * Get display name for service
 */
const getServiceDisplayName = (service) => {
  const serviceNames = {
    postGeneration: 'Post Generation',
    captionGeneration: 'Caption Generation',
    aiImageEdit: 'AI Image Edits',
    aiImageGeneration: 'AI Image Generation',
  };
  return serviceNames[service] || service;
};

export default useCredits;