import globalApiSlice from "./globalApiSlice";

interface CreditInfo {
  used: number;
  total: number; // -1 for unlimited
  available: number;
  resetDate?: string;
}

interface CreditBreakdown {
  total: number;
  used: number;
  available: number;
  resetDate: string;
  resetInterval: string;
}

interface ExecutionCreditBreakdown extends CreditBreakdown {
  executionCount: number;
  lastExecution?: string;
}

interface AutomationCreditInfo {
  success: boolean;
  globalCredits: {
    balance: number;
    lastMonthlyAddition: string;
    totalEarned: number;
    totalSpent: number;
    nextMonthlyAddition: string;
  };
  automationCosts: {
    creation: number;
    executionText: number;
    executionWithImage: number;
  };
  canAfford: {
    createAutomation: boolean;
    executeText: boolean;
    executeWithImage: boolean;
  };
}

interface UserCredits {
  success: boolean;
  globalCredits: {
    balance: number;
    lastMonthlyAddition: string;
    totalEarned: number;
    totalSpent: number;
    nextMonthlyAddition: string;
  };
  serviceCosts: {
    postGeneration: number;
    captionGeneration: number;
    automation: number;
    execution: number;
    executionWithImage: number;
  };
  canAfford: {
    postGeneration: boolean;
    captionGeneration: boolean;
    automation: boolean;
    execution: boolean;
    executionWithImage: boolean;
  };
  lastUpdated: string;
}

interface DeductCreditRequest {
  service: string;
  customCost?: number;
}

interface DeductCreditResponse {
  success: boolean;
  service: string;
  creditsDeducted: number;
  globalCredits: GlobalCreditInfo;
}

interface registerFcm {
  userId:string, token:string, platform?:string
}

interface CheckServiceAccessRequest {
  service: string;
  customCost?: number;
}

interface CheckServiceAccessResponse {
  success: boolean;
  canAccess: boolean;
  serviceCost: number;
  globalCreditsAvailable: number;
  reason?: string;
}

// ==================== PAYMENT RELATED INTERFACES ====================

interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits: number;
  bonusCredits: number;
  totalCredits: number;
  price: number;
  currency: string;
  originalPrice?: number;
  pricePerCredit: number;
  tier: string;
  features: string[];
  displaySettings: {
    color: string;
    icon?: string;
    badge?: {
      text: string;
      color: string;
    };
    isRecommended: boolean;
    sortOrder: number;
  };
  discountPercentage: number;
  isAvailable: boolean;
}

interface InitiatePaymentRequest {
  packageId: string;
  customerDetails: {
    firstName: string;
    email: string;
    phone?: string;
  };
}

interface InitiatePaymentResponse {
  success: boolean;
  paymentData: {
    orderId: string;
    txnid: string;
    paymentUrl: string;
    paymentParams: {
      key: string;
      txnid: string;
      amount: string;
      productinfo: string;
      firstname: string;
      email: string;
      phone: string;
      currency: string;
      hash: string;
      surl: string;
      furl: string;
      curl: string;
      service_provider: string;
    };
    environment: string;
  };
  packageDetails: {
    name: string;
    credits: number;
    bonusCredits: number;
    totalCredits: number;
    price: number;
    currency: string;
  };
}

interface PaymentStatusResponse {
  success: boolean;
  order: {
    orderId: string;
    status: string;
    amount: number;
    currency: string;
    creditsToAward: number;
    bonusCredits: number;
    creditsAwarded: boolean;
    creditsAwardedAt?: string;
    packageDetails: CreditPackage;
    transaction?: any;
    createdAt: string;
    updatedAt: string;
    paymentDetails: {
      txnid: string;
      mihpayid?: string;
      mode?: string;
      bank_ref_num?: string;
    };
  };
}

interface PaymentHistoryResponse {
  success: boolean;
  orders: Array<{
    orderId: string;
    status: string;
    amount: number;
    currency: string;
    creditsToAward: number;
    bonusCredits: number;
    creditsAwarded: boolean;
    packageDetails: CreditPackage;
    createdAt: string;
  }>;
  pagination: {
    currentPage: number;
    totalPages: number;
    totalOrders: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface GlobalCreditInfo {
  enabled: boolean;
  balance: number;
  totalPurchased: number;
  totalUsed: number;
  enabledAt?: string;
  serviceCosts: {
    [key: string]: number;
  };
}

interface UnifiedCreditStatus {
  type: 'global' | 'legacy';
  balance?: number;
  totalPurchased?: number;
  totalUsed?: number;
  serviceCosts?: { [key: string]: number };
  enabledAt?: string;
  services?: {
    [key: string]: {
      used: number;
      total: number;
      remaining: number;
    };
  };
}

// AI Image Edit interfaces
interface AIImageEditRequest {
  image: File;
  textBasedEdit?: string;
  styleTransfer?: string;
  objectManipulation?: string;
  enhancement?: string | string[];
  customPrompt?: string;
}

interface AIImageEditResponse {
  success: boolean;
  originalImage: string;
  editedImage: string;
  editOptions: {
    textBasedEdit?: string;
    styleTransfer?: string;
    objectManipulation?: string;
    enhancement?: string | string[];
    customPrompt?: string;
  };
  feedback?: string;
  message: string;
  creditsUsed: number;
}

// ==================== AD REWARD RELATED INTERFACES ====================

interface AdSessionRequest {
  adType: 'rewarded' | 'rewarded_interstitial';
  adUnitId: string;
  source: 'profile' | 'credit_purchase' | 'low_credit_warning' | 'main_screen' | 'ai_generation';
  deviceInfo?: {
    platform: string;
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
    connectionType?: string;
  };
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

interface AdSessionResponse {
  success: boolean;
  sessionId: string;
  adType: string;
  creditsToEarn: number;
  message: string;
}

interface CompleteAdSessionRequest {
  sessionId: string;
  watchDuration: number;
  adClicked?: boolean;
  userSkipped?: boolean;
}

interface CompleteAdSessionResponse {
  success: boolean;
  qualifiesForReward: boolean;
  completionRate: number;
  creditsAwarded: number;
  newBalance?: number;
  message: string;
}

interface FailAdSessionRequest {
  sessionId: string;
  errorCode: string;
  errorMessage: string;
  watchDuration?: number;
}

interface FailAdSessionResponse {
  success: boolean;
  status: string;
  creditsAwarded: number;
  message: string;
}

interface AdEligibilityResponse {
  success: boolean;
  isEligible: boolean;
  reason: string;
  stats: {
    period: string;
    ads: {
      totalWatched: number;
      completed: number;
      failed: number;
      averageCompletionRate: number;
      totalWatchTime: number;
    };
    credits: {
      totalEarned: number;
      averagePerAd: number;
      averageDaily: number;
    };
    engagement: {
      totalWatchTimeMinutes: number;
      averageWatchTimePerAd: number;
    };
  };
  creditsPerAd: number;
}

interface AdStatsResponse {
  success: boolean;
  stats: {
    period: string;
    ads: {
      totalWatched: number;
      completed: number;
      failed: number;
      averageCompletionRate: number;
      totalWatchTime: number;
    };
    credits: {
      totalEarned: number;
      averagePerAd: number;
      averageDaily: number;
    };
    engagement: {
      totalWatchTimeMinutes: number;
      averageWatchTimePerAd: number;
    };
  };
}

interface AdSessionDetailsResponse {
  success: boolean;
  session: {
    sessionId: string;
    status: string;
    adType: string;
    startTime: string;
    endTime?: string;
    duration: number;
    watchDuration: number;
    completionRate: number;
    creditsAwarded: number;
    rewardClaimed: boolean;
    source: string;
  };
}

export const creditsApiSlice = globalApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Query endpoints
    fetchUserCredits: builder.query<UserCredits, void>({
      query: () => ({
        url: 'credits',
        method: 'GET',
      }),
      providesTags: ['getandpost'],
    }),

    fetchAutomationCredits: builder.query<AutomationCreditInfo, void>({
      query: () => ({
        url: 'credits/automation',
        method: 'GET',
      }),
      providesTags: ['getandpost'],
    }),

    checkServiceAccess: builder.query<CheckServiceAccessResponse, CheckServiceAccessRequest>({
      query: ({ service, customCost }) => {
        const params = customCost ? `?customCost=${customCost}` : '';
        return {
          url: `credits/check/${service}${params}`,
          method: 'GET',
        };
      },
      providesTags: ['getandpost'],
    }),

    // Mutation endpoints
    deductCredit: builder.mutation<DeductCreditResponse, DeductCreditRequest>({
      query: ({ service, customCost }) => ({
        url: 'credits/deduct',
        method: 'POST',
        body: { service, ...(customCost && { customCost }) },
      }),
      invalidatesTags: ['getandpost'],
    }),

    registerNotification:builder.mutation<any, registerFcm>({
      query: ( data ) => ({
        url: 'fcm/register-token',
        method: 'POST',
        body: data ,
      }),
    }),

    // ==================== PAYMENT RELATED ENDPOINTS ====================

    // Get available credit packages
    fetchCreditPackages: builder.query<{ success: boolean; packages: CreditPackage[] }, void>({
      query: () => ({
        url: 'payments/packages',
        method: 'GET',
      }),
      providesTags: ['getandpost'],
    }),

    // Initiate payment for credit purchase
    initiatePayment: builder.mutation<InitiatePaymentResponse, InitiatePaymentRequest>({
      query: (data) => ({
        url: 'payments/initiate',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['getandpost'],
    }),

    // Get payment status by order ID
    getPaymentStatus: builder.query<PaymentStatusResponse, string>({
      query: (orderId) => ({
        url: `payments/status/${orderId}`,
        method: 'GET',
      }),
      providesTags: ['getandpost'],
    }),

    // Get user's payment history
    getPaymentHistory: builder.query<PaymentHistoryResponse, { page?: number; limit?: number; status?: string }>({
      query: ({ page = 1, limit = 20, status }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        if (status) params.append('status', status);

        return {
          url: `payments/history?${params.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['getandpost'],
    }),

    // Get unified credit balance (global or legacy)
    getUnifiedCreditBalance: builder.query<{ success: boolean; credits: UnifiedCreditStatus }, void>({
      query: () => ({
        url: 'payments/credits/balance',
        method: 'GET',
      }),
      providesTags: ['getandpost'],
    }),

    // AI Image Edit mutation
    editImageWithAI: builder.mutation<AIImageEditResponse, AIImageEditRequest>({
      query: ({ image, textBasedEdit, styleTransfer, objectManipulation, enhancement, customPrompt }) => {
        const formData = new FormData();
        formData.append('image', image);

        if (textBasedEdit) formData.append('textBasedEdit', textBasedEdit);
        if (styleTransfer) formData.append('styleTransfer', styleTransfer);
        if (objectManipulation) formData.append('objectManipulation', objectManipulation);
        if (enhancement) {
          if (Array.isArray(enhancement)) {
            formData.append('enhancement', enhancement.join(', '));
          } else {
            formData.append('enhancement', enhancement);
          }
        }
        if (customPrompt) formData.append('customPrompt', customPrompt);

        return {
          url: 'file/ai-image-edit',
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['getandpost'],
    }),

    // Migrate user to global credit system
    migrateToGlobalCredits: builder.mutation<{ success: boolean; credits: GlobalCreditInfo; message: string }, void>({
      query: () => ({
        url: 'payments/credits/migrate',
        method: 'POST',
      }),
      invalidatesTags: ['getandpost'],
    }),

    // ==================== AD REWARD ENDPOINTS ====================

    // Initiate ad watching session
    initiateAdSession: builder.mutation<AdSessionResponse, AdSessionRequest>({
      query: (data) => ({
        url: 'credits/watch-ad',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['getandpost'],
    }),

    // Complete ad session and claim reward
    completeAdSession: builder.mutation<CompleteAdSessionResponse, CompleteAdSessionRequest>({
      query: (data) => ({
        url: 'credits/claim-ad-reward',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['getandpost'],
    }),

    // Handle ad session failure
    failAdSession: builder.mutation<FailAdSessionResponse, FailAdSessionRequest>({
      query: ({ sessionId, ...data }) => ({
        url: `credits/ad-session/${sessionId}/failed`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['getandpost'],
    }),

    // Update ad loading status
    updateAdLoading: builder.mutation<{ success: boolean; status: string; message: string }, { sessionId: string; loadData?: any }>({
      query: ({ sessionId, loadData = {} }) => ({
        url: `credits/ad-session/${sessionId}/loading`,
        method: 'PUT',
        body: loadData,
      }),
    }),

    // Start ad playback
    startAdPlayback: builder.mutation<{ success: boolean; status: string; message: string }, string>({
      query: (sessionId) => ({
        url: `credits/ad-session/${sessionId}/start`,
        method: 'PUT',
      }),
    }),

    // Check ad eligibility
    checkAdEligibility: builder.query<AdEligibilityResponse, void>({
      query: () => ({
        url: 'credits/ad-eligibility',
        method: 'GET',
      }),
      providesTags: ['getandpost'],
    }),

    // Get user's ad statistics
    getUserAdStats: builder.query<AdStatsResponse, { days?: number }>({
      query: ({ days = 30 } = {}) => ({
        url: `credits/ad-stats?days=${days}`,
        method: 'GET',
      }),
      providesTags: ['getandpost'],
    }),

    // Get ad session details
    getAdSession: builder.query<AdSessionDetailsResponse, string>({
      query: (sessionId) => ({
        url: `credits/ad-session/${sessionId}`,
        method: 'GET',
      }),
      providesTags: ['getandpost'],
    }),

  }),
});

export const {
  // Legacy credit endpoints
  useFetchUserCreditsQuery,
  useLazyFetchUserCreditsQuery,
  useFetchAutomationCreditsQuery,
  useLazyFetchAutomationCreditsQuery,
  useCheckServiceAccessQuery,
  useLazyCheckServiceAccessQuery,
  useDeductCreditMutation,
  useRegisterNotificationMutation,

  // Payment related endpoints
  useFetchCreditPackagesQuery,
  useLazyFetchCreditPackagesQuery,
  useInitiatePaymentMutation,
  useGetPaymentStatusQuery,
  useLazyGetPaymentStatusQuery,
  useGetPaymentHistoryQuery,
  useLazyGetPaymentHistoryQuery,
  useGetUnifiedCreditBalanceQuery,
  useLazyGetUnifiedCreditBalanceQuery,
  useMigrateToGlobalCreditsMutation,

  // AI Image Edit endpoints
  useEditImageWithAIMutation,

  // Ad Reward endpoints
  useInitiateAdSessionMutation,
  useCompleteAdSessionMutation,
  useFailAdSessionMutation,
  useUpdateAdLoadingMutation,
  useStartAdPlaybackMutation,
  useCheckAdEligibilityQuery,
  useLazyCheckAdEligibilityQuery,
  useGetUserAdStatsQuery,
  useLazyGetUserAdStatsQuery,
  useGetAdSessionQuery,
  useLazyGetAdSessionQuery,
} = creditsApiSlice;