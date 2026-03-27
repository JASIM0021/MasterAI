import globalApiSlice from "./globalApiSlice";

interface MediaItem {
  type: 'image' | 'video' | 'gif';
  url: string;
  thumbnail?: string;
  altText?: string;
  size: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

interface PlatformTarget {
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter';
  accountId: string;
  accountName: string;
  status: 'pending' | 'scheduled' | 'published' | 'failed' | 'cancelled';
  publishedAt?: string;
  platformPostUrl?: string;
  error?: string;
}

interface Post {
  id: string;
  content: {
    text: string;
    hashtags: string[];
    mentions: string[];
  };
  media: MediaItem[];
  targetPlatforms: PlatformTarget[];
  scheduling: {
    type: 'immediate' | 'scheduled' | 'automated';
    scheduledAt?: string;
    timezone: string;
    automationRuleId?: string;
  };
  category: string;
  tags: string[];
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'cancelled' | 'pending_approval' | 'approved';
  totalEngagement: number;
  createdAt: string;
  updatedAt: string;
}

interface PostsResponse {
  posts: Post[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalPosts: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface CreatePostRequest {
  content: string;
  hashtags?: string[];
  mentions?: string[];
  targetPlatforms: Array<{
    platform: string;
    accountId: string;
    platformSpecificContent?: any;
  }>;
  scheduling?: {
    type: string;
    scheduledAt?: string;
    timezone?: string;
  };
  category?: string;
  tags?: string[];
  media?: File[];
}

interface UpdatePostRequest {
  postId: string;
  updates: Partial<{
    content: string;
    hashtags: string[];
    mentions: string[];
    category: string;
    tags: string[];
  }>;
}

export const postsApiSlice = globalApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Query endpoints
    fetchPosts: builder.query<PostsResponse, {
      page?: number;
      limit?: number;
      status?: string;
      platform?: string;
      category?: string;
    }>({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.status) queryParams.append('status', params.status);
        if (params.platform) queryParams.append('platform', params.platform);
        if (params.category) queryParams.append('category', params.category);

        return {
          url: `posts?${queryParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['getandpost'],
    }),

    fetchPost: builder.query<{ post: Post }, string>({
      query: (postId) => ({
        url: `posts/${postId}`,
        method: 'GET',
      }),
      providesTags: (result, error, postId) => [
        { type: 'getandpost', id: postId },
      ],
    }),

    // Mutation endpoints
    createPost: builder.mutation<{ post: Post }, CreatePostRequest>({
      query: (postData) => {
        const formData = new FormData();
        formData.append('content', postData.content);
        formData.append('hashtags', JSON.stringify(postData.hashtags || []));
        formData.append('mentions', JSON.stringify(postData.mentions || []));
        formData.append('targetPlatforms', JSON.stringify(postData.targetPlatforms));
        formData.append('scheduling', JSON.stringify(postData.scheduling || { type: 'immediate' }));
        formData.append('category', postData.category || 'other');
        formData.append('tags', JSON.stringify(postData.tags || []));

        // Add media files
        if (postData.media && postData.media.length > 0) {
          postData.media.forEach((file) => {
            formData.append('media', file);
          });
        }

        return {
          url: 'posts',
          method: 'POST',
          body: formData,
          formData: true,
        };
      },
      invalidatesTags: ['getandpost'],
    }),

    updatePost: builder.mutation<{ post: Post; postId: string }, UpdatePostRequest>({
      query: ({ postId, updates }) => {
        const formData = new FormData();
        Object.keys(updates).forEach(key => {
          const value = (updates as any)[key];
          if (Array.isArray(value)) {
            formData.append(key, JSON.stringify(value));
          } else {
            formData.append(key, value);
          }
        });

        return {
          url: `posts/${postId}`,
          method: 'PUT',
          body: formData,
          formData: true,
        };
      },
      invalidatesTags: (result, error, { postId }) => [
        { type: 'getandpost', id: postId },
        'getandpost',
      ],
    }),

    deletePost: builder.mutation<{ postId: string }, string>({
      query: (postId) => ({
        url: `posts/${postId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, postId) => [
        { type: 'getandpost', id: postId },
        'getandpost',
      ],
    }),

    publishPost: builder.mutation<{ post: Post }, string>({
      query: (postId) => ({
        url: `posts/${postId}/publish`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, postId) => [
        { type: 'getandpost', id: postId },
        'getandpost',
      ],
    }),

    duplicatePost: builder.mutation<{ post: Post }, string>({
      query: (postId) => ({
        url: `posts/${postId}/duplicate`,
        method: 'POST',
      }),
      invalidatesTags: ['getandpost'],
    }),

    // Approve or reject post
    approvePost: builder.mutation<{
      post: Post;
      sharingData?: {
        postId: string;
        content: any;
        media: any[];
        platforms: {
          [platform: string]: {
            webUrl: string;
            mobileDeepLink: string;
            instructions: {
              steps: string[];
              note: string;
            };
            capabilities: any;
            formattedContent: any;
          };
        };
      };
    }, {
      postId: string;
      userId: string;
      action: 'approve' | 'reject';
      rejectionReason?: string;
    }>({
      query: ({ postId, userId, action, rejectionReason }) => ({
        url: `approval/${postId}`,
        method: 'POST',
        body: {
          userId,
          action,
          rejectionReason: rejectionReason || null
        },
      }),
      invalidatesTags: (result, error, { postId }) => [
        { type: 'getandpost', id: postId },
        'getandpost',
      ],
    }),
  }),
});

export const {
  useFetchPostsQuery,
  useLazyFetchPostsQuery,
  useFetchPostQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
  usePublishPostMutation,
  useDuplicatePostMutation,
  useApprovePostMutation,
} = postsApiSlice;