const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Post = require('../models/Post');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class AIContentGenerator {
  constructor() {
    // Initialize Google Gemini
    this.geminiAPI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Initialize OpenAI (fallback for image generation)
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Image generation configuration
    this.imageProvider = process.env.IMAGE_PROVIDER || 'gemini'; // 'gemini', 'dalle', or 'stable-diffusion'
    this.vertexAIEndpoint = process.env.VERTEX_AI_ENDPOINT;
    this.googleCloudProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

    // Content generation prompts by tone
    this.tonePrompts = {
      professional: "Create professional, business-focused content that is informative and authoritative.",
      casual: "Create casual, conversational content that feels friendly and approachable.",
      friendly: "Create warm, friendly content that connects with people on a personal level.",
      authoritative: "Create authoritative content that demonstrates expertise and builds trust.",
      humorous: "Create engaging content with appropriate humor that entertains while informing.",
      inspirational: "Create motivational and inspiring content that uplifts and encourages action."
    };

    // Content length guidelines
    this.lengthGuidelines = {
      short: "Keep it under 100 words, perfect for quick engagement.",
      medium: "Aim for 100-250 words, providing good detail without being overwhelming.",
      long: "Write 250-500 words, providing comprehensive information and insights."
    };
  }

  /**
   * Generate AI content based on schedule configuration
   * @param {Object} schedule - The automation schedule
   * @param {string} userId - User ID for the post
   * @returns {Object} Generated post data
   */
  async generateContent(schedule, userId) {
    try {
      const { aiConfig } = schedule.content;
      const contentType = this.getRandomContentType(aiConfig.contentTypes);
      const topic = this.getRandomTopic(aiConfig.topics);

      let generatedContent = {};

      switch (contentType) {
        case 'text':
          generatedContent = await this.generateTextContent(topic, aiConfig);
          break;
        case 'image':
          generatedContent = await this.generateImageContent(topic, aiConfig);
          break;
        case 'quote':
          generatedContent = await this.generateQuoteContent(topic, aiConfig);
          break;
        default:
          throw new Error(`Unsupported content type: ${contentType}`);
      }

      // Create post object
      const postData = {
        userId: userId,
        content: {
          text: generatedContent.text,
          hashtags: generatedContent.hashtags || []
        },
        media: generatedContent.media || [],
        status: aiConfig.requireApproval ? 'pending_approval' : 'draft',
        isAiGenerated: true,
        aiGeneration: {
          prompt: generatedContent.prompt,
          topic: topic,
          tone: aiConfig.tone,
          contentType: contentType,
          generatedAt: new Date(),
          generationModel: aiConfig.generationModel || 'gemini-2.5-flash',
          generationCost: generatedContent.cost || 0
        },
        scheduling: {
          type: 'automated',
          automationRuleId: schedule._id
        },
        approval: {
          status: aiConfig.requireApproval ? 'pending' : 'approved'
        }
      };

      if (aiConfig.requireApproval) {
        // Generate approval token for email links
        const post = new Post(postData);
        await post.generateApprovalToken();
        return post;
      }

      return new Post(postData);
    } catch (error) {
      console.error('Error generating AI content:', error);
      throw error;
    }
  }

  /**
   * Generate text content using Gemini
   */
  async generateTextContent(topic, aiConfig) {
    try {
      const model = this.geminiAPI.getGenerativeModel({ model: aiConfig.generationModel || 'gemini-2.5-flash' });

      const prompt = this.buildTextPrompt(topic, aiConfig);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract hashtags if needed
      let hashtags = [];
      if (aiConfig.includeHashtags) {
        hashtags = await this.generateHashtags(topic, aiConfig.tone, aiConfig.maxHashtags);
      }

      return {
        text: this.cleanGeneratedText(text),
        hashtags: hashtags,
        prompt: prompt,
        cost: this.calculateGeminiCost(text)
      };
    } catch (error) {
      console.error('Error generating text content:', error);
      throw error;
    }
  }

  /**
   * Generate image content using configured provider (Gemini/Google or DALL-E)
   */
  async generateImageContent(topic, aiConfig) {
    try {
      // First generate a text caption
      const textContent = await this.generateTextContent(topic, aiConfig);

      // Generate image prompt based on topic and tone
      const imagePrompt = this.buildImagePrompt(topic, aiConfig.tone);

      // Generate image using configured provider
      let imageResult;
      switch (this.imageProvider) {
        case 'gemini':
          imageResult = await this.generateImageWithGemini(imagePrompt);
          break;
        case 'dalle':
          imageResult = await this.generateImageWithDALLE(imagePrompt);
          break;
        default:
          // Fallback to DALL-E if Gemini fails
          try {
            imageResult = await this.generateImageWithGemini(imagePrompt);
          } catch (geminiError) {
            console.warn('Gemini image generation failed, falling back to DALL-E:', geminiError.message);
            imageResult = await this.generateImageWithDALLE(imagePrompt);
          }
      }

      // Download and save image locally (optional)
      const savedImagePath = await this.downloadAndSaveImage(imageResult.url, topic);

      return {
        text: textContent.text,
        hashtags: textContent.hashtags,
        media: [{
          type: 'image',
          url: imageResult.url,
          localPath: savedImagePath,
          altText: `AI generated image about ${topic}`,
          prompt: imagePrompt
        }],
        prompt: `Text: ${textContent.prompt}\nImage: ${imagePrompt}`,
        cost: textContent.cost + imageResult.cost
      };
    } catch (error) {
      console.error('Error generating image content:', error);
      throw error;
    }
  }

  /**
   * Generate quote content
   */
  async generateQuoteContent(topic, aiConfig) {
    try {
      const model = this.geminiAPI.getGenerativeModel({ model: aiConfig.generationModel || 'gemini-2.5-flash' });

      const prompt = this.buildQuotePrompt(topic, aiConfig.tone);
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const quote = response.text();

      // Generate background image for the quote
      const imagePrompt = `Create a beautiful, minimalist background for an inspirational quote about ${topic}. Clean design, subtle colors, professional look suitable for social media.`;

      let media = [];
      let imageCost = 0;
      try {
        // Use configured image provider
        let imageResult;
        switch (this.imageProvider) {
          case 'gemini':
            imageResult = await this.generateImageWithGemini(imagePrompt);
            break;
          case 'dalle':
            imageResult = await this.generateImageWithDALLE(imagePrompt);
            break;
          default:
            try {
              imageResult = await this.generateImageWithGemini(imagePrompt);
            } catch (geminiError) {
              console.warn('Gemini image generation failed for quote, falling back to DALL-E:', geminiError.message);
              imageResult = await this.generateImageWithDALLE(imagePrompt);
            }
        }

        const savedImagePath = await this.downloadAndSaveImage(imageResult.url, `quote-${topic}`);

        media = [{
          type: 'image',
          url: imageResult.url,
          localPath: savedImagePath,
          altText: `Quote background for ${topic}`,
          prompt: imagePrompt
        }];

        imageCost = imageResult.cost;
      } catch (imageError) {
        console.warn('Failed to generate quote background image:', imageError.message);
      }

      let hashtags = [];
      if (aiConfig.includeHashtags) {
        hashtags = await this.generateHashtags(topic, aiConfig.tone, aiConfig.maxHashtags);
      }

      return {
        text: this.cleanGeneratedText(quote),
        hashtags: hashtags,
        media: media,
        prompt: prompt,
        cost: this.calculateGeminiCost(quote) + imageCost
      };
    } catch (error) {
      console.error('Error generating quote content:', error);
      throw error;
    }
  }

  /**
   * Generate relevant hashtags
   */
  async generateHashtags(topic, tone, maxCount) {
    try {
      const model = this.geminiAPI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `Generate ${maxCount} relevant, popular hashtags for a ${tone} social media post about "${topic}".
      Return only the hashtags, each starting with #, separated by spaces.
      Make them specific, relevant, and likely to get good engagement.
      Example format: #technology #innovation #business #growth #success`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const hashtagText = response.text();

      // Extract hashtags using regex
      const hashtags = hashtagText.match(/#[a-zA-Z0-9_]+/g) || [];

      return hashtags.slice(0, maxCount);
    } catch (error) {
      console.error('Error generating hashtags:', error);
      return [];
    }
  }

  /**
   * Build text generation prompt
   */
  buildTextPrompt(topic, aiConfig) {
    const toneGuidance = this.tonePrompts[aiConfig.tone] || this.tonePrompts.professional;
    const lengthGuidance = this.lengthGuidelines[aiConfig.contentLength] || this.lengthGuidelines.medium;

    const keywords = aiConfig.keywords && aiConfig.keywords.length > 0
      ? `Incorporate these keywords naturally: ${aiConfig.keywords.join(', ')}.`
      : '';

    return `Create engaging social media content about "${topic}".

Style Guidelines:
- ${toneGuidance}
- ${lengthGuidance}
- ${keywords}
- Make it engaging and shareable
- Use clear, concise language
- Include a call-to-action when appropriate
- Do not include hashtags in the main text

Topic: ${topic}
Tone: ${aiConfig.tone}

Write the social media post:`;
  }

  /**
   * Build image generation prompt
   */
  buildImagePrompt(topic, tone) {
    const styleMap = {
      professional: "clean, professional, business-style",
      casual: "casual, friendly, approachable",
      friendly: "warm, welcoming, people-focused",
      authoritative: "strong, confident, expert-level",
      humorous: "fun, engaging, slightly playful",
      inspirational: "uplifting, motivational, bright"
    };

    const style = styleMap[tone] || styleMap.professional;

    return `Create a ${style} image related to ${topic}. High quality, social media ready, visually appealing, modern design. Suitable for professional social media platforms.`;
  }

  /**
   * Build quote generation prompt
   */
  buildQuotePrompt(topic, tone) {
    const toneGuidance = this.tonePrompts[tone] || this.tonePrompts.professional;

    return `Generate an inspiring and thought-provoking quote related to "${topic}".

Guidelines:
- ${toneGuidance}
- Make it memorable and shareable
- Keep it concise but impactful
- Suitable for social media
- Should inspire action or reflection
- Do not include attribution unless it's a famous saying

Create a powerful quote about ${topic}:`;
  }

  /**
   * Clean generated text from AI
   */
  cleanGeneratedText(text) {
    return text
      .trim()
      .replace(/\*\*/g, '') // Remove markdown bold
      .replace(/\*/g, '') // Remove markdown italic
      .replace(/^"|"$/g, '') // Remove surrounding quotes
      .replace(/\n{3,}/g, '\n\n'); // Limit line breaks
  }

  /**
   * Calculate Gemini API cost (rough estimate)
   */
  calculateGeminiCost(text) {
    // Rough cost calculation for Gemini
    const tokens = text.split(' ').length * 1.3; // Approximate token count
    return (tokens / 1000000) * 0.00015; // $0.00015 per 1K tokens (rough estimate)
  }

  /**
   * Download and save generated image
   */
  async downloadAndSaveImage(imageUrl, topicName) {
    try {
      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();

      const filename = `ai-generated-${Date.now()}-${topicName.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
      const filePath = path.join(__dirname, '../uploads/ai-images', filename);

      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      // Save file
      await fs.writeFile(filePath, Buffer.from(buffer));

      return filePath;
    } catch (error) {
      console.error('Error saving image:', error);
      return null;
    }
  }

  /**
   * Generate image using Gemini/Google Vertex AI (Imagen)
   */
  async generateImageWithGemini(prompt) {
    try {
      // For now, use Google's Vertex AI Imagen if available
      // This requires proper Google Cloud setup and authentication
      if (this.vertexAIEndpoint && this.googleCloudProjectId) {
        const response = await this.callVertexAIImagen(prompt);
        return {
          url: response.imageUrl,
          cost: 0.02 // Estimated cost for Vertex AI Imagen
        };
      } else {
        // Alternative: Use Gemini to generate a very detailed prompt and then use a free/alternative service
        // For now, we'll enhance the prompt and use it with a hypothetical Gemini image service
        const enhancedPrompt = await this.enhancePromptWithGemini(prompt);

        // Mock Gemini image generation (replace with actual API when available)
        return await this.generateMockGeminiImage(enhancedPrompt);
      }
    } catch (error) {
      console.error('Error with Gemini image generation:', error);
      throw error;
    }
  }

  /**
   * Generate image using OpenAI DALL-E
   */
  async generateImageWithDALLE(prompt) {
    try {
      const imageResponse = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        size: "1024x1024",
        quality: "standard",
        n: 1,
      });

      return {
        url: imageResponse.data[0].url,
        cost: 0.04 // DALL-E 3 standard cost
      };
    } catch (error) {
      console.error('Error with DALL-E image generation:', error);
      throw error;
    }
  }

  /**
   * Call Google Vertex AI Imagen API
   */
  async callVertexAIImagen(prompt) {
    try {
      // This would require proper Google Cloud authentication
      // For now, this is a placeholder for the actual implementation
      const response = await axios.post(
        `${this.vertexAIEndpoint}/v1/projects/${this.googleCloudProjectId}/locations/us-central1/publishers/google/models/imagegeneration:predict`,
        {
          instances: [
            {
              prompt: prompt
            }
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: "1:1",
            safetyFilterLevel: "block_some",
            personGeneration: "allow_adult"
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.GOOGLE_CLOUD_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        imageUrl: response.data.predictions[0].bytesBase64Encoded // This would need to be converted to URL
      };
    } catch (error) {
      console.error('Error calling Vertex AI Imagen:', error);
      throw error;
    }
  }

  /**
   * Enhance prompt using Gemini for better image generation
   */
  async enhancePromptWithGemini(originalPrompt) {
    try {
      const model = this.geminiAPI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const enhancementPrompt = `Enhance this image generation prompt to be more detailed, specific, and likely to produce high-quality results:

Original prompt: "${originalPrompt}"

Make it more descriptive by adding:
- Specific visual details
- Art style or photography style
- Lighting conditions
- Color scheme suggestions
- Composition details

Return only the enhanced prompt, no explanation:`;

      const result = await model.generateContent(enhancementPrompt);
      const response = await result.response;
      const enhancedPrompt = response.text().trim();

      return enhancedPrompt || originalPrompt;
    } catch (error) {
      console.error('Error enhancing prompt with Gemini:', error);
      return originalPrompt;
    }
  }

  /**
   * Mock Gemini image generation (placeholder for actual implementation)
   */
  async generateMockGeminiImage(prompt) {
    try {
      // For now, fall back to DALL-E with enhanced prompt
      // In the future, this would be replaced with actual Gemini image generation API
      console.log('Using enhanced Gemini prompt with DALL-E fallback:', prompt);

      const imageResponse = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        size: "1024x1024",
        quality: "standard",
        n: 1,
      });

      return {
        url: imageResponse.data[0].url,
        cost: 0.04 // DALL-E cost (will be updated when real Gemini pricing is available)
      };
    } catch (error) {
      console.error('Error with mock Gemini image generation:', error);
      throw error;
    }
  }

  /**
   * Get random content type from array
   */
  getRandomContentType(contentTypes) {
    if (!contentTypes || contentTypes.length === 0) return 'text';
    return contentTypes[Math.floor(Math.random() * contentTypes.length)];
  }

  /**
   * Get random topic from array
   */
  getRandomTopic(topics) {
    if (!topics || topics.length === 0) return 'general business insights';
    return topics[Math.floor(Math.random() * topics.length)];
  }

  /**
   * Test content generation
   */
  async testGeneration(topic = "artificial intelligence", tone = "professional", contentType = "text") {
    const mockAiConfig = {
      topics: [topic],
      tone: tone,
      contentLength: 'medium',
      contentTypes: [contentType],
      includeHashtags: true,
      maxHashtags: 5,
      requireApproval: true,
      generationModel: 'gemini-2.5-flash'
    };

    const mockSchedule = {
      _id: 'test-schedule-id',
      content: {
        type: 'ai-generated',
        aiConfig: mockAiConfig
      }
    };

    return await this.generateContent(mockSchedule, 'test-user-id');
  }
}

module.exports = AIContentGenerator;