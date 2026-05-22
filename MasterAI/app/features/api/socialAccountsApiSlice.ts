import globalApiSlice from "./globalApiSlice";

interface ConnectedAccount {
  id: string;
  accountId: string;
  accountName: string;
  username: string | null;
  profilePicture: string | null;
  accountType: string;
  isVerified: boolean;
  lastConnected: string;
  permissions: string[];
}

interface ConnectedAccountsResponse {
  success: boolean;
  accounts: Record<string, ConnectedAccount[]>;
  totalAccounts: number;
}

// Simplified platform interface - no OAuth required
interface SocialPlatform {
  id: string;
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter';
  isEnabled: boolean;
  displayName: string;
  description: string;
  icon: string;
  color: string;
  sharingCapabilities: {
    maxTextLength: number;
    supportsImages: boolean;
    supportsHashtags: boolean;
    requiresManualUpload: boolean;
  };
}

interface SharingUrlsResponse {
  postId: string;
  sharingData: {
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
}

interface GenerateSharingUrlsRequest {
  postId: string;
  platforms?: string[];
}

// API slice with real endpoints for connected accounts management
export const socialAccountsApiSlice = globalApiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get available platforms info
    fetchAvailablePlatforms: builder.query<SocialPlatform[], void>({
      queryFn: () => {
        // Return static platform data since no OAuth is needed
        const platforms: SocialPlatform[] = [
          {
            id: 'facebook',
            platform: 'facebook',
            isEnabled: true,
            displayName: 'Facebook',
            description: 'Share to Facebook with pre-filled content',
            icon: 'facebook',
            color: '#1877F2',
            sharingCapabilities: {
              maxTextLength: 63206,
              supportsImages: true,
              supportsHashtags: true,
              requiresManualUpload: false,
            },
          },
          {
            id: 'instagram',
            platform: 'instagram',
            isEnabled: true,
            displayName: 'Instagram',
            description: 'Open Instagram app with content to share',
            icon: 'instagram',
            color: '#E4405F',
            sharingCapabilities: {
              maxTextLength: 2200,
              supportsImages: true,
              supportsHashtags: true,
              requiresManualUpload: true,
            },
          },
          {
            id: 'twitter',
            platform: 'twitter',
            isEnabled: true,
            displayName: 'Twitter',
            description: 'Share to Twitter with pre-filled content',
            icon: 'twitter',
            color: '#1DA1F2',
            sharingCapabilities: {
              maxTextLength: 280,
              supportsImages: true,
              supportsHashtags: true,
              requiresManualUpload: true,
            },
          },
          {
            id: 'linkedin',
            platform: 'linkedin',
            isEnabled: true,
            displayName: 'LinkedIn',
            description: 'Share to LinkedIn with content template',
            icon: 'linkedin',
            color: '#0A66C2',
            sharingCapabilities: {
              maxTextLength: 3000,
              supportsImages: true,
              supportsHashtags: true,
              requiresManualUpload: true,
            },
          },
        ];

        return { data: platforms };
      },
      providesTags: ['SocialPlatforms'],
    }),

    // Generate sharing URLs for a post
    generateSharingUrls: builder.query<SharingUrlsResponse, GenerateSharingUrlsRequest>({
      query: ({ postId, platforms }) => {
        const queryParams = platforms ? `?platforms=${platforms.join(',')}` : '';
        return {
          url: `approval/sharing-urls/${postId}${queryParams}`,
          method: 'GET',
        };
      },
      providesTags: (result, error, { postId }) => [
        { type: 'SharingUrls', id: postId },
      ],
    }),

    // Get connected social accounts for the current user
    getConnectedAccounts: builder.query<ConnectedAccountsResponse, void>({
      query: () => ({
        url: 'social/accounts',
        method: 'GET',
      }),
      providesTags: ['ConnectedAccounts'],
    }),

    // Disconnect a social account
    disconnectAccount: builder.mutation<{ success: boolean; message: string }, string>({
      query: (accountId) => ({
        url: `social/accounts/${accountId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ConnectedAccounts'],
    }),

    // Refresh a social account token
    refreshAccountToken: builder.mutation<{ success: boolean; message: string }, string>({
      query: (accountId) => ({
        url: `social/accounts/${accountId}/refresh`,
        method: 'POST',
      }),
      invalidatesTags: ['ConnectedAccounts'],
    }),
  }),
});

export const {
  useFetchAvailablePlatformsQuery,
  useGenerateSharingUrlsQuery,
  useLazyGenerateSharingUrlsQuery,
  useGetConnectedAccountsQuery,
  useDisconnectAccountMutation,
  useRefreshAccountTokenMutation,
} = socialAccountsApiSlice;