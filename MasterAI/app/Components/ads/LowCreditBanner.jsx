import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import RewardedAdButton from './RewardedAdButton';

const { width: screenWidth } = Dimensions.get('window');

const LowCreditBanner = ({
  visible = true,
  onDismiss,
  source = 'main_screen',
  threshold = 10,
  style,
  showRewardButton = true,
  showPurchaseButton = true,
  onPurchasePress,
  onAdCompleted,
  variant = 'warning', // 'warning', 'critical', 'info'
}) => {
  const [isVisible, setIsVisible] = useState(visible);
  const [isDismissed, setIsDismissed] = useState(false);

  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Get current credit balance from Redux store
  const creditBalance = useSelector(state =>
    state.credits?.globalCredits?.balance || 0
  );

  // Determine if banner should be shown based on credit balance
  const shouldShow = creditBalance <= threshold && !isDismissed && visible;

  // Variant configurations
  const variantConfig = {
    warning: {
      gradient: ['#F59E0B', '#D97706'],
      icon: 'warning',
      iconColor: '#FFFFFF',
      textColor: '#FFFFFF',
      title: 'Low Credits',
      message: `You have ${creditBalance} credits remaining`
    },
    critical: {
      gradient: ['#EF4444', '#DC2626'],
      icon: 'alert-circle',
      iconColor: '#FFFFFF',
      textColor: '#FFFFFF',
      title: 'Very Low Credits',
      message: `Only ${creditBalance} credits left!`
    },
    info: {
      gradient: ['#3B82F6', '#2563EB'],
      icon: 'information-circle',
      iconColor: '#FFFFFF',
      textColor: '#FFFFFF',
      title: 'Earn Free Credits',
      message: 'Watch ads to earn more credits'
    }
  };

  const currentVariant = variantConfig[variant];

  useEffect(() => {
    if (shouldShow && !isVisible) {
      setIsVisible(true);
      showBanner();
    } else if (!shouldShow && isVisible) {
      hideBanner();
    }
  }, [shouldShow, isVisible]);

  const showBanner = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideBanner = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
    });
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
    hideBanner();
  };

  const handleAdCompleted = (result) => {
    onAdCompleted?.(result);

    // Hide banner temporarily after successful ad watch
    // It will reappear if credits are still low
    setIsDismissed(true);
    setTimeout(() => {
      setIsDismissed(false);
    }, 5000); // Show again in 5 seconds if still needed
  };

  const handlePurchasePress = () => {
    onPurchasePress?.();
    setIsDismissed(true); // Dismiss when user goes to purchase
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={currentVariant.gradient}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          {/* Left side - Icon and Text */}
          <View style={styles.leftContent}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={currentVariant.icon}
                size={24}
                color={currentVariant.iconColor}
              />
            </View>

            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: currentVariant.textColor }]}>
                {currentVariant.title}
              </Text>
              <Text style={[styles.message, { color: currentVariant.textColor }]}>
                {currentVariant.message}
              </Text>
            </View>
          </View>

          {/* Right side - Action buttons */}
          <View style={styles.rightContent}>
            {showRewardButton && (
              <RewardedAdButton
                source={source}
                size="small"
                variant="outline"
                showCreditsText={false}
                onAdCompleted={handleAdCompleted}
                style={styles.adButton}
              />
            )}

            {showPurchaseButton && (
              <TouchableOpacity
                style={styles.purchaseButton}
                onPress={handlePurchasePress}
              >
                <Text style={styles.purchaseButtonText}>Buy</Text>
              </TouchableOpacity>
            )}

            {/* Dismiss button */}
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={handleDismiss}
            >
              <Ionicons name="close" size={18} color={currentVariant.textColor} />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// Compact version for smaller spaces
export const CompactLowCreditBanner = ({
  visible = true,
  source = 'compact',
  onAdCompleted,
  style,
}) => {
  const creditBalance = useSelector(state =>
    state.credits?.globalCredits?.balance || 0
  );

  const [isDismissed, setIsDismissed] = useState(false);

  const shouldShow = creditBalance <= 5 && !isDismissed && visible;

  const handleAdCompleted = (result) => {
    onAdCompleted?.(result);
    setIsDismissed(true);
    setTimeout(() => setIsDismissed(false), 10000);
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <View style={[styles.compactContainer, style]}>
      <LinearGradient
        colors={['#F59E0B', '#D97706']}
        style={styles.compactGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.compactContent}>
          <View style={styles.compactTextContainer}>
            <Ionicons name="warning" size={16} color="#FFFFFF" />
            <Text style={styles.compactText}>
              {creditBalance} credits left
            </Text>
          </View>

          <RewardedAdButton
            source={source}
            size="small"
            showCreditsText={false}
            onAdCompleted={handleAdCompleted}
            style={styles.compactAdButton}
          />

          <TouchableOpacity
            style={styles.compactDismissButton}
            onPress={() => setIsDismissed(true)}
          >
            <Ionicons name="close" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  gradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    fontFamily: 'Inter-Regular',
    opacity: 0.9,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  adButton: {
    marginRight: 8,
    paddingHorizontal: 12,
    height: 32,
  },
  purchaseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },
  dismissButton: {
    padding: 4,
  },

  // Compact styles
  compactContainer: {
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  compactGradient: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  compactText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
  compactAdButton: {
    marginRight: 6,
    paddingHorizontal: 8,
    height: 24,
  },
  compactDismissButton: {
    padding: 2,
  },
});

export default LowCreditBanner;