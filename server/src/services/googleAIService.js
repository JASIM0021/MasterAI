const { GoogleGenerativeAI } = require('@google/generative-ai');
const { GoogleAIFileManager } = require('@google/generative-ai/server');
const config = require('../config/config');
const fs = require('fs');
const path = require('path');
const { uploadBase64Image } = require('../../services/cloudinaryService');
const Type = require('../Type');

// Path to the directory containing the images
const uploadDir = path.join(__dirname, '../../uploads/images');
// Initialize Google Generative AI and File Manager
const genAI = new GoogleGenerativeAI(config.apiKey);
const fileManager = new GoogleAIFileManager(config.apiKey);

const uploadFileToGoogleAI = async (filePath, mimeType, displayName) => {
  console.log('Uploading....');
  return await fileManager.uploadFile(filePath, {
    mimeType,
    displayName,
  });
};

const generationConfig = {
  type: 'object',
  properties: {
    answers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
          },
          answer: {
            type: 'string',
          },
        },
        required: ['question', 'answer'],
      },
    },
  },
  required: ['answers'],
};

const prompt = `
Please analyze the uploaded image/video and provide answers to the  questions it contains.

- Return the answers as a JSON string without any code block formatting or additional annotations.
- If none of the provided options match the correct answer, ignore all options and provide the most accurate answer directly(with proper reson).

For MCQs, use this format:
{
  "answers": [
    {
      "question": "[Full question]",
      "answer": "A) Correct answer"
    },
    ...
  ]
}

For any other questio (non-mcq) questions or answers not fitting the MCQ format, use this format:
{
  "answers": [
    {
      "question": "[Full question]",
      "answer": "Correct answer with explanation or reasoning"
    },
    ...
  ]
}

`;

// const prompt = 'answer the all question of this given image';

// {
//   "answers": [
//     {
//       "question": "Question text",
//       "answer": "Correct answer"
//     },
//     ...
//   ]
//     'also ignore any '\' or \n in this json like :- '\n'  '\"answers\": '
// }`

const coddingType = {
  type: 'object',
  properties: {
    understanding_approch: {
      type: 'string',
    },
    code_with_comments: {
      type: 'string',
    },
    question: {
      type: 'string',
    },
  },
  required: ['understanding_approch', 'code_with_comments', 'question'],
};

const multilanguageResponse = {
  type: 'object',
  properties: {
    response: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sciencetificName: {
            type: 'string',
          },
          hindi: {
            type: 'string',
          },
          benguli: {
            type: 'string',
          },
          English: {
            type: 'string',
          },
        },
        required: ['sciencetificName', 'hindi', 'benguli', 'English'],
      },
    },
  },
  required: ['response'],
};

const storyresponse = {
  type: 'object',
  properties: {
    response: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          story: {
            type: 'string',
          },
        },
        required: ['story'],
      },
    },
  },
  required: ['response'],
};

const handlePrompt = (type, body) => {
  console.log('body?.language', body);
  if (type == Type.CAPTION) {
    return {
      prompt: `Generate 10+ unique and engaging captions for this image to use on my social media platforms:

1. Focus on the theme: ${body?.category || 'General'}
2. For each caption, provide:
   a) A short, catchy version (30-50 characters)
   b) An extended version (200-300 characters)
3. Ensure captions are creative, relevant to the image, and optimized for social media engagement
4. Include appropriate emojis where suitable
5. Language: ${body?.language || 'English'}
6. Incorporate trending hashtags related to the image content (max 3 per caption)
7. Vary the tone and style across captions (e.g., humorous, inspirational, informative)
8. Consider the platform-specific best practices for caption writing
`,
      generationConfig: {
        type: 'object',
        properties: {
          response: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sortcaption: {
                  type: 'string',
                },
                longcaption: {
                  type: 'string',
                },
              },
              required: ['sortcaption', 'longcaption'],
            },
          },
        },
        required: ['response'],
      },
    };
  } else if (type == Type.POST) {
    return {
      prompt: `Create 5+  detailed posts (at least 500 characters each) based on the uploaded photo. in ${body?.language ? body?.language : 'English'
        } for my ${body?.platform} account  . hastag alwase in english`,
      generationConfig: {
        type: 'object',
        properties: {
          response: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                post: {
                  type: 'string',
                },
                hasttag: {
                  type: 'string',
                },
              },
              required: ['post', 'hasttag'],
            },
          },
        },
        required: ['response'],
      },
    };
  } else if (type == Type.FACEBOOK) {
    return {
      prompt:
        'Create three engaging Social Media posts inspired by the uploaded photo. Each post should convey a unique message about my experiences, achievements, or insights, and maintain a friendly and relatable tone. Encourage friends to interact and share their thoughts. Include relevant hashtags for each post, without mentioning the photo description.',
      generationConfig: {
        type: 'object',
        properties: {
          response: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                post: {
                  type: 'string',
                },
                hasttag: {
                  type: 'string',
                },
              },
              required: ['post', 'hasttag'],
            },
          },
        },
        required: ['response'],
      },
    };
  } else if (type == Type.FEELING) {
    return {
      prompt: `
      Name: ${body?.personName},
      Age: ${body?.personAge},
      Gender: ${body?.personGender},

Analyze the feelings and thoughts of the person in the given picture. Always provide a response for the user's feelings, even if it's challenging to determine. If uncertain, make an educated guess based on visual cues. Use emojis for better visualization.

Your analysis should include:
1. A detailed description of the person's apparent emotional state
2. Possible thoughts or concerns they might have
3. Any notable body language or facial expressions
4. Contextual factors in the image that might influence their mood

Remember to express the analysis in ${body?.language ? body?.language : 'English'
        }.

Important: Always provide a feeling analysis, avoiding phrases like "it's not possible to determine". Use your best judgment based on the available information.
`,
      generationConfig: {
        type: 'object',
        properties: {
          response: {
            type: 'object',
            properties: {
              thought: {
                type: 'string',
              },
              feeling: {
                type: 'string',
              },
              sentiment: {
                type: 'string',
              },
            },
            required: ['thought', 'feeling', 'sentiment'],
          },
        },
        required: ['response'],
      },
    };
  } else if (type == Type.MATHSOLVER) {
    return {
      prompt: `
Analyze and solve the mathematical problem presented in the image. Follow these steps carefully:

1. Problem Identification: 🔍
   - Clearly state the type of mathematical problem (e.g., arithmetic, algebra, geometry, calculus).
   - List all given information and variables.

2. Solution Approach: 🧠
   - Outline the general method or theorem to be used.
   - Break down the solution into logical steps.

3. Step-by-Step Solution: 📝
   - Show each step of the calculation process.
   - Double-check all calculations for accuracy.
   - Explain the reasoning behind each step.
   - Pay extra attention to basic arithmetic operations to avoid errors.

4. Final Answer: 🎯
   - Clearly state the final result.
   - Include units if applicable.
   - Verify the answer by substituting it back into the original problem.

5. Verification: ✅
   - Perform a reverse calculation to check the answer's correctness.
   - If applicable, solve the problem using an alternative method to confirm the result.

6. Additional Insights: 💡
   - Provide any relevant mathematical concepts or alternative approaches.

Please express the solution in ${body?.language ? body?.language : 'English'}.
- dont use any markdown or code block in your response
- use emojies for better visualization
Important: Always provide a complete and accurate solution. Double-check all calculations, especially basic arithmetic, to ensure correctness. If you're unsure about any step, indicate that clearly and provide the best possible approach. Remember that even simple calculations can lead to errors, so take extra care with every step.
`,
      generationConfig: {
        type: 'object',
        properties: {
          response: {
            type: 'object',
            properties: {
              problemType: {
                type: 'string',
              },
              givenInformation: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              solutionApproach: {
                type: 'string',
              },
              stepByStepSolution: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
              finalAnswer: {
                type: 'string',
              },
              verificationMethod: {
                type: 'string',
              },
              additionalInsights: {
                type: 'string',
              },
            },
            required: [
              'problemType',
              'givenInformation',
              'solutionApproach',
              'stepByStepSolution',
              'finalAnswer',
              'verificationMethod',
            ],
          },
        },
        required: ['response'],
      },
    };
  } else if (type == Type.AGE) {
    return {
      prompt: 'estimate user age from this photo',
      generationConfig: {
        type: 'object',
        properties: {
          response: {
            type: 'integer',
          },
        },
        required: ['response'],
      },
    };
  } else if (type == Type.TREE) {
    return {
      prompt: `analize the tree name from the given picture .`,
      generationConfig: {
        type: 'object',
        properties: {
          response: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sciencetificName: {
                  type: 'string',
                },
                hindi: {
                  type: 'string',
                },
                benguli: {
                  type: 'string',
                },
                English: {
                  type: 'string',
                },
              },
              required: ['sciencetificName', 'hindi', 'benguli', 'English'],
            },
          },
        },
        required: ['response'],
      },
    };
  } else if (type == Type.ANIMAL) {
    return {
      prompt: 'analize the animal name from the given picture .',
      generationConfig: {
        type: 'object',
        properties: {
          response: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sciencetificName: {
                  type: 'string',
                },
                hindi: {
                  type: 'string',
                },
                benguli: {
                  type: 'string',
                },
                English: {
                  type: 'string',
                },
              },
              required: ['sciencetificName', 'hindi', 'benguli', 'English'],
            },
          },
        },
        required: ['response'],
      },
    };
  } else if (type == Type.QUATE) {
    return {
      prompt: 'write some quate for this pic',
      generationConfig: multilanguageResponse,
    };
  } else if (type == Type.CUSTOM) {
    return {
      prompt: body?.prompt,
      generationConfig: multilanguageResponse,
    };
  } else if (type == Type.CheckPrompt) {
    return {
      prompt: body?.prompt,
      generationConfig: {
        type: 'object',
        properties: {
          response: {
            type: 'object',
            properties: {
              verifiedPrompt: {
                type: 'string',
              },
            },
            required: ['verifiedPrompt'],
          },
        },
        required: ['response'],
      },
    };
  } else if (type == Type.STORY) {
    return {
      prompt: `craft a story Topic :- ${body?.topic ? body?.topic : 'random'
        } use emojies for itractive in ${body?.language ? body.language : 'English'
        } language`,
      generationConfig: storyresponse,
    };
  } else if (type == Type.getCoding) {
    return {
      prompt: `${body?.prompt}`,
      generationConfig: coddingType,
    };
  } else {
    return {
      prompt: prompt,
      generationConfig: generationConfig,
    };
  }
};

const generateMCQAnswers = async (fileUri, mimeType, type = '', body) => {
  // const model = genAI.getGenerativeModel({
  //   model: 'gemini-1.5-pro',

  //   // generationConfig: {
  //   //   responseMimeType: "application/json"
  //   // }
  // });

  const { prompt, generationConfig } = handlePrompt(type, body);

  let model = genAI.getGenerativeModel({
    model: process.env.GIMINI_MODEL, // gemini-2.0-flash-thinking-exp-01-21
    // Set the `responseMimeType` to output JSON
    // Pass the schema object to the `responseSchema` field
    generationConfig: {
      temperature: 0.5,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: generationConfig,
    },
  });
  const result = await model.generateContent([
    {
      fileData: {
        mimeType,
        fileUri,
      },
    },
    { text: prompt },
  ]);
  return result.response.text();
};

const generateCustom = async (type = '', body) => {
  // const model = genAI.getGenerativeModel({
  //   model: 'gemini-1.5-pro',

  //   // generationConfig: {
  //   //   responseMimeType: "application/json"
  //   // }
  // });
  console.log('body', body);
  const { prompt, generationConfig } = handlePrompt(type, body);

  let model = genAI.getGenerativeModel({
    model: process.env.GIMINI_MODEL,
    // Set the `responseMimeType` to output JSON
    // Pass the schema object to the `responseSchema` field
    generationConfig: {
      temperature: 0,
      topP: 1,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: generationConfig,
    },
  });
  const result = await model.generateContent([{ text: prompt }]);
  return result.response.text();
};

const generateCode = async (type = '', body) => {
  console.log('body', body);
  const { prompt, generationConfig } = handlePrompt(type, body);

  let model = genAI.getGenerativeModel({
    model: process.env.GIMINI_MODEL,
    // Set the `responseMimeType` to output JSON
    // Pass the schema object to the `responseSchema` field
    generationConfig: {
      temperature: 0,
      topP: 1,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: generationConfig,
    },
  });
  const result = await model.generateContent([{ text: prompt }]);
  return result.response.text();
};

// Automation-specific content generation for scheduler workflow
const generateAutomationContent = async (schedule) => {
  console.log('🤖 Generating automation content for schedule:', schedule.name);

  const aiConfig = schedule.content.aiConfig || {};
  const platforms = schedule.targetPlatforms.map(p => p.platform).join(', ');
  const contentType = aiConfig.contentType || 'text'; // Default to text if not specified

  console.log('📋 Content type:', contentType);

  // Generate content based on the selected content type
  switch (contentType) {
    case 'image':
      console.log('🖼️ Generating image post...');
      try {
        const textContent = await generateTextContent(schedule, platforms, aiConfig);
        const imageData = await generateImageForAutomation(textContent, aiConfig);

        return {
          type: 'image',
          text: textContent.text,
          hashtags: textContent.hashtags,
          mentions: textContent.mentions,
          image: imageData,
          generatedAt: new Date()
        };
      } catch (error) {
        console.warn('⚠️ Image generation failed, falling back to text content:', error.message);
        // Fallback to text content if image generation fails
        const textContent = await generateTextContent(schedule, platforms, aiConfig);
        return {
          type: 'text',
          text: textContent.text,
          hashtags: textContent.hashtags,
          mentions: textContent.mentions,
          generatedAt: new Date(),
          fallbackReason: 'Image generation failed'
        };
      }

    case 'quote':
      console.log('💭 Generating quote post...');
      const quoteContent = await generateQuoteContent(schedule, platforms, aiConfig);

      return {
        type: 'quote',
        text: quoteContent.text,
        author: quoteContent.author,
        hashtags: quoteContent.hashtags,
        mentions: quoteContent.mentions,
        generatedAt: new Date()
      };

    case 'text':
    default:
      console.log('📝 Generating text post...');
      const regularTextContent = await generateTextContent(schedule, platforms, aiConfig);

      return {
        type: 'text',
        text: regularTextContent.text,
        hashtags: regularTextContent.hashtags,
        mentions: regularTextContent.mentions,
        generatedAt: new Date()
      };
  }
};

// Generate text content for automation
const generateTextContent = async (schedule, platforms, aiConfig) => {
  const prompt = createAutomationPrompt(schedule, platforms, aiConfig);

  const generationConfig = {
    type: 'object',
    properties: {
      response: {
        type: 'object',
        properties: {
          postContent: {
            type: 'string',
          },
          hashtags: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        required: ['postContent', 'hashtags'],
      },
    },
    required: ['response'],
  };

  let model = genAI.getGenerativeModel({
    model: process.env.GIMINI_MODEL,
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: generationConfig,
    },
  });

  const result = await model.generateContent([{ text: prompt }]);
  const response = JSON.parse(result.response.text());

  return {
    text: response.response.postContent,
    hashtags: formatHashtags(response.response.hashtags || []),
    mentions: extractMentions(response.response.postContent)
  };
};

// Generate quote content for automation
const generateQuoteContent = async (schedule, platforms, aiConfig) => {
  const quotePrompt = createQuotePrompt(schedule, platforms, aiConfig);

  const generationConfig = {
    type: 'object',
    properties: {
      response: {
        type: 'object',
        properties: {
          quote: {
            type: 'string',
          },
          author: {
            type: 'string',
          },
          hashtags: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        required: ['quote', 'author', 'hashtags'],
      },
    },
    required: ['response'],
  };

  let model = genAI.getGenerativeModel({
    model: process.env.GIMINI_MODEL,
    generationConfig: {
      temperature: 0.8,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: generationConfig,
    },
  });

  const result = await model.generateContent([{ text: quotePrompt }]);
  const response = JSON.parse(result.response.text());

  return {
    text: `"${response.response.quote}" - ${response.response.author}`,
    author: response.response.author,
    hashtags: formatHashtags(response.response.hashtags || []),
    mentions: extractMentions(response.response.quote)
  };
};

// Generate image for automation post
const generateImageForAutomation = async (textContent, aiConfig) => {
  try {
    // Create image generation prompt based on the text content
    const imagePrompt = createImagePrompt(textContent.text, aiConfig);
    console.log('🎨 Image generation prompt:', imagePrompt);

    const generationConfig = {
      temperature: 0.8,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: 8192,
    };

    // Use Gemini's image generation model
    let model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-image',
      generationConfig: generationConfig,
    });

    const result = await model.generateContent([
      { text: imagePrompt }
    ]);

    console.log('✅ Image generated successfully for automation');

    // Extract base64 image data directly from the response
    let base64ImageData = null;

    // Check if response has parts with inline data (image)
    if (result.response.candidates && result.response.candidates[0]) {
      const candidate = result.response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            base64ImageData = part.inlineData.data;
            break;
          }
        }
      }
    }

    if (!base64ImageData) {
      console.log('Response structure:', JSON.stringify(result.response, null, 2));
      throw new Error('No image data found in Google AI response');
    }

    console.log('☁️ Uploading generated image to Cloudinary...');

    // Upload the generated image to Cloudinary
    const cloudinaryResult = await uploadBase64Image(base64ImageData, {
      folder: 'automation-generated-images',
      use_filename: false,
      unique_filename: true,
      transformation: [
        { width: 1080, height: 1080, crop: 'fill' }, // Instagram square format
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });

    console.log('✅ Image uploaded to Cloudinary successfully');

    return {
      url: cloudinaryResult.url,
      public_id: cloudinaryResult.public_id,
      width: cloudinaryResult.width,
      height: cloudinaryResult.height,
      format: cloudinaryResult.format,
      prompt: imagePrompt,
      generatedAt: new Date(),
      model: 'gemini-2.5-flash-image'
    };
  } catch (error) {
    console.error('❌ Image generation or upload failed for automation:', error);
    throw new Error(`Image generation/upload failed: ${error.message}`);
  }
};

// Create automation-specific text prompt
const createAutomationPrompt = (schedule, platforms, aiConfig) => {
  const topic = aiConfig.topics && aiConfig.topics.length > 0 ? aiConfig.topics[0] : aiConfig.topic || 'general content';
  const tone = aiConfig.tone || 'professional';
  const keywords = aiConfig.keywords && aiConfig.keywords.length > 0 ? aiConfig.keywords.join(', ') : '';
  const includeHashtags = aiConfig.includeHashtags !== false;
  const maxHashtags = aiConfig.maxHashtags || 5;
  const contentLength = aiConfig.contentLength || 'medium';
  const language = aiConfig.language || 'English';

  return `Create an engaging social media post for ${platforms} with the following specifications:

📝 Content Requirements:
- Topic: ${topic}
- Tone: ${tone}
- Language: ${language}
- Content Length: ${contentLength} (${getContentLengthTarget(contentLength)} characters)
${keywords ? `- Keywords to include: ${keywords}` : ''}

📱 Social Media Optimization:
- Platform: ${platforms}
- Make it engaging and shareable
- Encourage interaction (likes, comments, shares)
- Use compelling storytelling or hooks
${includeHashtags ? `- Include ${maxHashtags} relevant hashtags (single words only, no spaces or special characters)` : ''}

🎯 Requirements:
- Write in ${language}
- Be authentic and relatable
- Include a clear call-to-action
- Optimize for ${platforms} best practices

Please generate compelling content that would perform well on social media and encourage engagement.`;
};

// Create image generation prompt based on text content
const createImagePrompt = (textContent, aiConfig) => {
  const topic = aiConfig.topics && aiConfig.topics.length > 0 ? aiConfig.topics[0] : aiConfig.topic || 'social media';
  const tone = aiConfig.tone || 'professional';

  return `Create a visually appealing and professional social media image that complements this post content:

"${textContent}"

Image Requirements:
- Topic/Theme: ${topic}
- Style: ${tone} and modern
- Social media optimized (square or landscape format)
- High quality and visually engaging
- Suitable for social media platforms
- Include relevant visual elements that support the message
- Use appealing colors and composition
- Professional design that would attract engagement

Make the image eye-catching and aligned with the post content to maximize social media engagement.`;
};

// Create quote generation prompt
const createQuotePrompt = (schedule, platforms, aiConfig) => {
  const topic = aiConfig.topics && aiConfig.topics.length > 0 ? aiConfig.topics[0] : aiConfig.topic || 'inspiration';
  const tone = aiConfig.tone || 'inspirational';
  const keywords = aiConfig.keywords && aiConfig.keywords.length > 0 ? aiConfig.keywords.join(', ') : '';
  const includeHashtags = aiConfig.includeHashtags !== false;
  const maxHashtags = aiConfig.maxHashtags || 5;
  const language = aiConfig.language || 'English';

  return `Generate an inspiring and meaningful quote for social media with the following specifications:

💭 Quote Requirements:
- Topic/Theme: ${topic}
- Tone: ${tone}
- Language: ${language}
- Quote length: 20-100 words (concise and impactful)
${keywords ? `- Keywords to include: ${keywords}` : ''}

📱 Social Media Context:
- Platform: ${platforms}
- Make it shareable and memorable
- Should encourage reflection or motivation
- Use compelling and thought-provoking language
${includeHashtags ? `- Include ${maxHashtags} relevant hashtags (single words only, no spaces or special characters)` : ''}

👤 Author Requirements:
- Provide a believable author name (can be fictional but should sound realistic)
- Choose an author that fits the quote's theme and style
- Author should be appropriate for the ${tone} tone

🎯 Requirements:
- Write in ${language}
- Create original, inspiring content
- Make it suitable for social media sharing
- Ensure the quote is meaningful and engaging

Please generate a powerful quote that would resonate with social media audiences and encourage sharing.`;
};

// Helper function for content length targets
const getContentLengthTarget = (length) => {
  switch (length.toLowerCase()) {
    case 'short': return '50-100';
    case 'medium': return '100-200';
    case 'long': return '200-400';
    default: return '100-200';
  }
};

// Extract mentions from text (helper function if not already defined)
const extractMentions = (text) => {
  const mentionRegex = /@[\w]+/g;
  const matches = text.match(mentionRegex);
  return matches || [];
};

// Format hashtags to meet Post model validation requirements
const formatHashtags = (hashtags) => {
  if (!Array.isArray(hashtags)) {
    return [];
  }

  return hashtags
    .map(tag => {
      // Remove any existing # and clean the tag
      let cleanTag = tag.replace(/^#+/, '').trim();

      // Remove spaces and special characters, keep only alphanumeric and underscores
      cleanTag = cleanTag.replace(/[^a-zA-Z0-9_]/g, '');

      // Skip empty tags
      if (!cleanTag) {
        return null;
      }

      // Add # prefix and return
      return `#${cleanTag}`;
    })
    .filter(tag => tag !== null) // Remove null values
    .slice(0, 10); // Limit to 10 hashtags max
};

const deleteFileFromGoogleAI = async fileUri => {
  try {
    await fileManager.deleteFile(fileUri);
    return true; // File deleted successfully
  } catch (error) {
    console.error('Error deleting file:', error);
    return false; // Error deleting file
  }
};

// Function to ensure the directory exists
const ensureDirectoryExists = dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Directory created: ${dir}`);
  }
};

// Ensure the directory exists before reading or writing files
ensureDirectoryExists(uploadDir);

const deleteAllLocalFiles = () => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error('Failed to read directory:', err);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(uploadDir, file);

      fs.unlink(filePath, err => {
        if (err) {
          console.error('Failed to delete file:', err);
        } else {
          console.log(`Successfully deleted: ${filePath}`);
        }
      });
    });
  });
};

module.exports = {
  uploadFileToGoogleAI,
  generateMCQAnswers,
  deleteFileFromGoogleAI,
  deleteAllLocalFiles,
  generateCustom,
  generateCode,
  generateAutomationContent,
};
