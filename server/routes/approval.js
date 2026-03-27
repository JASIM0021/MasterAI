const express = require('express');
const Post = require('../models/Post');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');
const SocialMediaSharingService = require('../services/socialMediaSharingService');

const router = express.Router();
const sharingService = new SocialMediaSharingService();

// GET PENDING POSTS FOR APPROVAL
router.get('/pending/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const pendingPosts = await Post.findPendingApproval(userId);

    res.json({
      success: true,
      posts: pendingPosts.map(post => ({
        id: post._id,
        content: post.content,
        media: post.media,
        aiGeneration: post.aiGeneration,
        approval: {
          status: post.approval.status,
          approvalToken: post.approval.approvalToken,
          approvalTokenExpiresAt: post.approval.approvalTokenExpiresAt
        },
        createdAt: post.createdAt
      })),
      totalPending: pendingPosts.length
    });
  } catch (error) {
    console.error('Get pending posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending posts'
    });
  }
});

// APPROVE POST BY TOKEN (for email links and deep links)
router.get('/approve/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { action, redirect } = req.query; // 'approve' or 'reject', redirect='app' for mobile

    const post = await Post.findOne({
      'approval.approvalToken': token,
      'approval.approvalTokenExpiresAt': { $gt: new Date() },
      'approval.status': 'pending'
    });

    if (!post) {
      // If redirect=app, redirect to mobile app with error
      if (redirect === 'app') {
        return res.redirect(`https://masterai.fun/app/error?message=Invalid+or+expired+approval+token`);
      }

      return res.status(404).json({
        success: false,
        message: 'Invalid or expired approval token'
      });
    }

    if (action === 'approve') {
      await post.approvePost();

      // Generate social sharing URLs
      const sharingData = sharingService.generateSharingData(post);

      // If redirect=app, redirect to mobile app with sharing data
      if (redirect === 'app') {
        return res.redirect(`https://masterai.fun/app/share?status=approved&postId=${post._id}`);
      }

      res.json({
        success: true,
        message: 'Post approved successfully',
        action: 'share',
        post: {
          id: post._id,
          content: post.content,
          media: post.media,
          sharingData: sharingData
        }
      });
    } else if (action === 'reject') {
      await post.rejectPost('Rejected via email link');

      // If redirect=app, redirect to mobile app pending screen
      if (redirect === 'app') {
        return res.redirect(`https://masterai.fun/app/pending?status=rejected&postId=${post._id}`);
      }

      res.json({
        success: true,
        message: 'Post rejected successfully'
      });
    } else {
      // If redirect=app, redirect to mobile app approval screen
      if (redirect === 'app') {
        return res.redirect(`https://masterai.fun/app/approval?token=${token}&postId=${post._id}`);
      }

      // Show approval page with options
      res.json({
        success: true,
        post: {
          id: post._id,
          content: post.content,
          media: post.media,
          aiGeneration: post.aiGeneration,
          approvalOptions: {
            approveUrl: `/api/approval/approve/${token}?action=approve`,
            rejectUrl: `/api/approval/approve/${token}?action=reject`
          }
        }
      });
    }
  } catch (error) {
    console.error('Approve post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process approval'
    });
  }
});

// APPROVE POST BY POST ID (simplified route for frontend compatibility)
router.post('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, action, rejectionReason } = req.body;

    const post = await Post.findOne({
      _id: postId,
      userId: userId,
      'approval.status': 'pending'
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or already processed'
      });
    }

    if (action === 'approve') {
      await post.approvePost();

      // Generate social sharing URLs
      const sharingData = sharingService.generateSharingData(post);

      res.json({
        success: true,
        message: 'Post approved successfully',
        action: 'share',
        post: {
          id: post._id,
          content: post.content,
          media: post.media,
          sharingData: sharingData
        }
      });
    } else if (action === 'reject') {
      await post.rejectPost(rejectionReason || 'Rejected by user');

      res.json({
        success: true,
        message: 'Post rejected successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "approve" or "reject"'
      });
    }
  } catch (error) {
    console.error('Approve post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process approval'
    });
  }
});

// APPROVE POST BY POST ID (for app)
router.post('/approve-post/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, action, rejectionReason } = req.body;

    const post = await Post.findOne({
      _id: postId,
      userId: userId,
      'approval.status': 'pending'
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or already processed'
      });
    }

    if (action === 'approve') {
      await post.approvePost();

      // Generate social sharing URLs
      const sharingData = sharingService.generateSharingData(post);

      res.json({
        success: true,
        message: 'Post approved successfully',
        action: 'share',
        post: {
          id: post._id,
          content: post.content,
          media: post.media,
          sharingData: sharingData
        }
      });
    } else if (action === 'reject') {
      await post.rejectPost(rejectionReason || 'Rejected by user');

      res.json({
        success: true,
        message: 'Post rejected successfully'
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "approve" or "reject"'
      });
    }
  } catch (error) {
    console.error('Approve post by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process approval'
    });
  }
});

// GET APPROVAL STATISTICS
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = '30d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }

    const [pending, approved, rejected] = await Promise.all([
      Post.countDocuments({
        userId,
        'approval.status': 'pending',
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      Post.countDocuments({
        userId,
        'approval.status': 'approved',
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      Post.countDocuments({
        userId,
        'approval.status': 'rejected',
        createdAt: { $gte: startDate, $lte: endDate }
      })
    ]);

    const total = pending + approved + rejected;
    const approvalRate = total > 0 ? (approved / total * 100).toFixed(1) : 0;

    res.json({
      success: true,
      stats: {
        period,
        total,
        pending,
        approved,
        rejected,
        approvalRate: parseFloat(approvalRate)
      }
    });
  } catch (error) {
    console.error('Get approval stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval statistics'
    });
  }
});

// BATCH APPROVE/REJECT POSTS
router.post('/batch', async (req, res) => {
  try {
    const { userId, postIds, action, rejectionReason } = req.body;

    if (!postIds || !Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Post IDs array is required'
      });
    }

    const posts = await Post.find({
      _id: { $in: postIds },
      userId: userId,
      'approval.status': 'pending'
    });

    if (posts.length !== postIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some posts not found or already processed'
      });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const post of posts) {
      try {
        if (action === 'approve') {
          await post.approvePost();
        } else if (action === 'reject') {
          await post.rejectPost(rejectionReason || 'Batch rejection');
        }
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Post ${post._id}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Batch ${action} completed`,
      results
    });
  } catch (error) {
    console.error('Batch approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batch approval'
    });
  }
});

// RESEND NOTIFICATION FOR POST
router.post('/resend-notification/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, notificationType = 'both' } = req.body;

    const post = await Post.findOne({
      _id: postId,
      userId: userId,
      'approval.status': 'pending'
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or not pending approval'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new approval token if expired
    if (!post.approval.approvalToken ||
        new Date() > post.approval.approvalTokenExpiresAt) {
      await post.generateApprovalToken();
    }

    // Send notification
    const notificationService = new NotificationService();

    if (notificationType === 'email' || notificationType === 'both') {
      await notificationService.sendApprovalEmail(user, post);
    }

    if (notificationType === 'push' || notificationType === 'both') {
      await notificationService.sendApprovalPushNotification(user, post);
    }

    await post.markNotificationSent(notificationType);

    res.json({
      success: true,
      message: 'Notification sent successfully'
    });
  } catch (error) {
    console.error('Resend notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification'
    });
  }
});

// GET SHARING URLS FOR A POST
router.get('/sharing-urls/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { platforms } = req.query; // Optional: specific platforms

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Only allow sharing URLs for approved posts
    if (post.approval.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Post must be approved to generate sharing URLs'
      });
    }

    const requestedPlatforms = platforms
      ? platforms.split(',').map(p => p.trim())
      : ['facebook', 'instagram', 'twitter', 'linkedin'];

    const sharingData = sharingService.generateSharingData(post, requestedPlatforms);

    res.json({
      success: true,
      post: {
        id: post._id,
        content: post.content,
        media: post.media
      },
      sharingData: sharingData
    });
  } catch (error) {
    console.error('Get sharing URLs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate sharing URLs'
    });
  }
});

module.exports = router;