import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Platform } from 'react-native';
import { IP_ADDRESS } from './globalApiSlice';

// Auth API doesn't require API key authentication
const authApiSlice = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: Platform.OS === "web"
      ? "http://localhost:3000/api/auth/"
      : `http://${IP_ADDRESS}:3000/api/auth/`,
    prepareHeaders: (headers) => {
      headers.set('Content-Type', 'application/json');
      return headers;
    },
  }),
  tagTypes: ['Auth', 'User'],
  endpoints: (builder) => ({
    // Google Sign-In
    googleSignIn: builder.mutation({
      query: (credentials) => ({
        url: 'google',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth', 'User'],
    }),

    // Refresh Token
    refreshToken: builder.mutation({
      query: (refreshToken) => ({
        url: 'google/refresh',
        method: 'POST',
        body: { refreshToken },
      }),
      invalidatesTags: ['Auth'],
    }),

    // Logout
    logout: builder.mutation({
      query: () => ({
        url: 'logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth', 'User'],
    }),

    // Verify Token (optional endpoint for token validation)
    verifyToken: builder.query({
      query: (token) => ({
        url: 'verify',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }),
      providesTags: ['Auth'],
    }),
  }),
});

export const {
  useGoogleSignInMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useVerifyTokenQuery,
} = authApiSlice;

export default authApiSlice;