import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch } from 'react-redux';
import { toggleSchedule } from '../../../features/social/schedulesSlice';

const ScheduleCard = ({ schedule, onPress }) => {
  const dispatch = useDispatch();
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    try {
      setIsToggling(true);
      await dispatch(toggleSchedule(schedule.id)).unwrap();
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle schedule');
    } finally {
      setIsToggling(false);
    }
  };

  const getFrequencyText = (recurrence) => {
    switch (recurrence.frequency) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        const days = recurrence.daysOfWeek?.map(day => {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return dayNames[day];
        }).join(', ');
        return `Weekly (${days})`;
      case 'monthly':
        return `Monthly (${recurrence.dayOfMonth}${getOrdinalSuffix(recurrence.dayOfMonth)})`;
      case 'custom':
        return 'Custom';
      default:
        return 'Unknown';
    }
  };

  const getOrdinalSuffix = (number) => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const value = number % 100;
    return suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0];
  };

  const getTimeText = (timeSlots) => {
    if (!timeSlots || timeSlots.length === 0) return '';

    const formatTime = (hour, minute) => {
      const time = new Date();
      time.setHours(hour, minute);
      return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (timeSlots.length === 1) {
      return formatTime(timeSlots[0].hour, timeSlots[0].minute);
    } else {
      return `${timeSlots.length} times`;
    }
  };

  const getNextExecutionText = (nextExecution) => {
    if (!nextExecution) return 'Not scheduled';

    const now = new Date();
    const next = new Date(nextExecution);
    const diffInHours = Math.ceil((next - now) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'In less than 1 hour';
    } else if (diffInHours < 24) {
      return `In ${diffInHours} hours`;
    } else {
      const diffInDays = Math.ceil(diffInHours / 24);
      return `In ${diffInDays} days`;
    }
  };

  const getContentTypeIcon = (contentType) => {
    switch (contentType) {
      case 'template':
        return 'file-document-outline';
      case 'ai-generated':
        return 'robot';
      case 'predefined':
        return 'playlist-check';
      default:
        return 'text';
    }
  };

  const getStatusColor = (isActive) => {
    return isActive ? '#27ae60' : '#95a5a6';
  };

  return (
    <TouchableOpacity
      style={[
        styles.scheduleCard,
        { borderLeftColor: getStatusColor(schedule.isActive) }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.scheduleName} numberOfLines={1}>
            {schedule.name}
          </Text>

          <View style={styles.statusRow}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: schedule.isActive ? '#d5f4e6' : '#f8f9fa' }
            ]}>
              <Icon
                name={schedule.isActive ? 'play' : 'pause'}
                size={12}
                color={getStatusColor(schedule.isActive)}
              />
              <Text style={[
                styles.statusText,
                { color: getStatusColor(schedule.isActive) }
              ]}>
                {schedule.isActive ? 'Active' : 'Paused'}
              </Text>
            </View>

            <View style={styles.contentTypeIcon}>
              <Icon
                name={getContentTypeIcon(schedule.content?.type)}
                size={14}
                color="#666"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.toggleButton}
          onPress={handleToggle}
          disabled={isToggling}
        >
          <Icon
            name={isToggling ? 'loading' : (schedule.isActive ? 'pause' : 'play')}
            size={20}
            color={getStatusColor(schedule.isActive)}
          />
        </TouchableOpacity>
      </View>

      {schedule.description && (
        <Text style={styles.description} numberOfLines={2}>
          {schedule.description}
        </Text>
      )}

      <View style={styles.scheduleDetails}>
        <View style={styles.detailRow}>
          <Icon name="clock-outline" size={16} color="#666" />
          <Text style={styles.detailText}>
            {getFrequencyText(schedule.recurrence)}
            {schedule.recurrence?.timeSlots && (
              <Text style={styles.timeText}>
                {' at '}
                {getTimeText(schedule.recurrence.timeSlots)}
              </Text>
            )}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Icon name="calendar-clock" size={16} color="#666" />
          <Text style={styles.detailText}>
            Next: {getNextExecutionText(schedule.nextExecution)}
          </Text>
        </View>
      </View>

      {/* Target Platforms */}
      {schedule.targetPlatforms && schedule.targetPlatforms.length > 0 && (
        <View style={styles.platformsSection}>
          <Text style={styles.platformsLabel}>Platforms:</Text>
          <View style={styles.platformsList}>
            {schedule.targetPlatforms.slice(0, 4).map((platform, index) => (
              <View key={index} style={styles.platformTag}>
                <Icon
                  name={platform.platform}
                  size={12}
                  color="#666"
                />
                <Text style={styles.platformName} numberOfLines={1}>
                  {platform.accountName}
                </Text>
              </View>
            ))}
            {schedule.targetPlatforms.length > 4 && (
              <Text style={styles.morePlatforms}>
                +{schedule.targetPlatforms.length - 4}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Stats */}
      {schedule.stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{schedule.stats.totalExecutions || 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#27ae60' }]}>
              {schedule.stats.successfulExecutions || 0}
            </Text>
            <Text style={styles.statLabel}>Success</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: '#e74c3c' }]}>
              {schedule.stats.failedExecutions || 0}
            </Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>

          {schedule.stats.averageEngagement > 0 && (
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#3498db' }]}>
                {Math.round(schedule.stats.averageEngagement)}
              </Text>
              <Text style={styles.statLabel}>Avg Engagement</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  scheduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  scheduleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 6,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '600',
  },
  contentTypeIcon: {
    padding: 4,
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 12,
    lineHeight: 20,
  },
  scheduleDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#5a6c7d',
    flex: 1,
  },
  timeText: {
    fontWeight: '600',
    color: '#2c3e50',
  },
  platformsSection: {
    marginBottom: 12,
  },
  platformsLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 6,
    fontWeight: '600',
  },
  platformsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  platformTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
    maxWidth: 120,
  },
  platformName: {
    marginLeft: 4,
    fontSize: 11,
    color: '#666',
    flex: 1,
  },
  morePlatforms: {
    fontSize: 11,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 11,
    color: '#95a5a6',
    marginTop: 2,
  },
});

export default ScheduleCard;