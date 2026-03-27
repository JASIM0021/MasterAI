import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { PermissionsAndroid } from 'react-native';
// Import RTK Query hooks
import {
  useFetchPostsQuery,
  useLazyFetchPostsQuery
} from '../../features/api/postsApiSlice';

import {
  useFetchSchedulesQuery,
  useLazyFetchSchedulesQuery
} from '../../features/api/schedulesApiSlice';


// Import auth selectors
import {
  selectIsAuthenticated,
  selectAuthLoading
} from '../../features/auth/authSlice';

import TabsBottom from '../TabsSwitch/TabsBottom';
import { SCREEN_NAME } from '../../Constant';

// Component imports
import PostStatsCard from './components/PostStatsCard';
import ScheduleCard from './components/ScheduleCard';
import ExecutionLimitsCard from './components/ExecutionLimitsCard';
import PendingPostPreview from './components/PendingPostPreview';
import CreditDebugInfo from './components/CreditDebugInfo';
import withAuthRequired from '../../Components/auth/withAuthRequired';

const SocialAutomate = () => {
  const navigation = useNavigation();

  // Component state
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('automations'); // automations, posts
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Auth selectors
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const authLoading = useSelector(selectAuthLoading);

  // RTK Query hooks - conditionally fetch data when authenticated
  const {
    data: postsData,
    isLoading: postsLoading,
    isError: postsError,
    refetch: refetchPosts
  } = useFetchPostsQuery(
    { page: 1, limit: 20 },
    { skip: !isAuthenticated || authLoading }
  );

  const {
    data: schedulesData,
    isLoading: schedulesLoading,
    isError: schedulesError,
    refetch: refetchSchedules
  } = useFetchSchedulesQuery(
    { page: 1, limit: 20 },
    { skip: !isAuthenticated || authLoading }
  );


  // Derived data from RTK Query responses
  const posts = postsData?.posts || [];
  const schedules = schedulesData?.schedules || [];

  // Derived computed values from posts
  const draftPosts = posts.filter(post => post.status === 'draft');
  const scheduledPosts = posts.filter(post => post.status === 'approved');
  const publishedPosts = posts.filter(post => post.status === 'published');
  const pendingPosts = posts.filter(post => post.status === 'pending_approval');

  // Derived computed values from schedules
  const activeSchedules = schedules.filter(schedule => schedule.isActive);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchPosts(),
        refetchSchedules()
      ]);
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
    setRefreshing(false);

    PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  };

  const handleCreateAutomation = () => {
    navigation.navigate('CreateAutomation');
  };

  const handleViewPendingPosts = () => {
    navigation.navigate('PendingPosts');
  };

  const handlePreviewPost = (post) => {
    setSelectedPost(post);
    setShowPreviewModal(true);
  };

  const handlePostApproved = (approvedPost) => {
    // Refresh data after approval
    refetchPosts();
    refetchSchedules();
  };

  const handleClosePreview = () => {
    setShowPreviewModal(false);
    setSelectedPost(null);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'automations':
        return renderAutomationsTab();
      case 'posts':
        return renderPostsTab();
      default:
        return renderAutomationsTab();
    }
  };

  const renderAutomationsTab = () => {
    if (schedulesLoading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading automations...</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Automation Overview */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Active Automations</Text>
          <Text style={styles.overviewNumber}>{activeSchedules.length}</Text>
          <Text style={styles.overviewSubtitle}>Running workflows</Text>
        </View>

        {/* Execution Limits */}
        <ExecutionLimitsCard
          isAuthenticated={isAuthenticated}
          authLoading={authLoading}
        />

        {/* Debug Info (only in development) */}
        <CreditDebugInfo
          isAuthenticated={isAuthenticated}
          authLoading={authLoading}
        />

        {/* How It Works */}
        <View style={styles.infoCard}>
          <Icon name="information" size={24} color="#3498db" style={styles.infoIcon} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How Social Automation Works</Text>
            <Text style={styles.infoText}>
              1. Create automation rules with topics and timing{'\n'}
              2. AI generates posts and images automatically{'\n'}
              3. Get notifications to approve content{'\n'}
              4. Share approved posts directly to platforms
            </Text>
          </View>
        </View>

        {/* Schedules List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Automations</Text>
          <TouchableOpacity onPress={() => navigation.navigate('SchedulesList')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {schedules.slice(0, 5).map(schedule => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            onPress={() => navigation.navigate('ScheduleDetails', { scheduleId: schedule.id })}
          />
        ))}

        {schedules.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="robot" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No automations yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first automation to start generating content
            </Text>
          </View>
        )}

        {/* Manage Automations Button - Only show if user has automations */}
        {schedules.length > 0 && (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => navigation.navigate('SchedulesList')}
          >
            <View style={styles.manageButtonContent}>
              <Icon name="cog" size={20} color="#6200ee" style={styles.manageButtonIcon} />
              <Text style={styles.manageButtonText}>Manage All Automations</Text>
              <Text style={styles.manageButtonSubtext}>Edit, delete, or configure your workflows</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#6200ee" />
          </TouchableOpacity>
        )}

        {/* Create Automation Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateAutomation}
        >
          <LinearGradient
            colors={['#00796b', '#48a999']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            <Icon name="plus" size={20} color="#ffffff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Create Automation</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  const renderPostsTab = () => {
    if (postsLoading && !refreshing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Post Stats */}
        <View style={styles.statsGrid}>
          {/* <PostStatsCard
            title="Draft Posts"
            count={draftPosts.length}
            color="#f39c12"
            icon="file-document-edit"
          /> */}
          <PostStatsCard
            title="Approved"
            count={scheduledPosts.length}
            color="#3498db"
            icon="clock"
            onPress={() => {
              navigation.navigate("PostsList", { statusFilter: 'approved' })
            }}
          />
          <PostStatsCard
            title="Pending"
            count={pendingPosts.length}
            color="#27ae6e"
            icon="check-circle"
            onPress={() => {
              navigation.navigate("PostsList", { statusFilter: 'pending_approval' })
            }}
          />
        </View>

        {/* Recent Posts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Posts</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PostsList')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {posts.slice(0, 5).map(post => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>
              <Text style={styles.postStatus}>{post.status.toUpperCase()}</Text>
              <Text style={styles.postDate}>
                {new Date(post.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <Text style={styles.postContent} numberOfLines={2}>
              {post.content.text}
            </Text>
            <View style={styles.postPlatforms}>
              {post.targetPlatforms.map((platform, index) => (
                <View key={index} style={styles.platformTag}>
                  <Icon
                    name={platform.platform}
                    size={16}
                    color="#666"
                  />
                  <Text style={styles.platformTagText}>{platform.accountName}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        {posts.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="post" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No posts yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first post to get started
            </Text>
          </View>
        )}

        {/* View Pending Posts Button */}
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleViewPendingPosts}
        >
          <LinearGradient
            colors={['#f39c12', '#e67e22']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientButton}
          >
            <Icon name="clock" size={20} color="#ffffff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>View Pending Posts</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    );
  };



  // Show loading when auth is still loading
  if (authLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#6200ee" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }



  return (
    <View style={styles.container}>
    
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social Automate</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SocialAnalytics')}>
          <Icon name="chart-line" size={24} color="#6200ee" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'automations' && styles.activeTab]}
          onPress={() => setActiveTab('automations')}
        >
          <Icon
            name="robot"
            size={20}
            color={activeTab === 'automations' ? '#6200ee' : '#666'}
          />
          <Text style={[
            styles.tabText,
            activeTab === 'automations' && styles.activeTabText
          ]}>
            Automations
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.activeTab]}
          onPress={() => setActiveTab('posts')}
        >
          <Icon
            name="post"
            size={20}
            color={activeTab === 'posts' ? '#6200ee' : '#666'}
          />
          <Text style={[
            styles.tabText,
            activeTab === 'posts' && styles.activeTabText
          ]}>
            Posts
          </Text>
        </TouchableOpacity>

      </View>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Pending Post Preview Modal */}
      <PendingPostPreview
        visible={showPreviewModal}
        post={selectedPost}
        onClose={handleClosePreview}
        onApproved={handlePostApproved}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e6ed',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e6ed',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6200ee',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#6200ee',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  overviewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    margin: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  overviewTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  overviewNumber: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 4,
  },
  overviewSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  platformSection: {
    marginBottom: 20,
  },
  platformHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  platformIcon: {
    marginRight: 12,
  },
  platformTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  accountCount: {
    fontSize: 14,
    color: '#666',
  },
  noAccountsCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  noAccountsText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  connectButton: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  connectButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  viewAllText: {
    fontSize: 14,
    color: '#6200ee',
    fontWeight: '600',
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  postStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
  },
  postDate: {
    fontSize: 12,
    color: '#666',
  },
  postContent: {
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 12,
    lineHeight: 22,
  },
  postPlatforms: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  platformTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  platformTagText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  connectAccountButton: {
    marginVertical: 20,
  },
  manageButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e1e8ed',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  manageButtonContent: {
    flex: 1,
  },
  manageButtonIcon: {
    marginBottom: 8,
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  manageButtonSubtext: {
    fontSize: 13,
    color: '#7f8c8d',
    lineHeight: 18,
  },
  createButton: {
    marginVertical: 20,
    marginBottom: 100, // Extra space for bottom navigation
  },
  gradientButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e3f2fd',
  },
  previewText: {
    fontSize: 12,
    color: '#3498db',
    marginLeft: 4,
    fontWeight: '600',
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e8f5e8',
  },
  approveText: {
    fontSize: 12,
    color: '#27ae60',
    marginLeft: 4,
    fontWeight: '600',
  },
  quickApproveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e8f5e8',
  },
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  aiIndicatorText: {
    fontSize: 11,
    color: '#6200ee',
    marginLeft: 4,
    fontWeight: '500',
  },
  contentTypeBadge: {
    backgroundColor: '#f3e5f5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  contentTypeText: {
    fontSize: 10,
    color: '#6200ee',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  mediaIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  mediaIndicatorText: {
    fontSize: 11,
    color: '#e67e22',
    marginLeft: 4,
    fontWeight: '500',
  },
});



// Export with authentication requirement
export default withAuthRequired(SocialAutomate, {
  message: "Sign in to create AI-powered SocialAutomate and grow your social media presence!",
  showModal: true,
});