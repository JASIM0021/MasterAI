import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import useRewardedAd from '../../hooks/useRewardedAd';

const RewardedAdButton = ({
  source = 'profile',
  style,
  size = 'medium',
  variant = 'primary',
  showCreditsText = true,
  onAdCompleted,
  onAdFailed,
  disabled = false,
  creditsToEarn = 5
}) => {
  const {
    watchAd,
    isLoading,
    isEligible,
    checkEligibility,
    creditsPerAd,
    eligibility
  } = useRewardedAd();

  const [isPressed, setIsPressed] = useState(false);

  // Size configurations
  const sizeConfig = {
    small: {
      height: 40,
      paddingHorizontal: 12,
      fontSize: 14,
      iconSize: 18,
      borderRadius: 8
    },
    medium: {
      height: 48,
      paddingHorizontal: 16,
      fontSize: 16,
      iconSize: 22,
      borderRadius: 12
    },
    large: {
      height: 56,
      paddingHorizontal: 20,
      fontSize: 18,
      iconSize: 26,
      borderRadius: 16
    }
  };

  // Variant configurations
  const variantConfig = {
    primary: {
      gradient: ['#6366F1', '#8B5CF6'],
      textColor: '#FFFFFF',
      shadowColor: '#6366F1'
    },
    secondary: {
      gradient: ['#10B981', '#059669'],
      textColor: '#FFFFFF',
      shadowColor: '#10B981'
    },
    success: {
      gradient: ['#F59E0B', '#D97706'],
      textColor: '#FFFFFF',
      shadowColor: '#F59E0B'
    },
    outline: {
      gradient: ['transparent', 'transparent'],
      textColor: '#6366F1',
      shadowColor: '#6366F1',
      borderColor: '#6366F1',
      borderWidth: 2
    }
  };

  const currentSize = sizeConfig[size];
  const currentVariant = variantConfig[variant];

  const handlePress = async () => {
    if (disabled || isLoading) return;

    setIsPressed(true);

    try {
      // Check eligibility first
      const eligible = await checkEligibility();
      if (!eligible.isEligible) {
        let message = eligible.reason || 'You are not eligible to watch ads at this time.';

        // Add more specific messages based on eligibility data
        if (eligible.watchedToday >= eligible.dailyLimit) {
          message = `You've reached your daily limit of ${eligible.dailyLimit} ads. Try again tomorrow!`;
        } else if (eligible.canWatchNext && eligible.canWatchNext > Date.now()) {
          const waitTime = Math.ceil((eligible.canWatchNext - Date.now()) / (1000 * 60));
          message = `Please wait ${waitTime} minutes before watching another ad.`;
        }

        Alert.alert(
          'Cannot Watch Ad',
          message,
          [{ text: 'OK' }]
        );
        return;
      }

      // Watch the ad
      const result = await watchAd(source);

      if (result.success && result.creditsAwarded > 0) {
        // Success callback
        onAdCompleted?.(result);

        // Show success message
        Alert.alert(
          'Credits Earned!',
          `You earned ${result.creditsAwarded} credits! Your new balance is ${result.newBalance} credits.`,
          [{ text: 'Great!' }]
        );
      } else if (result.success && !result.qualifiesForReward) {
        // Ad completed but no reward
        Alert.alert(
          'Ad Completed',
          result.message || 'Ad was completed but did not qualify for reward.',
          [{ text: 'OK' }]
        );
      } else {
        // Failed
        onAdFailed?.(result);
        Alert.alert(
          'Ad Failed',
          result.message || 'Failed to complete ad. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('RewardedAdButton error:', error);
      onAdFailed?.(error);

      // Provide specific error messages based on error type
      let errorTitle = 'Error';
      let errorMessage = 'An error occurred while trying to show the ad. Please try again.';

      if (error.message?.includes('network') || error.message?.includes('connection')) {
        errorTitle = 'Network Error';
        errorMessage = 'Please check your internet connection and try again.';
      } else if (error.message?.includes('ad load failed') || error.message?.includes('AD_LOAD_FAILED')) {
        errorTitle = 'Ad Not Available';
        errorMessage = 'No ads are available right now. Please try again later.';
      } else if (error.message?.includes('timeout')) {
        errorTitle = 'Timeout';
        errorMessage = 'The ad took too long to load. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert(errorTitle, errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsPressed(false);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.contentContainer}>
          <ActivityIndicator
            size="small"
            color={currentVariant.textColor}
            style={styles.loadingIcon}
          />
          <Text style={[
            styles.text,
            {
              fontSize: currentSize.fontSize,
              color: currentVariant.textColor
            }
          ]}>
            Loading Ad...
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        <Ionicons
          name="play-circle"
          size={currentSize.iconSize}
          color={currentVariant.textColor}
          style={styles.icon}
        />
        <View style={styles.textContainer}>
          <Text style={[
            styles.text,
            {
              fontSize: currentSize.fontSize,
              color: currentVariant.textColor,
              fontWeight: '600'
            }
          ]}>
            Watch Ad
          </Text>
          {showCreditsText && (
            <Text style={[
              styles.creditsText,
              {
                fontSize: currentSize.fontSize - 2,
                color: currentVariant.textColor,
                opacity: 0.9
              }
            ]}>
              +{creditsPerAd || creditsToEarn} credits
            </Text>
          )}
        </View>
      </View>
    );
  };

  const buttonStyle = [
    styles.button,
    {
      height: currentSize.height,
      paddingHorizontal: currentSize.paddingHorizontal,
      borderRadius: currentSize.borderRadius,
      opacity: (disabled || !isEligible) ? 0.6 : (isPressed ? 0.8 : 1.0),
      borderColor: currentVariant.borderColor,
      borderWidth: currentVariant.borderWidth || 0,
      shadowColor: currentVariant.shadowColor,
    },
    style
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={handlePress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={disabled || isLoading || !isEligible}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={currentVariant.gradient}
        style={[
          styles.gradient,
          { borderRadius: currentSize.borderRadius }
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {renderContent()}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    elevation: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  loadingIcon: {
    marginRight: 8,
  },
  textContainer: {
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
  },
  creditsText: {
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginTop: 2,
  },
});

export default RewardedAdButton;