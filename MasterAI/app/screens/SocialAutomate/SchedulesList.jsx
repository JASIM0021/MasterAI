import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Text,
  useTheme,
  IconButton,
  Button,
  Snackbar,
  ActivityIndicator,
  Menu,
  Chip,
  Searchbar,
  FAB,
} from 'react-native-paper';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../../Components/header/Header';
import ScheduleCard from './components/ScheduleCard';
import {
  useFetchSchedulesQuery,
  useDeleteScheduleMutation,
  useToggleScheduleMutation,
} from '../../features/api/schedulesApiSlice';
import { selectIsAuthenticated } from '../../features/auth/authSlice';

const SchedulesList = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Component state
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  // Bulk selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedScheduleIds, setSelectedScheduleIds] = useState(new Set());
  const [bulkOperationsLoading, setBulkOperationsLoading] = useState(false);

  // RTK Query hooks
  const {
    data: schedulesData,
    isLoading: schedulesLoading,
    isError: schedulesError,
    refetch: refetchSchedules
  } = useFetchSchedulesQuery(
    {
      status: statusFilter !== 'all' ? statusFilter : undefined,
      limit: 50
    },
    { skip: !isAuthenticated }
  );

  const [deleteSchedule, { isLoading: deletingSchedule }] = useDeleteScheduleMutation();
  const [toggleSchedule, { isLoading: togglingSchedule }] = useToggleScheduleMutation();

  // Derived data
  const schedules = schedulesData?.schedules || [];
  const filteredSchedules = schedules.filter(schedule => {
    if (searchQuery.trim()) {
      return schedule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             schedule.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
             schedule.content?.aiConfig?.topic?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const statusOptions = [
    { value: 'all', label: 'All Workflows', icon: 'view-list', count: schedules.length },
    { value: 'active', label: 'Active', icon: 'play', count: schedules.filter(s => s.isActive).length },
    { value: 'paused', label: 'Paused', icon: 'pause', count: schedules.filter(s => !s.isActive).length },
  ];

  const handleSchedulePress = (schedule) => {
    navigation.navigate('ScheduleDetails', { scheduleId: schedule.id });
  };

  const handleEditSchedule = (schedule) => {
    navigation.navigate('EditAutomation', {
      scheduleId: schedule.id,
      schedule: schedule
    });
  };

  const handleToggleSchedule = async (schedule) => {
    try {
      await toggleSchedule(schedule.id).unwrap();
      setSnackbarMessage(
        `Workflow ${schedule.isActive ? 'paused' : 'activated'} successfully`
      );
      setSnackbarVisible(true);
      refetchSchedules();
    } catch (error) {
      console.error('Failed to toggle schedule:', error);
      setSnackbarMessage('Failed to update workflow. Please try again.');
      setSnackbarVisible(true);
    }
  };

  const handleDeleteSchedule = async (schedule) => {
    const executionCount = schedule.stats?.totalExecutions || 0;
    const isActive = schedule.isActive;
    const frequency = getFrequencyDisplay(schedule.recurrence);

    Alert.alert(
      'Delete Workflow',
      `Are you sure you want to delete "${schedule.name}"?\n\n` +
      `📊 Details:\n` +
      `• Status: ${isActive ? '🟢 Active' : '⏸️ Paused'}\n` +
      `• Frequency: ${frequency}\n` +
      `• Total executions: ${executionCount}\n` +
      `• Created: ${new Date(schedule.createdAt).toLocaleDateString()}\n\n` +
      `⚠️ This action will:\n` +
      `• Stop all future executions\n` +
      `• Remove the automation permanently\n` +
      `• Restore 1 automation credit to your account\n\n` +
      `This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteSchedule(schedule.id).unwrap();

              // Show enhanced success message with credit restoration info
              const creditInfo = result.creditInfo;
              const creditMessage = creditInfo
                ? ` You now have ${creditInfo.available} automation credits available.`
                : '';

              setSnackbarMessage(`Workflow deleted successfully.${creditMessage}`);
              setSnackbarVisible(true);
              refetchSchedules();
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

  const handleScheduleLongPress = (schedule) => {
    if (selectionMode) {
      // If already in selection mode, toggle the selection
      toggleScheduleSelection(schedule.id);
    } else {
      // Start selection mode and select this schedule
      setSelectionMode(true);
      setSelectedScheduleIds(new Set([schedule.id]));
    }
  };

  const toggleScheduleSelection = (scheduleId) => {
    const newSelection = new Set(selectedScheduleIds);
    if (newSelection.has(scheduleId)) {
      newSelection.delete(scheduleId);
    } else {
      newSelection.add(scheduleId);
    }
    setSelectedScheduleIds(newSelection);

    // Exit selection mode if no items are selected
    if (newSelection.size === 0) {
      setSelectionMode(false);
    }
  };

  const selectAllSchedules = () => {
    const allIds = new Set(filteredSchedules.map(s => s.id));
    setSelectedScheduleIds(allIds);
  };

  const clearSelection = () => {
    setSelectedScheduleIds(new Set());
    setSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    const selectedSchedules = filteredSchedules.filter(s => selectedScheduleIds.has(s.id));
    const scheduleNames = selectedSchedules.map(s => s.name).join(', ');

    Alert.alert(
      'Delete Multiple Workflows',
      `Are you sure you want to delete ${selectedScheduleIds.size} workflows?\n\n${scheduleNames}\n\nThis action cannot be undone and will stop all future executions.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setBulkOperationsLoading(true);
            let successCount = 0;
            let errorCount = 0;

            try {
              // Delete schedules one by one
              for (const scheduleId of selectedScheduleIds) {
                try {
                  await deleteSchedule(scheduleId).unwrap();
                  successCount++;
                } catch (error) {
                  console.error(`Failed to delete schedule ${scheduleId}:`, error);
                  errorCount++;
                }
              }

              // Show result message
              if (errorCount === 0) {
                setSnackbarMessage(`Successfully deleted ${successCount} workflows`);
              } else {
                setSnackbarMessage(`Deleted ${successCount} workflows, ${errorCount} failed`);
              }
              setSnackbarVisible(true);

              // Clear selection and refresh
              clearSelection();
              refetchSchedules();
            } catch (error) {
              console.error('Bulk delete error:', error);
              setSnackbarMessage('Failed to delete workflows. Please try again.');
              setSnackbarVisible(true);
            } finally {
              setBulkOperationsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleBulkToggle = async (activate) => {
    const selectedSchedules = filteredSchedules.filter(s => selectedScheduleIds.has(s.id));
    const action = activate ? 'activate' : 'pause';

    Alert.alert(
      `${activate ? 'Activate' : 'Pause'} Multiple Workflows`,
      `${action} ${selectedScheduleIds.size} selected workflows?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: activate ? 'Activate All' : 'Pause All',
          onPress: async () => {
            setBulkOperationsLoading(true);
            let successCount = 0;
            let errorCount = 0;

            try {
              for (const schedule of selectedSchedules) {
                // Only toggle if the schedule's current state is different from target
                if (schedule.isActive !== activate) {
                  try {
                    await toggleSchedule(schedule.id).unwrap();
                    successCount++;
                  } catch (error) {
                    console.error(`Failed to toggle schedule ${schedule.id}:`, error);
                    errorCount++;
                  }
                }
              }

              // Show result message
              if (errorCount === 0) {
                setSnackbarMessage(`Successfully ${action}d ${successCount} workflows`);
              } else {
                setSnackbarMessage(`${action}d ${successCount} workflows, ${errorCount} failed`);
              }
              setSnackbarVisible(true);

              // Clear selection and refresh
              clearSelection();
              refetchSchedules();
            } catch (error) {
              console.error('Bulk toggle error:', error);
              setSnackbarMessage(`Failed to ${action} workflows. Please try again.`);
              setSnackbarVisible(true);
            } finally {
              setBulkOperationsLoading(false);
            }
          },
        },
      ]
    );
  };

  const getFrequencyDisplay = (recurrence) => {
    if (recurrence?.minuteInterval) {
      return `Every ${recurrence.minuteInterval} min`;
    }

    switch (recurrence?.frequency) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
      case 'custom':
        return 'Custom';
      default:
        return 'Unknown';
    }
  };

  const renderScheduleItem = ({ item: schedule }) => {
    const isSelected = selectedScheduleIds.has(schedule.id);

    return (
      <View style={[
        styles.scheduleWrapper,
        selectionMode && styles.scheduleWrapperSelection,
        isSelected && styles.scheduleWrapperSelected
      ]}>
        {/* Selection Checkbox */}
        {selectionMode && (
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => toggleScheduleSelection(schedule.id)}
          >
            <View style={[
              styles.checkboxInner,
              isSelected && styles.checkboxSelected
            ]}>
              {isSelected && (
                <Icon name="check" size={16} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
        )}

        <ScheduleCard
          schedule={schedule}
          onPress={() => {
            if (selectionMode) {
              toggleScheduleSelection(schedule.id);
            } else {
              handleSchedulePress(schedule);
            }
          }}
          onLongPress={() => handleScheduleLongPress(schedule)}
          style={selectionMode ? styles.scheduleCardSelection : undefined}
        />

        {/* Action Buttons Overlay - hidden in selection mode */}
        {!selectionMode && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditSchedule(schedule)}
            >
              <Icon name="pencil" size={16} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.toggleButton, {
                backgroundColor: schedule.isActive ? '#e74c3c' : '#27ae60'
              }]}
              onPress={() => handleToggleSchedule(schedule)}
              disabled={togglingSchedule}
            >
              <Icon
                name={togglingSchedule ? 'loading' : (schedule.isActive ? 'pause' : 'play')}
                size={16}
                color="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteSchedule(schedule)}
              disabled={deletingSchedule}
            >
              <Icon name="delete" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderFilterItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.filterChip,
        statusFilter === item.value && styles.filterChipActive
      ]}
      onPress={() => {
        setStatusFilter(item.value);
        setShowFilterMenu(false);
      }}
    >
      <Icon
        name={item.icon}
        size={16}
        color={statusFilter === item.value ? '#fff' : theme.colors.primary}
      />
      <Text style={[
        styles.filterChipText,
        statusFilter === item.value && styles.filterChipTextActive
      ]}>
        {item.label} ({item.count})
      </Text>
    </TouchableOpacity>
  );

  if (schedulesLoading) {
    return (
      <View style={styles.container}>
        <Header isBack={true} title="Automation Workflows" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading workflows...</Text>
        </View>
      </View>
    );
  }

  if (schedulesError) {
    return (
      <View style={styles.container}>
        <Header isBack={true} title="Automation Workflows" />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color="#e74c3c" />
          <Text style={styles.errorText}>Failed to load workflows</Text>
          <Button mode="contained" onPress={() => refetchSchedules()}>
            Retry
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header isBack={true} title="Automation Workflows" />

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search workflows..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchBar}
        />

        <Menu
          visible={showFilterMenu}
          onDismiss={() => setShowFilterMenu(false)}
          anchor={
            <IconButton
              icon="filter-variant"
              iconColor={theme.colors.primary}
              size={24}
              onPress={() => setShowFilterMenu(true)}
            />
          }
        >
          {statusOptions.map((option) => (
            <Menu.Item
              key={option.value}
              onPress={() => {
                setStatusFilter(option.value);
                setShowFilterMenu(false);
              }}
              title={`${option.label} (${option.count})`}
              leadingIcon={option.icon}
              titleStyle={statusFilter === option.value ? { color: theme.colors.primary } : {}}
            />
          ))}
        </Menu>
      </View>

      {/* Filter Chips */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={statusOptions}
          renderItem={renderFilterItem}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      {/* Bulk Action Bar */}
      {selectionMode && (
        <View style={styles.bulkActionBar}>
          <View style={styles.bulkActionLeft}>
            <Text style={styles.bulkActionText}>
              {selectedScheduleIds.size} selected
            </Text>
            <TouchableOpacity onPress={selectAllSchedules}>
              <Text style={styles.selectAllText}>Select All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bulkActionButtons}>
            <IconButton
              icon="play"
              iconColor="#27ae60"
              size={20}
              onPress={() => handleBulkToggle(true)}
              disabled={bulkOperationsLoading}
            />
            <IconButton
              icon="pause"
              iconColor="#e74c3c"
              size={20}
              onPress={() => handleBulkToggle(false)}
              disabled={bulkOperationsLoading}
            />
            <IconButton
              icon="delete"
              iconColor="#e74c3c"
              size={20}
              onPress={handleBulkDelete}
              disabled={bulkOperationsLoading}
            />
            <IconButton
              icon="close"
              iconColor="#666"
              size={20}
              onPress={clearSelection}
            />
          </View>
        </View>
      )}

      {filteredSchedules.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="robot" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No matching workflows' : 'No automation workflows'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Try adjusting your search criteria'
              : 'Create your first automation workflow to start generating content automatically'
            }
          </Text>
          {!searchQuery && (
            <Button
              mode="contained"
              onPress={() => navigation.navigate('CreateAutomation')}
              style={styles.createButton}
            >
              Create First Workflow
            </Button>
          )}
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {filteredSchedules.length} workflow{filteredSchedules.length !== 1 ? 's' : ''}
              {statusFilter !== 'all' && ` • ${statusOptions.find(o => o.value === statusFilter)?.label}`}
            </Text>
          </View>

          <FlatList
            data={filteredSchedules}
            renderItem={renderScheduleItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={schedulesLoading}
                onRefresh={refetchSchedules}
              />
            }
          />
        </>
      )}

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        label="New Workflow"
        onPress={() => navigation.navigate('CreateAutomation')}
      />

      {/* Action Menu */}
      <Menu
        visible={showActionMenu}
        onDismiss={() => setShowActionMenu(false)}
        anchor={{ x: 0, y: 0 }}
      >
        <Menu.Item
          onPress={() => {
            setShowActionMenu(false);
            if (selectedSchedule) {
              handleEditSchedule(selectedSchedule);
            }
          }}
          title="Edit Workflow"
          leadingIcon="pencil"
        />
        <Menu.Item
          onPress={() => {
            setShowActionMenu(false);
            if (selectedSchedule) {
              handleToggleSchedule(selectedSchedule);
            }
          }}
          title={selectedSchedule?.isActive ? "Pause Workflow" : "Activate Workflow"}
          leadingIcon={selectedSchedule?.isActive ? "pause" : "play"}
        />
        <Menu.Item
          onPress={() => {
            setShowActionMenu(false);
            if (selectedSchedule) {
              handleDeleteSchedule(selectedSchedule);
            }
          }}
          title="Delete Workflow"
          leadingIcon="delete"
          titleStyle={{ color: '#e74c3c' }}
        />
      </Menu>

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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  createButton: {
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e6ed',
  },
  searchBar: {
    flex: 1,
    marginRight: 8,
    elevation: 0,
    backgroundColor: '#f5f7fa',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e6ed',
  },
  filtersContent: {
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f7fa',
    borderWidth: 1,
    borderColor: '#e0e6ed',
  },
  filterChipActive: {
    backgroundColor: '#6200ee',
    borderColor: '#6200ee',
  },
  filterChipText: {
    fontSize: 12,
    marginLeft: 6,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e6ed',
  },
  headerText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Space for FAB
  },
  scheduleWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  actionButtons: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  editButton: {
    backgroundColor: '#3498db',
  },
  toggleButton: {
    // backgroundColor set dynamically
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  // Bulk selection styles
  scheduleWrapperSelection: {
    paddingLeft: 50, // Space for checkbox
  },
  scheduleWrapperSelected: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  scheduleCardSelection: {
    marginLeft: 8,
  },
  checkbox: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: [{ translateY: -12 }],
    zIndex: 10,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2196f3',
    borderColor: '#2196f3',
  },
  bulkActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bulkActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulkActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 16,
  },
  selectAllText: {
    fontSize: 14,
    color: '#2196f3',
    fontWeight: '500',
  },
  bulkActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default SchedulesList;