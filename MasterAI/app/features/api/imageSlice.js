import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './globalApiSlice';
import apiconstant from '../../Constant/apiconstant';

const PhotoSlice = createApi({
  reducerPath: 'imageApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: async (headers, { getState, endpoint }) => {
      // Add API key for authentication
      headers.set('apiKey', apiconstant.masterAiKey);

      // Get auth token for credit tracking
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      headers.set('Content-Type', 'application/json');

      return headers;
    },
  }),
  tagTypes: ['Image'],
  endpoints: builder => ({
    generateImage: builder.mutation({
      query: ({ prompt, style = 'default', userId }) => ({
        url: 'generate-image',
        method: 'POST',
        body: { prompt, style, userId },
      }),
    }),
  }),
});

export const { useGenerateImageMutation } = PhotoSlice;
export default PhotoSlice;
