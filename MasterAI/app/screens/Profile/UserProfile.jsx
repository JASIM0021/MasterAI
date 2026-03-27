import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Avatar,
  Button,
  Divider,
  List,
  ProgressBar,
  useTheme,
  Surface,
  IconButton,
} from 'react-native-paper';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectCurrentUser,
  selectIsAuthenticated,
  logoutUser,
} from '../../features/auth/authSlice';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Header from '../../Components/header/Header';
import CreditDisplay from '../../Components/credits/CreditDisplay';
import RewardedAdButton from '../../Components/ads/RewardedAdButton';
import { AUTH_CONFIG } from '../../config/authConfig';
import { SCREEN_NAME } from '../../Constant';
import SimpleAuthPrompt from '../../Components/auth/SimpleAuthPrompt';
import { SafeScreen } from '../../Components/layout';

const { width } = Dimensions.get('window');

const UserProfile = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const isAuthenticated = useSelector(selectIsAuthenticated);
  const currentUser = useSelector(selectCurrentUser);

  const onRefresh = async () => {
    setRefreshing(true);
    // CreditDisplay component handles its own data fetching
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => dispatch(logoutUser()),
        },
      ]
    );
  };

  const handleUpgrade = () => {
    navigation.navigate(SCREEN_NAME.CreditPurchase);
  };

  const handleAdCompleted = (result) => {
    // Refresh credit display after successful ad completion
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  if (!isAuthenticated) {
    return (
      <SafeScreen edges={['bottom', 'left', 'right']}>
        <Header title="Profile" />
        <SimpleAuthPrompt
          customMessage="Sign in to view your profile, manage your account settings, and track your usage credits."
          onAuthSuccess={() => {
            // Profile will automatically re-render when auth state changes
            console.log('User successfully authenticated from profile screen');
          }}
        />
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edges={['bottom', 'left', 'right']}>
      <Header title="Profile" />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* User Info Card */}
        <Card style={styles.userCard}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.userCardGradient}
          >
            <View style={styles.userInfo}>
              <Avatar.Image
                size={80}
                source={{ uri: currentUser?.profilePicture || 'https://via.placeholder.com/80' }}
                style={styles.avatar}
              />
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{currentUser?.name}</Text>
                <Text style={styles.userEmail}>{currentUser?.email}</Text>
                <View style={styles.planBadge}>
                  <MaterialCommunityIcons
                    name={currentUser?.subscription?.plan === 'premium' ? 'crown' : 'account'}
                    size={16}
                    color="white"
                  />
                  <Text style={styles.planText}>
                    {currentUser?.subscription?.plan === 'premium' ? 'Premium' : 'Free Plan'}
                  </Text>
                </View>
              </View>
              <IconButton
                icon="logout"
                iconColor="white"
                size={24}
                onPress={handleLogout}
                style={styles.logoutButton}
              />
            </View>
          </LinearGradient>
        </Card>

        {/* Global Credits */}
        <View style={styles.creditsSection}>
          <Text style={styles.creditsSectionTitle}>Account Credits</Text>
          <CreditDisplay
            service="postGeneration"
            showUpgrade={currentUser?.subscription?.plan !== 'premium'}
            onUpgrade={handleUpgrade}
            style={styles.globalCreditDisplay}
          />

          {/* Earn Free Credits Section */}
          <Card style={styles.earnCreditsCard}>
            <Card.Content>
              <View style={styles.earnCreditsHeader}>
                <MaterialCommunityIcons
                  name="gift"
                  size={24}
                  color="#6366F1"
                />
                <Text style={styles.earnCreditsTitle}>Earn Free Credits</Text>
              </View>
              <Text style={styles.earnCreditsDescription}>
                Watch short video ads to earn credits instantly. No waiting, no limits!
              </Text>
              <View style={styles.rewardButtonContainer}>
                <RewardedAdButton
                  source="profile"
                  size="medium"
                  variant="primary"
                  onAdCompleted={handleAdCompleted}
                  style={styles.rewardButton}
                />
                <View style={styles.rewardInfo}>
                  <Text style={styles.rewardInfoText}>
                    +5 credits per ad
                  </Text>
                  <Text style={styles.rewardInfoSubtext}>
                    Watch as many as you want
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Account Info */}
        <Card style={styles.accountCard}>
          <Card.Content>
            <Text style={styles.accountTitle}>Account Information</Text>
            <Divider style={styles.divider} />

            <List.Item
              title="Sign-in Method"
              description={currentUser?.authProvider?.toUpperCase() || 'Unknown'}
              left={props => <List.Icon {...props} icon="login" />}
            />

            <List.Item
              title="Member Since"
              description={new Date(currentUser?.lastLogin).toLocaleDateString()}
              left={props => <List.Icon {...props} icon="calendar" />}
            />

            <List.Item
              title="Email Verified"
              description={currentUser?.emailVerified ? 'Verified' : 'Not Verified'}
              left={props => <List.Icon {...props} icon={currentUser?.emailVerified ? "check-circle" : "alert-circle"} />}
            />
          </Card.Content>
        </Card>

        {/* Actions */}
        <Card style={styles.actionsCard}>
          <Card.Content>
            <Text style={styles.actionsTitle}>Actions</Text>
            <Divider style={styles.divider} />

            <Button
              mode="outlined"
              onPress={() => navigation.navigate(SCREEN_NAME.MyVideos)}
              style={styles.actionButton}
              icon="video"
            >
              My Videos
            </Button>

            <Button
              mode="outlined"
              onPress={() => console.log('Navigate to settings')}
              style={styles.actionButton}
              icon="cog"
            >
              Settings
            </Button>

            <Button
              mode="outlined"
              onPress={() => console.log('Navigate to help')}
              style={styles.actionButton}
              icon="help-circle"
            >
              Help & Support
            </Button>

            <Button
              mode="contained"
              onPress={handleLogout}
              style={[styles.actionButton, styles.logoutActionButton]}
              buttonColor={theme.colors.error}
              icon="logout"
            >
              Logout
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  userCard: {
    marginBottom: 16,
    elevation: 4,
  },
  userCardGradient: {
    padding: 20,
    borderRadius: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 8,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  planText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  logoutButton: {
    margin: 0,
  },
  creditsSection: {
    marginBottom: 16,
  },
  creditsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
    color: '#333',
  },
  globalCreditDisplay: {
    marginHorizontal: 0,
  },
  earnCreditsCard: {
    marginTop: 12,
    elevation: 2,
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#e1e8ff',
  },
  earnCreditsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  earnCreditsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginLeft: 8,
  },
  earnCreditsDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  rewardButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardButton: {
    flex: 0,
    minWidth: 140,
  },
  rewardInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  rewardInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  rewardInfoSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    marginBottom: 16,
  },
  accountCard: {
    marginBottom: 16,
    elevation: 2,
  },
  accountTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  actionsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  actionButton: {
    marginBottom: 8,
  },
  logoutActionButton: {
    marginTop: 8,
  },
});

export default UserProfile;