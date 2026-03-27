import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import apiconstant from '../../Constant/apiconstant';
import { Platform } from 'react-native';
import tokenManager from '../../utils/tokenManager';

// let url = "https://android-manager.onrender.com";
// let url=" https://liberal-salmon-enormously.ngrok-free.app"
// let url=
export let IP_ADDRESS = '10.103.176.12'
 let url = {
  // http://192.168.114.113

  url_dev: Platform.OS == "web" ? "http://localhost:3000/api/" : `http://${IP_ADDRESS}:3000/api/`,
  url_prod: 'https://masteraiapi.todayintech.in/api/'
};

 export let API_URL = url[__DEV__ ? 'url_dev' : 'url_prod'];


 const globalApiSlice = createApi({
  reducerPath: 'erm',
  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: async (headers, { getState, endpoint }) => {
      // Initialize tokenManager if not already done
      await tokenManager.initialize();

      const token = tokenManager.getToken();
      console.log('token from tokenManager', token ? `${token.substring(0, 20)}...` : 'null');

      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      headers.set('apiKey', apiconstant.masterAiKey);

      return headers;
    },
  }),
  tagTypes: ['erm', 'getandpost'],
  endpoints: builder => ({}),
});


export default globalApiSlice;