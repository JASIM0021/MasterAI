const EmailService = require('./emailService');
const PushNotificationService = require('./pushNotificationService');

class NotificationService {
  constructor() {
    // Initialize individual services
    this.emailService = new EmailService();
    this.pushService = new PushNotificationService();

    // Base URL for approval links
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  /**
   * Send email notification for post approval
   * @param {Object} user - User object
   * @param {Object} post - Post object with approval token
   */
  async sendApprovalEmail(user, post) {
    try {
      return await this.emailService.sendApprovalEmail(user, post);
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }

  /**
   * Send push notification for post approval
   * @param {Object} user - User object
   * @param {Object} post - Post object
   */
  async sendApprovalPushNotification(user, post) {
    try {
      return await this.pushService.sendApprovalNotification(user, post);
    } catch (error) {
      console.error('Push notification error:', error);
      throw error;
    }
  }

  /**
   * Send summary email with multiple pending posts
   * @param {Object} user - User object
   * @param {Array} posts - Array of pending posts
   */
  async sendPendingPostsSummaryEmail(user, posts) {
    try {
      if (!posts || posts.length === 0) {
        return null;
      }

      return await this.emailService.sendBatchSummaryEmail(user, posts);
    } catch (error) {
      console.error('Summary email send error:', error);
      throw error;
    }
  }



  /**
   * Send batch notifications for multiple users
   */
  async sendBatchNotifications() {
    try {
      const Post = require('../models/Post');
      const User = require('../models/User');

      // Find posts that need notifications
      const postsNeedingNotification = await Post.findNeedingNotification()
        .populate('userId', 'name email')
        .limit(50); // Process in batches

      if (postsNeedingNotification.length === 0) {
        console.log('No posts need notifications');
        return { sent: 0 };
      }

      let sent = 0;
      const errors = [];

      for (const post of postsNeedingNotification) {
        try {
          const user = post.userId;

          // Send email notification
          await this.sendApprovalEmail(user, post);

          // Send push notification
          await this.sendApprovalPushNotification(user, post);

          // Mark notification as sent
          await post.markNotificationSent('both');

          sent++;
        } catch (error) {
          errors.push(`Post ${post._id}: ${error.message}`);
          console.error(`Failed to send notification for post ${post._id}:`, error);
        }
      }

      console.log(`Sent ${sent} notifications, ${errors.length} failed`);
      return { sent, errors };
    } catch (error) {
      console.error('Batch notifications error:', error);
      throw error;
    }
  }

  /**
   * Send daily summary to users with pending posts
   */
  async sendDailySummaries() {
    try {
      const Post = require('../models/Post');
      const User = require('../models/User');

      // Find users with pending posts older than 2 hours
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

      const usersWithPending = await Post.aggregate([
        {
          $match: {
            'approval.status': 'pending',
            'approval.notificationSent': true,
            'approval.notificationSentAt': { $lt: twoHoursAgo }
          }
        },
        {
          $group: {
            _id: '$userId',
            posts: { $push: '$$ROOT' },
            count: { $sum: 1 }
          }
        },
        {
          $match: {
            count: { $gte: 1 }
          }
        }
      ]);

      let sent = 0;

      for (const userGroup of usersWithPending) {
        try {
          const user = await User.findById(userGroup._id);
          if (!user || !user.email) continue;

          await this.sendPendingPostsSummaryEmail(user, userGroup.posts);
          sent++;
        } catch (error) {
          console.error(`Failed to send summary to user ${userGroup._id}:`, error);
        }
      }

      console.log(`Sent ${sent} daily summaries`);
      return { sent };
    } catch (error) {
      console.error('Daily summaries error:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;