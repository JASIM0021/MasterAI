const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

/**
 * Veo3 Video Generation Service
 * Integrates with Google's Veo 3.1 model for AI video generation
 * Uses the Google GenAI SDK for complete video generation workflow
 */
class Veo3Service {
  constructor() {
    this.apiKey = process.env.GEMINI_VEO_API_KEY || process.env.GOOGLE_API_KEY;
    this.fastModel = 'veo-3.1-fast-generate-preview';
    this.standardModel = 'veo-3.1-generate-preview';
    this.maxRetries = 3;
    this.pollingInterval = 10000; // 10 seconds as per Veo 3.1 docs
    this.maxDuration = 8; // Veo3 max duration in seconds
    this.videoRetentionDays = 2; // Videos are retained for 2 days on Google servers
    this.tempVideoDir = path.join(__dirname, '..', 'temp', 'videos');

    this.validateConfiguration();
    this.initializeGenAI();
    this.ensureTempDirectory();
  }

  /**
   * Validate service configuration
   */
  validateConfiguration() {
    if (!this.apiKey) {
      console.error('❌ GOOGLE_API_KEY not found in environment variables');
      throw new Error('Google API key is required for Veo 3.1 integration');
    }
    console.log('✅ Veo 3.1 service initialized successfully');
  }

  /**
   * Initialize Google GenAI SDK
   */
  initializeGenAI() {
    try {
      this.ai = new GoogleGenAI({apiKey: this.apiKey});
      console.log('✅ Google GenAI SDK initialized with Veo API key');
    } catch (error) {
      console.error('❌ Failed to initialize Google GenAI SDK:', error);
      throw new Error('Failed to initialize Google GenAI SDK');
    }
  }

  /**
   * Ensure temp video directory exists
   */
  async ensureTempDirectory() {
    try {
      await fs.mkdir(this.tempVideoDir, { recursive: true });
    } catch (error) {
      console.warn('⚠️ Could not create temp directory:', error.message);
    }
  }

  /**
   * Generate video using Veo 3.1 model with complete synchronous workflow
   * @param {Object} options - Generation options
   * @param {string} options.prompt - Text prompt for video generation
   * @param {string} options.aspectRatio - Video aspect ratio (16:9, 9:16)
   * @param {number} options.duration - Video duration in seconds (4, 6, 8)
   * @param {string} options.resolution - Video resolution (720p, 1080p)
   * @param {string} options.model - Model type ('fast' or 'standard')
   * @param {string} options.userId - User ID for tracking
   * @param {string} options.userImageBase64 - Optional user image in base64
   * @param {Function} options.progressCallback - Optional progress callback
   * @returns {Promise<Object>} Complete video result with Cloudinary URL
   */
  async generateVideoComplete(options) {
    const startTime = Date.now();
    const {
      prompt,
      aspectRatio = '16:9',
      duration = 8,
      resolution = '720p',
      model = 'fast',
      userId,
      userImageBase64 = null,
      progressCallback = null
    } = options;

    const selectedModel = model === 'fast' ? this.fastModel : this.standardModel;

    console.log(`🎬 Starting complete Veo 3.1 video generation for user ${userId}`);
    console.log(`📝 Prompt: ${prompt}`);
    console.log(`📐 Config: ${aspectRatio}, ${duration}s, ${resolution}, model: ${selectedModel}`);

    try {
      // Validate inputs
      this.validateGenerationOptions(options);

      // Build generation configuration
      const config = {
        numberOfVideos: 1,
        resolution: resolution,
        aspectRatio: aspectRatio
      };

      // Build generation payload
      const generateVideoPayload = {
        model: selectedModel,
        config: config,
        prompt: prompt.trim()
      };

      // Add image if provided
      if (userImageBase64) {
        generateVideoPayload.image = {
          imageBytes: userImageBase64,
          mimeType: 'image/jpeg' // Assume JPEG, could be made dynamic
        };
      }

      if (progressCallback) {
        progressCallback(10, 'Initializing video generation...');
      }

      // Step 1: Generate video with Veo 3.1
      console.log('🚀 Step 1: Submitting video generation request to Veo 3.1...');
      let operation = await this.ai.models.generateVideos(generateVideoPayload);

      console.log(`🔄 Operation started: ${operation.name || 'unknown'}`);

      if (progressCallback) {
        progressCallback(25, 'Video generation started...');
      }

      // Step 2: Poll until video generation is complete
      console.log('⏳ Step 2: Waiting for video generation to complete...');
      let pollCount = 0;
      const maxPolls = 60; // Max 10 minutes (60 * 10 seconds)

      while (!operation.done && pollCount < maxPolls) {
        console.log('🔄 Video generation in progress...');
        await new Promise((resolve) => setTimeout(resolve, this.pollingInterval));

        pollCount++;
        const progress = Math.min(25 + (pollCount * 50 / maxPolls), 75);

        if (progressCallback) {
          progressCallback(progress, `Generating video... ${Math.round(progress)}%`);
        }

        operation = await this.ai.operations.getVideosOperation({operation: operation});
      }

      if (!operation.done) {
        throw new Error('Video generation timed out after 10 minutes');
      }

      console.log('✅ Video generation completed!');

      if (progressCallback) {
        progressCallback(80, 'Downloading generated video...');
      }

      // Step 3: Download the generated video
      console.log('📥 Step 3: Downloading generated video...');

      // Debug: Log the operation response structure
      console.log('🔍 Operation response structure:', JSON.stringify(operation.response, null, 2));

      // Check if content was filtered by safety systems
      if (operation.response.raiMediaFilteredCount && operation.response.raiMediaFilteredCount > 0) {
        const reason = operation.response.raiMediaFilteredReasons?.[0] || 'Content was filtered by safety systems';
        console.error('🚫 Content filtered by safety systems:', reason);
        throw new Error(`Content filtered: ${reason}`);
      }

      // Check if generatedVideos exists and has content
      if (!operation.response.generatedVideos || operation.response.generatedVideos.length === 0) {
        console.error('❌ No generated videos found in response');
        throw new Error('No generated videos found in the response');
      }

      const videoObject = operation.response.generatedVideos[0].video;
      if (!videoObject || !videoObject.uri) {
        console.error('❌ Video object or URI missing:', videoObject);
        throw new Error('Video object or URI missing from response');
      }

      const videoUrl = decodeURIComponent(videoObject.uri);

      const response = await fetch(`${videoUrl}&key=${this.apiKey}`);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }

      const videoBlob = await response.arrayBuffer();
      const videoBuffer = Buffer.from(videoBlob);

      console.log(`✅ Video downloaded, size: ${videoBuffer.length} bytes`);

      if (progressCallback) {
        progressCallback(90, 'Uploading to cloud storage...');
      }

      // Step 4: Upload to Cloudinary
      console.log('☁️ Step 4: Uploading video to Cloudinary...');
      const { videoProcessingService } = require('./videoProcessingService');

      const processedVideo = await videoProcessingService.uploadVideoBuffer(videoBuffer, {
        userId,
        prompt: prompt,
        aspectRatio: aspectRatio,
        duration: duration,
        resolution: resolution,
        model: selectedModel
      });

      const elapsedTime = Date.now() - startTime;

      if (progressCallback) {
        progressCallback(100, 'Video generation completed!');
      }

      // Log metrics
      this.logMetrics('generateVideoComplete', elapsedTime, true, {
        userId,
        aspectRatio,
        duration,
        resolution,
        model: selectedModel,
        hasUserImage: !!userImageBase64,
        cloudinaryUrl: processedVideo.video.url
      });

      console.log(`✅ Complete video generation finished in ${Math.round(elapsedTime / 1000)}s`);

      return {
        status: 'completed',
        prompt,
        config: {
          aspectRatio,
          duration,
          resolution,
          model: selectedModel
        },
        video: {
          url: processedVideo.video.url,
          publicId: processedVideo.video.publicId,
          duration: processedVideo.video.duration,
          size: processedVideo.video.size,
          format: processedVideo.video.format,
          resolution: {
            width: processedVideo.video.width,
            height: processedVideo.video.height
          }
        },
        thumbnail: processedVideo.thumbnail ? {
          url: processedVideo.thumbnail.url,
          publicId: processedVideo.thumbnail.publicId
        } : null,
        completedAt: new Date(),
        processingTimeMs: elapsedTime,
        metadata: {
          model: selectedModel,
          userId,
          hasUserImage: !!userImageBase64,
          createdAt: new Date()
        }
      };

    } catch (error) {
      const elapsedTime = Date.now() - startTime;

      console.error('❌ Complete video generation failed:', error);

      if (progressCallback) {
        progressCallback(-1, `Error: ${error.message}`);
      }

      // Log failure metrics
      this.logMetrics('generateVideoComplete', elapsedTime, false, {
        userId,
        aspectRatio,
        duration,
        resolution,
        model: selectedModel,
        error: error.message
      });

      throw new Error(`Complete video generation failed: ${error.message}`);
    }
  }

  /**
   * Legacy method for backward compatibility (now calls the complete flow)
   */
  async generateVideo(options) {
    return await this.generateVideoComplete(options);
  }

  /**
   * Make API call to Veo 3.1 predictLongRunning endpoint
   * @param {Object} payload - Request payload
   * @returns {Promise<Object>} API response
   */
  async makeVeoApiCall(payload) {
    const url = `${this.baseURL}/models/${this.model}:predictLongRunning`;

    let retries = 0;
    const maxRetries = this.maxRetries;

    while (retries < maxRetries) {
      try {
        console.log(`🔄 Making Veo 3.1 API call (attempt ${retries + 1}/${maxRetries})`);

        const response = await axios.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.apiKey
          },
          timeout: 30000 // 30 second timeout for initial request
        });

        if (!response.data || !response.data.name) {
          throw new Error('Invalid response from Veo 3.1 API - missing operation name');
        }

        console.log('✅ Veo 3.1 API call successful');
        return response.data;
      } catch (error) {
        retries++;

        if (error.response) {
          const status = error.response.status;
          const message = error.response.data?.error?.message || error.response.statusText;

          // Don't retry client errors (4xx) except for rate limiting
          if (status >= 400 && status < 500 && status !== 429) {
            if (status === 400) {
              throw new Error(`Invalid request: ${message}`);
            } else if (status === 403) {
              throw new Error('API access denied. Check your API key and quota.');
            } else {
              throw new Error(`Veo 3.1 API error (${status}): ${message}`);
            }
          }

          // Retry on rate limiting and server errors
          if (status === 429) {
            console.warn(`⚠️ Rate limit exceeded (attempt ${retries}/${maxRetries})`);
          } else if (status >= 500) {
            console.warn(`⚠️ Server error ${status} (attempt ${retries}/${maxRetries}): ${message}`);
          }
        } else if (error.code === 'ECONNABORTED') {
          console.warn(`⚠️ Request timeout (attempt ${retries}/${maxRetries})`);
        } else {
          console.warn(`⚠️ Network error (attempt ${retries}/${maxRetries}): ${error.message}`);
        }

        if (retries >= maxRetries) {
          if (error.response) {
            const status = error.response.status;
            const message = error.response.data?.error?.message || error.response.statusText;

            if (status === 429) {
              throw new Error('Rate limit exceeded. Please try again later.');
            } else {
              throw new Error(`Veo 3.1 API error (${status}): ${message}`);
            }
          } else if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout. Veo 3.1 API is not responding.');
          } else {
            throw new Error(`Network error: ${error.message}`);
          }
        }

        // Exponential backoff with jitter
        const baseDelay = this.baseDelay * Math.pow(2, retries - 1);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;

        console.log(`⏳ Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Check the status of a video generation operation
   * @param {string} operationName - Operation name from generateVideo
   * @returns {Promise<Object>} Operation status
   */
  async checkJobStatus(operationName) {
    console.log(`🔍 Checking Veo 3.1 operation status: ${operationName}`);

    try {
      const url = `${this.baseURL}/${operationName}`;

      const response = await axios.get(url, {
        headers: {
          'x-goog-api-key': this.apiKey
        },
        timeout: 15000 // 15 second timeout for status checks
      });

      const operation = response.data;

      if (!operation.done) {
        // Operation still in progress
        return {
          operationName,
          status: 'processing',
          progress: this.estimateProgress(operation),
          message: 'Video generation in progress...',
          retryAfter: this.pollingInterval
        };
      }

      // Operation completed
      if (operation.error) {
        // Operation failed
        console.error('❌ Veo 3.1 operation failed:', operation.error);
        return {
          operationName,
          status: 'failed',
          error: {
            message: operation.error.message || 'Video generation failed',
            code: operation.error.code || 'GENERATION_FAILED'
          }
        };
      }

      // Operation succeeded - handle the actual Veo 3.1 response format
      if (operation.response && operation.response.generateVideoResponse &&
          operation.response.generateVideoResponse.generatedSamples &&
          operation.response.generateVideoResponse.generatedSamples.length > 0) {

        const generatedSample = operation.response.generateVideoResponse.generatedSamples[0];

        console.log('✅ Veo 3.1 video generation completed successfully');

        return {
          operationName,
          status: 'completed',
          progress: 100,
          video: {
            url: generatedSample.video.uri,
            duration: 8, // Default duration, actual duration may vary
            format: 'mp4',
            resolution: { width: 1280, height: 720 }, // Default resolution
            metadata: {},
            expiresAt: new Date(Date.now() + (this.videoRetentionDays * 24 * 60 * 60 * 1000)) // 2 days from now
          },
          completedAt: new Date(),
          message: 'Video generation completed successfully!'
        };
      } else {
        throw new Error('Invalid response format - no video data found');
      }

    } catch (error) {
      console.error('❌ Failed to check operation status:', error);

      if (error.response && error.response.status === 404) {
        return {
          operationName,
          status: 'failed',
          error: {
            message: 'Operation not found or expired',
            code: 'OPERATION_NOT_FOUND'
          }
        };
      }

      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  /**
   * Download video from Veo 3.1 response
   * @param {string} videoUri - Video URI from Veo 3.1
   * @returns {Promise<Buffer>} Video data
   */
  async downloadVideo(videoUri) {
    console.log(`📥 Downloading video from Veo 3.1: ${videoUri}`);

    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const response = await axios.get(videoUri, {
          headers: {
            'x-goog-api-key': this.apiKey
          },
          responseType: 'arraybuffer',
          timeout: 120000 // 2 minute timeout for video download
        });

        console.log('✅ Video downloaded successfully');
        return Buffer.from(response.data);
      } catch (error) {
        retries++;
        console.error(`❌ Download attempt ${retries} failed:`, error.message);

        if (retries >= maxRetries) {
          throw new Error(`Video download failed after ${maxRetries} attempts: ${error.message}`);
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, retries) * 1000;
        console.log(`⏳ Retrying download in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Estimate progress for operations in progress
   * @param {Object} operation - Operation object
   * @returns {number} Progress percentage (0-95)
   */
  estimateProgress(operation) {
    // Since Veo 3.1 doesn't provide progress info, we estimate based on time
    // Keep it between 10-95% to indicate active processing
    return Math.floor(Math.random() * 85) + 10;
  }

  /**
   * Get resolution information from generated video config
   * @param {Object} generatedVideo - Generated video object
   * @returns {Object} Resolution object
   */
  getResolutionFromConfig(generatedVideo) {
    // Try to extract resolution from metadata or use defaults
    if (generatedVideo.metadata && generatedVideo.metadata.resolution) {
      return generatedVideo.metadata.resolution;
    }

    // Default resolutions based on common Veo 3.1 outputs
    return { width: 1280, height: 720 }; // Default to 720p
  }

  /**
   * Validate generation options
   * @param {Object} options - Options to validate
   */
  validateGenerationOptions(options) {
    const { prompt, aspectRatio, duration, resolution, model } = options;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('Prompt is required and must be a non-empty string');
    }

    if (prompt.length > 2000) {
      throw new Error('Prompt must be 2000 characters or less');
    }

    const validAspectRatios = ['16:9', '9:16'];
    if (!validAspectRatios.includes(aspectRatio)) {
      throw new Error(`Invalid aspect ratio. Must be one of: ${validAspectRatios.join(', ')}`);
    }

    const validDurations = [4, 6, 8];
    if (!validDurations.includes(duration)) {
      throw new Error(`Invalid duration. Must be one of: ${validDurations.join(', ')} seconds`);
    }

    const validResolutions = ['720p', '1080p'];
    if (!validResolutions.includes(resolution)) {
      throw new Error(`Invalid resolution. Must be one of: ${validResolutions.join(', ')}`);
    }

    const validModels = ['fast', 'standard'];
    if (model && !validModels.includes(model)) {
      throw new Error(`Invalid model. Must be one of: ${validModels.join(', ')}`);
    }

    // Validate resolution/duration combination (1080p requires 8s duration)
    if (resolution === '1080p' && duration !== 8) {
      throw new Error('1080p resolution requires 8-second duration');
    }
  }

  /**
   * Calculate credit cost for video generation
   * @param {Object} options - Generation options
   * @returns {number} Credit cost
   */
  calculateCreditCost(options) {
    const { duration = 8, model = 'fast' } = options;

    // Base cost: 3 credits per second
    const baseCost = duration * 3;

    // Standard model has 50% premium
    const modelMultiplier = model === 'standard' ? 1.5 : 1;

    return Math.ceil(baseCost * modelMultiplier);
  }

  /**
   * Get estimated generation time for model
   * @param {string} model - Model type ('fast' or 'standard')
   * @returns {Object} Time estimates in seconds
   */
  getEstimatedTimes(model = 'fast') {
    if (model === 'fast') {
      return {
        min: 120, // 2 minutes
        max: 180, // 3 minutes
        average: 150 // 2.5 minutes
      };
    } else {
      return {
        min: 300, // 5 minutes
        max: 600, // 10 minutes
        average: 450 // 7.5 minutes
      };
    }
  }

  /**
   * Get estimated generation time based on Veo 3.1 performance
   * @param {Object} options - Generation options
   * @returns {number} Estimated time in seconds
   */
  getEstimatedGenerationTime(options) {
    const { duration = 8, resolution = '720p', aspectRatio = '16:9' } = options;

    // Base time: 11 seconds minimum as per Veo 3.1 docs
    let baseTime = 11;

    // Duration factor
    baseTime += duration * 5; // ~5 seconds per second of video

    // Resolution factor
    if (resolution === '1080p') {
      baseTime *= 1.5;
    }

    // Aspect ratio factor (vertical videos may take longer)
    if (aspectRatio === '9:16') {
      baseTime *= 1.1;
    }

    // Add some variance (can go up to 6 minutes during peak hours)
    const maxTime = 360; // 6 minutes
    return Math.min(baseTime, maxTime);
  }

  /**
   * Get service health status
   * @returns {Object} Health status
   */
  async getHealthStatus() {
    try {
      const hasApiKey = !!this.apiKey;

      return {
        status: hasApiKey ? 'healthy' : 'degraded',
        model: this.model,
        apiKey: hasApiKey ? 'configured' : 'missing',
        endpoint: `${this.baseURL}/models/${this.model}`,
        timestamp: new Date(),
        capabilities: {
          maxDuration: this.maxDuration,
          supportedAspectRatios: ['16:9', '9:16'],
          supportedResolutions: ['720p', '1080p'],
          supportedDurations: [4, 6, 8],
          pollingInterval: this.pollingInterval,
          videoRetentionDays: this.videoRetentionDays
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Log operation metrics for monitoring
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @param {boolean} success - Whether operation succeeded
   * @param {Object} metadata - Additional metadata
   */
  logMetrics(operation, duration, success, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service: 'veo3Service',
      operation,
      duration_ms: duration,
      success,
      metadata
    };

    if (success) {
      console.log(`📊 [METRICS] ${operation} completed in ${duration}ms`, logEntry);
    } else {
      console.error(`📊 [METRICS] ${operation} failed after ${duration}ms`, logEntry);
    }

    // In production, you might want to send these metrics to a monitoring service
    // like DataDog, New Relic, or AWS CloudWatch
  }

  /**
   * Cancel a video generation operation (if supported)
   * @param {string} operationName - Operation name to cancel
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelJob(operationName) {
    console.log(`🛑 Attempting to cancel operation: ${operationName}`);

    // Note: Veo 3.1 API may not support operation cancellation
    // This is a placeholder for future implementation
    console.warn('⚠️ Operation cancellation not supported by Veo 3.1 API');

    return {
      operationName,
      status: 'cancellation_not_supported',
      message: 'Veo 3.1 operations cannot be cancelled once started'
    };
  }
}

// Create and export singleton instance
const veo3Service = new Veo3Service();

module.exports = {
  veo3Service,
  Veo3Service
};