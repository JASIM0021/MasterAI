import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, ProgressBar, Button, useTheme } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  selectRemainingCredits,
  selectCanUseService,
  selectCreditsLoading,
  fetchUserCredits,
} from '../../features/credits/creditsSlice';
import { selectIsAuthenticated, selectCurrentUser } from '../../features/auth/authSlice';
import {
  useGetUnifiedCreditBalanceQuery,
  useFetchCreditPackagesQuery,
} from '../../features/api/creditsApiSlice';
import { SCREEN_NAME } from '../../Constant';

const CreditDisplay = ({
  service,
  showUpgrade = true,
  onUpgrade = null,
  style = {},
  compact = false,
  showPurchaseButton = true
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);

  // Legacy credit selectors for fallback
  const legacyRemainingCredits = useSelector(selectRemainingCredits(service));
  const legacyCanUseService = useSelector(selectCanUseService(service));
  const legacyCreditsLoading = useSelector(selectCreditsLoading);

  // New unified credit query
  const {
    data: unifiedCreditData,
    isLoading: unifiedCreditsLoading,
    error: unifiedCreditsError,
    refetch: refetchUnifiedCredits
  } = useGetUnifiedCreditBalanceQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: 30000 // Poll every 30 seconds
  });

  // Fallback to legacy system
  useEffect(() => {
    if (isAuthenticated && (!unifiedCreditData || unifiedCreditsError)) {
      dispatch(fetchUserCredits());
    }
  }, [isAuthenticated, dispatch, unifiedCreditData, unifiedCreditsError]);

  // Helper functions to determine credit system and values
  const getCreditSystemData = () => {
    // Prioritize unified credit system if available
    if (unifiedCreditData?.credits) {
      const credits = unifiedCreditData.credits;

      if (credits.type === 'global') {
        const serviceCost = credits.serviceCosts?.[service] || 1;
        const canUse = credits.balance >= serviceCost;

        return {
          type: 'global',
          balance: credits.balance,
          serviceCost,
          canUse,
          totalPurchased: credits.totalPurchased,
          totalUsed: credits.totalUsed,
          loading: unifiedCreditsLoading
        };
      } else if (credits.type === 'legacy' && credits.services?.[service]) {
        const serviceData = credits.services[service];
        return {
          type: 'legacy',
          remaining: serviceData.remaining,
          total: serviceData.total,
          canUse: serviceData.remaining > 0,
          loading: unifiedCreditsLoading
        };
      }
    }

    // Fallback to legacy system
    return {
      type: 'legacy',
      remaining: legacyRemainingCredits,
      total: 50, // Default assumption
      canUse: legacyCanUseService,
      loading: legacyCreditsLoading
    };
  };

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      // Navigate to credit purchase screen
      navigation.navigate(SCREEN_NAME.CreditPurchase);
    }
  };

  const handlePurchaseCredits = () => {
    // Navigate to credit purchase screen
    navigation.navigate(SCREEN_NAME.CreditPurchase);
  };

  const getServiceDisplayName = (service) => {
    const serviceNames = {
      // New automation credits
      automation: 'Workflow Creation',
      execution: 'Workflow Executions',

      // Legacy credits
      postGeneration: 'Post Generation',
      captionGeneration: 'Caption Generation',
      aiImageEdit: 'AI Image Edits',
      aiImageGeneration: 'AI Image Generation',
    };
    return serviceNames[service] || service;
  };

  const getServiceIcon = (service) => {
    const serviceIcons = {
      // New automation credits
      automation: 'robot',
      execution: 'play-circle',

      // Legacy credits
      postGeneration: 'post',
      captionGeneration: 'text',
      aiImageEdit: 'image-edit',
      aiImageGeneration: 'creation',
    };
    return serviceIcons[service] || 'star';
  };

  const getProgressColor = (creditData) => {
    if (creditData.type === 'global') {
      if (creditData.balance <= 5) return '#f44336';
      if (creditData.balance <= 20) return '#ff9800';
      return theme.colors.primary;
    } else {
      if (creditData.remaining === -1) return theme.colors.primary;
      if (creditData.remaining <= 2) return '#f44336';
      if (creditData.remaining <= 5) return '#ff9800';
      return theme.colors.primary;
    }
  };

  const getProgressValue = (creditData) => {
    if (creditData.type === 'global') {
      // For global credits, show progress based on cost
      const maxDisplayCredits = Math.max(100, creditData.totalPurchased || 100);
      return Math.max(0, Math.min(1, creditData.balance / maxDisplayCredits));
    } else {
      if (creditData.remaining === -1) return 1;
      if (creditData.remaining === null || creditData.remaining === undefined) return 0;

      const used = Math.max(0, creditData.total - creditData.remaining);
      return Math.max(0, Math.min(1, (creditData.total - used) / creditData.total));
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  // Get current credit system data
  const creditData = getCreditSystemData();

  // Premium users
  if (currentUser?.subscription?.plan === 'premium') {
    return (
      <Card style={[styles.creditCard, styles.premiumCard, style]}>
        <Card.Content style={compact ? styles.compactContent : styles.content}>
          <View style={styles.premiumHeader}>
            <MaterialCommunityIcons name="crown" size={20} color="#FFD700" />
            <Text style={styles.premiumText}>Premium - Unlimited</Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  if (compact) {
    const displayText = creditData.type === 'global'
      ? `${creditData.balance} credits (${creditData.serviceCost} per use)`
      : `${creditData.remaining || 0} remaining`;

    const showAlert = creditData.type === 'global'
      ? creditData.balance <= creditData.serviceCost
      : (creditData.remaining <= 2 && creditData.remaining !== -1);

    return (
      <View style={[styles.compactContainer, style]}>
        <MaterialCommunityIcons
          name={getServiceIcon(service)}
          size={16}
          color={getProgressColor(creditData)}
          style={styles.compactIcon}
        />
        <Text style={styles.compactText}>{displayText}</Text>
        {showAlert && (
          <MaterialCommunityIcons name="alert" size={16} color="#f44336" />
        )}
      </View>
    );
  }

  return (
    <Card style={[styles.creditCard, style]}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons
              name={getServiceIcon(service)}
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.title}>{getServiceDisplayName(service)}</Text>
            {creditData.type === 'global' && (
              <MaterialCommunityIcons name="wallet" size={16} color="#28a745" />
            )}
          </View>
          {creditData.loading && (
            <MaterialCommunityIcons name="loading" size={20} color={theme.colors.primary} />
          )}
        </View>

        <View style={styles.creditInfo}>
          {creditData.type === 'global' ? (
            <>
              <Text style={styles.creditText}>
                {creditData.balance} global credits available
              </Text>
              <Text style={styles.serviceCostText}>
                Costs {creditData.serviceCost} credit{creditData.serviceCost !== 1 ? 's' : ''} per use
              </Text>
            </>
          ) : (
            <Text style={styles.creditText}>
              {creditData.remaining === -1 ? 'Unlimited' : `${creditData.remaining ?? 0} credits remaining`}
            </Text>
          )}

          {creditData.remaining !== -1 && (
            <ProgressBar
              progress={getProgressValue(creditData)}
              color={getProgressColor(creditData)}
              style={styles.progressBar}
            />
          )}
        </View>

        {/* Warning for low credits */}
        {((creditData.type === 'global' && creditData.balance <= creditData.serviceCost) ||
          (creditData.type === 'legacy' && creditData.remaining <= 2 && creditData.remaining !== -1)) && (
          <View style={styles.warningContainer}>
            <MaterialCommunityIcons name="alert" size={16} color="#f44336" />
            <Text style={styles.warningText}>
              {creditData.type === 'global'
                ? 'Insufficient credits for this service!'
                : (creditData.remaining === 0 ? 'No credits remaining!' : 'Running low on credits!')
              }
            </Text>
          </View>
        )}

        {/* Purchase credits button for global system */}
        {creditData.type === 'global' && showPurchaseButton && (
          <Button
            mode="contained"
            onPress={handlePurchaseCredits}
            style={styles.purchaseButton}
            labelStyle={styles.upgradeButtonText}
            icon="wallet-plus"
          >
            Purchase Credits
          </Button>
        )}

        {/* Legacy system upgrade options */}
        {creditData.type === 'legacy' && (
          <>
            {/* Upgrade button for free users */}
            {showUpgrade && currentUser?.subscription?.plan !== 'premium' && (
              <Button
                mode="contained"
                onPress={handleUpgrade}
                style={styles.upgradeButton}
                labelStyle={styles.upgradeButtonText}
                icon="crown"
              >
                Upgrade to Premium
              </Button>
            )}

            {/* Migration suggestion */}
            <Button
              mode="outlined"
              onPress={handlePurchaseCredits}
              style={styles.migrateButton}
              labelStyle={styles.migrateButtonText}
              icon="arrow-up-circle"
            >
              Upgrade to Global Credits
            </Button>
          </>
        )}

        {/* No credits left */}
        {!creditData.canUse && (
          <View style={styles.noCreditsContainer}>
            <Text style={styles.noCreditsText}>
              {creditData.type === 'global'
                ? `You need ${creditData.serviceCost} credits to use ${getServiceDisplayName(service).toLowerCase()}.`
                : `You've used all your ${getServiceDisplayName(service).toLowerCase()} credits for this month.`
              }
            </Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  creditCard: {
    marginVertical: 8,
    elevation: 2,
  },
  premiumCard: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  content: {
    paddingVertical: 12,
  },
  compactContent: {
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFD700',
    marginLeft: 8,
  },
  creditInfo: {
    marginBottom: 8,
  },
  creditText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#f44336',
    marginLeft: 8,
    flex: 1,
  },
  upgradeButton: {
    marginTop: 8,
  },
  upgradeButtonText: {
    fontSize: 12,
  },
  purchaseButton: {
    marginTop: 8,
    backgroundColor: '#28a745',
  },
  migrateButton: {
    marginTop: 8,
    borderColor: '#007bff',
  },
  migrateButtonText: {
    fontSize: 11,
    color: '#007bff',
  },
  serviceCostText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  noCreditsContainer: {
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  noCreditsText: {
    fontSize: 12,
    color: '#e65100',
    textAlign: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  compactIcon: {
    marginRight: 4,
  },
  compactText: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
});

export default CreditDisplay;