import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFetchUserCreditsQuery } from '../../../features/api/creditsApiSlice';

const ExecutionLimitsCard = ({ isAuthenticated, authLoading }) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const {
    data: creditsData,
    isLoading: creditsLoading,
    isError: creditsError,
    refetch: refetchCredits
  } = useFetchUserCreditsQuery(
    undefined,
    { skip: !isAuthenticated || authLoading }
  );

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return '#e74c3c';
    if (percentage >= 70) return '#f39c12';
    return '#27ae60';
  };

  const getStatusIcon = (percentage) => {
    if (percentage >= 90) return 'alert-circle';
    if (percentage >= 70) return 'alert';
    return 'check-circle';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysUntilReset = (resetDate) => {
    const now = new Date();
    const reset = new Date(resetDate);
    const diffTime = reset - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  if (!creditsData && creditsLoading) {
    return (
      <View style={styles.creditsCard}>
        <View style={styles.creditsHeader}>
          <Icon name="coin" size={24} color="#f39c12" />
          <Text style={styles.creditsTitle}>Execution Limits</Text>
        </View>
        <ActivityIndicator size="small" color="#f39c12" style={{ marginTop: 8 }} />
      </View>
    );
  }

  if (creditsError || !creditsData) {
    return (
      <View style={styles.creditsCard}>
        <View style={styles.creditsHeader}>
          <Icon name="coin" size={24} color="#e74c3c" />
          <Text style={styles.creditsTitle}>Execution Limits</Text>
        </View>
        <Text style={styles.creditsErrorText}>Failed to load limits</Text>
        <TouchableOpacity onPress={refetchCredits} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const automationPercentage = (creditsData?.automation?.used / creditsData?.automation?.total) * 100 || 0;
  const executionPercentage = (creditsData?.execution?.used / creditsData?.execution?.total) * 100 || 0;

  return (
    <>
      <View style={styles.creditsCard}>
        <TouchableOpacity
          style={styles.creditsHeader}
          onPress={() => setShowDetailsModal(true)}
        >
          <Icon name="speedometer" size={24} color="#f39c12" />
          <Text style={styles.creditsTitle}>Execution Limits</Text>
          <Icon name="chevron-right" size={20} color="#666" />
        </TouchableOpacity>

        {/* Quick Overview */}
        <View style={styles.quickOverview}>
          <View style={styles.overviewItem}>
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewLabel}>Automations</Text>
              <Icon
                name={getStatusIcon(automationPercentage)}
                size={16}
                color={getProgressColor(automationPercentage)}
              />
            </View>
            <Text style={styles.overviewValue}>
              {creditsData?.automation?.used || 0} / {creditsData?.automation?.total || 0}
            </Text>
            <View style={styles.miniProgressBar}>
              <View
                style={[
                  styles.miniProgressFill,
                  {
                    width: `${Math.min(automationPercentage, 100)}%`,
                    backgroundColor: getProgressColor(automationPercentage)
                  }
                ]}
              />
            </View>
          </View>

          <View style={styles.overviewItem}>
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewLabel}>Executions</Text>
              <Icon
                name={getStatusIcon(executionPercentage)}
                size={16}
                color={getProgressColor(executionPercentage)}
              />
            </View>
            <Text style={styles.overviewValue}>
              {creditsData?.execution?.used || 0} / {creditsData?.execution?.total || 0}
            </Text>
            <View style={styles.miniProgressBar}>
              <View
                style={[
                  styles.miniProgressFill,
                  {
                    width: `${Math.min(executionPercentage, 100)}%`,
                    backgroundColor: getProgressColor(executionPercentage)
                  }
                ]}
              />
            </View>
          </View>
        </View>

        {/* Reset Info */}
        <View style={styles.resetInfo}>
          <Icon name="refresh" size={16} color="#666" />
          <Text style={styles.resetText}>
            Resets in {getDaysUntilReset(creditsData?.automation?.resetDate || creditsData?.execution?.resetDate)} days
          </Text>
        </View>

        {/* Tap to view details hint */}
        <Text style={styles.tapHint}>Tap for detailed breakdown</Text>
      </View>

      {/* Detailed Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowDetailsModal(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Execution Limits Details</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Automation Credits */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Automation Credits</Text>
              <Text style={styles.detailSectionSubtitle}>
                Controls how many automations you can create
              </Text>

              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <Icon name="robot" size={24} color="#6200ee" />
                  <View style={styles.detailHeaderText}>
                    <Text style={styles.detailCardTitle}>Active Automations</Text>
                    <Text style={styles.detailCardValue}>
                      {creditsData?.automation?.used || 0} of {creditsData?.automation?.total || 0} used
                    </Text>
                  </View>
                </View>

                <View style={styles.detailProgressContainer}>
                  <View style={styles.detailProgressBar}>
                    <LinearGradient
                      colors={[getProgressColor(automationPercentage), getProgressColor(automationPercentage)]}
                      style={[styles.detailProgressFill, { width: `${Math.min(automationPercentage, 100)}%` }]}
                    />
                  </View>
                  <Text style={styles.detailProgressText}>
                    {Math.round(automationPercentage)}% used
                  </Text>
                </View>

                <View style={styles.detailStats}>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Available</Text>
                    <Text style={[styles.detailStatValue, { color: '#27ae60' }]}>
                      {(creditsData?.automation?.total || 0) - (creditsData?.automation?.used || 0)}
                    </Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Total Limit</Text>
                    <Text style={styles.detailStatValue}>
                      {creditsData?.automation?.total || 0}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Execution Credits */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Execution Credits</Text>
              <Text style={styles.detailSectionSubtitle}>
                Controls how many posts your automations can generate
              </Text>

              <View style={styles.detailCard}>
                <View style={styles.detailHeader}>
                  <Icon name="play" size={24} color="#3498db" />
                  <View style={styles.detailHeaderText}>
                    <Text style={styles.detailCardTitle}>Monthly Executions</Text>
                    <Text style={styles.detailCardValue}>
                      {creditsData?.execution?.used || 0} of {creditsData?.execution?.total || 0} used
                    </Text>
                  </View>
                </View>

                <View style={styles.detailProgressContainer}>
                  <View style={styles.detailProgressBar}>
                    <LinearGradient
                      colors={[getProgressColor(executionPercentage), getProgressColor(executionPercentage)]}
                      style={[styles.detailProgressFill, { width: `${Math.min(executionPercentage, 100)}%` }]}
                    />
                  </View>
                  <Text style={styles.detailProgressText}>
                    {Math.round(executionPercentage)}% used
                  </Text>
                </View>

                <View style={styles.detailStats}>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Remaining</Text>
                    <Text style={[styles.detailStatValue, { color: '#27ae60' }]}>
                      {(creditsData?.execution?.total || 0) - (creditsData?.execution?.used || 0)}
                    </Text>
                  </View>
                  <View style={styles.detailStat}>
                    <Text style={styles.detailStatLabel}>Monthly Limit</Text>
                    <Text style={styles.detailStatValue}>
                      {creditsData?.execution?.total || 0}
                    </Text>
                  </View>
                </View>

                {creditsData?.execution?.lastExecution && (
                  <View style={styles.lastExecutionInfo}>
                    <Icon name="clock" size={16} color="#666" />
                    <Text style={styles.lastExecutionText}>
                      Last execution: {formatDate(creditsData?.execution?.lastExecution)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Reset Information */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Reset Schedule</Text>

              <View style={styles.resetCard}>
                <Icon name="calendar-refresh" size={24} color="#f39c12" />
                <View style={styles.resetCardContent}>
                  <Text style={styles.resetCardTitle}>Next Reset</Text>
                  <Text style={styles.resetCardDate}>
                    {formatDate(creditsData?.automation?.resetDate || creditsData?.execution?.resetDate)}
                  </Text>
                  <Text style={styles.resetCardCountdown}>
                    {getDaysUntilReset(creditsData?.automation?.resetDate || creditsData?.execution?.resetDate)} days remaining
                  </Text>
                  <Text style={styles.resetCardNote}>
                    All limits will be restored to full capacity on the reset date.
                  </Text>
                </View>
              </View>
            </View>

            {/* Usage Tips */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Usage Tips</Text>

              <View style={styles.tipsCard}>
                <View style={styles.tip}>
                  <Icon name="lightbulb" size={16} color="#f39c12" />
                  <Text style={styles.tipText}>
                    Create focused automations with specific topics for better results
                  </Text>
                </View>
                <View style={styles.tip}>
                  <Icon name="lightbulb" size={16} color="#f39c12" />
                  <Text style={styles.tipText}>
                    Use longer intervals between executions to manage your limits
                  </Text>
                </View>
                <View style={styles.tip}>
                  <Icon name="lightbulb" size={16} color="#f39c12" />
                  <Text style={styles.tipText}>
                    Review and approve generated content to maintain quality
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  creditsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  creditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creditsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 8,
    flex: 1,
  },
  creditsErrorText: {
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignSelf: 'center',
  },
  retryText: {
    color: '#6200ee',
    fontWeight: '600',
  },
  quickOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  overviewItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  overviewValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 6,
  },
  miniProgressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
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
    marginLeft: 6,
  },
  tapHint: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e6ed',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSpacer: {
    width: 32,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  detailSection: {
    marginTop: 20,
  },
  detailSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  detailSectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  detailCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailHeaderText: {
    marginLeft: 12,
    flex: 1,
  },
  detailCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  detailCardValue: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  detailProgressContainer: {
    marginBottom: 16,
  },
  detailProgressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  detailProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  detailProgressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  detailStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailStat: {
    alignItems: 'center',
  },
  detailStatLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  lastExecutionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  lastExecutionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
  },
  resetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  resetCardContent: {
    marginLeft: 12,
    flex: 1,
  },
  resetCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  resetCardDate: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f39c12',
    marginBottom: 4,
  },
  resetCardCountdown: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  resetCardNote: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  tipsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
});

export default ExecutionLimitsCard;