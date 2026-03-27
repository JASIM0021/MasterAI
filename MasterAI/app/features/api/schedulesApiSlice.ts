import globalApiSlice from "./globalApiSlice";

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
    topics: string[];
    tone: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'humorous' | 'inspirational';
    language: 'english' | 'spanish' | 'french' | 'german' | 'italian' | 'portuguese' | 'chinese' | 'japanese' | 'korean' | 'hindi' | 'arabic';
    keywords: string[];
    contentLength: 'short' | 'medium' | 'long';
    contentType: 'text' | 'image' | 'quote';
    includeHashtags: boolean;
    maxHashtags: number;
    requireApproval: boolean;
    autoPublish: boolean;
    generationModel: string;
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

interface SchedulesResponse {
  schedules: Schedule[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalSchedules: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface CreateScheduleRequest {
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
}

interface UpdateScheduleRequest {
  scheduleId: string;
  updates: Partial<Schedule>;
}

export const schedulesApiSlice = globalApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Query endpoints
    fetchSchedules: builder.query<SchedulesResponse, {
      page?: number;
      limit?: number;
      status?: string;
      platform?: string;
      frequency?: string;
    }>({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.status) queryParams.append('status', params.status);
        if (params.platform) queryParams.append('platform', params.platform);
        if (params.frequency) queryParams.append('frequency', params.frequency);

        return {
          url: `schedules?${queryParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['getandpost'],
    }),

    fetchSchedule: builder.query<{ schedule: Schedule }, string>({
      query: (scheduleId) => ({
        url: `schedules/${scheduleId}`,
        method: 'GET',
      }),
      providesTags: (result, error, scheduleId) => [
        { type: 'getandpost', id: scheduleId },
      ],
    }),

    fetchScheduleAnalytics: builder.query<any, {
      scheduleId: string;
      dateRange?: string;
    }>({
      query: ({ scheduleId, dateRange }) => {
        const queryParams = new URLSearchParams();
        if (dateRange) queryParams.append('dateRange', dateRange);

        return {
          url: `schedules/${scheduleId}/analytics?${queryParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: (result, error, { scheduleId }) => [
        { type: 'getandpost', id: `analytics-${scheduleId}` },
      ],
    }),

    // Mutation endpoints
    createSchedule: builder.mutation<{ schedule: Schedule }, CreateScheduleRequest>({
      query: (scheduleData) => ({
        url: 'schedules',
        method: 'POST',
        body: scheduleData,
      }),
      invalidatesTags: ['getandpost'],
    }),

    updateSchedule: builder.mutation<{ schedule: Schedule; scheduleId: string }, UpdateScheduleRequest>({
      query: ({ scheduleId, updates }) => ({
        url: `schedules/${scheduleId}`,
        method: 'PUT',
        body: updates,
      }),
      invalidatesTags: (result, error, { scheduleId }) => [
        { type: 'getandpost', id: scheduleId },
        'getandpost',
      ],
    }),

    deleteSchedule: builder.mutation<{ scheduleId: string }, string>({
      query: (scheduleId) => ({
        url: `schedules/${scheduleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, scheduleId) => [
        { type: 'getandpost', id: scheduleId },
        'getandpost',
      ],
    }),

    toggleSchedule: builder.mutation<{ schedule: Schedule }, string>({
      query: (scheduleId) => ({
        url: `schedules/${scheduleId}/toggle`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, scheduleId) => [
        { type: 'getandpost', id: scheduleId },
        'getandpost',
      ],
    }),

    testSchedule: builder.mutation<any, string>({
      query: (scheduleId) => ({
        url: `schedules/${scheduleId}/test`,
        method: 'POST',
      }),
      // Don't invalidate on test, as it's just a preview
    }),

    duplicateSchedule: builder.mutation<{
      schedule: Schedule;
      originalScheduleId: string;
      creditInfo: any;
    }, string>({
      query: (scheduleId) => ({
        url: `schedules/${scheduleId}/duplicate`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, scheduleId) => [
        { type: 'getandpost', id: scheduleId },
        'getandpost',
      ],
    }),
  }),
});

export const {
  useFetchSchedulesQuery,
  useLazyFetchSchedulesQuery,
  useFetchScheduleQuery,
  useFetchScheduleAnalyticsQuery,
  useCreateScheduleMutation,
  useUpdateScheduleMutation,
  useDeleteScheduleMutation,
  useToggleScheduleMutation,
  useTestScheduleMutation,
  useDuplicateScheduleMutation,
} = schedulesApiSlice;