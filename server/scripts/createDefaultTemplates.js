const mongoose = require('mongoose');
const dotenv = require('dotenv');
const VideoTemplate = require('../models/VideoTemplate');

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/master-ai', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Default video templates data
const defaultTemplates = [
  // ================= MARKETING & BUSINESS =================
  {
    name: "Product Showcase",
    description: "Professional product presentation with sleek transitions and modern aesthetics",
    category: "marketing",
    prompt: "Create a professional product showcase video with smooth camera movements, elegant lighting, and clean backgrounds. Show the product from multiple angles with sleek transitions between shots. Use modern, minimalist aesthetics with sophisticated color grading.",
    tags: ["product", "showcase", "professional", "marketing", "business"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/product-showcase.jpg",
      alt: "Product showcase template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/product-showcase-demo.mp4",
      duration: 8,
      aspectRatio: "16:9"
    },
    config: {
      duration: 8,
      aspectRatio: "16:9",
      quality: "high",
      aiSettings: {
        creativity: 0.6,
        guidance: 8
      }
    },
    supportsUserPhoto: true,
    photoPromptTemplate: "Create a professional product showcase video featuring {USER_PHOTO}. Use smooth camera movements, elegant lighting, and clean backgrounds. Show the product from multiple angles with sleek transitions between shots. Use modern, minimalist aesthetics with sophisticated color grading.",
    difficulty: "beginner",
    estimatedTime: 25,
    sortOrder: 1
  },
  {
    name: "Brand Story",
    description: "Compelling brand narrative with emotional storytelling and cinematic visuals",
    category: "marketing",
    prompt: "Create an inspiring brand story video with cinematic camera work, warm color tones, and emotional narrative flow. Include authentic moments, lifestyle scenes, and meaningful connections. Use dynamic transitions and compelling visual metaphors.",
    tags: ["brand", "story", "narrative", "emotional", "cinematic"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/brand-story.jpg",
      alt: "Brand story template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/brand-story-demo.mp4",
      duration: 8,
      aspectRatio: "16:9"
    },
    config: {
      duration: 8,
      aspectRatio: "16:9",
      quality: "high",
      aiSettings: {
        creativity: 0.8,
        guidance: 7
      }
    },
    supportsUserPhoto: false,
    difficulty: "intermediate",
    estimatedTime: 30,
    sortOrder: 2
  },
  {
    name: "Service Explainer",
    description: "Clear and engaging service demonstration with step-by-step visual breakdown",
    category: "business",
    prompt: "Create a clear service explainer video with step-by-step visual breakdown. Use clean animations, professional graphics, and easy-to-follow sequences. Include modern UI elements and smooth transitions between concepts.",
    tags: ["service", "explainer", "tutorial", "business", "professional"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/service-explainer.jpg",
      alt: "Service explainer template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/service-explainer-demo.mp4",
      duration: 8,
      aspectRatio: "16:9"
    },
    config: {
      duration: 8,
      aspectRatio: "16:9",
      quality: "standard",
      aiSettings: {
        creativity: 0.5,
        guidance: 9
      }
    },
    supportsUserPhoto: false,
    difficulty: "beginner",
    estimatedTime: 20,
    sortOrder: 3
  },
  {
    name: "Testimonial Style",
    description: "Authentic customer testimonial format with warm, trustworthy atmosphere",
    category: "marketing",
    prompt: "Create an authentic testimonial-style video with warm lighting, natural settings, and trustworthy atmosphere. Use close-up shots, genuine expressions, and comfortable environments. Include subtle background elements that convey reliability.",
    tags: ["testimonial", "customer", "authentic", "trust", "review"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/testimonial.jpg",
      alt: "Testimonial template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/testimonial-demo.mp4",
      duration: 8,
      aspectRatio: "16:9"
    },
    config: {
      duration: 8,
      aspectRatio: "16:9",
      quality: "standard",
      aiSettings: {
        creativity: 0.4,
        guidance: 8
      }
    },
    supportsUserPhoto: true,
    photoPromptTemplate: "Create an authentic testimonial-style video featuring {USER_PHOTO} as the speaker. Use warm lighting, natural settings, and trustworthy atmosphere. Show genuine expressions and comfortable environments.",
    difficulty: "beginner",
    estimatedTime: 18,
    sortOrder: 4
  },
  {
    name: "Company Culture",
    description: "Dynamic workplace showcase highlighting team collaboration and company values",
    category: "business",
    prompt: "Create a vibrant company culture video showcasing team collaboration, modern office environments, and positive energy. Use dynamic camera movements, natural lighting, and authentic workplace moments. Include diverse team interactions and creative spaces.",
    tags: ["company", "culture", "team", "workplace", "collaboration"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/company-culture.jpg",
      alt: "Company culture template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/company-culture-demo.mp4",
      duration: 8,
      aspectRatio: "16:9"
    },
    config: {
      duration: 8,
      aspectRatio: "16:9",
      quality: "standard",
      aiSettings: {
        creativity: 0.7,
        guidance: 7
      }
    },
    supportsUserPhoto: false,
    difficulty: "intermediate",
    estimatedTime: 25,
    sortOrder: 5
  },

  // ================= CREATIVE & ARTISTIC =================
  {
    name: "Abstract Art",
    description: "Mesmerizing abstract visuals with flowing colors and artistic transitions",
    category: "creative",
    prompt: "Create a mesmerizing abstract art video with flowing colors, organic shapes, and hypnotic movements. Use vibrant color palettes, smooth morphing transitions, and ethereal lighting effects. Include particle systems and fluid dynamics.",
    tags: ["abstract", "art", "creative", "colorful", "artistic"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/abstract-art.jpg",
      alt: "Abstract art template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/abstract-art-demo.mp4",
      duration: 8,
      aspectRatio: "1:1"
    },
    config: {
      duration: 8,
      aspectRatio: "1:1",
      quality: "high",
      aiSettings: {
        creativity: 0.9,
        guidance: 5
      }
    },
    supportsUserPhoto: false,
    difficulty: "advanced",
    estimatedTime: 35,
    sortOrder: 6
  },
  {
    name: "Nature Scenes",
    description: "Serene natural landscapes with peaceful ambiance and organic beauty",
    category: "creative",
    prompt: "Create a serene nature scene video with peaceful landscapes, gentle wildlife, and organic beauty. Use natural lighting, soft focus effects, and calming movements. Include elements like flowing water, swaying trees, and golden hour lighting.",
    tags: ["nature", "landscape", "peaceful", "organic", "serene"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/nature-scenes.jpg",
      alt: "Nature scenes template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/nature-scenes-demo.mp4",
      duration: 8,
      aspectRatio: "16:9"
    },
    config: {
      duration: 8,
      aspectRatio: "16:9",
      quality: "high",
      aiSettings: {
        creativity: 0.6,
        guidance: 6
      }
    },
    supportsUserPhoto: false,
    difficulty: "beginner",
    estimatedTime: 22,
    sortOrder: 7
  },
  {
    name: "Artistic Portrait",
    description: "Stylized portrait with creative lighting and artistic visual effects",
    category: "artistic",
    prompt: "Create an artistic portrait video with dramatic lighting, creative shadows, and stylized visual effects. Use cinematic color grading, elegant camera movements, and sophisticated composition. Include artistic elements like lens flares and depth of field.",
    tags: ["portrait", "artistic", "dramatic", "cinematic", "stylized"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/artistic-portrait.jpg",
      alt: "Artistic portrait template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/artistic-portrait-demo.mp4",
      duration: 8,
      aspectRatio: "9:16"
    },
    config: {
      duration: 8,
      aspectRatio: "9:16",
      quality: "high",
      aiSettings: {
        creativity: 0.8,
        guidance: 7
      }
    },
    supportsUserPhoto: true,
    photoPromptTemplate: "Create an artistic portrait video featuring {USER_PHOTO} with dramatic lighting, creative shadows, and stylized visual effects. Use cinematic color grading and sophisticated composition.",
    difficulty: "intermediate",
    estimatedTime: 28,
    sortOrder: 8
  },
  {
    name: "Creative Transition",
    description: "Dynamic transitions with geometric patterns and modern motion graphics",
    category: "creative",
    prompt: "Create a dynamic video focused on creative transitions with geometric patterns, modern motion graphics, and seamless morphing effects. Use bold colors, clean lines, and rhythmic movements that sync with visual beats.",
    tags: ["transition", "geometric", "motion", "graphics", "dynamic"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/creative-transition.jpg",
      alt: "Creative transition template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/creative-transition-demo.mp4",
      duration: 8,
      aspectRatio: "1:1"
    },
    config: {
      duration: 8,
      aspectRatio: "1:1",
      quality: "standard",
      aiSettings: {
        creativity: 0.8,
        guidance: 6
      }
    },
    supportsUserPhoto: false,
    difficulty: "intermediate",
    estimatedTime: 24,
    sortOrder: 9
  },
  {
    name: "Minimalist Design",
    description: "Clean minimalist aesthetics with elegant simplicity and sophisticated elements",
    category: "artistic",
    prompt: "Create a minimalist design video with clean aesthetics, elegant simplicity, and sophisticated elements. Use negative space effectively, subtle movements, and monochromatic or muted color palettes. Focus on geometric precision and balanced composition.",
    tags: ["minimalist", "clean", "elegant", "simple", "sophisticated"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/minimalist-design.jpg",
      alt: "Minimalist design template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/minimalist-design-demo.mp4",
      duration: 8,
      aspectRatio: "16:9"
    },
    config: {
      duration: 8,
      aspectRatio: "16:9",
      quality: "standard",
      aiSettings: {
        creativity: 0.4,
        guidance: 8
      }
    },
    supportsUserPhoto: false,
    difficulty: "beginner",
    estimatedTime: 20,
    sortOrder: 10
  },

  // ================= SOCIAL MEDIA =================
  {
    name: "Instagram Reel",
    description: "Trendy vertical video optimized for Instagram Reels with dynamic pacing",
    category: "social_media",
    prompt: "Create a trendy Instagram Reel with dynamic pacing, quick cuts, and engaging visual hooks. Use vertical format, vibrant colors, and modern effects. Include trending elements like text overlays, smooth transitions, and eye-catching moments.",
    tags: ["instagram", "reel", "trendy", "vertical", "social"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/instagram-reel.jpg",
      alt: "Instagram Reel template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/instagram-reel-demo.mp4",
      duration: 8,
      aspectRatio: "9:16"
    },
    config: {
      duration: 8,
      aspectRatio: "9:16",
      quality: "high",
      aiSettings: {
        creativity: 0.8,
        guidance: 6
      }
    },
    supportsUserPhoto: true,
    photoPromptTemplate: "Create a trendy Instagram Reel featuring {USER_PHOTO} with dynamic pacing, quick cuts, and engaging visual hooks. Use vertical format and modern effects.",
    difficulty: "beginner",
    estimatedTime: 20,
    sortOrder: 11
  },
  {
    name: "TikTok Style",
    description: "Engaging TikTok-style content with quick transitions and viral appeal",
    category: "social_media",
    prompt: "Create an engaging TikTok-style video with quick transitions, viral appeal, and attention-grabbing moments. Use fast-paced editing, trending effects, and interactive elements. Include dynamic movements and catchy visual hooks.",
    tags: ["tiktok", "viral", "quick", "engaging", "trending"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/tiktok-style.jpg",
      alt: "TikTok style template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/tiktok-style-demo.mp4",
      duration: 8,
      aspectRatio: "9:16"
    },
    config: {
      duration: 8,
      aspectRatio: "9:16",
      quality: "standard",
      aiSettings: {
        creativity: 0.9,
        guidance: 5
      }
    },
    supportsUserPhoto: true,
    photoPromptTemplate: "Create an engaging TikTok-style video featuring {USER_PHOTO} with quick transitions, viral appeal, and attention-grabbing moments.",
    difficulty: "beginner",
    estimatedTime: 18,
    sortOrder: 12
  },
  {
    name: "YouTube Short",
    description: "Optimized YouTube Shorts format with strong hooks and clear messaging",
    category: "social_media",
    prompt: "Create a YouTube Shorts video with strong opening hooks, clear messaging, and optimized vertical format. Use engaging thumbnails moments, smooth pacing, and compelling visual storytelling that keeps viewers watching.",
    tags: ["youtube", "shorts", "hooks", "messaging", "vertical"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/youtube-short.jpg",
      alt: "YouTube Short template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/youtube-short-demo.mp4",
      duration: 8,
      aspectRatio: "9:16"
    },
    config: {
      duration: 8,
      aspectRatio: "9:16",
      quality: "high",
      aiSettings: {
        creativity: 0.7,
        guidance: 7
      }
    },
    supportsUserPhoto: false,
    difficulty: "beginner",
    estimatedTime: 22,
    sortOrder: 13
  },
  {
    name: "Story Template",
    description: "Perfect for Instagram/Facebook Stories with engaging visual flow",
    category: "social_media",
    prompt: "Create an Instagram/Facebook Story template with engaging visual flow, story-friendly proportions, and interactive elements. Use bold text, vibrant backgrounds, and smooth animations that work well in vertical story format.",
    tags: ["story", "instagram", "facebook", "vertical", "interactive"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/story-template.jpg",
      alt: "Story template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/story-template-demo.mp4",
      duration: 8,
      aspectRatio: "9:16"
    },
    config: {
      duration: 8,
      aspectRatio: "9:16",
      quality: "standard",
      aiSettings: {
        creativity: 0.6,
        guidance: 7
      }
    },
    supportsUserPhoto: true,
    photoPromptTemplate: "Create an Instagram/Facebook Story featuring {USER_PHOTO} with engaging visual flow and interactive elements. Use bold design and story-friendly proportions.",
    difficulty: "beginner",
    estimatedTime: 15,
    sortOrder: 14
  },
  {
    name: "Trending Effect",
    description: "Latest social media trends with popular effects and viral elements",
    category: "social_media",
    prompt: "Create a video using the latest social media trends with popular effects, viral elements, and current aesthetics. Include trending filters, modern transitions, and effects that are currently popular across social platforms.",
    tags: ["trending", "viral", "effects", "popular", "current"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/trending-effect.jpg",
      alt: "Trending effect template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/trending-effect-demo.mp4",
      duration: 8,
      aspectRatio: "9:16"
    },
    config: {
      duration: 8,
      aspectRatio: "9:16",
      quality: "high",
      aiSettings: {
        creativity: 0.9,
        guidance: 5
      }
    },
    supportsUserPhoto: true,
    photoPromptTemplate: "Create a video featuring {USER_PHOTO} using the latest social media trends with popular effects and viral elements.",
    difficulty: "intermediate",
    estimatedTime: 26,
    sortOrder: 15
  },

  // ================= EDUCATIONAL =================
  {
    name: "Tutorial Style",
    description: "Clear educational content with step-by-step visual guidance",
    category: "educational",
    prompt: "Create a clear tutorial-style video with step-by-step visual guidance, clean layouts, and educational flow. Use clear annotations, smooth demonstrations, and easy-to-follow sequences that make learning engaging.",
    tags: ["tutorial", "educational", "step-by-step", "learning", "clear"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/tutorial-style.jpg",
      alt: "Tutorial style template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/tutorial-style-demo.mp4",
      duration: 8,
      aspectRatio: "16:9"
    },
    config: {
      duration: 8,
      aspectRatio: "16:9",
      quality: "standard",
      aiSettings: {
        creativity: 0.4,
        guidance: 9
      }
    },
    supportsUserPhoto: false,
    difficulty: "beginner",
    estimatedTime: 20,
    sortOrder: 16
  },
  {
    name: "Infographic Animation",
    description: "Animated infographics with data visualization and informative content",
    category: "educational",
    prompt: "Create an animated infographic video with data visualization, charts, graphs, and informative content. Use clean design, smooth animations, and clear visual hierarchy to present information effectively.",
    tags: ["infographic", "data", "visualization", "animated", "informative"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/infographic-animation.jpg",
      alt: "Infographic animation template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/infographic-animation-demo.mp4",
      duration: 8,
      aspectRatio: "16:9"
    },
    config: {
      duration: 8,
      aspectRatio: "16:9",
      quality: "high",
      aiSettings: {
        creativity: 0.5,
        guidance: 8
      }
    },
    supportsUserPhoto: false,
    difficulty: "intermediate",
    estimatedTime: 30,
    sortOrder: 17
  },
  {
    name: "Learning Content",
    description: "Engaging educational material with interactive learning elements",
    category: "educational",
    prompt: "Create engaging learning content with interactive elements, visual aids, and educational storytelling. Use friendly aesthetics, clear explanations, and memorable visual metaphors that enhance understanding.",
    tags: ["learning", "educational", "interactive", "engaging", "storytelling"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/learning-content.jpg",
      alt: "Learning content template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/learning-content-demo.mp4",
      duration: 8,
      aspectRatio: "16:9"
    },
    config: {
      duration: 8,
      aspectRatio: "16:9",
      quality: "standard",
      aiSettings: {
        creativity: 0.6,
        guidance: 7
      }
    },
    supportsUserPhoto: false,
    difficulty: "beginner",
    estimatedTime: 25,
    sortOrder: 18
  },

  // ================= LIFESTYLE =================
  {
    name: "Travel Vlog",
    description: "Adventure-filled travel content with scenic views and wanderlust appeal",
    category: "lifestyle",
    prompt: "Create an adventure-filled travel vlog with scenic views, wanderlust appeal, and authentic travel moments. Use dynamic camera movements, beautiful landscapes, and lifestyle elements that inspire exploration.",
    tags: ["travel", "vlog", "adventure", "scenic", "wanderlust"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/travel-vlog.jpg",
      alt: "Travel vlog template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/travel-vlog-demo.mp4",
      duration: 8,
      aspectRatio: "16:9"
    },
    config: {
      duration: 8,
      aspectRatio: "16:9",
      quality: "high",
      aiSettings: {
        creativity: 0.7,
        guidance: 6
      }
    },
    supportsUserPhoto: true,
    photoPromptTemplate: "Create an adventure-filled travel vlog featuring {USER_PHOTO} with scenic views, wanderlust appeal, and authentic travel moments.",
    difficulty: "intermediate",
    estimatedTime: 28,
    sortOrder: 19
  },
  {
    name: "Daily Life",
    description: "Authentic daily moments with cozy, relatable lifestyle content",
    category: "lifestyle",
    prompt: "Create authentic daily life content with cozy, relatable moments and lifestyle aesthetics. Use natural lighting, comfortable settings, and genuine emotions that connect with everyday experiences.",
    tags: ["daily", "life", "authentic", "cozy", "relatable"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/daily-life.jpg",
      alt: "Daily life template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/daily-life-demo.mp4",
      duration: 8,
      aspectRatio: "9:16"
    },
    config: {
      duration: 8,
      aspectRatio: "9:16",
      quality: "standard",
      aiSettings: {
        creativity: 0.5,
        guidance: 7
      }
    },
    supportsUserPhoto: true,
    photoPromptTemplate: "Create authentic daily life content featuring {USER_PHOTO} with cozy, relatable moments and lifestyle aesthetics.",
    difficulty: "beginner",
    estimatedTime: 18,
    sortOrder: 20
  },

  // ================= ENTERTAINMENT =================
  {
    name: "Music Video Style",
    description: "Dynamic music video aesthetics with rhythm-synced visuals and artistic flair",
    category: "entertainment",
    prompt: "Create a dynamic music video style with rhythm-synced visuals, artistic flair, and energetic movements. Use creative lighting, bold colors, and choreographed camera work that matches musical beats.",
    tags: ["music", "video", "rhythm", "artistic", "energetic"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/music-video.jpg",
      alt: "Music video style template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/music-video-demo.mp4",
      duration: 8,
      aspectRatio: "16:9"
    },
    config: {
      duration: 8,
      aspectRatio: "16:9",
      quality: "high",
      aiSettings: {
        creativity: 0.9,
        guidance: 5
      }
    },
    supportsUserPhoto: true,
    photoPromptTemplate: "Create a dynamic music video style featuring {USER_PHOTO} with rhythm-synced visuals, artistic flair, and energetic movements.",
    difficulty: "advanced",
    estimatedTime: 35,
    sortOrder: 21
  },
  {
    name: "Comedy Sketch",
    description: "Humorous content with comedic timing and entertaining visual gags",
    category: "entertainment",
    prompt: "Create humorous comedy content with comedic timing, entertaining visual gags, and playful elements. Use exaggerated expressions, funny situations, and lighthearted aesthetics that bring joy and laughter.",
    tags: ["comedy", "humor", "funny", "entertaining", "playful"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/comedy-sketch.jpg",
      alt: "Comedy sketch template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/comedy-sketch-demo.mp4",
      duration: 8,
      aspectRatio: "9:16"
    },
    config: {
      duration: 8,
      aspectRatio: "9:16",
      quality: "standard",
      aiSettings: {
        creativity: 0.8,
        guidance: 6
      }
    },
    supportsUserPhoto: true,
    photoPromptTemplate: "Create humorous comedy content featuring {USER_PHOTO} with comedic timing, entertaining visual gags, and playful elements.",
    difficulty: "intermediate",
    estimatedTime: 25,
    sortOrder: 22
  },
  {
    name: "Gaming Highlight",
    description: "Exciting gaming moments with dynamic effects and competitive energy",
    category: "entertainment",
    prompt: "Create exciting gaming highlight content with dynamic effects, competitive energy, and gaming aesthetics. Use fast-paced editing, neon colors, and digital effects that capture the thrill of gaming.",
    tags: ["gaming", "highlight", "competitive", "dynamic", "digital"],
    thumbnail: {
      url: "https://res.cloudinary.com/demo/image/upload/v1234567890/template-thumbnails/gaming-highlight.jpg",
      alt: "Gaming highlight template"
    },
    dummyVideo: {
      url: "https://res.cloudinary.com/demo/video/upload/v1234567890/template-videos/gaming-highlight-demo.mp4",
      duration: 8,
      aspectRatio: "16:9"
    },
    config: {
      duration: 8,
      aspectRatio: "16:9",
      quality: "high",
      aiSettings: {
        creativity: 0.8,
        guidance: 6
      }
    },
    supportsUserPhoto: false,
    difficulty: "intermediate",
    estimatedTime: 26,
    sortOrder: 23
  }
];

// Function to create templates
const createDefaultTemplates = async () => {
  try {
    console.log('🏗️ Creating default video templates...');

    // Check if templates already exist
    const existingCount = await VideoTemplate.countDocuments();

    if (existingCount > 0) {
      console.log(`⚠️ Found ${existingCount} existing templates. Skipping creation.`);
      console.log('💡 To recreate templates, delete existing ones first.');
      return;
    }

    // Create all templates
    const createdTemplates = await VideoTemplate.insertMany(defaultTemplates);

    console.log(`✅ Successfully created ${createdTemplates.length} default templates:`);

    // Group by category for display
    const byCategory = {};
    createdTemplates.forEach(template => {
      if (!byCategory[template.category]) {
        byCategory[template.category] = [];
      }
      byCategory[template.category].push(template.name);
    });

    Object.entries(byCategory).forEach(([category, templates]) => {
      console.log(`  📁 ${category}: ${templates.length} templates`);
      templates.forEach(name => {
        console.log(`    - ${name}`);
      });
    });

    console.log('\n🎉 Default templates creation completed successfully!');

  } catch (error) {
    console.error('❌ Error creating default templates:', error);
    process.exit(1);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await createDefaultTemplates();
  mongoose.connection.close();
  console.log('👋 Database connection closed.');
};

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { createDefaultTemplates, defaultTemplates };