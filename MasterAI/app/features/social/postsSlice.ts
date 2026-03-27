import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { API_URL } from '../api/globalApiSlice';

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

interface PostsState {
  posts: Post[];
  currentPost: Post | null;
  isLoading: boolean;
  isCreating: boolean;
  isPublishing: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalPosts: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    status?: string;
    platform?: string;
    category?: string;
  };
}

const initialState: PostsState = {
  posts: [],
  currentPost: null,
  isLoading: false,
  isCreating: false,
  isPublishing: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalPosts: 0,
    hasNext: false,
    hasPrev: false
  },
  filters: {}
};

// Async thunks
export const fetchPosts = createAsyncThunk(
  'posts/fetchPosts',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    platform?: string;
    category?: string;
  } = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.status) queryParams.append('status', params.status);
      if (params.platform) queryParams.append('platform', params.platform);
      if (params.category) queryParams.append('category', params.category);

      const response = await fetch(`${API_URL}/posts?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorize Access');
        } else if (response.status === 404) {
          throw new Error('Posts API endpoint not found');
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `Failed to fetch posts (${response.status})`);
        }
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Fetch posts error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const createPost = createAsyncThunk(
  'posts/createPost',
  async (postData: {
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
  }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;

      if (!token) {
        throw new Error('No authentication token found');
      }

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
        postData.media.forEach((file, index) => {
          formData.append('media', file);
        });
      }

      const response = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create post');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Create post error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchPost = createAsyncThunk(
  'posts/fetchPost',
  async (postId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/posts/${postId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch post');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Fetch post error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const updatePost = createAsyncThunk(
  'posts/updatePost',
  async (params: {
    postId: string;
    updates: Partial<{
      content: string;
      hashtags: string[];
      mentions: string[];
      category: string;
      tags: string[];
    }>;
  }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      const formData = new FormData();
      Object.keys(params.updates).forEach(key => {
        const value = (params.updates as any)[key];
        if (Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      });

      const response = await fetch(`${API_URL}/posts/${params.postId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update post');
      }

      const data = await response.json();
      return { postId: params.postId, ...data };
    } catch (error: any) {
      console.error('Update post error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const deletePost = createAsyncThunk(
  'posts/deletePost',
  async (postId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete post');
      }

      return { postId };
    } catch (error: any) {
      console.error('Delete post error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const publishPost = createAsyncThunk(
  'posts/publishPost',
  async (postId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/posts/${postId}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to publish post');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Publish post error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const duplicatePost = createAsyncThunk(
  'posts/duplicatePost',
  async (postId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/posts/${postId}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to duplicate post');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Duplicate post error:', error);
      return rejectWithValue(error.message);
    }
  }
);

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentPost: (state, action: PayloadAction<Post | null>) => {
      state.currentPost = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<{ status: string; platform: string; category: string }>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    updatePostStatus: (state, action: PayloadAction<{ postId: string; status: string }>) => {
      const { postId, status } = action.payload;
      const post = state.posts.find(p => p.id === postId);
      if (post) {
        post.status = status as any;
      }
      if (state.currentPost && state.currentPost.id === postId) {
        state.currentPost.status = status as any;
      }
    },
    addPost: (state, action: PayloadAction<Post>) => {
      state.posts.unshift(action.payload);
      state.pagination.totalPosts += 1;
    },
    removePost: (state, action: PayloadAction<string>) => {
      const postId = action.payload;
      state.posts = state.posts.filter(p => p.id !== postId);
      state.pagination.totalPosts = Math.max(0, state.pagination.totalPosts - 1);
      if (state.currentPost && state.currentPost.id === postId) {
        state.currentPost = null;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch posts
      .addCase(fetchPosts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.posts = action.payload.posts || [];
        state.pagination = action.payload.pagination || state.pagination;
        state.error = null;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create post
      .addCase(createPost.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.isCreating = false;
        if (action.payload.post) {
          state.posts.unshift(action.payload.post);
          state.pagination.totalPosts += 1;
        }
        state.error = null;
      })
      .addCase(createPost.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })
      // Fetch single post
      .addCase(fetchPost.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPost.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentPost = action.payload.post;
        state.error = null;
      })
      .addCase(fetchPost.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update post
      .addCase(updatePost.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updatePost.fulfilled, (state, action) => {
        state.isLoading = false;
        const { postId } = action.payload;
        const postIndex = state.posts.findIndex(p => p.id === postId);
        if (postIndex >= 0) {
          state.posts[postIndex] = { ...state.posts[postIndex], ...action.payload.post };
        }
        if (state.currentPost && state.currentPost.id === postId) {
          state.currentPost = { ...state.currentPost, ...action.payload.post };
        }
        state.error = null;
      })
      .addCase(updatePost.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete post
      .addCase(deletePost.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deletePost.fulfilled, (state, action) => {
        state.isLoading = false;
        const { postId } = action.payload;
        state.posts = state.posts.filter(p => p.id !== postId);
        state.pagination.totalPosts = Math.max(0, state.pagination.totalPosts - 1);
        if (state.currentPost && state.currentPost.id === postId) {
          state.currentPost = null;
        }
        state.error = null;
      })
      .addCase(deletePost.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Publish post
      .addCase(publishPost.pending, (state) => {
        state.isPublishing = true;
        state.error = null;
      })
      .addCase(publishPost.fulfilled, (state, action) => {
        state.isPublishing = false;
        const { post } = action.payload;
        if (post) {
          const postIndex = state.posts.findIndex(p => p.id === post.id);
          if (postIndex >= 0) {
            state.posts[postIndex] = { ...state.posts[postIndex], ...post };
          }
          if (state.currentPost && state.currentPost.id === post.id) {
            state.currentPost = { ...state.currentPost, ...post };
          }
        }
        state.error = null;
      })
      .addCase(publishPost.rejected, (state, action) => {
        state.isPublishing = false;
        state.error = action.payload as string;
      })
      // Duplicate post
      .addCase(duplicatePost.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(duplicatePost.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload.post) {
          state.posts.unshift(action.payload.post);
          state.pagination.totalPosts += 1;
        }
        state.error = null;
      })
      .addCase(duplicatePost.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setCurrentPost,
  setFilters,
  clearFilters,
  updatePostStatus,
  addPost,
  removePost
} = postsSlice.actions;

export default postsSlice.reducer;

// Selectors
export const selectPosts = (state: { posts: PostsState }) => state.posts.posts;
export const selectCurrentPost = (state: { posts: PostsState }) => state.posts.currentPost;
export const selectPostsLoading = (state: { posts: PostsState }) => state.posts.isLoading;
export const selectPostsCreating = (state: { posts: PostsState }) => state.posts.isCreating;
export const selectPostsPublishing = (state: { posts: PostsState }) => state.posts.isPublishing;
export const selectPostsError = (state: { posts: PostsState }) => state.posts.error;
export const selectPostsPagination = (state: { posts: PostsState }) => state.posts.pagination;
export const selectPostsFilters = (state: { posts: PostsState }) => state.posts.filters;

export const selectPostsByStatus = (status: string) =>
  (state: { posts: PostsState }) =>
    state.posts.posts.filter(post => post.status === status);

export const selectPostsByPlatform = (platform: string) =>
  (state: { posts: PostsState }) =>
    state.posts.posts.filter(post =>
      post.targetPlatforms.some(p => p.platform === platform)
    );

export const selectDraftPosts = (state: { posts: PostsState }) =>
  state.posts.posts.filter(post => post.status === 'draft');

export const selectScheduledPosts = (state: { posts: PostsState }) =>
  state.posts.posts.filter(post => post.status === 'scheduled');

export const selectPublishedPosts = (state: { posts: PostsState }) =>
  state.posts.posts.filter(post => post.status === 'published');

export const selectPendingPosts = (state: { posts: PostsState }) =>
  state.posts.posts.filter(post => post.status === 'pending_approval');