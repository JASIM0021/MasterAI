class SocialMediaSharingService {
  constructor() {
    this.platforms = {
      facebook: 'facebook',
      instagram: 'instagram',
      twitter: 'twitter',
      linkedin: 'linkedin'
    };
  }

  /**
   * Generate sharing URLs for multiple platforms
   * @param {Object} post - Post object with content and media
   * @param {Array} platforms - Array of platform names
   * @returns {Object} Sharing URLs for each platform
   */
  generateSharingUrls(post, platforms = ['facebook', 'instagram', 'twitter', 'linkedin']) {
    const sharingUrls = {};

    for (const platform of platforms) {
      try {
        const url = this.generatePlatformSharingUrl(post, platform);
        if (url) {
          sharingUrls[platform] = {
            success: true,
            url: url,
            platform: platform
          };
        }
      } catch (error) {
        sharingUrls[platform] = {
          success: false,
          error: error.message,
          platform: platform
        };
      }
    }

    return sharingUrls;
  }

  /**
   * Generate sharing URL for specific platform
   * @param {Object} post - Post object
   * @param {string} platform - Platform name
   * @returns {string} Sharing URL
   */
  generatePlatformSharingUrl(post, platform) {
    const content = this.formatContentForPlatform(post.content, platform);
    const imageUrl = this.getFirstImageUrl(post.media);

    switch (platform.toLowerCase()) {
      case 'facebook':
        return this.generateFacebookUrl(content, imageUrl);
      case 'instagram':
        return this.generateInstagramUrl(content, imageUrl);
      case 'twitter':
        return this.generateTwitterUrl(content, imageUrl);
      case 'linkedin':
        return this.generateLinkedInUrl(content, imageUrl);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Generate Facebook sharing URL
   */
  generateFacebookUrl(content, imageUrl) {
    const baseUrl = 'https://www.facebook.com/sharer/sharer.php';
    const params = new URLSearchParams();

    // Facebook sharing URL parameters
    params.append('quote', content.text);

    if (imageUrl) {
      params.append('u', imageUrl);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate Instagram sharing URL (mobile deep link)
   */
  generateInstagramUrl(content, imageUrl) {
    // Instagram doesn't have a direct web sharing URL like other platforms
    // We'll return a mobile deep link that opens Instagram app with camera
    // The user will need to manually add their content

    // For web, redirect to Instagram's website with instructions
    return 'https://www.instagram.com/';
  }

  /**
   * Generate Twitter sharing URL
   */
  generateTwitterUrl(content, imageUrl) {
    const baseUrl = 'https://twitter.com/intent/tweet';
    const params = new URLSearchParams();

    params.append('text', content.text);

    if (imageUrl) {
      // Twitter doesn't support direct image sharing via URL
      // But we can include the image URL in the text
      params.set('text', `${content.text}\n\n📷 ${imageUrl}`);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate LinkedIn sharing URL
   */
  generateLinkedInUrl(content, imageUrl) {
    const baseUrl = 'https://www.linkedin.com/sharing/share-offsite/';
    const params = new URLSearchParams();

    // LinkedIn sharing parameters
    if (imageUrl) {
      params.append('url', imageUrl);
    }

    // LinkedIn doesn't support direct text in URL, but we can use the URL parameter
    // The user will manually add the text in LinkedIn's sharing dialog
    params.append('summary', content.text);

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Generate mobile app deep links for better mobile experience
   * @param {Object} post - Post object
   * @param {string} platform - Platform name
   * @returns {string} Deep link URL
   */
  generateMobileDeepLink(post, platform) {
    const content = this.formatContentForPlatform(post.content, platform);

    switch (platform.toLowerCase()) {
      case 'instagram':
        // Instagram camera deep link
        return 'instagram://camera';

      case 'twitter':
        // Twitter compose deep link
        const tweetText = encodeURIComponent(content.text);
        return `twitter://post?message=${tweetText}`;

      case 'linkedin':
        // LinkedIn app deep link
        return 'linkedin://';

      case 'facebook':
        // Facebook app deep link
        const fbText = encodeURIComponent(content.text);
        return `fb://publish/text?text=${fbText}`;

      default:
        return this.generatePlatformSharingUrl(post, platform);
    }
  }

  /**
   * Format content for specific platform with character limits
   * @param {Object} content - Post content
   * @param {string} platform - Platform name
   */
  formatContentForPlatform(content, platform) {
    let text = content.text || '';
    let hashtags = content.hashtags || [];

    // Platform-specific formatting and limits
    switch (platform.toLowerCase()) {
      case 'twitter':
        // Twitter 280 character limit
        const hashtagsText = hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '';
        let fullText = text + hashtagsText;

        if (fullText.length > 280) {
          const availableLength = 280 - hashtagsText.length - 3; // 3 for "..."
          text = text.substring(0, availableLength) + '...';
          fullText = text + hashtagsText;
        }

        return { text: fullText, hashtags };

      case 'instagram':
        // Instagram loves hashtags and has 2200 char limit
        const instagramText = text + (hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '');
        return {
          text: instagramText.length > 2200 ? instagramText.substring(0, 2200) : instagramText,
          hashtags
        };

      case 'linkedin':
        // LinkedIn 3000 character limit, more professional tone
        const linkedinText = text + (hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '');
        return {
          text: linkedinText.length > 3000 ? linkedinText.substring(0, 3000) : linkedinText,
          hashtags
        };

      case 'facebook':
      default:
        // Facebook has high character limit (63,206)
        const facebookText = text + (hashtags.length > 0 ? '\n\n' + hashtags.join(' ') : '');
        return { text: facebookText, hashtags };
    }
  }

  /**
   * Get the first image URL from media array
   * @param {Array} media - Media array
   * @returns {string|null} Image URL
   */
  getFirstImageUrl(media) {
    if (!media || media.length === 0) return null;

    const image = media.find(m => m.type === 'image');
    return image ? image.url : null;
  }

  /**
   * Get platform capabilities and limitations
   * @param {string} platform - Platform name
   */
  getPlatformCapabilities(platform) {
    const capabilities = {
      facebook: {
        maxTextLength: 63206,
        supportsImages: true,
        supportsHashtags: true,
        sharingMethod: 'web_url',
        requiresManualImageUpload: false
      },
      instagram: {
        maxTextLength: 2200,
        supportsImages: true,
        supportsHashtags: true,
        sharingMethod: 'app_redirect',
        requiresManualImageUpload: true // User needs to select/upload image manually
      },
      twitter: {
        maxTextLength: 280,
        supportsImages: true,
        supportsHashtags: true,
        sharingMethod: 'web_url',
        requiresManualImageUpload: true // Image URL included in text
      },
      linkedin: {
        maxTextLength: 3000,
        supportsImages: true,
        supportsHashtags: true,
        sharingMethod: 'web_url',
        requiresManualImageUpload: true // User adds content manually
      }
    };

    return capabilities[platform.toLowerCase()] || null;
  }

  /**
   * Generate sharing instructions for user
   * @param {string} platform - Platform name
   * @param {Object} post - Post object
   */
  getSharingInstructions(platform, post) {
    const content = this.formatContentForPlatform(post.content, platform);
    const hasImage = this.getFirstImageUrl(post.media) !== null;

    const instructions = {
      facebook: {
        steps: [
          'Click the Facebook sharing link',
          'The post text will be pre-filled',
          hasImage ? 'Image will be automatically included' : 'Add an image if desired',
          'Click "Share" to publish'
        ],
        note: 'Text and images are automatically filled in Facebook\'s sharing dialog.'
      },
      instagram: {
        steps: [
          'Click the Instagram link to open the app',
          'Select or take a photo',
          'Copy and paste this text into your caption:',
          `"${content.text}"`,
          'Publish your post'
        ],
        note: 'Instagram requires manual image selection and text copying.'
      },
      twitter: {
        steps: [
          'Click the Twitter sharing link',
          'The tweet text will be pre-filled',
          hasImage ? 'Add the provided image manually' : 'Add an image if desired',
          'Click "Tweet" to publish'
        ],
        note: 'Text is pre-filled, but images need to be uploaded manually.'
      },
      linkedin: {
        steps: [
          'Click the LinkedIn sharing link',
          'Copy and paste this text:',
          `"${content.text}"`,
          hasImage ? 'Upload the provided image' : 'Add an image if desired',
          'Click "Post" to publish'
        ],
        note: 'LinkedIn requires manual text copying and image upload.'
      }
    };

    return instructions[platform.toLowerCase()] || {
      steps: ['Visit the platform and create your post manually'],
      note: 'Manual posting required for this platform.'
    };
  }

  /**
   * Generate sharing data for frontend
   * @param {Object} post - Post object
   * @param {Array} platforms - Platform names
   */
  generateSharingData(post, platforms = ['facebook', 'instagram', 'twitter', 'linkedin']) {
    const sharingData = {
      postId: post._id,
      content: post.content,
      media: post.media,
      platforms: {}
    };

    for (const platform of platforms) {
      const url = this.generatePlatformSharingUrl(post, platform);
      const deepLink = this.generateMobileDeepLink(post, platform);
      const instructions = this.getSharingInstructions(platform, post);
      const capabilities = this.getPlatformCapabilities(platform);

      sharingData.platforms[platform] = {
        webUrl: url,
        mobileDeepLink: deepLink,
        instructions: instructions,
        capabilities: capabilities,
        formattedContent: this.formatContentForPlatform(post.content, platform)
      };
    }

    return sharingData;
  }
}

module.exports = SocialMediaSharingService;