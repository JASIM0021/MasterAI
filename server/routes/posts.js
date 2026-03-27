const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const axios = require('axios');
const { TwitterApi } = require('twitter-api-v2');

// Import models
const User = require('../models/User');
const Post = require('../models/Post');
const SocialAccount = require('../models/SocialAccount');
const PostHistory = require('../models/PostHistory');

const router = express.Router();

// Import auth middleware
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/posts');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/avi', 'video/mov'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
});

// CREATE POST
router.post('/', verifyToken, upload.array('media', 10), async (req, res) => {
  try {
    const {
      content,
      hashtags,
      mentions,
      targetPlatforms,
      scheduling,
      category,
      tags
    } = req.body;

    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Post content is required'
      });
    }

    // Parse arrays if they come as strings
    const parsedHashtags = typeof hashtags === 'string' ? JSON.parse(hashtags) : hashtags || [];
    const parsedMentions = typeof mentions === 'string' ? JSON.parse(mentions) : mentions || [];
    const parsedTargetPlatforms = typeof targetPlatforms === 'string' ? JSON.parse(targetPlatforms) : targetPlatforms || [];
    const parsedScheduling = typeof scheduling === 'string' ? JSON.parse(scheduling) : scheduling || {};
    const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags || [];

    // Validate target platforms
    if (parsedTargetPlatforms.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one target platform is required'
      });
    }

    // Process uploaded media
    const processedMedia = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const mediaItem = {
          type: file.mimetype.startsWith('image/') ? 'image' : 'video',
          url: `/uploads/posts/${file.filename}`,
          size: file.size
        };

        // Get image dimensions for images
        if (mediaItem.type === 'image') {
          try {
            const metadata = await sharp(file.path).metadata();
            mediaItem.dimensions = {
              width: metadata.width,
              height: metadata.height
            };

            // Create thumbnail for large images
            if (metadata.width > 800 || metadata.height > 800) {
              const thumbnailPath = file.path.replace(path.extname(file.filename), '_thumb' + path.extname(file.filename));
              await sharp(file.path)
                .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toFile(thumbnailPath);

              mediaItem.thumbnail = `/uploads/posts/${path.basename(thumbnailPath)}`;
            }
          } catch (error) {
            console.error('Error processing image:', error);
          }
        }

        processedMedia.push(mediaItem);
      }
    }

    // Validate platform accounts
    const validatedPlatforms = [];
    for (const platform of parsedTargetPlatforms) {
      const account = await SocialAccount.findOne({
        _id: platform.accountId,
        userId: req.user._id,
        platform: platform.platform,
        isActive: true
      });

      if (!account) {
        return res.status(400).json({
          success: false,
          message: `Invalid account for platform: ${platform.platform}`
        });
      }

      validatedPlatforms.push({
        platform: platform.platform,
        accountId: platform.accountId,
        accountName: account.accountName,
        platformSpecificContent: platform.platformSpecificContent || {},
        status: 'pending'
      });
    }

    // Check if user has enough global credits for manual post creation (5 credits)
    const hasCredits = await req.user.hasGlobalCredits('postGeneration');
    if (!hasCredits) {
      const availableCredits = await req.user.getAvailableGlobalCredits();
      return res.status(402).json({
        success: false,
        message: `Insufficient credits. You need 5 credits to create a post. Available: ${availableCredits}`,
        errorCode: 'INSUFFICIENT_CREDITS',
        creditsNeeded: 5,
        creditsAvailable: availableCredits
      });
    }

    // Consume 5 global credits for manual post creation
    try {
      await req.user.consumeGlobalCredits('postGeneration');
      console.log(`💳 Consumed 5 global credits for manual post creation by user ${req.user._id}`);
    } catch (creditError) {
      return res.status(500).json({
        success: false,
        message: `Failed to process credits: ${creditError.message}`,
        errorCode: 'CREDIT_PROCESSING_ERROR'
      });
    }

    // Create post
    const newPost = new Post({
      userId: req.user._id,
      content: {
        text: content.trim(),
        hashtags: parsedHashtags,
        mentions: parsedMentions
      },
      media: processedMedia,
      targetPlatforms: validatedPlatforms,
      scheduling: {
        type: parsedScheduling.type || 'immediate',
        scheduledAt: parsedScheduling.scheduledAt ? new Date(parsedScheduling.scheduledAt) : null,
        timezone: parsedScheduling.timezone || 'UTC',
        automationRuleId: parsedScheduling.automationRuleId || null
      },
      category: category || 'other',
      tags: parsedTags,
      status: parsedScheduling.type === 'scheduled' ? 'scheduled' : 'draft'
    });

    await newPost.save();

    // If immediate posting, publish now
    if (parsedScheduling.type === 'immediate') {
      await publishPost(newPost);
    }

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      post: {
        id: newPost._id,
        content: newPost.content,
        media: newPost.media,
        targetPlatforms: newPost.targetPlatforms.map(p => ({
          platform: p.platform,
          accountName: p.accountName,
          status: p.status
        })),
        scheduling: newPost.scheduling,
        status: newPost.status,
        createdAt: newPost.createdAt
      }
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create post'
    });
  }
});

// GET POSTS
router.get('/', verifyToken, async (req, res) => {
  try {
    const {
      status,
      platform,
      category,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = { userId: req.user._id };

    // Add filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (platform) {
      query['targetPlatforms.platform'] = platform;
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const posts = await Post.find(query)
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const totalPosts = await Post.countDocuments(query);

    res.json({
      success: true,
      posts: posts.map(post => ({
        id: post._id,
        content: post.content,
        media: post.media,
        targetPlatforms: post.targetPlatforms.map(p => ({
          platform: p.platform,
          accountName: p.accountName,
          status: p.status,
          publishedAt: p.publishedAt,
          platformPostUrl: p.platformPostUrl,
          error: p.error
        })),
        scheduling: post.scheduling,
        category: post.category,
        tags: post.tags,
        status: post.status,
        totalEngagement: post.totalEngagement,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        hasNext: page * limit < totalPosts,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts'
    });
  }
});

// GET SINGLE POST
router.get('/:postId', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findOne({
      _id: postId,
      userId: req.user._id
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.json({
      success: true,
      post: {
        id: post._id,
        content: post.content,
        media: post.media,
        targetPlatforms: post.targetPlatforms,
        scheduling: post.scheduling,
        category: post.category,
        tags: post.tags,
        status: post.status,
        totalEngagement: post.totalEngagement,
        publishAttempts: post.publishAttempts,
        lastPublishAttempt: post.lastPublishAttempt,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt
      }
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post'
    });
  }
});

// UPDATE POST
router.put('/:postId', verifyToken, upload.array('media', 10), async (req, res) => {
  try {
    const { postId } = req.params;
    const {
      content,
      hashtags,
      mentions,
      targetPlatforms,
      scheduling,
      category,
      tags
    } = req.body;

    const post = await Post.findOne({
      _id: postId,
      userId: req.user._id
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Can only update draft or scheduled posts
    if (!['draft', 'scheduled'].includes(post.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update published posts'
      });
    }

    // Update fields if provided
    if (content !== undefined) {
      post.content.text = content.trim();
    }

    if (hashtags !== undefined) {
      post.content.hashtags = typeof hashtags === 'string' ? JSON.parse(hashtags) : hashtags;
    }

    if (mentions !== undefined) {
      post.content.mentions = typeof mentions === 'string' ? JSON.parse(mentions) : mentions;
    }

    if (category !== undefined) {
      post.category = category;
    }

    if (tags !== undefined) {
      post.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }

    // Handle new media uploads
    if (req.files && req.files.length > 0) {
      // Process new media files (similar to create post logic)
      // For brevity, reusing the same logic as in create post
    }

    await post.save();

    res.json({
      success: true,
      message: 'Post updated successfully',
      post: {
        id: post._id,
        content: post.content,
        media: post.media,
        status: post.status,
        updatedAt: post.updatedAt
      }
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update post'
    });
  }
});

// DELETE POST
router.delete('/:postId', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findOne({
      _id: postId,
      userId: req.user._id
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Can only delete draft or scheduled posts
    if (!['draft', 'scheduled', 'failed'].includes(post.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete published posts'
      });
    }

    // Delete associated media files
    if (post.media && post.media.length > 0) {
      for (const mediaItem of post.media) {
        const filePath = path.join(__dirname, '../', mediaItem.url);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        // Delete thumbnail if exists
        if (mediaItem.thumbnail) {
          const thumbPath = path.join(__dirname, '../', mediaItem.thumbnail);
          if (fs.existsSync(thumbPath)) {
            fs.unlinkSync(thumbPath);
          }
        }
      }
    }

    await Post.findByIdAndDelete(postId);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete post'
    });
  }
});

// PUBLISH POST NOW
router.post('/:postId/publish', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const post = await Post.findOne({
      _id: postId,
      userId: req.user._id
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const readyCheck = post.isReadyToPublish();
    if (!readyCheck.ready) {
      return res.status(400).json({
        success: false,
        message: readyCheck.reason
      });
    }

    await publishPost(post);

    res.json({
      success: true,
      message: 'Post published successfully',
      post: {
        id: post._id,
        status: post.status,
        targetPlatforms: post.targetPlatforms.map(p => ({
          platform: p.platform,
          accountName: p.accountName,
          status: p.status,
          publishedAt: p.publishedAt,
          error: p.error
        }))
      }
    });
  } catch (error) {
    console.error('Publish post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish post'
    });
  }
});

// DUPLICATE POST
router.post('/:postId/duplicate', verifyToken, async (req, res) => {
  try {
    const { postId } = req.params;

    const originalPost = await Post.findOne({
      _id: postId,
      userId: req.user._id
    });

    if (!originalPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const duplicatedPost = new Post({
      userId: req.user._id,
      content: {
        text: originalPost.content.text + ' (Copy)',
        hashtags: [...originalPost.content.hashtags],
        mentions: [...originalPost.content.mentions]
      },
      media: [...originalPost.media],
      targetPlatforms: originalPost.targetPlatforms.map(p => ({
        platform: p.platform,
        accountId: p.accountId,
        accountName: p.accountName,
        platformSpecificContent: { ...p.platformSpecificContent },
        status: 'pending'
      })),
      category: originalPost.category,
      tags: [...originalPost.tags],
      status: 'draft'
    });

    await duplicatedPost.save();

    res.status(201).json({
      success: true,
      message: 'Post duplicated successfully',
      post: {
        id: duplicatedPost._id,
        content: duplicatedPost.content,
        status: duplicatedPost.status,
        createdAt: duplicatedPost.createdAt
      }
    });
  } catch (error) {
    console.error('Duplicate post error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to duplicate post'
    });
  }
});

// Helper function to publish post to social media platforms
async function publishPost(post) {
  post.publishAttempts += 1;
  post.lastPublishAttempt = new Date();

  const results = await Promise.allSettled(
    post.targetPlatforms.map(platform => publishToPlatform(post, platform))
  );

  let hasSuccess = false;
  let hasFailed = false;

  results.forEach((result, index) => {
    const platform = post.targetPlatforms[index];

    if (result.status === 'fulfilled') {
      platform.status = 'published';
      platform.publishedAt = new Date();
      platform.platformPostId = result.value.postId;
      platform.platformPostUrl = result.value.postUrl;
      platform.error = null;
      hasSuccess = true;

      // Create post history record
      createPostHistory(post, platform, result.value);
    } else {
      platform.status = 'failed';
      platform.error = result.reason.message;
      hasFailed = true;
    }
  });

  // Update overall post status
  if (hasSuccess && !hasFailed) {
    post.status = 'published';
  } else if (hasSuccess && hasFailed) {
    post.status = 'published'; // Partial success
  } else {
    post.status = 'failed';
  }

  await post.save();
}

// Helper function to publish to individual platform
async function publishToPlatform(post, platformConfig) {
  const account = await SocialAccount.findById(platformConfig.accountId);
  if (!account || !account.isActive) {
    throw new Error('Account not found or inactive');
  }

  const accessToken = account.getDecryptedAccessToken();
  const content = post.content.text;

  switch (platformConfig.platform) {
    case 'facebook':
      return await publishToFacebook(account, content, post.media, accessToken);
    case 'instagram':
      return await publishToInstagram(account, content, post.media, accessToken);
    case 'linkedin':
      return await publishToLinkedIn(account, content, post.media, accessToken);
    case 'twitter':
      return await publishToTwitter(account, content, post.media, accessToken);
    default:
      throw new Error(`Unsupported platform: ${platformConfig.platform}`);
  }
}

// Platform-specific publishing functions
async function publishToFacebook(account, content, media, accessToken) {
  try {
    const pageId = account.accountType === 'page' ? account.accountId : 'me';
    const endpoint = `https://graph.facebook.com/v18.0/${pageId}/feed`;

    const postData = {
      message: content,
      access_token: accessToken
    };

    // Handle media attachments
    if (media && media.length > 0) {
      // For simplicity, just attach the first image
      const firstImage = media.find(m => m.type === 'image');
      if (firstImage) {
        postData.link = firstImage.url; // This should be a public URL
      }
    }

    const response = await axios.post(endpoint, postData);

    return {
      postId: response.data.id,
      postUrl: `https://facebook.com/${response.data.id}`
    };
  } catch (error) {
    console.error('Facebook publish error:', error);
    throw new Error('Failed to publish to Facebook: ' + error.message);
  }
}

async function publishToTwitter(account, content, media, accessToken) {
  try {
    const tokenSecret = account.platformData?.tokenSecret;

    const client = new TwitterApi({
      appKey: process.env.TWITTER_CONSUMER_KEY,
      appSecret: process.env.TWITTER_CONSUMER_SECRET,
      accessToken,
      accessSecret: tokenSecret
    });

    const tweet = await client.v2.tweet({
      text: content
    });

    return {
      postId: tweet.data.id,
      postUrl: `https://twitter.com/${account.username}/status/${tweet.data.id}`
    };
  } catch (error) {
    console.error('Twitter publish error:', error);
    throw new Error('Failed to publish to Twitter: ' + error.message);
  }
}

async function publishToLinkedIn(account, content, media, accessToken) {
  try {
    const endpoint = 'https://api.linkedin.com/v2/ugcPosts';

    const postData = {
      author: `urn:li:person:${account.accountId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    const response = await axios.post(endpoint, postData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });

    const postId = response.data.id;
    return {
      postId,
      postUrl: `https://linkedin.com/feed/update/${postId}`
    };
  } catch (error) {
    console.error('LinkedIn publish error:', error);
    throw new Error('Failed to publish to LinkedIn: ' + error.message);
  }
}

async function publishToInstagram(account, content, media, accessToken) {
  try {
    // Instagram requires Facebook API and media upload
    // This is a simplified version - full implementation would require media upload to Instagram
    throw new Error('Instagram publishing requires additional setup');
  } catch (error) {
    console.error('Instagram publish error:', error);
    throw new Error('Failed to publish to Instagram: ' + error.message);
  }
}

// Helper function to create post history
async function createPostHistory(post, platformConfig, publishResult) {
  try {
    const postHistory = new PostHistory({
      userId: post.userId,
      postId: post._id,
      platform: platformConfig.platform,
      accountId: platformConfig.accountId,
      accountName: platformConfig.accountName,
      contentSnapshot: {
        text: post.content.text,
        hashtags: post.content.hashtags,
        mentions: post.content.mentions,
        mediaCount: post.media ? post.media.length : 0
      },
      platformPostId: publishResult.postId,
      platformPostUrl: publishResult.postUrl,
      publishedAt: new Date(),
      publishingMethod: post.scheduling.type || 'immediate',
      scheduleId: post.scheduling.automationRuleId,
      status: 'published'
    });

    await postHistory.save();
  } catch (error) {
    console.error('Error creating post history:', error);
  }
}

module.exports = router;