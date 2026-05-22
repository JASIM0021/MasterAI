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
          <View style={styles.rewardCard}>
            <LinearGradient
              colors={['#6c47ff', '#a78bfa']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.rewardGradient}
            >
              {/* Decorative circles */}
              <View style={styles.rewardCircle1} />
              <View style={styles.rewardCircle2} />

              <View style={styles.rewardTop}>
                <View style={styles.rewardIconBox}>
                  <MaterialCommunityIcons name="play-circle" size={26} color="#6c47ff" />
                </View>
                <View style={styles.rewardMeta}>
                  <Text style={styles.rewardTitle}>Watch & Earn</Text>
                  <Text style={styles.rewardSubtitle}>Free credits, instantly</Text>
                </View>
                <View style={styles.rewardBadge}>
                  <Text style={styles.rewardBadgeText}>+5</Text>
                  <Text style={styles.rewardBadgeLabel}>per ad</Text>
                </View>
              </View>

              <Text style={styles.rewardDesc}>
                Watch a short video and earn 5 credits immediately. No daily cap — watch as many as you like!
              </Text>

              <RewardedAdButton
                source="profile"
                size="medium"
                variant="outline"
                textColor="white"
                onAdCompleted={handleAdCompleted}
                style={styles.rewardBtn}
              />
            </LinearGradient>
          </View>
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
  rewardCard: {
    marginTop: 12,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#6c47ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  rewardGradient: {
    padding: 20,
    overflow: 'hidden',
  },
  rewardCircle1: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -30,
    right: -20,
  },
  rewardCircle2: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: 10,
    left: -15,
  },
  rewardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rewardIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardMeta: {
    flex: 1,
    marginLeft: 12,
  },
  rewardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: 'white',
  },
  rewardSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  rewardBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  rewardBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
  },
  rewardBadgeLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  rewardDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 19,
    marginBottom: 16,
  },
  rewardBtn: {
    borderColor: 'white',
    borderWidth: 1.5,
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