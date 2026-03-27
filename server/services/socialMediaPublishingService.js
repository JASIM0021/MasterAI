const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class SocialMediaPublishingService {
  constructor() {
    this.platforms = {
      facebook: 'facebook',
      instagram: 'instagram',
      twitter: 'twitter',
      linkedin: 'linkedin'
    };
  }

  /**
   * Publish post to multiple social media platforms
   * @param {Object} post - Post object with content and media
   * @param {Array} targetPlatforms - Array of platform objects with credentials
   * @param {Object} user - User object
   */
  async publishToMultiplePlatforms(post, targetPlatforms, user) {
    const results = [];

    for (const platform of targetPlatforms) {
      try {
        const result = await this.publishToPlatform(post, platform, user);
        results.push({
          platform: platform.platform,
          accountName: platform.accountName,
          success: true,
          result: result,
          publishedAt: new Date()
        });
      } catch (error) {
        console.error(`Failed to publish to ${platform.platform}:`, error.message);
        results.push({
          platform: platform.platform,
          accountName: platform.accountName,
          success: false,
          error: error.message,
          publishedAt: new Date()
        });
      }
    }

    return {
      success: results.some(r => r.success),
      results: results,
      successCount: results.filter(r => r.success).length,
      totalPlatforms: results.length
    };
  }

  /**
   * Publish to a specific platform
   * @param {Object} post - Post object
   * @param {Object} platform - Platform configuration
   * @param {Object} user - User object
   */
  async publishToPlatform(post, platform, user) {
    switch (platform.platform.toLowerCase()) {
      case 'facebook':
        return await this.publishToFacebook(post, platform, user);
      case 'instagram':
        return await this.publishToInstagram(post, platform, user);
      case 'twitter':
        return await this.publishToTwitter(post, platform, user);
      case 'linkedin':
        return await this.publishToLinkedIn(post, platform, user);
      default:
        throw new Error(`Unsupported platform: ${platform.platform}`);
    }
  }

  /**
   * Publish to Facebook
   * @param {Object} post - Post object
   * @param {Object} platform - Platform configuration
   * @param {Object} user - User object
   */
  async publishToFacebook(post, platform, user) {
    try {
      const { accessToken, pageId } = platform.credentials;

      if (!accessToken || !pageId) {
        throw new Error('Facebook access token and page ID are required');
      }

      const content = this.formatContentForPlatform(post.content, 'facebook');

      // Prepare the post data
      const postData = {
        message: content.text,
        access_token: accessToken
      };

      // Add link if present
      if (content.link) {
        postData.link = content.link;
      }

      let postResponse;

      // If there are images, upload them first
      if (post.media && post.media.length > 0) {
        const imageMedia = post.media.filter(m => m.type === 'image');

        if (imageMedia.length === 1) {
          // Single image post
          const imageUrl = imageMedia[0].url;
          postData.url = imageUrl;

          postResponse = await axios.post(
            `https://graph.facebook.com/v18.0/${pageId}/photos`,
            postData
          );
        } else if (imageMedia.length > 1) {
          // Multiple images - create album
          const albumResponse = await axios.post(
            `https://graph.facebook.com/v18.0/${pageId}/albums`,
            {
              name: `Post from ${new Date().toLocaleDateString()}`,
              message: content.text,
              access_token: accessToken
            }
          );

          const albumId = albumResponse.data.id;

          // Upload images to album
          for (const image of imageMedia) {
            await axios.post(
              `https://graph.facebook.com/v18.0/${albumId}/photos`,
              {
                url: image.url,
                access_token: accessToken
              }
            );
          }

          postResponse = albumResponse;
        }
      } else {
        // Text-only post
        postResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${pageId}/feed`,
          postData
        );
      }

      return {
        platformPostId: postResponse.data.id || postResponse.data.post_id,
        publishedAt: new Date(),
        platform: 'facebook',
        url: `https://facebook.com/${postResponse.data.id || postResponse.data.post_id}`
      };
    } catch (error) {
      console.error('Facebook publishing error:', error.response?.data || error.message);
      throw new Error(`Facebook publishing failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Publish to Instagram
   * @param {Object} post - Post object
   * @param {Object} platform - Platform configuration
   * @param {Object} user - User object
   */
  async publishToInstagram(post, platform, user) {
    try {
      const { accessToken, instagramAccountId } = platform.credentials;

      if (!accessToken || !instagramAccountId) {
        throw new Error('Instagram access token and account ID are required');
      }

      const content = this.formatContentForPlatform(post.content, 'instagram');

      // Instagram requires media for posts
      if (!post.media || post.media.length === 0) {
        throw new Error('Instagram posts require at least one image or video');
      }

      const imageMedia = post.media.filter(m => m.type === 'image');

      if (imageMedia.length === 0) {
        throw new Error('Instagram posts require at least one image');
      }

      let containerResponse;

      if (imageMedia.length === 1) {
        // Single image post
        containerResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
          {
            image_url: imageMedia[0].url,
            caption: content.text,
            access_token: accessToken
          }
        );
      } else {
        // Carousel post (multiple images)
        const mediaContainers = [];

        // Create media containers for each image
        for (const image of imageMedia.slice(0, 10)) { // Instagram allows max 10 items
          const containerResponse = await axios.post(
            `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
            {
              image_url: image.url,
              is_carousel_item: true,
              access_token: accessToken
            }
          );
          mediaContainers.push(containerResponse.data.id);
        }

        // Create carousel container
        containerResponse = await axios.post(
          `https://graph.facebook.com/v18.0/${instagramAccountId}/media`,
          {
            media_type: 'CAROUSEL',
            children: mediaContainers.join(','),
            caption: content.text,
            access_token: accessToken
          }
        );
      }

      // Publish the media container
      const publishResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${instagramAccountId}/media_publish`,
        {
          creation_id: containerResponse.data.id,
          access_token: accessToken
        }
      );

      return {
        platformPostId: publishResponse.data.id,
        publishedAt: new Date(),
        platform: 'instagram',
        url: `https://instagram.com/p/${publishResponse.data.id}`
      };
    } catch (error) {
      console.error('Instagram publishing error:', error.response?.data || error.message);
      throw new Error(`Instagram publishing failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Publish to Twitter
   * @param {Object} post - Post object
   * @param {Object} platform - Platform configuration
   * @param {Object} user - User object
   */
  async publishToTwitter(post, platform, user) {
    try {
      const { accessToken, accessTokenSecret, consumerKey, consumerSecret } = platform.credentials;

      if (!accessToken || !accessTokenSecret || !consumerKey || !consumerSecret) {
        throw new Error('Twitter OAuth credentials are required');
      }

      const content = this.formatContentForPlatform(post.content, 'twitter');

      // Prepare tweet data
      const tweetData = {
        text: content.text
      };

      // Upload media if present
      if (post.media && post.media.length > 0) {
        const imageMedia = post.media.filter(m => m.type === 'image');

        if (imageMedia.length > 0) {
          const mediaIds = [];

          for (const image of imageMedia.slice(0, 4)) { // Twitter allows max 4 images
            const mediaId = await this.uploadMediaToTwitter(image.url, platform.credentials);
            mediaIds.push(mediaId);
          }

          tweetData.media = {
            media_ids: mediaIds
          };
        }
      }

      // Use Twitter API v2
      const response = await this.makeTwitterAPIRequest(
        'POST',
        'https://api.twitter.com/2/tweets',
        tweetData,
        platform.credentials
      );

      return {
        platformPostId: response.data.id,
        publishedAt: new Date(),
        platform: 'twitter',
        url: `https://twitter.com/i/status/${response.data.id}`
      };
    } catch (error) {
      console.error('Twitter publishing error:', error.response?.data || error.message);
      throw new Error(`Twitter publishing failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Publish to LinkedIn
   * @param {Object} post - Post object
   * @param {Object} platform - Platform configuration
   * @param {Object} user - User object
   */
  async publishToLinkedIn(post, platform, user) {
    try {
      const { accessToken, personId } = platform.credentials;

      if (!accessToken || !personId) {
        throw new Error('LinkedIn access token and person ID are required');
      }

      const content = this.formatContentForPlatform(post.content, 'linkedin');

      // Prepare post data
      const postData = {
        author: `urn:li:person:${personId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: content.text
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      // Add media if present
      if (post.media && post.media.length > 0) {
        const imageMedia = post.media.filter(m => m.type === 'image');

        if (imageMedia.length > 0) {
          // Upload images to LinkedIn
          const media = [];

          for (const image of imageMedia.slice(0, 9)) { // LinkedIn allows max 9 images
            const uploadedAsset = await this.uploadMediaToLinkedIn(image.url, platform.credentials);
            media.push({
              status: 'READY',
              media: uploadedAsset
            });
          }

          postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
          postData.specificContent['com.linkedin.ugc.ShareContent'].media = media;
        }
      }

      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        postData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      return {
        platformPostId: response.data.id,
        publishedAt: new Date(),
        platform: 'linkedin',
        url: `https://linkedin.com/feed/update/${response.data.id}`
      };
    } catch (error) {
      console.error('LinkedIn publishing error:', error.response?.data || error.message);
      throw new Error(`LinkedIn publishing failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Format content for specific platform
   * @param {Object} content - Post content
   * @param {string} platform - Platform name
   */
  formatContentForPlatform(content, platform) {
    let text = content.text || '';
    let hashtags = content.hashtags || [];
    let link = content.link || '';

    // Platform-specific formatting
    switch (platform.toLowerCase()) {
      case 'twitter':
        // Twitter has character limits
        const maxLength = 280;
        const hashtagsText = hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '';
        const linkText = link ? '\n\n' + link : '';

        let totalText = text + hashtagsText + linkText;

        if (totalText.length > maxLength) {
          const availableLength = maxLength - hashtagsText.length - linkText.length - 3; // 3 for "..."
          text = text.substring(0, availableLength) + '...';
          totalText = text + hashtagsText + linkText;
        }

        return {
          text: totalText,
          hashtags: hashtags,
          link: link
        };

      case 'instagram':
        // Instagram loves hashtags
        const instagramText = text + (hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '');
        return {
          text: instagramText,
          hashtags: hashtags,
          link: link
        };

      case 'linkedin':
        // LinkedIn is more professional
        const linkedinText = text + (hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '');
        return {
          text: linkedinText,
          hashtags: hashtags,
          link: link
        };

      case 'facebook':
      default:
        // Facebook handles longer content well
        const facebookText = text + (hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '');
        return {
          text: facebookText,
          hashtags: hashtags,
          link: link
        };
    }
  }

  /**
   * Upload media to Twitter
   * @param {string} imageUrl - Image URL
   * @param {Object} credentials - Twitter credentials
   */
  async uploadMediaToTwitter(imageUrl, credentials) {
    // This is a simplified version - in production you'd need proper OAuth1 implementation
    // For now, return a mock media ID
    console.log('Mock: Uploading media to Twitter:', imageUrl);
    return 'mock_media_id_' + Date.now();
  }

  /**
   * Upload media to LinkedIn
   * @param {string} imageUrl - Image URL
   * @param {Object} credentials - LinkedIn credentials
   */
  async uploadMediaToLinkedIn(imageUrl, credentials) {
    // This is a simplified version - in production you'd need proper LinkedIn media upload
    // For now, return a mock asset
    console.log('Mock: Uploading media to LinkedIn:', imageUrl);
    return 'urn:li:digitalmediaAsset:mock_asset_' + Date.now();
  }

  /**
   * Make authenticated Twitter API request
   * @param {string} method - HTTP method
   * @param {string} url - API URL
   * @param {Object} data - Request data
   * @param {Object} credentials - Twitter credentials
   */
  async makeTwitterAPIRequest(method, url, data, credentials) {
    // This is a simplified version - in production you'd need proper OAuth1 implementation
    // For now, return a mock response
    console.log('Mock: Making Twitter API request:', method, url, data);
    return {
      data: {
        id: 'mock_tweet_id_' + Date.now(),
        text: data.text
      }
    };
  }

  /**
   * Validate platform credentials
   * @param {Object} platform - Platform configuration
   */
  async validatePlatformCredentials(platform) {
    try {
      switch (platform.platform.toLowerCase()) {
        case 'facebook':
          return await this.validateFacebookCredentials(platform.credentials);
        case 'instagram':
          return await this.validateInstagramCredentials(platform.credentials);
        case 'twitter':
          return await this.validateTwitterCredentials(platform.credentials);
        case 'linkedin':
          return await this.validateLinkedInCredentials(platform.credentials);
        default:
          throw new Error(`Unsupported platform: ${platform.platform}`);
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Validate Facebook credentials
   */
  async validateFacebookCredentials(credentials) {
    try {
      const { accessToken, pageId } = credentials;

      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${pageId}`,
        {
          params: {
            access_token: accessToken,
            fields: 'name,id'
          }
        }
      );

      return {
        valid: true,
        accountInfo: {
          id: response.data.id,
          name: response.data.name
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Validate Instagram credentials
   */
  async validateInstagramCredentials(credentials) {
    try {
      const { accessToken, instagramAccountId } = credentials;

      const response = await axios.get(
        `https://graph.facebook.com/v18.0/${instagramAccountId}`,
        {
          params: {
            access_token: accessToken,
            fields: 'name,username'
          }
        }
      );

      return {
        valid: true,
        accountInfo: {
          id: response.data.id,
          name: response.data.name,
          username: response.data.username
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  /**
   * Validate Twitter credentials
   */
  async validateTwitterCredentials(credentials) {
    // Mock validation for now
    return {
      valid: true,
      accountInfo: {
        id: 'mock_twitter_id',
        name: 'Mock Twitter Account'
      }
    };
  }

  /**
   * Validate LinkedIn credentials
   */
  async validateLinkedInCredentials(credentials) {
    try {
      const { accessToken } = credentials;

      const response = await axios.get(
        'https://api.linkedin.com/v2/people/~',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      return {
        valid: true,
        accountInfo: {
          id: response.data.id,
          name: `${response.data.firstName?.localized?.en_US} ${response.data.lastName?.localized?.en_US}`
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get platform publishing capabilities
   * @param {string} platform - Platform name
   */
  getPlatformCapabilities(platform) {
    const capabilities = {
      facebook: {
        maxImages: 10,
        maxVideos: 1,
        maxTextLength: 63206,
        supportsLinks: true,
        supportsHashtags: true,
        supportsScheduling: true
      },
      instagram: {
        maxImages: 10,
        maxVideos: 1,
        maxTextLength: 2200,
        supportsLinks: false, // Only in bio
        supportsHashtags: true,
        supportsScheduling: true,
        requiresMedia: true
      },
      twitter: {
        maxImages: 4,
        maxVideos: 1,
        maxTextLength: 280,
        supportsLinks: true,
        supportsHashtags: true,
        supportsScheduling: true
      },
      linkedin: {
        maxImages: 9,
        maxVideos: 1,
        maxTextLength: 3000,
        supportsLinks: true,
        supportsHashtags: true,
        supportsScheduling: true
      }
    };

    return capabilities[platform.toLowerCase()] || null;
  }

  /**
   * Check if post is compatible with platform
   * @param {Object} post - Post object
   * @param {string} platform - Platform name
   */
  isPostCompatibleWithPlatform(post, platform) {
    const capabilities = this.getPlatformCapabilities(platform);

    if (!capabilities) {
      return { compatible: false, reason: 'Unsupported platform' };
    }

    // Check if media is required but missing
    if (capabilities.requiresMedia && (!post.media || post.media.length === 0)) {
      return { compatible: false, reason: 'Platform requires media content' };
    }

    // Check text length
    const content = this.formatContentForPlatform(post.content, platform);
    if (content.text.length > capabilities.maxTextLength) {
      return {
        compatible: false,
        reason: `Text too long (${content.text.length}/${capabilities.maxTextLength} characters)`
      };
    }

    // Check media limits
    const imageCount = post.media ? post.media.filter(m => m.type === 'image').length : 0;
    const videoCount = post.media ? post.media.filter(m => m.type === 'video').length : 0;

    if (imageCount > capabilities.maxImages) {
      return {
        compatible: false,
        reason: `Too many images (${imageCount}/${capabilities.maxImages})`
      };
    }

    if (videoCount > capabilities.maxVideos) {
      return {
        compatible: false,
        reason: `Too many videos (${videoCount}/${capabilities.maxVideos})`
      };
    }

    return { compatible: true };
  }
}

module.exports = SocialMediaPublishingService;