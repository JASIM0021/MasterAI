import {
  configureStore,
  combineReducers,
  applyMiddleware,
  createStore,
} from '@reduxjs/toolkit';

import GlobalSlice from './slice/GlobalSlice';


// Import authentication modules
import authReducer from './auth/authSlice';
import authApiSlice from './api/authApiSlice';

// Import credits module
import creditsReducer from './credits/creditsSlice';

// Import image API
import imageApiSlice from './api/imageSlice';

// Import social automation API slices
import { postsApiSlice } from './api/postsApiSlice';
import { schedulesApiSlice } from './api/schedulesApiSlice';
import { creditsApiSlice } from './api/creditsApiSlice';
import { socialAccountsApiSlice } from './api/socialAccountsApiSlice';

// Import social automation modules
import socialAccountsReducer from './social/socialAccountsSlice';
import postsReducer from './social/postsSlice';
import schedulesReducer from './social/schedulesSlice';

// Import ad rewards module
import adRewardsReducer from './adRewards/adRewardSlice';

import { setupListeners } from '@reduxjs/toolkit/query';
import globalApiSlice from './api/globalApiSlice';

export const store = configureStore({
  reducer: {
    // Add the generated reducer as a specific top-level slice
    [globalApiSlice.reducerPath]: globalApiSlice.reducer,

    // Add authentication reducers
    auth: authReducer,
    [authApiSlice.reducerPath]: authApiSlice.reducer,

    // Add credits reducer
    credits: creditsReducer,

    // Add image API
    [imageApiSlice.reducerPath]: imageApiSlice.reducer,

    // Add social automation reducers
    socialAccounts: socialAccountsReducer,
    posts: postsReducer,
    schedules: schedulesReducer,

    // Add ad rewards reducer
    adReward: adRewardsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types from serialization check
        ignoredActions: [
          'erm/executeQuery/pending',
          'erm/executeQuery/fulfilled',
          'erm/executeQuery/rejected',
          'persist/PERSIST',
          'persist/REHYDRATE',
        ],
        // Ignore these field paths in all actions
        ignoredActionsPaths: [
          'meta.arg',
          'meta.baseQueryMeta',
          'payload.data._bodyBlob',
          'payload.data._bodyInit',
          'payload.data.bodyUsed',
          'payload.data.headers',
          'payload.data.ok',
          'payload.data.status',
          'payload.data.statusText',
          'payload.data.type',
          'payload.data.url',
        ],
        // Ignore these paths in the state
        ignoredPaths: [
          'erm.queries',
          'erm.mutations',
          'erm.subscriptions',
        ],
      },
    }).concat(
      globalApiSlice.middleware,
      authApiSlice.middleware,
      imageApiSlice.middleware
    ),
});
// Setup RTK Query listeners for refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);
export default store;
