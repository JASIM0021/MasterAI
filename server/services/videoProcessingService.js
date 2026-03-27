const cloudinary = require('cloudinary').v2;
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { promisify } = require('util');

// Configure Cloudinary (inherit from existing service)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo',
  secure: true
});

/**
 * Video Processing Service
 * Handles video upload, processing, optimization, and Cloudinary storage
 */
class VideoProcessingService {
  constructor() {
    this.uploadFolder = 'generated-videos';
    this.thumbnailFolder = 'video-thumbnails';
    this.maxVideoSize = 50 * 1024 * 1024; // 50MB
    this.supportedFormats = ['mp4', 'avi', 'mov', 'webm'];
    this.defaultQuality = 'auto';
  }

  /**
   * Upload video to Cloudinary from URL
   * @param {string} videoUrl - URL of the video to upload
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadVideoFromUrl(videoUrl, options = {}) {
    try {
      console.log('🎬 Uploading video from URL to Cloudinary...');
      console.log(`📎 Source URL: ${videoUrl}`);

      const uploadOptions = {
        resource_type: 'video',
        folder: this.uploadFolder,
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        quality: this.defaultQuality,
        format: 'mp4',
        video_codec: 'h264',
        audio_codec: 'aac',
        ...options
      };

      const result = await cloudinary.uploader.upload(videoUrl, uploadOptions);

      console.log('✅ Video uploaded to Cloudinary successfully');
      console.log(`📎 URL: ${result.secure_url}`);
      console.log(`⏱️ Duration: ${result.duration}s`);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        duration: result.duration,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        playbackUrl: result.playback_url || result.secure_url,
        uploadedAt: new Date(result.created_at)
      };

    } catch (error) {
      console.error('❌ Video upload failed:', error);
      throw new Error(`Failed to upload video to Cloudinary: ${error.message}`);
    }
  }

  /**
   * Upload video file to Cloudinary
   * @param {string} filePath - Local file path
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} Upload result
   */
  async uploadVideoFile(filePath, options = {}) {
    try {
      console.log('🎬 Uploading video file to Cloudinary...');
      console.log(`📁 File path: ${filePath}`);

      // Validate file
      await this.validateVideoFile(filePath);

      const uploadOptions = {
        resource_type: 'video',
        folder: this.uploadFolder,
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        quality: this.defaultQuality,
        format: 'mp4',
        video_codec: 'h264',
        audio_codec: 'aac',
        ...options
      };

      const result = await cloudinary.uploader.upload(filePath, uploadOptions);

      console.log('✅ Video file uploaded to Cloudinary successfully');
      console.log(`📎 URL: ${result.secure_url}`);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        duration: result.duration,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
        playbackUrl: result.playback_url || result.secure_url,
        uploadedAt: new Date(result.created_at)
      };

    } catch (error) {
      console.error('❌ Video file upload failed:', error);
      throw new Error(`Failed to upload video file to Cloudinary: ${error.message}`);
    }
  }

  /**
   * Generate and upload video thumbnail
   * @param {string} videoUrl - Video URL or public ID
   * @param {Object} options - Thumbnail options
   * @returns {Promise<Object>} Thumbnail upload result
   */
  async generateThumbnail(videoUrl, options = {}) {
    try {
      console.log('📸 Generating video thumbnail...');

      const thumbnailOptions = {
        resource_type: 'video',
        transformation: [
          {
            start_offset: '1', // 1 second into video
            width: 480,
            height: 270,
            crop: 'fill',
            quality: 'auto',
            format: 'jpg'
          }
        ],
        folder: this.thumbnailFolder,
        ...options
      };

      // Generate thumbnail URL from video
      let thumbnailUrl;
      if (videoUrl.includes('cloudinary.com')) {
        // Extract public ID from Cloudinary URL and generate thumbnail
        const publicId = this.extractPublicIdFromUrl(videoUrl);
        thumbnailUrl = cloudinary.url(publicId, {
          resource_type: 'video',
          transformation: thumbnailOptions.transformation,
          format: 'jpg'
        });
      } else {
        // For external URLs, we need to upload first then generate thumbnail
        const videoResult = await this.uploadVideoFromUrl(videoUrl);
        thumbnailUrl = cloudinary.url(videoResult.publicId, {
          resource_type: 'video',
          transformation: thumbnailOptions.transformation,
          format: 'jpg'
        });
      }

      console.log('✅ Video thumbnail generated successfully');
      console.log(`📎 Thumbnail URL: ${thumbnailUrl}`);

      return {
        url: thumbnailUrl,
        width: thumbnailOptions.transformation[0].width,
        height: thumbnailOptions.transformation[0].height,
        format: 'jpg',
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('❌ Thumbnail generation failed:', error);
      throw new Error(`Failed to generate thumbnail: ${error.message}`);
    }
  }

  /**
   * Process generated video (upload + thumbnail + optimization)
   * @param {string} videoUrl - Source video URL
   * @param {Object} metadata - Video metadata
   * @returns {Promise<Object>} Processing result
   */
  async processGeneratedVideo(videoUrl, metadata = {}) {
    try {
      console.log('🔄 Processing generated video...');

      const { userId, jobId, prompt, aspectRatio } = metadata;

      // Create optimized filename
      const filename = `${userId}_${jobId}_${Date.now()}`;

      // Upload video with optimizations
      const videoResult = await this.uploadVideoFromUrl(videoUrl, {
        public_id: `${this.uploadFolder}/${filename}`,
        eager: [
          {
            quality: 'auto',
            format: 'mp4',
            video_codec: 'h264',
            audio_codec: 'aac'
          }
        ],
        eager_async: true,
        context: {
          userId,
          jobId,
          prompt: prompt ? prompt.substring(0, 100) : '',
          aspectRatio,
          processedAt: new Date().toISOString()
        }
      });

      // Generate thumbnail
      const thumbnailResult = await this.generateThumbnail(videoResult.url, {
        public_id: `${this.thumbnailFolder}/${filename}_thumb`
      });

      console.log('✅ Video processing completed successfully');

      return {
        video: videoResult,
        thumbnail: thumbnailResult,
        metadata: {
          processedAt: new Date(),
          originalUrl: videoUrl,
          userId,
          jobId
        }
      };

    } catch (error) {
      console.error('❌ Video processing failed:', error);
      throw new Error(`Failed to process video: ${error.message}`);
    }
  }

  /**
   * Delete video from Cloudinary
   * @param {string} publicId - Video public ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteVideo(publicId) {
    try {
      console.log(`🗑️ Deleting video from Cloudinary: ${publicId}`);

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'video'
      });

      if (result.result === 'ok') {
        console.log('✅ Video deleted successfully');
      } else {
        console.log('⚠️ Video deletion result:', result.result);
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to delete video from Cloudinary:', error);
      throw new Error(`Failed to delete video: ${error.message}`);
    }
  }

  /**
   * Delete thumbnail from Cloudinary
   * @param {string} publicId - Thumbnail public ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteThumbnail(publicId) {
    try {
      console.log(`🗑️ Deleting thumbnail from Cloudinary: ${publicId}`);

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image'
      });

      if (result.result === 'ok') {
        console.log('✅ Thumbnail deleted successfully');
      } else {
        console.log('⚠️ Thumbnail deletion result:', result.result);
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to delete thumbnail from Cloudinary:', error);
      throw new Error(`Failed to delete thumbnail: ${error.message}`);
    }
  }

  /**
   * Get optimized video URL with transformations
   * @param {string} publicId - Video public ID
   * @param {Object} transformations - Cloudinary transformations
   * @returns {string} Optimized video URL
   */
  getOptimizedVideoUrl(publicId, transformations = {}) {
    const defaultTransformations = {
      quality: 'auto',
      format: 'mp4',
      video_codec: 'h264',
      ...transformations
    };

    return cloudinary.url(publicId, {
      resource_type: 'video',
      ...defaultTransformations
    });
  }

  /**
   * Get video streaming URL for different qualities
   * @param {string} publicId - Video public ID
   * @param {string} quality - Quality preset (sd, hd, auto)
   * @returns {Object} Streaming URLs
   */
  getStreamingUrls(publicId, quality = 'auto') {
    const baseUrl = cloudinary.url(publicId, { resource_type: 'video' });

    const qualities = {
      sd: { width: 640, quality: '30' },
      hd: { width: 1280, quality: '60' },
      auto: { quality: 'auto' }
    };

    const selectedQuality = qualities[quality] || qualities.auto;

    return {
      original: baseUrl,
      optimized: cloudinary.url(publicId, {
        resource_type: 'video',
        ...selectedQuality,
        format: 'mp4'
      }),
      m3u8: cloudinary.url(publicId, {
        resource_type: 'video',
        format: 'm3u8',
        streaming_profile: 'hd'
      })
    };
  }

  /**
   * Validate video file
   * @param {string} filePath - Path to video file
   * @returns {Promise<Object>} Validation result
   */
  async validateVideoFile(filePath) {
    try {
      const stats = await fs.stat(filePath);

      // Check file size
      if (stats.size > this.maxVideoSize) {
        throw new Error(`File size (${Math.round(stats.size / 1024 / 1024)}MB) exceeds maximum allowed size (${this.maxVideoSize / 1024 / 1024}MB)`);
      }

      // Check file extension
      const ext = path.extname(filePath).toLowerCase().substring(1);
      if (!this.supportedFormats.includes(ext)) {
        throw new Error(`Unsupported format: ${ext}. Supported formats: ${this.supportedFormats.join(', ')}`);
      }

      return {
        valid: true,
        size: stats.size,
        format: ext,
        sizeInMB: Math.round(stats.size / 1024 / 1024)
      };

    } catch (error) {
      throw new Error(`File validation failed: ${error.message}`);
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   * @param {string} url - Cloudinary URL
   * @returns {string} Public ID
   */
  extractPublicIdFromUrl(url) {
    try {
      // Extract public ID from Cloudinary URL
      // Example: https://res.cloudinary.com/demo/video/upload/v123456/folder/filename.mp4
      const urlParts = url.split('/');
      const uploadIndex = urlParts.findIndex(part => part === 'upload');

      if (uploadIndex === -1) {
        throw new Error('Invalid Cloudinary URL format');
      }

      // Get everything after version number
      const afterVersion = urlParts.slice(uploadIndex + 2).join('/');

      // Remove file extension
      return afterVersion.replace(/\.[^/.]+$/, '');

    } catch (error) {
      console.error('❌ Failed to extract public ID from URL:', error);
      return url; // Return original URL as fallback
    }
  }

  /**
   * Download video from URL to local file
   * @param {string} videoUrl - Video URL
   * @param {string} outputPath - Local output path
   * @returns {Promise<string>} Local file path
   */
  async downloadVideo(videoUrl, outputPath) {
    try {
      console.log(`📥 Downloading video from ${videoUrl}`);

      const response = await axios({
        method: 'GET',
        url: videoUrl,
        responseType: 'stream'
      });

      const writer = require('fs').createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log('✅ Video downloaded successfully');
          resolve(outputPath);
        });
        writer.on('error', reject);
      });

    } catch (error) {
      console.error('❌ Video download failed:', error);
      throw new Error(`Failed to download video: ${error.message}`);
    }
  }

  /**
   * Get video metadata
   * @param {string} videoPath - Video file path or URL
   * @returns {Promise<Object>} Video metadata
   */
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(new Error(`Failed to get video metadata: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

        resolve({
          duration: metadata.format.duration,
          size: metadata.format.size,
          bitrate: metadata.format.bit_rate,
          format: metadata.format.format_name,
          video: videoStream ? {
            codec: videoStream.codec_name,
            width: videoStream.width,
            height: videoStream.height,
            fps: eval(videoStream.r_frame_rate) // Convert fraction to decimal
          } : null,
          audio: audioStream ? {
            codec: audioStream.codec_name,
            channels: audioStream.channels,
            sampleRate: audioStream.sample_rate
          } : null
        });
      });
    });
  }

  /**
   * Cleanup local video files
   * @param {Array<string>} filePaths - Array of file paths to delete
   * @returns {Promise<Array>} Cleanup results
   */
  async cleanupLocalFiles(filePaths) {
    const results = [];

    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        results.push({ filePath, success: true });
        console.log(`🗑️ Cleaned up local file: ${filePath}`);
      } catch (error) {
        results.push({ filePath, success: false, error: error.message });
        console.error(`❌ Failed to cleanup file ${filePath}:`, error);
      }
    }

    return results;
  }

  /**
   * Upload video buffer to Cloudinary
   * @param {Buffer} videoBuffer - Video data buffer
   * @param {Object} metadata - Video metadata
   * @returns {Promise<Object>} Processing result
   */
  async uploadVideoBuffer(videoBuffer, metadata = {}) {
    try {
      console.log('📤 Uploading video buffer to Cloudinary...');
      console.log(`📦 Buffer size: ${videoBuffer.length} bytes`);

      const { userId, prompt, aspectRatio, duration, resolution, model } = metadata;

      // Create optimized filename
      const filename = `${userId}_${Date.now()}_${model || 'veo3'}`;

      // Convert buffer to base64 for Cloudinary upload
      const base64Video = `data:video/mp4;base64,${videoBuffer.toString('base64')}`;

      // Upload video buffer directly
      const videoResult = await cloudinary.uploader.upload(base64Video, {
        resource_type: 'video',
        public_id: `${this.uploadFolder}/${filename}`,
        quality: 'auto',
        format: 'mp4',
        video_codec: 'h264',
        audio_codec: 'aac',
        eager: [
          {
            quality: 'auto',
            format: 'mp4',
            video_codec: 'h264',
            audio_codec: 'aac'
          }
        ],
        eager_async: true,
        context: {
          userId,
          prompt,
          aspectRatio,
          duration,
          resolution,
          model
        }
      });

      // Generate thumbnail
      const thumbnail = await this.generateThumbnail(videoResult.url, {
        public_id: `${this.thumbnailFolder}/${filename}_thumb`
      });

      console.log('✅ Video buffer processing completed successfully');

      return {
        video: videoResult,
        thumbnail: thumbnail,
        metadata: {
          userId,
          prompt,
          aspectRatio,
          duration,
          resolution,
          model,
          processedAt: new Date()
        }
      };

    } catch (error) {
      console.error('❌ Video buffer processing failed:', error);
      throw new Error(`Failed to process video buffer: ${error.message}`);
    }
  }

  /**
   * Upload local video file to Cloudinary
   * @param {string} localFilePath - Path to local video file
   * @param {Object} metadata - Video metadata
   * @returns {Promise<Object>} Processing result
   */
  async uploadLocalVideo(localFilePath, metadata = {}) {
    try {
      console.log('📤 Uploading local video file to Cloudinary...');
      console.log(`📁 Local file: ${localFilePath}`);

      const { userId, prompt, aspectRatio, duration, resolution } = metadata;

      // Create optimized filename
      const filename = `${userId}_${Date.now()}`;

      // Upload video file directly
      const videoResult = await this.uploadLocalFile(localFilePath, {
        public_id: `${this.uploadFolder}/${filename}`,
        eager: [
          {
            quality: 'auto',
            format: 'mp4',
            video_codec: 'h264',
            audio_codec: 'aac'
          }
        ],
        eager_async: true,
        context: {
          userId,
          prompt,
          aspectRatio,
          duration,
          resolution
        }
      });

      // Generate thumbnail
      const thumbnail = await this.generateThumbnail(videoResult.url, {
        public_id: `${this.thumbnailFolder}/${filename}_thumb`
      });

      console.log('✅ Local video processing completed successfully');

      return {
        video: videoResult,
        thumbnail: thumbnail,
        metadata: {
          userId,
          prompt,
          aspectRatio,
          duration,
          resolution,
          processedAt: new Date()
        }
      };

    } catch (error) {
      console.error('❌ Local video processing failed:', error);
      throw new Error(`Failed to process local video: ${error.message}`);
    }
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  async getHealthStatus() {
    try {
      // Test Cloudinary connection
      const testResult = await cloudinary.api.ping();

      return {
        status: 'healthy',
        cloudinary: testResult.status === 'ok' ? 'connected' : 'disconnected',
        maxVideoSize: `${this.maxVideoSize / 1024 / 1024}MB`,
        supportedFormats: this.supportedFormats,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }
}

// Create and export singleton instance
const videoProcessingService = new VideoProcessingService();

module.exports = {
  videoProcessingService,
  VideoProcessingService
};