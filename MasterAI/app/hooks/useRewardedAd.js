import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Platform } from 'react-native';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import {
  startAdSession,
  updateAdSessionStatus,
  completeAdSession,
  failAdSession,
  clearCurrentSession,
  setEligibilityLoading,
  setEligibility,
  setEligibilityError,
  selectCurrentSession,
  selectIsLoading,
  selectEligibility,
  selectCanWatchAd,
  selectEligibilityNeedsRefresh,
} from '../features/adRewards/adRewardSlice';
import {
  useInitiateAdSessionMutation,
  useCompleteAdSessionMutation,
  useFailAdSessionMutation,
  useCheckAdEligibilityQuery,
} from '../features/api/creditsApiSlice';
import { getAdUnit } from '../config/admobConfig';

const useRewardedAd = () => {
  const dispatch = useDispatch();

  // Redux state
  const currentSession = useSelector(selectCurrentSession);
  const isLoading = useSelector(selectIsLoading);
  const eligibility = useSelector(selectEligibility);
  const canWatchAd = useSelector(selectCanWatchAd);
  const eligibilityNeedsRefresh = useSelector(selectEligibilityNeedsRefresh);

  // API mutations
  const [initiateAdSession] = useInitiateAdSessionMutation();
  const [completeAdSessionApi] = useCompleteAdSessionMutation();
  const [failAdSessionApi] = useFailAdSessionMutation();

  // Local state
  const [rewardedAd, setRewardedAd] = useState(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const [adError, setAdError] = useState(null);

  // Get ad unit ID based on platform
  const getAdUnitId = useCallback((adType = 'rewarded') => {
    if (__DEV__) {
      return adType === 'rewarded' ? TestIds.REWARDED : TestIds.REWARDED_INTERSTITIAL;
    }

    return getAdUnit(adType);
  }, []);

  // Initialize rewarded ad
  const initializeAd = useCallback(async (adType = 'rewarded') => {
    try {
      const adUnitId = getAdUnitId(adType);
      const ad = RewardedAd.createForAdRequest(adUnitId);

      // Set up event listeners
      const unsubscribeLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
        setAdLoaded(true);
        setAdError(null);
      });

      const unsubscribeFailedToLoad = ad.addAdEventListener(
        RewardedAdEventType.FAILED_TO_LOAD_EVENT,
        (error) => {
          setAdLoaded(false);
          setAdError(error);
          console.error('Ad failed to load:', error);
        }
      );

      const unsubscribeEarned = ad.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          console.log('User earned reward:', reward);
        }
      );

      const unsubscribeClosed = ad.addAdEventListener(RewardedAdEventType.CLOSED, () => {
        // Ad was closed, clean up
        setRewardedAd(null);
        setAdLoaded(false);
      });

      // Store unsubscribe functions
      ad._unsubscribeFunctions = [
        unsubscribeLoaded,
        unsubscribeFailedToLoad,
        unsubscribeEarned,
        unsubscribeClosed,
      ];

      setRewardedAd(ad);

      // Load the ad
      ad.load();

      return ad;
    } catch (error) {
      console.error('Failed to initialize ad:', error);
      setAdError(error);
      throw error;
    }
  }, [getAdUnitId]);

  // Clean up ad
  const cleanupAd = useCallback(() => {
    if (rewardedAd) {
      // Unsubscribe from events
      if (rewardedAd._unsubscribeFunctions) {
        rewardedAd._unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
      }
      setRewardedAd(null);
    }
    setAdLoaded(false);
    setAdError(null);
  }, [rewardedAd]);

  // Use RTK Query hook for eligibility checking
  const {
    data: eligibilityData,
    isLoading: isEligibilityLoading,
    error: eligibilityError,
    refetch: refetchEligibility
  } = useCheckAdEligibilityQuery(undefined, {
    skip: !eligibilityNeedsRefresh && eligibility !== null,
    refetchOnMountOrArgChange: true
  });

  // Check eligibility with proper API integration
  const checkEligibility = useCallback(async (forceRefresh = false) => {
    if (eligibility && !eligibilityNeedsRefresh && !forceRefresh) {
      return eligibility;
    }

    try {
      dispatch(setEligibilityLoading(true));

      // Use refetch if forcing refresh or query hasn't run yet
      const result = forceRefresh ? await refetchEligibility() : { data: eligibilityData, error: eligibilityError };

      if (result.error) {
        throw new Error(result.error.message || 'Failed to check eligibility');
      }

      const responseData = result.data;
      const eligibilityResult = {
        isEligible: responseData.success && responseData.isEligible,
        reason: responseData.message || responseData.reason,
        creditsPerAd: responseData.creditsPerAd || 5,
        dailyLimit: responseData.dailyLimit,
        watchedToday: responseData.watchedToday,
        canWatchNext: responseData.canWatchNext,
      };

      dispatch(setEligibility(eligibilityResult));
      return eligibilityResult;
    } catch (error) {
      console.error('Failed to check eligibility:', error);
      dispatch(setEligibilityError(error.message));
      return {
        isEligible: false,
        reason: error.message || 'Unable to check eligibility',
        creditsPerAd: 5,
      };
    } finally {
      dispatch(setEligibilityLoading(false));
    }
  }, [dispatch, eligibility, eligibilityNeedsRefresh, eligibilityData, eligibilityError, refetchEligibility]);

  // Watch ad function
  const watchAd = useCallback(async (source = 'unknown', options = {}) => {
    try {
      // Check eligibility first
      const eligibilityResult = await checkEligibility();
      if (!eligibilityResult.isEligible) {
        throw new Error(eligibilityResult.reason || 'Not eligible to watch ads');
      }

      const adType = options.adType || 'rewarded';
      const adUnitId = getAdUnitId(adType);

      // Initiate session on backend
      const sessionResponse = await initiateAdSession({
        adType,
        adUnitId,
        source,
        deviceInfo: {
          platform: Platform.OS,
          deviceModel: Platform.constants?.Model || 'Unknown',
          osVersion: Platform.constants?.Release || Platform.Version,
          appVersion: '1.0.0', // You might want to get this dynamically
        },
      }).unwrap();

      if (!sessionResponse.success) {
        throw new Error(sessionResponse.message || 'Failed to initiate ad session');
      }

      const sessionId = sessionResponse.sessionId;

      // Start session in Redux
      dispatch(startAdSession({
        sessionId,
        adType,
        adUnitId,
        source,
        creditsToEarn: eligibilityResult.creditsPerAd,
      }));

      // Initialize and load ad
      dispatch(updateAdSessionStatus({ sessionId, status: 'loading' }));
      const ad = await initializeAd(adType);

      // Wait for ad to load with timeout
      const loadTimeout = 10000; // 10 seconds
      const loadStartTime = Date.now();

      while (!adLoaded && !adError && (Date.now() - loadStartTime) < loadTimeout) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (adError) {
        await failAdSessionApi({
          sessionId,
          errorCode: 'AD_LOAD_FAILED',
          errorMessage: adError.message || 'Failed to load ad',
        });

        dispatch(failAdSession({
          sessionId,
          error: {
            code: 'AD_LOAD_FAILED',
            message: adError.message || 'Failed to load ad',
          },
        }));

        return {
          success: false,
          message: 'Failed to load ad. Please try again.',
        };
      }

      if (!adLoaded) {
        await failAdSessionApi({
          sessionId,
          errorCode: 'AD_LOAD_TIMEOUT',
          errorMessage: 'Ad loading timeout',
        });

        dispatch(failAdSession({
          sessionId,
          error: {
            code: 'AD_LOAD_TIMEOUT',
            message: 'Ad loading timeout',
          },
        }));

        return {
          success: false,
          message: 'Ad loading timeout. Please try again.',
        };
      }

      // Show the ad and track real events
      dispatch(updateAdSessionStatus({ sessionId, status: 'playing' }));
      const watchStartTime = Date.now();

      // Set up tracking variables for ad completion
      let adEarnedReward = false;
      let adWasClosed = false;
      let watchDuration = 0;

      // Set up event listeners for this specific ad session
      const earnedListener = ad.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          adEarnedReward = true;
          console.log('User earned reward:', reward);
        }
      );

      const closedListener = ad.addAdEventListener(
        RewardedAdEventType.CLOSED,
        () => {
          adWasClosed = true;
          watchDuration = Date.now() - watchStartTime;
        }
      );

      try {
        await ad.show();

        // Wait for ad to be closed
        while (!adWasClosed) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Calculate completion rate based on whether reward was earned
        const completionRate = adEarnedReward ? 100 : Math.max(0, (watchDuration / 30000) * 100);

        // Clean up listeners
        earnedListener();
        closedListener();

      } catch (showError) {
        // Clean up listeners if ad.show() fails
        earnedListener();
        closedListener();
        throw showError;
      }

      // Complete the session with real ad data
      const completionResponse = await completeAdSessionApi({
        sessionId,
        watchDuration,
        adClicked: false, // Could be tracked with additional listeners
        userSkipped: !adEarnedReward, // If no reward earned, consider it skipped
        earnedReward: adEarnedReward,
        completionRate,
      }).unwrap();

      if (completionResponse.success && completionResponse.qualifiesForReward) {
        dispatch(completeAdSession({
          sessionId,
          creditsAwarded: completionResponse.creditsAwarded,
          completionRate,
          watchDuration,
        }));

        return {
          success: true,
          qualifiesForReward: true,
          creditsAwarded: completionResponse.creditsAwarded,
          newBalance: completionResponse.newBalance,
          message: completionResponse.message,
        };
      } else {
        dispatch(completeAdSession({
          sessionId,
          creditsAwarded: 0,
          completionRate,
          watchDuration,
        }));

        return {
          success: true,
          qualifiesForReward: false,
          creditsAwarded: 0,
          message: completionResponse.message || 'Ad completed but did not qualify for reward',
        };
      }
    } catch (error) {
      console.error('watchAd error:', error);

      if (currentSession) {
        await failAdSessionApi({
          sessionId: currentSession.sessionId,
          errorCode: 'WATCH_AD_ERROR',
          errorMessage: error.message || 'Unknown error occurred',
        });

        dispatch(failAdSession({
          sessionId: currentSession.sessionId,
          error: {
            code: 'WATCH_AD_ERROR',
            message: error.message || 'Unknown error occurred',
          },
        }));
      }

      return {
        success: false,
        message: error.message || 'Failed to watch ad. Please try again.',
      };
    } finally {
      cleanupAd();
    }
  }, [
    checkEligibility,
    getAdUnitId,
    initiateAdSession,
    completeAdSessionApi,
    failAdSessionApi,
    dispatch,
    initializeAd,
    adLoaded,
    adError,
    cleanupAd,
    currentSession,
  ]);

  // Cancel current ad session
  const cancelAdSession = useCallback(async () => {
    if (currentSession) {
      try {
        await failAdSessionApi({
          sessionId: currentSession.sessionId,
          errorCode: 'USER_CANCELLED',
          errorMessage: 'User cancelled ad session',
        });

        dispatch(failAdSession({
          sessionId: currentSession.sessionId,
          error: {
            code: 'USER_CANCELLED',
            message: 'User cancelled ad session',
          },
        }));
      } catch (error) {
        console.error('Failed to cancel ad session:', error);
      }
    }

    cleanupAd();
    dispatch(clearCurrentSession());
  }, [currentSession, failAdSessionApi, dispatch, cleanupAd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAd();
    };
  }, [cleanupAd]);

  return {
    // State
    currentSession,
    isLoading,
    eligibility,
    canWatchAd,
    adLoaded,
    adError,

    // Actions
    watchAd,
    cancelAdSession,
    checkEligibility,

    // Ad management
    initializeAd,
    cleanupAd,

    // Computed values
    sessionId: currentSession?.sessionId,
    isEligible: eligibility?.isEligible || false,
    creditsPerAd: eligibility?.creditsPerAd || 5,
  };
};

export default useRewardedAd;