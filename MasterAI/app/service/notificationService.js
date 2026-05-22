// services/PushNotificationService.js
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid } from 'react-native';
import * as Notifications from 'expo-notifications';
import { API_URL } from '../features/api/globalApiSlice';
import apiconstant from '../Constant/apiconstant';
import tokenManager from '../utils/tokenManager';

// ── Notification categories (must be registered before any notification fires) ──
export const registerNotificationCategories = async () => {
  await Notifications.setNotificationCategoryAsync('post_approval', [
    {
      identifier: 'approve_and_share',
      buttonTitle: 'Approve & Share',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'dismiss',
      buttonTitle: 'Dismiss',
      options: { opensAppToForeground: false, isDestructive: true },
    },
  ]);
};

// ── Show a local notification from FCM data payload ──────────────────────────
export const showLocalNotificationFromData = async (data) => {
  try {
    const { type, title, body, postId, imageUrl, deepLink } = data || {};
    if (!type || !title) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type, postId, deepLink, imageUrl },
        categoryIdentifier: type === 'post_approval' ? 'post_approval' : undefined,
        sound: 'default',
        ...(imageUrl ? { attachments: [{ url: imageUrl }] } : {}),
      },
      trigger: null, // fire immediately
    });
  } catch (err) {
    console.warn('[showLocalNotification] error:', err.message);
  }
};

export const RNPushService  = {
  // Request permission for notifications
  requestPermission:  async () => {
    try {
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('Authorization status:', authStatus);
        }
        return enabled;
      } else {
        // Android 13+ requires runtime permission
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
      }
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  },

  // Get FCM token
  getToken: async () => {
    try {
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        console.log('=== FCM TOKEN ===');
        console.log('Full FCM Token:', fcmToken);
        console.log('FCM Token (first 50 chars):', fcmToken.substring(0, 50) + '...');
        console.log('Platform:', Platform.OS);
        console.log('================');

        // Store locally first
        await AsyncStorage.setItem('fcmToken', fcmToken);

        // Then save to database
        await RNPushService.saveTokenToDatabase(fcmToken);
        return fcmToken;
      } else {
        console.log('⚠️ No FCM token available - Google Play Services might not be available');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);

      // Provide helpful error messages based on error type
      if (error.message.includes('SERVICE_NOT_AVAILABLE')) {
        console.log('💡 FCM SERVICE_NOT_AVAILABLE - This is common in emulators without Google Play Services');
        console.log('📱 Push notifications will work on real devices with Google Play Services');
        console.log('🔧 For testing: Use a real device or enable Google Play Services in emulator');
      }

      return null;
    }
  },

  // Save FCM token to backend
  saveTokenToDatabase: async (fcmToken) => {
    try {
      console.log('Saving FCM token to database...');

      // Initialize token manager to get auth token
      await tokenManager.initialize();
      const authToken = tokenManager.getToken();

      if (!authToken) {
        console.log('No auth token available, FCM token will be registered when user logs in');
        return;
      }

      console.log('Auth token available, registering FCM token with backend');

      // Send FCM token to backend
      const response = await fetch(API_URL + 'auth/fcm/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'authorization': `Bearer ${authToken}`,
          'apiKey': apiconstant.masterAiKey
        },
        body: JSON.stringify({
          fcmToken: fcmToken,
          platform: Platform.OS,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('FCM token registered successfully');
      } else {
        console.error('Failed to register FCM token:', result.message);
      }

      return result;
    } catch (error) {
      console.error('Error saving FCM token to database:', error);
    }
  },

  // Listen for token refresh
  onTokenRefresh: () => {
    return messaging().onTokenRefresh(fcmToken => {
      console.log('=== FCM TOKEN REFRESHED ===');
      console.log('New FCM Token:', fcmToken);
      console.log('=========================');

      // Store new token locally
      AsyncStorage.setItem('fcmToken', fcmToken);

      // Save new token to database
      RNPushService.saveTokenToDatabase(fcmToken);
    });
  }
,
  // Handle foreground messages — show local notification with action buttons
  onMessage: () => {
    return messaging().onMessage(async remoteMessage => {
      console.log('Foreground message received:', remoteMessage);
      if (remoteMessage?.data) {
        await showLocalNotificationFromData(remoteMessage.data);
      }
    });
  },


  // Handle background messages (data-only FCM → local notification with action buttons)
  setBackgroundMessageHandler: () => {
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Background message:', remoteMessage);
      if (remoteMessage?.data) {
        await showLocalNotificationFromData(remoteMessage.data);
      }
    });
  },
  // Handle notification open events
  handleNotificationOpen:async ()=> {
    // When app is opened from a notification (killed state)
    const initialNotification = await messaging().getInitialNotification();
    if (initialNotification) {
      console.log('App opened from killed state:', initialNotification);
      this.handleNotificationNavigation(initialNotification);
    }

    // When app is opened from a notification (background state)
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('App opened from background:', remoteMessage);
      this.handleNotificationNavigation(remoteMessage);
    });
  },

  // Navigate based on notification data
  handleNotificationNavigation:(remoteMessage)=> {
    const { data } = remoteMessage;

    console.log('=== NOTIFICATION NAVIGATION ===');
    console.log('Notification data:', data);
    console.log('Notification type:', data?.type);
    console.log('================================');

    if (!data) return;

    // Import navigation reference (will be set up in main app)
    const { navigationRef } = require('../navigation/navigationRef');

    switch (data.type) {
      case 'post_approval':
        // Navigate to post approval screen with post ID
        if (data.postId && navigationRef?.isReady()) {
          console.log(`📱 Navigating to ApprovePost screen for post: ${data.postId}`);
          navigationRef.navigate('ApprovePost', {
            postId: data.postId,
            fromNotification: true
          });
        } else {
          console.warn('❌ Cannot navigate: navigationRef not ready or postId missing');
        }
        break;

      case 'post_status':
        // Navigate to post details or posts list
        if (data.postId && navigationRef?.isReady()) {
          console.log(`📱 Navigating to PostDetailsList for post: ${data.postId}`);
          navigationRef.navigate('PostDetailsList', {
            postId: data.postId,
            fromNotification: true
          });
        }
        break;

      case 'credit_warning':
        // Navigate to credits screen
        if (navigationRef?.isReady()) {
          console.log('📱 Navigating to Credits screen');
          navigationRef.navigate('Credits');
        }
        break;

      case 'daily_summary':
        // Navigate to pending posts
        if (navigationRef?.isReady()) {
          console.log('📱 Navigating to PendingPosts screen');
          navigationRef.navigate('PendingPosts');
        }
        break;

      case 'video_generation_started':
        // Navigate to MyVideos screen to show the video being generated
        if (navigationRef?.isReady()) {
          console.log(`📱 Navigating to MyVideos screen for video: ${data.videoId}`);
          navigationRef.navigate('MyVideos', {
            videoId: data.videoId,
            fromNotification: true,
            highlight: true
          });
        }
        break;

      case 'video_generation_progress':
        // Navigate to MyVideos screen to show progress
        if (navigationRef?.isReady()) {
          console.log(`📱 Navigating to MyVideos screen for video progress: ${data.videoId}`);
          navigationRef.navigate('MyVideos', {
            videoId: data.videoId,
            fromNotification: true,
            showProgress: true
          });
        }
        break;

      case 'video_generation_completed':
        // Navigate to video details or MyVideos to show completed video
        if (data.videoId && navigationRef?.isReady()) {
          console.log(`📱 Navigating to video details for completed video: ${data.videoId}`);
          navigationRef.navigate('MyVideos', {
            videoId: data.videoId,
            fromNotification: true,
            autoPlay: true
          });
        }
        break;

      case 'video_generation_failed':
        // Navigate to video generation screen to retry
        if (navigationRef?.isReady()) {
          console.log(`📱 Navigating to VideoGenerationScreen for retry: ${data.videoId}`);
          navigationRef.navigate('VideoGenerationScreen', {
            retryVideoId: data.videoId,
            fromNotification: true,
            errorMessage: data.error
          });
        }
        break;

      default:
        console.log(`⚠️ Unknown notification type: ${data.type}`);
        // For unknown types, try to use the screen parameter directly
        if (data.screen && navigationRef?.isReady()) {
          navigationRef.navigate(data.screen, data.params);
        }
        break;
    }
  },

  // Initialize notification channels for Android
  initializeNotificationChannels: () => {
    try {
      const PushNotification = require('react-native-push-notification');

      // Configure PushNotification
      PushNotification.configure({
        // Called when a remote or local notification is opened or received
        onNotification: function (notification) {
          console.log('📱 PushNotification received:', notification);

          // Handle action button presses
          if (notification.action) {
            RNPushService.handleNotificationAction(notification);
          } else if (notification.userInteraction) {
            // User tapped the notification
            RNPushService.handleNotificationTap(notification);
          }

          // Required on iOS for localNotification
          notification.finish && notification.finish();
        },

        // iOS specific
        onRegistrationError: function(err) {
          console.error('Push notification registration error:', err);
        },

        // Should the initial notification be popped automatically
        popInitialNotification: true,

        // Request permissions
        requestPermissions: true,
      });

      // Create notification channels
      const channels = [
        {
          channelId: 'default',
          channelName: 'Default Notifications',
          channelDescription: 'Default notifications from Master AI',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        {
          channelId: 'post_approval',
          channelName: 'Post Approvals',
          channelDescription: 'Notifications for post approval requests',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        {
          channelId: 'post_status',
          channelName: 'Post Status',
          channelDescription: 'Notifications for post status updates',
          playSound: true,
          soundName: 'default',
          importance: 3,
          vibrate: false,
        },
        {
          channelId: 'credit_warnings',
          channelName: 'Credit Warnings',
          channelDescription: 'Notifications for credit usage warnings',
          playSound: true,
          soundName: 'default',
          importance: 3,
          vibrate: false,
        },
        {
          channelId: 'video_generation',
          channelName: 'Video Generation',
          channelDescription: 'AI video generation status updates',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
      ];

      channels.forEach(channel => {
        PushNotification.createChannel(
          channel,
          (created) => console.log(`📋 Channel '${channel.channelId}' created: ${created}`)
        );
      });

      console.log('✅ Notification channels initialized');
    } catch (error) {
      console.error('❌ Error initializing notification channels:', error);
    }
  },

  // Handle notification action button presses
  handleNotificationAction: (notification) => {
    console.log('🔘 Notification action pressed:', notification.action);
    console.log('📋 Notification data:', notification.data || notification.userInfo);

    const data = notification.data || notification.userInfo || {};

    switch (notification.action) {
      case 'approve_and_share':
        if (data.type === 'post_approval' && data.postId) {
          console.log('✅ Approve and Share action - navigating to approval screen');
          RNPushService.handleNotificationNavigation({
            data: {
              ...data,
              action: 'approve_and_share'
            }
          });
        }
        break;

      case 'dismiss':
        console.log('❌ Dismiss action - notification dismissed');
        // Just dismiss, no navigation needed
        break;

      default:
        console.log('⚠️ Unknown notification action:', notification.action);
        break;
    }
  },

  // Handle notification tap (not action button)
  handleNotificationTap: (notification) => {
    console.log('👆 Notification tapped:', notification);

    const data = notification.data || notification.userInfo || {};

    if (data.type) {
      RNPushService.handleNotificationNavigation({ data });
    }
  },

  // Initialize all listeners (blocking - for backward compatibility)
  initialize: async () => {
    console.log('Initializing push notification service...');

    try {
      // Initialize notification channels first
      RNPushService.initializeNotificationChannels();

      const hasPermission = await RNPushService.requestPermission();
      console.log('Permission granted:', hasPermission);

      if (hasPermission) {
        // Get FCM token
        await RNPushService.getToken();

        // Set up listeners
        RNPushService.onTokenRefresh();
        RNPushService.onMessage();
        RNPushService.setBackgroundMessageHandler();
        RNPushService.handleNotificationOpen();

        console.log('Push notification service initialized successfully');
      } else {
        console.log('Push notification permission denied');
      }
    } catch (error) {
      console.error('Error initializing push notification service:', error);
    }
  },

  // Non-blocking async initialization for performance optimization
  initializeAsync: async () => {
    if (__DEV__) console.log('🚀 Starting async push notification initialization...');

    try {
      // Initialize notification channels (fast, non-blocking)
      RNPushService.initializeNotificationChannels();

      // Request permission in background
      const hasPermission = await RNPushService.requestPermission();
      if (__DEV__) console.log('🔔 Permission granted:', hasPermission);

      if (hasPermission) {
        // Get FCM token asynchronously
        RNPushService.getToken().catch(err => {
          if (__DEV__) console.log('⚠️ FCM token will be retried later:', err);
        });

        // Set up listeners (these are fast)
        RNPushService.onTokenRefresh();
        RNPushService.onMessage();
        RNPushService.setBackgroundMessageHandler();
        RNPushService.handleNotificationOpen();

        if (__DEV__) console.log('✅ Push notification service initialized successfully (async)');
      } else {
        if (__DEV__) console.log('❌ Push notification permission denied');
      }
    } catch (error) {
      if (__DEV__) console.error('❌ Error in async push notification initialization:', error);
      throw error;
    }
  }
,
  // Register FCM token after user login
  registerTokenAfterLogin: async () => {
    try {
      console.log('Registering FCM token after login...');

      // Get stored FCM token
      const fcmToken = await AsyncStorage.getItem('fcmToken');

      if (fcmToken) {
        console.log('Found stored FCM token, registering with backend...');
        await RNPushService.saveTokenToDatabase(fcmToken);
      } else {
        console.log('No stored FCM token found, getting new token...');
        await RNPushService.getToken();
      }
    } catch (error) {
      console.error('Error registering FCM token after login:', error);
    }
  },

  // Get current FCM token (utility function)
  getCurrentToken: async () => {
    try {
      return await AsyncStorage.getItem('fcmToken');
    } catch (error) {
      console.error('Error getting current FCM token:', error);
      return null;
    }
  },

  // Show local notification when app is in foreground
  showLocalNotification: (remoteMessage) => {
    try {
      console.log('📱 Showing local notification for foreground message:', remoteMessage);

      const { notification, data } = remoteMessage;

      if (!notification) {
        console.log('⚠️ No notification payload, skipping local notification');
        return;
      }

      // Import notification library
      const PushNotification = require('react-native-push-notification');

      // Configure notification channels if not already done
      PushNotification.createChannel(
        {
          channelId: data?.channelId || 'default',
          channelName: 'Default notifications',
          channelDescription: 'A default channel for notifications',
          playSound: true,
          soundName: 'default',
          importance: 4,
          vibrate: true,
        },
        (created) => console.log(`Notification channel created: ${created}`)
      );

      // Build notification options
      const notificationOptions = {
        channelId: data?.channelId || 'default',
        title: notification.title || 'Master AI',
        message: notification.body || '',
        playSound: true,
        soundName: 'default',
        importance: 'high',
        priority: 'high',
        visibility: 'public',
        autoCancel: true,
        largeIcon: 'ic_launcher',
        smallIcon: 'ic_notification',
        bigText: notification.body,
        subText: 'Master AI',
        vibrate: true,
        vibration: 300,
        tag: data?.type || 'general',
        group: 'master_ai_group',
        userInfo: data || {},
      };

      // Add image if available
      if (notification.imageUrl) {
        notificationOptions.bigPictureUrl = notification.imageUrl;
        notificationOptions.largeIconUrl = notification.imageUrl;
        console.log('🖼️ Added image to local notification:', notification.imageUrl);
      }

      // Add action buttons if it's an approval notification
      if (data?.type === 'post_approval') {
        notificationOptions.actions = ['approve_and_share', 'dismiss'];
        notificationOptions.actionText = {
          approve_and_share: 'Approve and Share',
          dismiss: 'Cancel'
        };
        console.log('🔘 Added action buttons to approval notification');
      }

      // Show the local notification
      PushNotification.localNotification(notificationOptions);

      console.log('✅ Local notification displayed successfully');
    } catch (error) {
      console.error('❌ Error showing local notification:', error);
    }
  },

  // Clean up listeners
  unsubscribe: () => {
    // Store unsubscribe functions and call them here
    console.log('Unsubscribing from push notification listeners');
  }
}

// Named-export aliases expected by bottomTabs.jsx
export const getFCMToken = () => RNPushService.getToken();
export const registerAppWithFCM = () => RNPushService.initializeAsync();

