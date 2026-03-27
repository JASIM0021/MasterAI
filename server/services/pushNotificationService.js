const admin = require('firebase-admin');
const User = require('../models/User');
var serviceAccount = require("../firebase.json");
class PushNotificationService {
  constructor() {
    this.isInitialized = false;
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  initializeFirebase() {
    try {
      // Check if Firebase is already initialized
      if (admin.apps.length === 0) {


        if (serviceAccount) {

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: "https://masterai-28872-default-rtdb.firebaseio.com"
          });

          console.log('✅ Firebase Admin SDK initialized for push notifications');
        } else {
          console.log('⚠️ Firebase service account not configured - push notifications disabled');
          return;
        }
      }

      this.messaging = admin.messaging();
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
      this.isInitialized = false;
    }
  }

  /**
   * Send push notification for post approval
   */
  async sendApprovalNotification(user, post) {
    if (!this.isInitialized) {
      console.log('⚠️ Push notifications not available - Firebase not initialized');
      return { success: false, reason: 'Firebase not initialized' };
    }

    try {
      // Get user's device tokens (you'll need to store these when users log in)
      const deviceTokens = await this.getUserDeviceTokens(user._id);

      if (!deviceTokens || deviceTokens.length === 0) {
        console.log(`📱 No device tokens found for user: ${user.email}`);
        return { success: false, reason: 'No device tokens' };
      }

      const postPreview = this.truncateText(post.content.text, 100);

      const message = {
        notification: {
          title: 'Your post is ready to review',
          body: postPreview,
          imageUrl: post.media?.[0]?.url || null
        },
        data: {
          type: 'post_approval',
          postId: post._id.toString(),
          userId: user._id.toString(),
          approvalToken: post.approval?.approvalToken || '',
          screen: 'PostApproval',
          action: 'review_post',
          deepLink: `masterai://approval/${post._id.toString()}`,
          webLink: `${process.env.FRONTEND_URL}/approval/${post.approval?.approvalToken}`
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#667eea',
            channelId: 'post_approval',
            priority: 'high',
            defaultSound: true
          },
          data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            action_1: 'approve_and_share',
            action_1_title: 'Approve and Share',
            action_2: 'dismiss',
            action_2_title: 'Cancel'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              category: 'POST_APPROVAL',
              'thread-id': 'post_approval'
            }
          }
        },
        webpush: {
          notification: {
            icon: '/icons/notification-icon.png',
            badge: '/icons/badge-icon.png',
            actions: [
              {
                action: 'approve_and_share',
                title: 'Approve and Share',
                icon: '/icons/approve-icon.png'
              },
              {
                action: 'dismiss',
                title: 'Cancel',
                icon: '/icons/cancel-icon.png'
              }
            ]
          },
          fcmOptions: {
            link: `${process.env.FRONTEND_URL}/approval/${post.approval?.approvalToken}`
          }
        }
      };

      const results = [];

      // Send to all user devices
      for (const token of deviceTokens) {
        try {
          const result = await this.messaging.send({
            ...message,
            token: token
          });

          results.push({
            token: token.substring(0, 10) + '...',
            success: true,
            messageId: result
          });

          console.log(`📱 Push notification sent to device: ${token.substring(0, 10)}...`);
        } catch (error) {
          console.error(`❌ Failed to send to device ${token.substring(0, 10)}...:`, error.message);

          // Remove invalid tokens
          if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
            await this.removeDeviceToken(user._id, token);
          }

          results.push({
            token: token.substring(0, 10) + '...',
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      console.log(`📊 Push notification results: ${successCount}/${deviceTokens.length} successful`);

      return {
        success: successCount > 0,
        results: results,
        successCount: successCount,
        totalDevices: deviceTokens.length
      };
    } catch (error) {
      console.error('Push notification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification when post is approved/rejected
   */
  async sendStatusNotification(user, post, status, reason = null) {
    if (!this.isInitialized) {
      return { success: false, reason: 'Firebase not initialized' };
    }

    try {
      const deviceTokens = await this.getUserDeviceTokens(user._id);

      if (!deviceTokens || deviceTokens.length === 0) {
        return { success: false, reason: 'No device tokens' };
      }

      const isApproved = status === 'approved';
      const postPreview = this.truncateText(post.content.text, 80);

      const message = {
        notification: {
          title: `${isApproved ? '✅' : '❌'} Post ${status}`,
          body: isApproved
            ? `Your post is ready to publish: ${postPreview}`
            : `Post rejected: ${postPreview}${reason ? ` - ${reason}` : ''}`,
          imageUrl: post.media?.[0]?.url || null
        },
        data: {
          type: 'post_status',
          postId: post._id.toString(),
          userId: user._id.toString(),
          status: status,
          reason: reason || '',
          deepLink: `masterai://posts/${post._id}`,
          webLink: `${process.env.FRONTEND_URL}/posts/${post._id}`
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: isApproved ? '#28a745' : '#dc3545',
            channelId: 'post_status',
            priority: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              category: 'POST_STATUS'
            }
          }
        },
        webpush: {
          notification: {
            icon: isApproved ? '/icons/success-icon.png' : '/icons/error-icon.png'
          },
          fcmOptions: {
            link: `${process.env.FRONTEND_URL}/posts/${post._id}`
          }
        }
      };

      const results = [];

      for (const token of deviceTokens) {
        try {
          const result = await this.messaging.send({
            ...message,
            token: token
          });

          results.push({
            token: token.substring(0, 10) + '...',
            success: true,
            messageId: result
          });
        } catch (error) {
          if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
            await this.removeDeviceToken(user._id, token);
          }

          results.push({
            token: token.substring(0, 10) + '...',
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return {
        success: successCount > 0,
        results: results,
        successCount: successCount,
        totalDevices: deviceTokens.length
      };
    } catch (error) {
      console.error('Status notification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send credit warning notification
   */
  async sendCreditWarningNotification(user, creditInfo) {
    if (!this.isInitialized) {
      return { success: false, reason: 'Firebase not initialized' };
    }

    try {
      const deviceTokens = await this.getUserDeviceTokens(user._id);

      if (!deviceTokens || deviceTokens.length === 0) {
        return { success: false, reason: 'No device tokens' };
      }

      const usagePercentage = Math.round((creditInfo.used / creditInfo.total) * 100);

      const message = {
        notification: {
          title: '⚠️ Automation Credits Warning',
          body: `You've used ${usagePercentage}% of your automation credits (${creditInfo.used}/${creditInfo.total})`
        },
        data: {
          type: 'credit_warning',
          userId: user._id.toString(),
          usagePercentage: usagePercentage.toString(),
          used: creditInfo.used.toString(),
          total: creditInfo.total.toString(),
          deepLink: 'masterai://credits',
          webLink: `${process.env.FRONTEND_URL}/credits`
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#ffc107',
            channelId: 'credit_warnings'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              category: 'CREDIT_WARNING'
            }
          }
        },
        webpush: {
          notification: {
            icon: '/icons/warning-icon.png'
          },
          fcmOptions: {
            link: `${process.env.FRONTEND_URL}/credits`
          }
        }
      };

      const results = [];

      for (const token of deviceTokens) {
        try {
          const result = await this.messaging.send({
            ...message,
            token: token
          });

          results.push({
            token: token.substring(0, 10) + '...',
            success: true,
            messageId: result
          });
        } catch (error) {
          if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
            await this.removeDeviceToken(user._id, token);
          }

          results.push({
            token: token.substring(0, 10) + '...',
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return {
        success: successCount > 0,
        results: results,
        successCount: successCount,
        totalDevices: deviceTokens.length
      };
    } catch (error) {
      console.error('Credit warning notification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send batch summary notification
   */
  async sendBatchSummaryNotification(user, pendingCount, approvedCount, rejectedCount) {
    if (!this.isInitialized || pendingCount === 0) {
      return { success: false, reason: 'Nothing to notify' };
    }

    try {
      const deviceTokens = await this.getUserDeviceTokens(user._id);

      if (!deviceTokens || deviceTokens.length === 0) {
        return { success: false, reason: 'No device tokens' };
      }

      const message = {
        notification: {
          title: '📊 Daily Automation Summary',
          body: `${pendingCount} posts awaiting approval, ${approvedCount} approved, ${rejectedCount} rejected`
        },
        data: {
          type: 'daily_summary',
          userId: user._id.toString(),
          pendingCount: pendingCount.toString(),
          approvedCount: approvedCount.toString(),
          rejectedCount: rejectedCount.toString(),
          deepLink: 'masterai://posts/pending',
          webLink: `${process.env.FRONTEND_URL}/posts/pending`
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#667eea',
            channelId: 'daily_summary'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              category: 'DAILY_SUMMARY'
            }
          }
        },
        webpush: {
          notification: {
            icon: '/icons/summary-icon.png'
          },
          fcmOptions: {
            link: `${process.env.FRONTEND_URL}/posts/pending`
          }
        }
      };

      const results = [];

      for (const token of deviceTokens) {
        try {
          const result = await this.messaging.send({
            ...message,
            token: token
          });

          results.push({
            token: token.substring(0, 10) + '...',
            success: true,
            messageId: result
          });
        } catch (error) {
          if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
            await this.removeDeviceToken(user._id, token);
          }

          results.push({
            token: token.substring(0, 10) + '...',
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;

      return {
        success: successCount > 0,
        results: results,
        successCount: successCount,
        totalDevices: deviceTokens.length
      };
    } catch (error) {
      console.error('Batch summary notification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Register device token for user
   */
  async registerDeviceToken(userId, token, platform = 'unknown') {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Initialize deviceTokens array if it doesn't exist
      if (!user.deviceTokens) {
        user.deviceTokens = [];
      }

      // Remove existing token if it exists
      user.deviceTokens = user.deviceTokens.filter(t => t.token !== token);

      // Add new token
      user.deviceTokens.push({
        token: token,
        platform: platform,
        registeredAt: new Date(),
        lastUsed: new Date()
      });

      // Keep only the last 5 tokens per user
      if (user.deviceTokens.length > 5) {
        user.deviceTokens = user.deviceTokens
          .sort((a, b) => b.registeredAt - a.registeredAt)
          .slice(0, 5);
      }

      await user.save();

      console.log(`📱 Device token registered for user: ${user.email} (${platform})`);

      return { success: true, tokenCount: user.deviceTokens.length };
    } catch (error) {
      console.error('Error registering device token:', error);
      throw error;
    }
  }

  /**
   * Get user device tokens
   */
  async getUserDeviceTokens(userId) {
    try {
      const user = await User.findById(userId).select('deviceTokens');

      if (!user || !user.deviceTokens) {
        return [];
      }

      // Return only valid tokens (not older than 60 days)
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

      return user.deviceTokens
        .filter(t => t.registeredAt > sixtyDaysAgo)
        .map(t => t.token);
    } catch (error) {
      console.error('Error getting device tokens:', error);
      return [];
    }
  }

  /**
   * Remove invalid device token
   */
  async removeDeviceToken(userId, token) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.deviceTokens) {
        return;
      }

      user.deviceTokens = user.deviceTokens.filter(t => t.token !== token);
      await user.save();

      console.log(`🗑️ Removed invalid device token for user: ${userId}`);
    } catch (error) {
      console.error('Error removing device token:', error);
    }
  }

  /**
   * Test push notification
   */
  async testNotification(userId, title = 'Test Notification', body = 'This is a test notification from MasterAI') {
    if (!this.isInitialized) {
      throw new Error('Push notification service not initialized');
    }

    try {
      const deviceTokens = await this.getUserDeviceTokens(userId);

      if (!deviceTokens || deviceTokens.length === 0) {
        throw new Error('No device tokens found for user');
      }

      const message = {
        notification: {
          title: title,
          body: body
        },
        data: {
          type: 'test',
          timestamp: Date.now().toString()
        }
      };

      const results = [];

      for (const token of deviceTokens) {
        try {
          const result = await this.messaging.send({
            ...message,
            token: token
          });

          results.push({
            token: token.substring(0, 10) + '...',
            success: true,
            messageId: result
          });
        } catch (error) {
          results.push({
            token: token.substring(0, 10) + '...',
            success: false,
            error: error.message
          });
        }
      }

      return {
        success: results.some(r => r.success),
        results: results
      };
    } catch (error) {
      console.error('Test notification error:', error);
      throw error;
    }
  }

  /**
   * Utility function to truncate text
   */
  truncateText(text, maxLength) {
    if (!text) return '';

    // Handle case where text might be an object with original/processed properties
    if (typeof text === 'object' && text.original) {
      text = text.original;
    }

    // Ensure text is a string
    if (typeof text !== 'string') {
      text = String(text);
    }

    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  }

  /**
   * Send video generation started notification
   */
  async sendVideoGenerationStarted(user, video) {
    if (!this.isInitialized) {
      console.log('⚠️ Push notifications not available - Firebase not initialized');
      return { success: false, reason: 'Firebase not initialized' };
    }

    try {
      const deviceTokens = await this.getUserDeviceTokens(user._id);

      if (!deviceTokens || deviceTokens.length === 0) {
        console.log(`📱 No device tokens found for user: ${user.email}`);
        return { success: false, reason: 'No device tokens' };
      }

      const promptPreview = this.truncateText(video.prompt, 80);
      const estimatedTime = video.config?.model === 'standard' ? '5-10 minutes' : '2-3 minutes';

      const message = {
        notification: {
          title: '🎬 Video Generation Started',
          body: `"${promptPreview}" - Estimated time: ${estimatedTime}`
        },
        data: {
          type: 'video_generation_started',
          videoId: video._id.toString(),
          userId: user._id.toString(),
          prompt: video.prompt,
          estimatedTime: estimatedTime,
          screen: 'VideoDetails',
          deepLink: `masterai://videos/${video._id}`
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#667eea',
            channelId: 'video_generation',
            priority: 'default'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              category: 'VIDEO_GENERATION'
            }
          }
        }
      };

      return await this.sendToAllDevices(deviceTokens, message);
    } catch (error) {
      console.error('Video generation started notification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send video generation progress notification
   */
  async sendVideoGenerationProgress(user, video, progress, status) {
    if (!this.isInitialized) {
      return { success: false, reason: 'Firebase not initialized' };
    }

    try {
      const deviceTokens = await this.getUserDeviceTokens(user._id);

      if (!deviceTokens || deviceTokens.length === 0) {
        return { success: false, reason: 'No device tokens' };
      }

      const promptPreview = this.truncateText(video.prompt, 60);

      const message = {
        notification: {
          title: '🔄 Video Generation Progress',
          body: `"${promptPreview}" - ${Math.round(progress)}% complete`
        },
        data: {
          type: 'video_generation_progress',
          videoId: video._id.toString(),
          userId: user._id.toString(),
          progress: progress.toString(),
          status: status,
          screen: 'VideoDetails',
          deepLink: `masterai://videos/${video._id}`
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#ffc107',
            channelId: 'video_generation',
            priority: 'low',
            onlyAlertOnce: true
          }
        },
        apns: {
          payload: {
            aps: {
              sound: null, // Silent for progress updates
              category: 'VIDEO_GENERATION'
            }
          }
        }
      };

      return await this.sendToAllDevices(deviceTokens, message);
    } catch (error) {
      console.error('Video generation progress notification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send video generation completed notification
   */
  async sendVideoGenerationCompleted(user, video) {
    if (!this.isInitialized) {
      return { success: false, reason: 'Firebase not initialized' };
    }

    try {
      const deviceTokens = await this.getUserDeviceTokens(user._id);

      if (!deviceTokens || deviceTokens.length === 0) {
        return { success: false, reason: 'No device tokens' };
      }

      const promptPreview = this.truncateText(video.prompt, 80);
      const processingTime = video.processingTimeMs ?
        `Generated in ${Math.round(video.processingTimeMs / 1000)}s` :
        'Video is ready to view';

      const message = {
        notification: {
          title: '✅ Video Generation Complete!',
          body: `"${promptPreview}" - Tap to view your video`,
          imageUrl: video.thumbnail?.url || null
        },
        data: {
          type: 'video_generation_completed',
          videoId: video._id.toString(),
          userId: user._id.toString(),
          prompt: video.prompt,
          videoUrl: video.video?.url || '',
          thumbnailUrl: video.thumbnail?.url || '',
          processingTime: processingTime,
          screen: 'VideoDetails',
          action: 'view_video',
          deepLink: `masterai://videos/${video._id}`,
          webLink: `${process.env.FRONTEND_URL}/videos/${video._id}`
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#28a745',
            channelId: 'video_generation',
            priority: 'high',
            defaultSound: true
          },
          data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            action_1: 'view_video',
            action_1_title: 'View Video',
            action_2: 'share_video',
            action_2_title: 'Share'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              category: 'VIDEO_GENERATION_COMPLETE',
              'thread-id': 'video_generation'
            }
          }
        },
        webpush: {
          notification: {
            icon: '/icons/video-icon.png',
            image: video.thumbnail?.url || null
          },
          fcmOptions: {
            link: `${process.env.FRONTEND_URL}/videos/${video._id}`
          }
        }
      };

      return await this.sendToAllDevices(deviceTokens, message);
    } catch (error) {
      console.error('Video generation completed notification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send video generation failed notification
   */
  async sendVideoGenerationFailed(user, video, error) {
    if (!this.isInitialized) {
      return { success: false, reason: 'Firebase not initialized' };
    }

    try {
      const deviceTokens = await this.getUserDeviceTokens(user._id);

      if (!deviceTokens || deviceTokens.length === 0) {
        return { success: false, reason: 'No device tokens' };
      }

      const promptPreview = this.truncateText(video.prompt, 80);
      const errorMessage = error.message || 'Generation failed unexpectedly';

      const message = {
        notification: {
          title: '❌ Video Generation Failed',
          body: `"${promptPreview}" - ${errorMessage}. Tap to retry.`
        },
        data: {
          type: 'video_generation_failed',
          videoId: video._id.toString(),
          userId: user._id.toString(),
          prompt: video.prompt,
          error: errorMessage,
          screen: 'VideoGeneration',
          action: 'retry_generation',
          deepLink: `masterai://videos/generate?retry=${video._id}`
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#dc3545',
            channelId: 'video_generation',
            priority: 'high',
            defaultSound: true
          },
          data: {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            action_1: 'retry_generation',
            action_1_title: 'Retry',
            action_2: 'view_credits',
            action_2_title: 'Check Credits'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              category: 'VIDEO_GENERATION_FAILED',
              'thread-id': 'video_generation'
            }
          }
        },
        webpush: {
          notification: {
            icon: '/icons/error-icon.png'
          },
          fcmOptions: {
            link: `${process.env.FRONTEND_URL}/videos/generate`
          }
        }
      };

      return await this.sendToAllDevices(deviceTokens, message);
    } catch (error) {
      console.error('Video generation failed notification error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Helper method to send notifications to all user devices
   */
  async sendToAllDevices(deviceTokens, message) {
    const results = [];

    for (const token of deviceTokens) {
      try {
        const result = await this.messaging.send({
          ...message,
          token: token
        });

        results.push({
          token: token.substring(0, 10) + '...',
          success: true,
          messageId: result
        });
      } catch (error) {
        // Remove invalid tokens
        if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
          // Note: We'd need the userId here to remove the token
          console.log(`🗑️ Invalid token detected and should be removed: ${token.substring(0, 10)}...`);
        }

        results.push({
          token: token.substring(0, 10) + '...',
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return {
      success: successCount > 0,
      results: results,
      successCount: successCount,
      totalDevices: deviceTokens.length
    };
  }

  /**
   * Check if push notification service is ready
   */
  isReady() {
    return this.isInitialized;
  }
}

module.exports = PushNotificationService;