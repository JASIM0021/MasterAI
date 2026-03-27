import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  useTheme,
  IconButton,
  Button,
  Snackbar,
  ActivityIndicator,
  Chip,
  Divider,
} from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../Components/header/Header';
import {
  useFetchScheduleQuery,
  useFetchScheduleAnalyticsQuery,
  useDeleteScheduleMutation,
  useToggleScheduleMutation,
  useTestScheduleMutation,
  useDuplicateScheduleMutation,
} from '../../features/api/schedulesApiSlice';

const { width } = Dimensions.get('window');

const ScheduleDetails = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  // Get scheduleId from route params
  const { scheduleId } = route.params || {};

  // Component state
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // RTK Query hooks
  const {
    data: scheduleData,
    isLoading: scheduleLoading,
    isError: scheduleError,
    refetch: refetchSchedule
  } = useFetchScheduleQuery(scheduleId, { skip: !scheduleId });

  const {
    data: analyticsData,
    isLoading: analyticsLoading,
  } = useFetchScheduleAnalyticsQuery(
    { scheduleId, dateRange: '30d' },
    { skip: !scheduleId }
  );

  const [deleteSchedule, { isLoading: deletingSchedule }] = useDeleteScheduleMutation();
  const [toggleSchedule, { isLoading: togglingSchedule }] = useToggleScheduleMutation();
  const [testSchedule, { isLoading: testingSchedule }] = useTestScheduleMutation();
  const [duplicateSchedule, { isLoading: duplicatingSchedule }] = useDuplicateScheduleMutation();

  const schedule = scheduleData?.schedule;

  const handleEditSchedule = () => {
    navigation.navigate('EditAutomation', {
      scheduleId: schedule.id,
      schedule: schedule
    });
  };

  const handleToggleSchedule = async () => {
    try {
      await toggleSchedule(scheduleId).unwrap();
      setSnackbarMessage(
        `Workflow ${schedule.isActive ? 'paused' : 'activated'} successfully`
      );
      setSnackbarVisible(true);
      refetchSchedule();
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
      setSnackbarMessage('Failed to update workflow. Please try again.');
      setSnackbarVisible(true);
    }
  };

  const handleDeleteSchedule = async () => {
    const executionCount = schedule.stats?.totalExecutions || 0;
    const successfulCount = schedule.stats?.successfulExecutions || 0;
    const failedCount = schedule.stats?.failedExecutions || 0;
    const isActive = schedule.isActive;

    // Get frequency display
    const getFrequencyText = () => {
      if (schedule.recurrence?.minuteInterval) {
        return `Every ${schedule.recurrence.minuteInterval} minutes`;
      }
      switch (schedule.recurrence?.frequency) {
        case 'daily': return 'Daily';
        case 'weekly': return 'Weekly';
        case 'monthly': return 'Monthly';
        case 'custom': return 'Custom schedule';
        default: return 'Unknown frequency';
      }
    };

    Alert.alert(
      'Delete Workflow',
      `Are you sure you want to delete "${schedule.name}"?\n\n` +
      `📊 Workflow Details:\n` +
      `• Status: ${isActive ? '🟢 Active' : '⏸️ Paused'}\n` +
      `• Frequency: ${getFrequencyText()}\n` +
      `• Total posts generated: ${executionCount}\n` +
      `• Successful: ${successfulCount}\n` +
      `• Failed: ${failedCount}\n` +
      `• Created: ${new Date(schedule.createdAt).toLocaleDateString()}\n` +
      `• Content type: ${schedule.content?.aiConfig?.contentType || 'Unknown'}\n` +
      `• Language: ${schedule.content?.aiConfig?.language || 'Unknown'}\n\n` +
      `⚠️ This action will:\n` +
      `• Stop all future executions immediately\n` +
      `• Remove the automation permanently\n` +
      `• Restore 1 automation credit to your account\n` +
      `• Delete all configuration and settings\n\n` +
      `💡 Alternative: You can pause the workflow instead of deleting it.\n\n` +
      `This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Pause Instead',
          onPress: () => {
            if (schedule.isActive) {
              handleToggleSchedule();
            }
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteSchedule(scheduleId).unwrap();

              // Show enhanced success message with credit restoration info
              const creditInfo = result.creditInfo;
              const creditMessage = creditInfo
                ? ` You now have ${creditInfo.available} automation credits available.`
                : '';

              setSnackbarMessage(`Workflow "${schedule.name}" deleted successfully.${creditMessage}`);
              setSnackbarVisible(true);

              // Navigate back after short delay
              setTimeout(() => {
                navigation.goBack();
              }, 2000);
            } catch (error) {
              console.error('Failed to delete schedule:', error);
              const errorMessage = error?.data?.message || 'Failed to delete workflow. Please try again.';
              setSnackbarMessage(errorMessage);
              setSnackbarVisible(true);
            }
          },
        },
      ]
    );
  };

  const handleTestSchedule = async () => {
    try {
      const result = await testSchedule(scheduleId).unwrap();
      setSnackbarMessage('Test execution completed successfully!');
      setSnackbarVisible(true);
      console.log('Test result:', result);
    } catch (error) {
      console.error('Failed to test schedule:', error);
      setSnackbarMessage('Test execution failed. Please check your workflow configuration.');
      setSnackbarVisible(true);
    }
  };

  const handleDuplicateSchedule = async () => {
    Alert.alert(
      'Duplicate Workflow',
      `Create a copy of "${schedule.name}"? The duplicate will be created as inactive and you can edit it before starting.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Duplicate',
          onPress: async () => {
            try {
              const result = await duplicateSchedule(scheduleId).unwrap();
              setSnackbarMessage(
                `Workflow duplicated successfully! "${result.schedule.name}" has been created.`
              );
              setSnackbarVisible(true);

              // Navigate to the edit screen for the duplicated workflow after delay
              setTimeout(() => {
                navigation.navigate('EditAutomation', {
                  scheduleId: result.schedule.id,
                  schedule: result.schedule
                });
              }, 1500);
            } catch (error) {
              console.error('Failed to duplicate schedule:', error);
              const errorMessage = error?.data?.message || 'Failed to duplicate workflow. Please try again.';
              setSnackbarMessage(errorMessage);
              setSnackbarVisible(true);
            }
          },
        },
      ]
    );
  };

  const getFrequencyDisplay = (recurrence) => {
    if (recurrence?.minuteInterval) {
      return {
        title: `Every ${recurrence.minuteInterval} minutes`,
        subtitle: 'Per-minute automation (experimental)',
        icon: 'clock-fast'
      };
    }

    switch (recurrence?.frequency) {
      case 'daily':
        return {
          title: 'Daily',
          subtitle: `At ${formatTimeSlots(recurrence.timeSlots)}`,
          icon: 'calendar-today'
        };
      case 'weekly':
        const days = recurrence.daysOfWeek?.map(day => {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return dayNames[day];
        }).join(', ');
        return {
          title: 'Weekly',
          subtitle: `${days} at ${formatTimeSlots(recurrence.timeSlots)}`,
          icon: 'calendar-week'
        };
      case 'monthly':
        return {
          title: 'Monthly',
          subtitle: `${recurrence.dayOfMonth}${getOrdinalSuffix(recurrence.dayOfMonth)} at ${formatTimeSlots(recurrence.timeSlots)}`,
          icon: 'calendar-month'
        };
      case 'custom':
        return {
          title: 'Custom Schedule',
          subtitle: 'Custom cron expression',
          icon: 'calendar-clock'
        };
      default:
        return {
          title: 'Unknown',
          subtitle: 'Unknown frequency',
          icon: 'help-circle'
        };
    }
  };

  const formatTimeSlots = (timeSlots) => {
    if (!timeSlots || timeSlots.length === 0) return 'No time set';

    const formatTime = (hour, minute) => {
      const time = new Date();
      time.setHours(hour, minute);
      return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (timeSlots.length === 1) {
      return formatTime(timeSlots[0].hour, timeSlots[0].minute);
    } else {
      return `${timeSlots.length} times daily`;
    }
  };

  const getOrdinalSuffix = (number) => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const value = number % 100;
    return suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
  };

  const getContentTypeInfo = (content) => {
    switch (content?.type) {
      case 'ai-generated':
        return {
          title: 'AI-Generated Content',
          icon: 'robot',
          color: '#3498db',
          details: [
            { label: 'Topic', value: content.aiConfig?.topic || 'Not set' },
            { label: 'Tone', value: content.aiConfig?.tone || 'Not set' },
            { label: 'Length', value: content.aiConfig?.contentLength || 'Not set' },
            { label: 'Keywords', value: content.aiConfig?.keywords?.join(', ') || 'None' },
          ]
        };
      case 'template':
        return {
          title: 'Template-based',
          icon: 'file-document-outline',
          color: '#e67e22',
          details: [
            { label: 'Template', value: content.template ? 'Custom template set' : 'Not set' }
          ]
        };
      case 'predefined':
        return {
          title: 'Predefined Content Pool',
          icon: 'playlist-check',
          color: '#9b59b6',
          details: [
            { label: 'Content Items', value: content.contentPool?.length || 0 },
            { label: 'Rotation', value: content.rotation || 'sequential' }
          ]
        };
      default:
        return {
          title: 'Unknown Type',
          icon: 'help-circle',
          color: '#95a5a6',
          details: []
        };
    }
  };

  const getStatusInfo = (isActive) => {
    return {
      text: isActive ? 'Active' : 'Paused',
      color: isActive ? '#27ae60' : '#e74c3c',
      icon: isActive ? 'play-circle' : 'pause-circle',
      bgColor: isActive ? '#d5f4e6' : '#ffebee'
    };
  };

  const getNextExecutionText = (nextExecution) => {
    if (!nextExecution) return 'Not scheduled';

    const now = new Date();
    const next = new Date(nextExecution);
    const diffInMinutes = Math.ceil((next - now) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Very soon';
    } else if (diffInMinutes < 60) {
      return `In ${diffInMinutes} minutes`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.ceil(diffInMinutes / 60);
      return `In ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.ceil(diffInMinutes / 1440);
      return `In ${days} day${days > 1 ? 's' : ''}`;
    }
  };

  if (scheduleLoading) {
    return (
      <View style={styles.container}>
        <Header isBack={true} title="Workflow Details" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading workflow details...</Text>
        </View>
      </View>
    );
  }

  if (scheduleError || !schedule) {
    return (
      <View style={styles.container}>
        <Header isBack={true} title="Workflow Details" />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color="#e74c3c" />
          <Text style={styles.errorText}>Failed to load workflow details</Text>
          <Button mode="contained" onPress={() => refetchSchedule()}>
            Retry
          </Button>
        </View>
      </View>
    );
  }

  const frequencyInfo = getFrequencyDisplay(schedule.recurrence);
  const contentInfo = getContentTypeInfo(schedule.content);
  const statusInfo = getStatusInfo(schedule.isActive);

  return (
    <View style={styles.container}>
      <Header isBack={true} title="Workflow Details" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <Card.Content style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View style={styles.headerInfo}>
                <Text style={styles.workflowName} numberOfLines={2}>
                  {schedule.name}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                  <Icon name={statusInfo.icon} size={16} color={statusInfo.color} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>
                    {statusInfo.text}
                  </Text>
                </View>
              </View>

              <View style={styles.headerActions}>
                <IconButton
                  icon="pencil"
                  size={24}
                  iconColor={theme.colors.primary}
                  onPress={handleEditSchedule}
                />
                <IconButton
                  icon={schedule.isActive ? 'pause' : 'play'}
                  size={24}
                  iconColor={schedule.isActive ? '#e74c3c' : '#27ae60'}
                  onPress={handleToggleSchedule}
                  disabled={togglingSchedule}
                />
              </View>
            </View>

            {schedule.description && (
              <Text style={styles.workflowDescription}>
                {schedule.description}
              </Text>
            )}

            <View style={styles.quickStats}>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatNumber}>
                  {schedule.stats?.totalExecutions || 0}
                </Text>
                <Text style={styles.quickStatLabel}>Total Posts</Text>
              </View>
              <View style={styles.quickStat}>
                <Text style={[styles.quickStatNumber, { color: '#27ae60' }]}>
                  {schedule.stats?.successfulExecutions || 0}
                </Text>
                <Text style={styles.quickStatLabel}>Successful</Text>
              </View>
              <View style={styles.quickStat}>
                <Text style={[styles.quickStatNumber, { color: '#e74c3c' }]}>
                  {schedule.stats?.failedExecutions || 0}
                </Text>
                <Text style={styles.quickStatLabel}>Failed</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Schedule Information */}
        <Card style={styles.infoCard}>
          <Card.Content style={styles.infoContent}>
            <Text style={styles.sectionTitle}>Schedule Information</Text>

            <View style={styles.infoRow}>
              <Icon name={frequencyInfo.icon} size={20} color={theme.colors.primary} />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>{frequencyInfo.title}</Text>
                <Text style={styles.infoSubtitle}>{frequencyInfo.subtitle}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Icon name="clock-outline" size={20} color={theme.colors.primary} />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Next Execution</Text>
                <Text style={styles.infoSubtitle}>
                  {getNextExecutionText(schedule.nextExecution)}
                  {schedule.nextExecution && (
                    <Text style={styles.exactTime}>
                      {'\n'}{new Date(schedule.nextExecution).toLocaleString()}
                    </Text>
                  )}
                </Text>
              </View>
            </View>

            {schedule.lastExecution && (
              <View style={styles.infoRow}>
                <Icon name="clock-check" size={20} color="#666" />
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Last Execution</Text>
                  <Text style={styles.infoSubtitle}>
                    {new Date(schedule.lastExecution).toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <Icon name="calendar-range" size={20} color={theme.colors.primary} />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Created</Text>
                <Text style={styles.infoSubtitle}>
                  {new Date(schedule.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Content Configuration */}
        <Card style={styles.infoCard}>
          <Card.Content style={styles.infoContent}>
            <View style={styles.sectionHeader}>
              <Icon name={contentInfo.icon} size={24} color={contentInfo.color} />
              <Text style={styles.sectionTitle}>{contentInfo.title}</Text>
            </View>

            {contentInfo.details.map((detail, index) => (
              <View key={index} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{detail.label}:</Text>
                <Text style={styles.detailValue}>{detail.value}</Text>
              </View>
            ))}

            {schedule.content?.aiConfig?.includeHashtags && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Hashtags:</Text>
                <Text style={styles.detailValue}>
                  Up to {schedule.content.aiConfig.maxHashtags} hashtags
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Target Platforms */}
        <Card style={styles.infoCard}>
          <Card.Content style={styles.infoContent}>
            <Text style={styles.sectionTitle}>Target Platforms</Text>
            <View style={styles.platformsGrid}>
              {schedule.targetPlatforms.map((platform, index) => (
                <View key={index} style={[
                  styles.platformCard,
                  { opacity: platform.isActive ? 1 : 0.5 }
                ]}>
                  <Icon
                    name={platform.platform}
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.platformName}>{platform.accountName}</Text>
                  {!platform.isActive && (
                    <Chip compact mode="outlined" textStyle={{ fontSize: 10 }}>
                      Inactive
                    </Chip>
                  )}
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Limits and Constraints */}
        {schedule.limits && (schedule.limits.maxExecutions || schedule.limits.endDate) && (
          <Card style={styles.infoCard}>
            <Card.Content style={styles.infoContent}>
              <Text style={styles.sectionTitle}>Limits & Constraints</Text>

              {schedule.limits.maxExecutions && (
                <View style={styles.limitRow}>
                  <Icon name="counter" size={20} color="#666" />
                  <Text style={styles.limitText}>
                    Maximum executions: {schedule.limits.maxExecutions}
                  </Text>
                </View>
              )}

              {schedule.limits.endDate && (
                <View style={styles.limitRow}>
                  <Icon name="calendar-end" size={20} color="#666" />
                  <Text style={styles.limitText}>
                    End date: {new Date(schedule.limits.endDate).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Error Information */}
        {schedule.lastError && (
          <Card style={[styles.infoCard, styles.errorCard]}>
            <Card.Content style={styles.infoContent}>
              <View style={styles.errorHeader}>
                <Icon name="alert-circle" size={20} color="#e74c3c" />
                <Text style={[styles.sectionTitle, { color: '#e74c3c' }]}>
                  Recent Error
                </Text>
              </View>
              <Text style={styles.errorMessage}>{schedule.lastError}</Text>
              <Text style={styles.errorCount}>
                Error count: {schedule.errorCount}
              </Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <Button
          mode="outlined"
          onPress={handleTestSchedule}
          disabled={testingSchedule}
          style={styles.actionButton}
          loading={testingSchedule}
          icon="play-circle-outline"
        >
          Test Run
        </Button>

        <Button
          mode="contained"
          onPress={handleToggleSchedule}
          disabled={togglingSchedule}
          style={[styles.actionButton, {
            backgroundColor: schedule.isActive ? '#e74c3c' : '#27ae60'
          }]}
          loading={togglingSchedule}
          icon={schedule.isActive ? 'pause' : 'play'}
        >
          {schedule.isActive ? 'Pause' : 'Activate'}
        </Button>

        <Button
          mode="outlined"
          onPress={handleDuplicateSchedule}
          disabled={duplicatingSchedule}
          style={styles.actionButton}
          loading={duplicatingSchedule}
          icon="content-duplicate"
        >
          Duplicate
        </Button>

        <Button
          mode="contained"
          onPress={handleDeleteSchedule}
          disabled={deletingSchedule}
          style={[styles.actionButton, styles.deleteButton]}
          loading={deletingSchedule}
          icon="delete"
          buttonColor="#e74c3c"
        >
          Delete
        </Button>
      </View>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginVertical: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  headerContent: {
    paddingVertical: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  workflowName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  headerActions: {
    flexDirection: 'row',
  },
  workflowDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  infoCard: {
    marginBottom: 16,
    borderRadius: 12,
  },
  infoContent: {
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoText: {
    marginLeft: 12,
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  infoSubtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  exactTime: {
    fontSize: 12,
    color: '#999',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 2,
    textAlign: 'right',
  },
  platformsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  platformCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    margin: 4,
    minWidth: (width - 80) / 3,
  },
  platformName: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  limitText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#e74c3c',
    backgroundColor: '#fff5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorCount: {
    fontSize: 12,
    color: '#999',
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e6ed',
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
});

export default ScheduleDetails;