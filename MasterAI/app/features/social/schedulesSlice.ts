import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { API_URL } from '../api/globalApiSlice';
import apiconstant from '../../Constant/apiconstant';

interface TimeSlot {
  hour: number;
  minute: number;
}

interface Recurrence {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  daysOfWeek?: number[];
  dayOfMonth?: number;
  timeSlots: TimeSlot[];
  timezone: string;
  cronExpression?: string;
}

interface ContentConfig {
  type: 'template' | 'ai-generated' | 'predefined';
  template?: string;
  aiConfig?: {
    topic: string;
    tone: 'professional' | 'casual' | 'friendly' | 'informative' | 'promotional';
    keywords: string[];
    contentLength: 'short' | 'medium' | 'long';
    includeHashtags: boolean;
    maxHashtags: number;
  };
  contentPool?: Array<{
    text: string;
    media: string[];
    used: boolean;
    lastUsed?: string;
  }>;
  rotation: 'sequential' | 'random' | 'weighted';
}

interface TargetPlatform {
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter';
  accountId: string;
  accountName: string;
  isActive: boolean;
}

interface Schedule {
  id: string;
  name: string;
  description: string;
  type: 'recurring' | 'one-time';
  recurrence: Recurrence;
  content: ContentConfig;
  targetPlatforms: TargetPlatform[];
  isActive: boolean;
  limits: {
    maxExecutions?: number;
    endDate?: string;
  };
  nextExecution?: string;
  lastExecution?: string;
  stats: {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageEngagement: number;
  };
  lastError?: string;
  errorCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SchedulesState {
  schedules: Schedule[];
  currentSchedule: Schedule | null;
  isLoading: boolean;
  isCreating: boolean;
  isTesting: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalSchedules: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    status?: string;
    platform?: string;
    frequency?: string;
  };
}

const initialState: SchedulesState = {
  schedules: [],
  currentSchedule: null,
  isLoading: false,
  isCreating: false,
  isTesting: false,
  error: null,
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalSchedules: 0,
    hasNext: false,
    hasPrev: false
  },
  filters: {}
};

// Async thunks
export const fetchSchedules = createAsyncThunk(
  'schedules/fetchSchedules',
  async (params: {
    page?: number;
    limit?: number;
    status?: string;
    platform?: string;
    frequency?: string;
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
      if (params.frequency) queryParams.append('frequency', params.frequency);

      const response = await fetch(`${API_URL}/schedules?${queryParams.toString()}`, {
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
          throw new Error('Schedules API endpoint not found');
        } else {
          const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
          throw new Error(errorData.message || `Failed to fetch schedules (${response.status})`);
        }
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Fetch schedules error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const createSchedule = createAsyncThunk(
  'schedules/createSchedule',
  async (scheduleData: {
    name: string;
    description?: string;
    type: 'recurring' | 'one-time';
    recurrence: Recurrence;
    content: ContentConfig;
    targetPlatforms: TargetPlatform[];
    limits?: {
      maxExecutions?: number;
      endDate?: string;
    };
  }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/schedules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create schedule');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Create schedule error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchSchedule = createAsyncThunk(
  'schedules/fetchSchedule',
  async (scheduleId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/schedules/${scheduleId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch schedule');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Fetch schedule error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const updateSchedule = createAsyncThunk(
  'schedules/updateSchedule',
  async (params: {
    scheduleId: string;
    updates: Partial<Schedule>;
  }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/schedules/${params.scheduleId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params.updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update schedule');
      }

      const data = await response.json();
      return { scheduleId: params.scheduleId, ...data };
    } catch (error: any) {
      console.error('Update schedule error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const deleteSchedule = createAsyncThunk(
  'schedules/deleteSchedule',
  async (scheduleId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete schedule');
      }

      return { scheduleId };
    } catch (error: any) {
      console.error('Delete schedule error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const toggleSchedule = createAsyncThunk(
  'schedules/toggleSchedule',
  async (scheduleId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/schedules/${scheduleId}/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'apiKey':apiconstant.masterAiKey
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to toggle schedule');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Toggle schedule error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const testSchedule = createAsyncThunk(
  'schedules/testSchedule',
  async (scheduleId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_URL}/schedules/${scheduleId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to test schedule');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Test schedule error:', error);
      return rejectWithValue(error.message);
    }
  }
);

export const fetchScheduleAnalytics = createAsyncThunk(
  'schedules/fetchAnalytics',
  async (params: {
    scheduleId: string;
    dateRange?: string;
  }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      const token = state.auth.token;

      if (!token) {
        throw new Error('No authentication token found');
      }

      const queryParams = new URLSearchParams();
      if (params.dateRange) queryParams.append('dateRange', params.dateRange);

      const response = await fetch(
        `${API_URL}/schedules/${params.scheduleId}/analytics?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch schedule analytics');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Fetch schedule analytics error:', error);
      return rejectWithValue(error.message);
    }
  }
);

const schedulesSlice = createSlice({
  name: 'schedules',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentSchedule: (state, action: PayloadAction<Schedule | null>) => {
      state.currentSchedule = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<{ status: string; platform: string; frequency: string }>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    updateScheduleStatus: (state, action: PayloadAction<{ scheduleId: string; isActive: boolean }>) => {
      const { scheduleId, isActive } = action.payload;
      const schedule = state.schedules.find(s => s.id === scheduleId);
      if (schedule) {
        schedule.isActive = isActive;
      }
      if (state.currentSchedule && state.currentSchedule.id === scheduleId) {
        state.currentSchedule.isActive = isActive;
      }
    },
    addSchedule: (state, action: PayloadAction<Schedule>) => {
      state.schedules.unshift(action.payload);
      state.pagination.totalSchedules += 1;
    },
    removeSchedule: (state, action: PayloadAction<string>) => {
      const scheduleId = action.payload;
      state.schedules = state.schedules.filter(s => s.id !== scheduleId);
      state.pagination.totalSchedules = Math.max(0, state.pagination.totalSchedules - 1);
      if (state.currentSchedule && state.currentSchedule.id === scheduleId) {
        state.currentSchedule = null;
      }
    },
    updateScheduleStats: (state, action: PayloadAction<{ scheduleId: string; stats: Partial<Schedule['stats']> }>) => {
      const { scheduleId, stats } = action.payload;
      const schedule = state.schedules.find(s => s.id === scheduleId);
      if (schedule) {
        schedule.stats = { ...schedule.stats, ...stats };
      }
      if (state.currentSchedule && state.currentSchedule.id === scheduleId) {
        state.currentSchedule.stats = { ...state.currentSchedule.stats, ...stats };
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch schedules
      .addCase(fetchSchedules.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSchedules.fulfilled, (state, action) => {
        state.isLoading = false;
        state.schedules = action.payload.schedules || [];
        state.pagination = action.payload.pagination || state.pagination;
        state.error = null;
      })
      .addCase(fetchSchedules.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Create schedule
      .addCase(createSchedule.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createSchedule.fulfilled, (state, action) => {
        state.isCreating = false;
        if (action.payload.schedule) {
          state.schedules.unshift(action.payload.schedule);
          state.pagination.totalSchedules += 1;
        }
        state.error = null;
      })
      .addCase(createSchedule.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })
      // Fetch single schedule
      .addCase(fetchSchedule.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSchedule.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSchedule = action.payload.schedule;
        state.error = null;
      })
      .addCase(fetchSchedule.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update schedule
      .addCase(updateSchedule.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateSchedule.fulfilled, (state, action) => {
        state.isLoading = false;
        const { scheduleId } = action.payload;
        const scheduleIndex = state.schedules.findIndex(s => s.id === scheduleId);
        if (scheduleIndex >= 0) {
          state.schedules[scheduleIndex] = { ...state.schedules[scheduleIndex], ...action.payload.schedule };
        }
        if (state.currentSchedule && state.currentSchedule.id === scheduleId) {
          state.currentSchedule = { ...state.currentSchedule, ...action.payload.schedule };
        }
        state.error = null;
      })
      .addCase(updateSchedule.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Delete schedule
      .addCase(deleteSchedule.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteSchedule.fulfilled, (state, action) => {
        state.isLoading = false;
        const { scheduleId } = action.payload;
        state.schedules = state.schedules.filter(s => s.id !== scheduleId);
        state.pagination.totalSchedules = Math.max(0, state.pagination.totalSchedules - 1);
        if (state.currentSchedule && state.currentSchedule.id === scheduleId) {
          state.currentSchedule = null;
        }
        state.error = null;
      })
      .addCase(deleteSchedule.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Toggle schedule
      .addCase(toggleSchedule.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(toggleSchedule.fulfilled, (state, action) => {
        state.isLoading = false;
        const { schedule } = action.payload;
        if (schedule) {
          const scheduleIndex = state.schedules.findIndex(s => s.id === schedule.id);
          if (scheduleIndex >= 0) {
            state.schedules[scheduleIndex].isActive = schedule.isActive;
            state.schedules[scheduleIndex].nextExecution = schedule.nextExecution;
          }
          if (state.currentSchedule && state.currentSchedule.id === schedule.id) {
            state.currentSchedule.isActive = schedule.isActive;
            state.currentSchedule.nextExecution = schedule.nextExecution;
          }
        }
        state.error = null;
      })
      .addCase(toggleSchedule.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Test schedule
      .addCase(testSchedule.pending, (state) => {
        state.isTesting = true;
        state.error = null;
      })
      .addCase(testSchedule.fulfilled, (state, action) => {
        state.isTesting = false;
        state.error = null;
        // Test result is handled by the component
      })
      .addCase(testSchedule.rejected, (state, action) => {
        state.isTesting = false;
        state.error = action.payload as string;
      })
      // Fetch analytics
      .addCase(fetchScheduleAnalytics.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchScheduleAnalytics.fulfilled, (state, action) => {
        state.isLoading = false;
        state.error = null;
        // Analytics data is handled by the component
      })
      .addCase(fetchScheduleAnalytics.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setCurrentSchedule,
  setFilters,
  clearFilters,
  updateScheduleStatus,
  addSchedule,
  removeSchedule,
  updateScheduleStats
} = schedulesSlice.actions;

export default schedulesSlice.reducer;

// Selectors
export const selectSchedules = (state: { schedules: SchedulesState }) => state.schedules.schedules;
export const selectCurrentSchedule = (state: { schedules: SchedulesState }) => state.schedules.currentSchedule;
export const selectSchedulesLoading = (state: { schedules: SchedulesState }) => state.schedules.isLoading;
export const selectSchedulesCreating = (state: { schedules: SchedulesState }) => state.schedules.isCreating;
export const selectSchedulesTesting = (state: { schedules: SchedulesState }) => state.schedules.isTesting;
export const selectSchedulesError = (state: { schedules: SchedulesState }) => state.schedules.error;
export const selectSchedulesPagination = (state: { schedules: SchedulesState }) => state.schedules.pagination;
export const selectSchedulesFilters = (state: { schedules: SchedulesState }) => state.schedules.filters;

export const selectActiveSchedules = (state: { schedules: SchedulesState }) =>
  state.schedules.schedules.filter(schedule => schedule.isActive);

export const selectInactiveSchedules = (state: { schedules: SchedulesState }) =>
  state.schedules.schedules.filter(schedule => !schedule.isActive);

export const selectSchedulesByPlatform = (platform: string) =>
  (state: { schedules: SchedulesState }) =>
    state.schedules.schedules.filter(schedule =>
      schedule.targetPlatforms.some(p => p.platform === platform && p.isActive)
    );

export const selectSchedulesByFrequency = (frequency: string) =>
  (state: { schedules: SchedulesState }) =>
    state.schedules.schedules.filter(schedule => schedule.recurrence.frequency === frequency);