import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, ProgressBar, Button, useTheme } from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  selectAutomationCreditSummary,
  selectCanCreateWorkflow,
  selectCanExecuteWorkflow,
  selectCreditsLoading,
  fetchUserCredits,
} from '../../features/credits/creditsSlice';
import { selectIsAuthenticated, selectCurrentUser } from '../../features/auth/authSlice';
import {
  useGetUnifiedCreditBalanceQuery,
  useFetchAutomationCreditsQuery,
} from '../../features/api/creditsApiSlice';

const AutomationCreditDisplay = ({
  showUpgrade = true,
  onUpgrade = null,
  style = {},
  compact = false
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);

  // Legacy selectors for fallback
  const legacyCreditSummary = useSelector(selectAutomationCreditSummary);
  const legacyCanCreateWorkflow = useSelector(selectCanCreateWorkflow);
  const legacyCanExecuteWorkflow = useSelector(selectCanExecuteWorkflow);
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

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      console.log('Navigate to upgrade page');
    }
  };

  // Helper function to get automation credit data from unified system
  const getAutomationCreditData = () => {
    // Prioritize unified credit system if available
    if (unifiedCreditData?.credits) {
      const credits = unifiedCreditData.credits;

      if (credits.type === 'global') {
        const automationCost = credits.serviceCosts?.automation || 10;
        const executionCost = credits.serviceCosts?.execution || 5;
        const executionWithImageCost = credits.serviceCosts?.executionWithImage || 15;

        return {
          type: 'global',
          balance: credits.balance,
          automationCost,
          executionCost,
          executionWithImageCost,
          canCreateAutomation: credits.balance >= automationCost,
          canExecuteText: credits.balance >= executionCost,
          canExecuteImage: credits.balance >= executionWithImageCost,
          loading: unifiedCreditsLoading
        };
      } else if (credits.type === 'legacy') {
        // Handle legacy automation credits if they exist
        const automationData = credits.services?.automation;
        const executionData = credits.services?.execution;

        return {
          type: 'legacy',
          automation: automationData || { used: 0, total: 2, remaining: 2 },
          execution: executionData || { used: 0, total: 20, remaining: 20 },
          canCreateAutomation: automationData ? automationData.remaining > 0 : false,
          canExecuteText: executionData ? executionData.remaining > 0 : false,
          loading: unifiedCreditsLoading
        };
      }
    }

    // Fallback to legacy system
    return {
      type: 'legacy',
      automation: legacyCreditSummary?.automation || { used: 0, total: 2, available: 2 },
      execution: legacyCreditSummary?.execution || { used: 0, total: 20, available: 20 },
      canCreateAutomation: legacyCanCreateWorkflow,
      canExecuteText: legacyCanExecuteWorkflow,
      loading: legacyCreditsLoading
    };
  };

  const getProgressColor = (remaining, lowThreshold = 2) => {
    if (remaining === -1) return theme.colors.primary;
    if (remaining <= 1) return '#f44336';
    if (remaining <= lowThreshold) return '#ff9800';
    return theme.colors.primary;
  };

  const getProgressValue = (used, total) => {
    if (total === -1) return 1;
    if (total === 0) return 0;
    return Math.max(0, Math.min(1, (total - used) / total));
  };

  // Get credit data from unified system
  const creditData = getAutomationCreditData();

  if (!isAuthenticated || creditData.loading) {
    return null;
  }

  // Premium users
  if (currentUser?.subscription?.plan === 'premium') {
    return (
      <Card style={[styles.creditCard, styles.premiumCard, style]}>
        <Card.Content style={compact ? styles.compactContent : styles.content}>
          <View style={styles.premiumHeader}>
            <MaterialCommunityIcons name="crown" size={20} color="#FFD700" />
            <Text style={styles.premiumText}>Premium - Unlimited Automation</Text>
          </View>
        </Card.Content>
      </Card>
    );
  }

  if (compact) {
    if (creditData.type === 'global') {
      // For global credits, show balance and costs
      const automationCount = Math.floor(creditData.balance / creditData.automationCost);
      const executionCount = Math.floor(creditData.balance / creditData.executionCost);

      return (
        <View style={[styles.compactContainer, style]}>
          <MaterialCommunityIcons
            name="wallet"
            size={16}
            color={getProgressColor(creditData.balance, 20)}
            style={styles.compactIcon}
          />
          <Text style={styles.compactText}>
            {creditData.balance} credits • {automationCount} workflows • {executionCount} executions
          </Text>
          {creditData.balance <= 10 && (
            <MaterialCommunityIcons name="alert" size={16} color="#f44336" />
          )}
        </View>
      );
    } else {
      // Legacy credit display
      const automation = creditData.automation;
      const execution = creditData.execution;
      const automationAvailable = automation.total - automation.used;
      const executionAvailable = execution.total - execution.used;

      return (
        <View style={[styles.compactContainer, style]}>
          <MaterialCommunityIcons
            name="robot"
            size={16}
            color={getProgressColor(automationAvailable)}
            style={styles.compactIcon}
          />
          <Text style={styles.compactText}>
            {automationAvailable === -1 ? '∞' : automationAvailable} workflows, {executionAvailable === -1 ? '∞' : executionAvailable} executions
          </Text>
          {(automationAvailable <= 1 || executionAvailable <= 5) && automationAvailable !== -1 && (
            <MaterialCommunityIcons name="alert" size={16} color="#f44336" />
          )}
        </View>
      );
    }
  }

  return (
    <Card style={[styles.creditCard, style]}>
      <Card.Content style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons
              name="robot"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={styles.title}>Automation Credits</Text>
          </View>
          {creditsLoading && (
            <MaterialCommunityIcons name="loading" size={20} color={theme.colors.primary} />
          )}
        </View>

        {/* Workflow Creation Credits */}
        <View style={styles.creditSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="plus-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Workflow Creation</Text>
          </View>

          <Text style={styles.creditText}>
            {automation.available === -1
              ? 'Unlimited workflows'
              : `${automation.available} of ${automation.total} workflows remaining`
            }
          </Text>

          {automation.total !== -1 && (
            <ProgressBar
              progress={getProgressValue(automation.used, automation.total)}
              color={getProgressColor(automation.available, 1)}
              style={styles.progressBar}
            />
          )}

          {automation.available <= 1 && automation.total !== -1 && (
            <View style={styles.warningContainer}>
              <MaterialCommunityIcons name="alert" size={16} color="#f44336" />
              <Text style={styles.warningText}>
                {automation.available === 0
                  ? 'No workflow creation credits remaining!'
                  : 'Only 1 workflow creation credit left!'
                }
              </Text>
            </View>
          )}
        </View>

        {/* Workflow Execution Credits */}
        <View style={styles.creditSection}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="play-circle" size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>Workflow Executions</Text>
          </View>

          <Text style={styles.creditText}>
            {execution.available === -1
              ? 'Unlimited executions'
              : `${execution.available} of ${execution.total} executions remaining`
            }
          </Text>

          {execution.total !== -1 && (
            <ProgressBar
              progress={getProgressValue(execution.used, execution.total)}
              color={getProgressColor(execution.available, 5)}
              style={styles.progressBar}
            />
          )}

          {execution.executionCount > 0 && (
            <Text style={styles.statsText}>
              Total executed: {execution.executionCount} times
              {execution.lastExecution && (
                <Text style={styles.lastExecutionText}>
                  {'\n'}Last execution: {new Date(execution.lastExecution).toLocaleDateString()}
                </Text>
              )}
            </Text>
          )}

          {execution.available <= 5 && execution.total !== -1 && (
            <View style={styles.warningContainer}>
              <MaterialCommunityIcons name="alert" size={16} color="#f44336" />
              <Text style={styles.warningText}>
                {execution.available === 0
                  ? 'No execution credits remaining!'
                  : 'Running low on execution credits!'
                }
              </Text>
            </View>
          )}
        </View>

        {/* Reset Date Info */}
        {(automation.resetDate || execution.resetDate) && (
          <View style={styles.resetInfo}>
            <MaterialCommunityIcons name="refresh" size={16} color="#666" />
            <Text style={styles.resetText}>
              Credits reset on {new Date(automation.resetDate || execution.resetDate).toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* Upgrade button for free users */}
        {showUpgrade && currentUser?.subscription?.plan !== 'premium' && (
          <Button
            mode="contained"
            onPress={handleUpgrade}
            style={styles.upgradeButton}
            labelStyle={styles.upgradeButtonText}
            icon="crown"
          >
            Upgrade for Unlimited Automation
          </Button>
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
    marginBottom: 16,
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
  creditSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    color: '#333',
  },
  creditText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  lastExecutionText: {
    fontSize: 11,
    color: '#bbb',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 6,
    marginTop: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#f44336',
    marginLeft: 8,
    flex: 1,
  },
  resetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  resetText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  upgradeButton: {
    marginTop: 16,
  },
  upgradeButtonText: {
    fontSize: 12,
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

export default AutomationCreditDisplay;