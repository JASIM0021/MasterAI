import globalApiSlice from "./globalApiSlice";

// ================= TYPE DEFINITIONS =================

interface VideoConfig {
  duration: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  quality: 'standard' | 'high';
  resolution: '720p' | '1080p';
  model: 'fast' | 'standard';
  aiSettings?: {
    creativity: number;
    guidance: number;
  };
}

interface VideoTemplate {
  id: string;
  name: string;
  description: string;
  category: 'marketing' | 'business' | 'creative' | 'artistic' | 'social_media' | 'educational' | 'lifestyle' | 'entertainment';
  prompt: string;
  tags: string[];
  thumbnail: {
    url: string;
    alt: string;
  };
  dummyVideo: {
    url: string;
    duration: number;
    aspectRatio: string;
  };
  config: VideoConfig;
  supportsUserPhoto: boolean;
  photoPromptTemplate?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  usageCount: number;
  isPremium: boolean;
  isActive: boolean;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GeneratedVideo {
  id: string;
  userId: string;
  templateId?: string;
  generationType: 'custom_prompt' | 'template' | 'template_with_photo';
  prompt: {
    original: string;
    processed?: string;
  };
  userImage?: {
    url: string;
    uploadedAt: string;
  };
  config: VideoConfig;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  externalJobId?: string;
  video?: {
    url: string;
    publicId: string;
    duration: number;
    size: number;
    format: string;
    resolution: {
      width: number;
      height: number;
    };
    uploadedAt: string;
  };
  thumbnail?: {
    url: string;
    publicId: string;
  };
  creditCost: number;
  creditDeducted: boolean;
  creditDeductedAt?: string;
  error?: {
    message: string;
    code: string;
    details?: any;
    occurredAt: string;
  };
  timing?: {
    startedAt: string;
    completedAt?: string;
    totalDuration?: number;
  };
  isFavorite: boolean;
  viewCount: number;
  shareCount: number;
  template?: VideoTemplate;
  createdAt: string;
  updatedAt: string;
}

interface UserFavorite {
  templateId: string;
  addedAt: string;
  usageCount: number;
  lastUsedAt?: string;
}

interface VideoCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

interface VideoGenerationRequest {
  prompt: string;
  templateId?: string;
  userImageBase64?: string;
  config?: Partial<VideoConfig>;
}

interface VideoGenerationResponse {
  success: boolean;
  message: string;
  video: {
    id: string;
    operationName: string;
    status: string;
    submittedAt: string;
    creditCost: number;
    generationType: string;
    config: VideoConfig;
    template?: {
      id: string;
      name: string;
      category: string;
    };
  };
}

interface VideoStatusResponse {
  success: boolean;
  video: GeneratedVideo;
}

interface PhotoUploadResponse {
  success: boolean;
  message: string;
  image: {
    url: string;
    publicId: string;
    width: number;
    height: number;
  };
}

interface TemplatesResponse {
  success: boolean;
  templates: VideoTemplate[];
  count: number;
  pagination: {
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

interface FavoritesResponse {
  success: boolean;
  favorites: VideoTemplate[];
  count: number;
}

interface CategoriesResponse {
  success: boolean;
  categories: VideoCategory[];
}

interface MyVideosResponse {
  success: boolean;
  videos: GeneratedVideo[];
  count: number;
  pagination: {
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

// ================= API SLICE DEFINITION =================

export const videosApiSlice = globalApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // ================= VIDEO GENERATION =================

    generateVideo: builder.mutation<VideoGenerationResponse, VideoGenerationRequest>({
      query: (data) => ({
        url: '/videos/generate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['getandpost'],
    }),

    calculateVideoCost: builder.mutation<{
      success: boolean;
      cost: {
        duration: number;
        model: string;
        baseCost: number;
        modelMultiplier: number;
        totalCost: number;
      };
      estimatedTime: {
        min: number;
        max: number;
        average: number;
      };
      breakdown: {
        message: string;
        formula: string;
      };
    }, {
      duration: number;
      model: string;
    }>({
      query: (data) => ({
        url: '/videos/calculate-cost',
        method: 'POST',
        body: data,
      }),
    }),

    checkVideoStatus: builder.query<VideoStatusResponse, string>({
      query: (videoId) => `/videos/status/${videoId}`,
      providesTags: (result, error, videoId) => [
        { type: 'getandpost', id: `video-${videoId}` }
      ],
    }),

    uploadVideoPhoto: builder.mutation<PhotoUploadResponse, FormData>({
      query: (formData) => ({
        url: '/videos/upload-photo',
        method: 'POST',
        body: formData,
      }),
    }),

    // ================= TEMPLATES =================

    getTemplates: builder.query<TemplatesResponse, {
      category?: string;
      search?: string;
      sortBy?: 'popular' | 'newest' | 'alphabetical';
      limit?: number;
      skip?: number;
    }>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value.toString());
          }
        });
        return `/videos/templates?${searchParams.toString()}`;
      },
      providesTags: ['getandpost'],
    }),

    getTemplate: builder.query<{ success: boolean; template: VideoTemplate }, string>({
      query: (templateId) => `/videos/templates/${templateId}`,
      providesTags: (result, error, templateId) => [
        { type: 'getandpost', id: `template-${templateId}` }
      ],
    }),

    getTemplatesByCategory: builder.query<{
      success: boolean;
      category: string;
      templates: VideoTemplate[];
      count: number;
    }, { category: string; limit?: number; skip?: number }>({
      query: ({ category, limit = 20, skip = 0 }) =>
        `/videos/templates/category/${category}?limit=${limit}&skip=${skip}`,
      providesTags: (result, error, { category }) => [
        { type: 'getandpost', id: `category-${category}` }
      ],
    }),

    getCategories: builder.query<CategoriesResponse, void>({
      query: () => '/videos/categories',
      providesTags: ['getandpost'],
    }),

    // ================= FAVORITES =================

    getFavorites: builder.query<FavoritesResponse, {
      limit?: number;
      sort?: 'recent' | 'most_used' | 'alphabetical';
    }>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value.toString());
          }
        });
        return `/videos/favorites?${searchParams.toString()}`;
      },
      providesTags: ['getandpost'],
    }),

    toggleFavorite: builder.mutation<{
      success: boolean;
      message: string;
      favorite: {
        templateId: string;
        isFavorite: boolean;
        action: 'added' | 'removed';
      };
    }, string>({
      query: (templateId) => ({
        url: `/videos/favorites/${templateId}`,
        method: 'POST',
      }),
      invalidatesTags: ['getandpost'],
    }),

    getRecentTemplates: builder.query<{
      success: boolean;
      recent: VideoTemplate[];
      count: number;
    }, { limit?: number }>({
      query: ({ limit = 5 } = {}) => `/videos/recent?limit=${limit}`,
      providesTags: ['getandpost'],
    }),

    // ================= USER VIDEOS =================

    getMyVideos: builder.query<MyVideosResponse, {
      status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
      limit?: number;
      skip?: number;
      sortBy?: 'newest' | 'oldest';
    }>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value.toString());
          }
        });
        return `/videos/my-videos?${searchParams.toString()}`;
      },
      providesTags: ['getandpost'],
    }),

    deleteVideo: builder.mutation<{
      success: boolean;
      message: string;
    }, string>({
      query: (videoId) => ({
        url: `/videos/${videoId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['getandpost'],
    }),

    // ================= POLLING HELPERS =================

    // Continuous polling for video status
    pollVideoStatus: builder.query<VideoStatusResponse, string>({
      query: (videoId) => `/videos/status/${videoId}`,
      providesTags: (result, error, videoId) => [
        { type: 'getandpost', id: `video-${videoId}` }
      ],
      // Auto-polling configuration
      pollingInterval: 5000, // Poll every 5 seconds
    }),
  }),
});

// ================= EXPORT HOOKS =================

export const {
  // Video Generation
  useGenerateVideoMutation,
  useCalculateVideoCostMutation,
  useCheckVideoStatusQuery,
  useUploadVideoPhotoMutation,
  usePollVideoStatusQuery,

  // Templates
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useGetTemplatesByCategoryQuery,
  useGetCategoriesQuery,

  // Favorites
  useGetFavoritesQuery,
  useToggleFavoriteMutation,
  useGetRecentTemplatesQuery,

  // User Videos
  useGetMyVideosQuery,
  useDeleteVideoMutation,
} = videosApiSlice;

// ================= CUSTOM HOOKS =================

// Custom hook for video generation with status polling
export const useGenerateVideoWithPolling = () => {
  const [generateVideo, { data: generationData, isLoading: isGenerating, error: generationError }] = useGenerateVideoMutation();

  return {
    generateVideo,
    generationData,
    isGenerating,
    generationError,
  };
};

// Custom hook for template search
export const useTemplateSearch = (searchQuery: string, category?: string) => {
  return useGetTemplatesQuery({
    search: searchQuery,
    category,
    sortBy: 'popular',
    limit: 20,
  }, {
    skip: !searchQuery || searchQuery.length < 2,
  });
};

// Custom hook for favorites management
export const useFavoritesManager = () => {
  const [toggleFavorite] = useToggleFavoriteMutation();
  const { data: favoritesData, refetch } = useGetFavoritesQuery({});

  const handleToggleFavorite = async (templateId: string) => {
    try {
      await toggleFavorite(templateId).unwrap();
      refetch();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  return {
    favorites: favoritesData?.favorites || [],
    toggleFavorite: handleToggleFavorite,
    refetch,
  };
};

// Export types for use in components
export type {
  VideoTemplate,
  GeneratedVideo,
  VideoConfig,
  VideoGenerationRequest,
  VideoCategory,
  UserFavorite,
};

export default videosApiSlice;