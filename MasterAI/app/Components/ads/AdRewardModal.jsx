import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  SafeAreaView,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { useRewardedAd } from '../../hooks/useRewardedAd';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const AdRewardModal = ({
  visible,
  onClose,
  source = 'modal',
  creditsToEarn = 5,
  onAdCompleted,
  onAdFailed,
}) => {
  const {
    watchAd,
    initializeAd,
    checkEligibility,
    cancelAdSession,
    isLoading,
    sessionId,
    currentSession,
    adLoaded,
    adError,
    eligibility,
    creditsPerAd
  } = useRewardedAd();

  const [adState, setAdState] = useState('preparing'); // preparing, loading, playing, completed, failed
  const [progress, setProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [rewardEarned, setRewardEarned] = useState(false);
  const [adResult, setAdResult] = useState(null);
  const [currentAd, setCurrentAd] = useState(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Start entrance animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      // Initialize ad watching
      initializeAdWatch();
    } else {
      // Reset state when modal closes
      resetModalState();
    }
  }, [visible]);

  useEffect(() => {
    let interval;
    if (adState === 'playing' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          const newProgress = Math.max(0, (30 - newTime) / 30);
          setProgress(newProgress);

          // Animate progress
          Animated.timing(progressAnim, {
            toValue: newProgress,
            duration: 1000,
            useNativeDriver: false,
          }).start();

          // Show close button after 80% completion
          if (newProgress >= 0.8 && !showCloseButton) {
            setShowCloseButton(true);
          }

          if (newTime <= 0) {
            handleAdCompleted();
          }

          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [adState, timeRemaining, showCloseButton]);

  const resetModalState = () => {
    setAdState('preparing');
    setProgress(0);
    setTimeRemaining(30);
    setShowCloseButton(false);
    setRewardEarned(false);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);
    progressAnim.setValue(0);
  };

  const initializeAdWatch = async () => {
    try {
      setAdState('loading');

      // Check eligibility first
      const eligibilityResult = await checkEligibility();
      if (!eligibilityResult.isEligible) {
        setAdState('failed');
        onAdFailed?.({ reason: eligibilityResult.reason });
        return;
      }

      // Initialize real AdMob ad
      const ad = await initializeAd('rewarded');
      setCurrentAd(ad);

      // Set up real ad event listeners
      const unsubscribeEarned = ad.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        (reward) => {
          setRewardEarned(true);
          console.log('User earned reward:', reward);
        }
      );

      const unsubscribeOpened = ad.addAdEventListener(
        RewardedAdEventType.OPENED,
        () => {
          setAdState('playing');
          // Start the progress timer when ad actually opens
          setTimeRemaining(30);
        }
      );

      const unsubscribeClosed = ad.addAdEventListener(
        RewardedAdEventType.CLOSED,
        () => {
          // Ad was closed, handle completion or early exit
          handleAdClosed();
        }
      );

      // Store cleanup functions
      ad._modalUnsubscribes = [unsubscribeEarned, unsubscribeOpened, unsubscribeClosed];

      // Show the ad immediately once loaded
      if (adLoaded) {
        await ad.show();
      }

    } catch (error) {
      console.error('Failed to initialize ad:', error);
      setAdState('failed');
      onAdFailed?.(error);
    }
  };

  const handleAdClosed = async () => {
    try {
      // Cleanup ad event listeners
      if (currentAd && currentAd._modalUnsubscribes) {
        currentAd._modalUnsubscribes.forEach(unsubscribe => unsubscribe());
      }

      if (rewardEarned) {
        // User completed the ad and earned reward
        handleAdCompleted();
      } else {
        // User closed ad early or ad failed
        setAdState('failed');
        onAdFailed?.({ reason: 'Ad was closed before completion' });
      }
    } catch (error) {
      console.error('Error handling ad close:', error);
      setAdState('failed');
      onAdFailed?.(error);
    }
  };

  const handleAdCompleted = async () => {
    try {
      setAdState('completed');

      // Use the actual watchAd API to complete the session and award credits
      const result = await watchAd(source, {
        watchDuration: 30 - timeRemaining,
        completed: true,
        adType: 'rewarded'
      });

      setAdResult(result);

      if (result.success && result.creditsAwarded > 0) {
        onAdCompleted?.(result);

        // Show success animation
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        // Auto close after showing success
        setTimeout(() => {
          handleClose();
        }, 3000);
      } else {
        setAdState('failed');
        onAdFailed?.(result);
      }
    } catch (error) {
      console.error('Failed to complete ad:', error);
      setAdState('failed');
      onAdFailed?.(error);
    }
  };

  const handleClose = async () => {
    if (adState === 'playing' && !showCloseButton) {
      Alert.alert(
        'Close Ad?',
        'You need to watch the entire ad to earn credits. Are you sure you want to close?',
        [
          { text: 'Continue Watching', style: 'cancel' },
          {
            text: 'Close',
            style: 'destructive',
            onPress: async () => {
              // Cancel the ad session with the backend
              await cancelAdSession();
              setAdState('failed');
              onAdFailed?.({ reason: 'User closed ad early' });

              // Clean up any ad listeners
              if (currentAd && currentAd._modalUnsubscribes) {
                currentAd._modalUnsubscribes.forEach(unsubscribe => unsubscribe());
              }

              closeModal();
            }
          }
        ]
      );
      return;
    }

    closeModal();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const renderPreparingState = () => (
    <View style={styles.stateContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="tv" size={64} color="#6366F1" />
      </View>
      <Text style={styles.stateTitle}>Preparing Your Ad</Text>
      <Text style={styles.stateDescription}>
        Get ready to earn {creditsToEarn} credits by watching a short video
      </Text>
      <ActivityIndicator size="large" color="#6366F1" style={styles.loader} />
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.stateContainer}>
      <View style={styles.iconContainer}>
        <ActivityIndicator size={48} color="#6366F1" />
      </View>
      <Text style={styles.stateTitle}>Loading Ad...</Text>
      <Text style={styles.stateDescription}>
        Please wait while we load your rewarded video
      </Text>
      <View style={styles.loadingProgress}>
        <View style={styles.loadingBar}>
          <Animated.View
            style={[
              styles.loadingFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );

  const renderPlayingState = () => (
    <View style={styles.stateContainer}>
      <View style={styles.adNotificationContainer}>
        <View style={styles.iconContainer}>
          <Ionicons name="tv" size={64} color="#6366F1" />
        </View>
        <Text style={styles.stateTitle}>Ad is Playing</Text>
        <Text style={styles.stateDescription}>
          A video ad is currently playing in full screen. Watch it completely to earn {creditsPerAd || creditsToEarn} credits.
        </Text>

        <View style={styles.adProgressIndicator}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.adProgressText}>
            Ad in progress...
          </Text>
        </View>

        <View style={styles.creditsPreview}>
          <Ionicons name="diamond" size={24} color="#F59E0B" />
          <Text style={styles.creditsPreviewText}>
            +{creditsPerAd || creditsToEarn} credits when complete
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCompletedState = () => (
    <View style={styles.stateContainer}>
      <View style={styles.successContainer}>
        <Animated.View
          style={[
            styles.successIcon,
            {
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={80} color="#10B981" />
        </Animated.View>
        <Text style={styles.successTitle}>Congratulations!</Text>
        <Text style={styles.successDescription}>
          You earned {adResult?.creditsAwarded || creditsPerAd || creditsToEarn} credits!
        </Text>
        <View style={styles.creditsDisplay}>
          <Ionicons name="diamond" size={24} color="#F59E0B" />
          <Text style={styles.creditsAmount}>+{adResult?.creditsAwarded || creditsPerAd || creditsToEarn}</Text>
        </View>
        {adResult?.newBalance && (
          <Text style={styles.newBalanceText}>
            New balance: {adResult.newBalance} credits
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.continueButton}
        onPress={handleClose}
      >
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.continueGradient}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  const renderFailedState = () => (
    <View style={styles.stateContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="close-circle" size={64} color="#EF4444" />
      </View>
      <Text style={styles.stateTitle}>Ad Failed</Text>
      <Text style={styles.stateDescription}>
        Sorry, there was an issue with the ad. Please try again.
      </Text>

      <TouchableOpacity
        style={styles.retryButton}
        onPress={() => {
          setAdState('preparing');
          initializeAdWatch();
        }}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleClose}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    switch (adState) {
      case 'preparing':
        return renderPreparingState();
      case 'loading':
        return renderLoadingState();
      case 'playing':
        return renderPlayingState();
      case 'completed':
        return renderCompletedState();
      case 'failed':
        return renderFailedState();
      default:
        return renderPreparingState();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Rewarded Ad</Text>
              {(adState === 'preparing' || adState === 'failed' || adState === 'completed') && (
                <TouchableOpacity
                  style={styles.headerCloseButton}
                  onPress={handleClose}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>

            {/* Content */}
            <View style={styles.content}>
              {renderContent()}
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: screenWidth * 0.9,
    maxHeight: screenHeight * 0.8,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Inter-SemiBold',
  },
  headerCloseButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  stateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Inter-Bold',
  },
  stateDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Inter-Medium',
  },
  loader: {
    marginTop: 20,
  },
  loadingProgress: {
    width: '100%',
    marginTop: 20,
  },
  loadingBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 2,
  },
  adPlayerContainer: {
    width: '100%',
    height: 200,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mockAdPlayer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockAdText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    fontFamily: 'Inter-SemiBold',
  },
  progressContainer: {
    width: '100%',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Inter-SemiBold',
  },
  timeRemaining: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6366F1',
    fontFamily: 'Inter-Medium',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  skipButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  skipButtonText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    fontFamily: 'Inter-Bold',
  },
  successDescription: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 20,
    fontFamily: 'Inter-Medium',
  },
  creditsDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  creditsAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginLeft: 8,
    fontFamily: 'Inter-Bold',
  },
  continueButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  continueGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Inter-SemiBold',
  },
  retryButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Inter-SemiBold',
  },
  closeButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    fontFamily: 'Inter-Medium',
  },
  adNotificationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  adProgressIndicator: {
    alignItems: 'center',
    marginVertical: 20,
  },
  adProgressText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    fontFamily: 'Inter-Medium',
  },
  creditsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
  },
  creditsPreviewText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginLeft: 8,
    fontFamily: 'Inter-SemiBold',
  },
  newBalanceText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    fontFamily: 'Inter-Medium',
  },
});

export default AdRewardModal;