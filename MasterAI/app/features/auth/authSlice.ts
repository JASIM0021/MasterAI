import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tokenManager from '../../utils/tokenManager';

interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  emailVerified: boolean;
  authProvider: string;
  lastLogin: string;
  role?: string;
  subscription?: {
    plan: string;
    isActive: boolean;
  };
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastSignInMethod: 'google' | 'facebook' | 'email' | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  lastSignInMethod: null,
};

// Define the restoreAuthState thunk using tokenManager
export const restoreAuthState = createAsyncThunk(
  'auth/restoreAuthState',
  async () => {
    try {
      // Initialize tokenManager and load from storage
      await tokenManager.initialize();
      const authData = await tokenManager.loadFromStorage();

      if (authData.isValid) {
        return {
          user: authData.userData,
          token: authData.token,
          method: authData.lastMethod as 'google' | 'facebook' | 'email' | undefined,
        };
      } else {
        throw new Error('No valid authentication data found');
      }
    } catch (error) {
      console.error('Failed to restore auth state:', error);
      throw error;
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Start authentication process
    authStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },

    // Authentication success
    authSuccess: (state, action: PayloadAction<{ user: User; token: string; method: 'google' | 'facebook' | 'email' }>) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.lastSignInMethod = action.payload.method;
      state.error = null;

      // Store using tokenManager for better persistence
      tokenManager.saveToken(action.payload.token, action.payload.user, action.payload.method);
    },

    // Authentication failure
    authFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
      state.error = action.payload;
    },

    // Update user information
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        // Update using tokenManager
        tokenManager.saveToken(state.token, state.user, state.lastSignInMethod);
      }
    },

    // Clear authentication state
    clearAuth: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
      state.lastSignInMethod = null;

      // Clear using tokenManager
      tokenManager.clearStorage();
    },

    // Restore authentication state from storage
    restoreAuth: (state, action: PayloadAction<{ user: User; token: string; method?: 'google' | 'facebook' | 'email' }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.lastSignInMethod = action.payload.method || null;
      state.isLoading = false;
      state.error = null;
    },

    // Clear error message
    clearError: (state) => {
      state.error = null;
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    // Update token (for refresh scenarios)
    updateToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      tokenManager.updateToken(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreAuthState.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(restoreAuthState.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.lastSignInMethod = action.payload.method;
        state.error = null;
      })
      .addCase(restoreAuthState.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.lastSignInMethod = null;
        state.error = action.error.message || 'Failed to restore authentication';
      });
  },
});

export const {
  authStart,
  authSuccess,
  authFailure,
  updateUser,
  clearAuth,
  restoreAuth,
  clearError,
  setLoading,
  updateToken,
} = authSlice.actions;

export default authSlice.reducer;

// Async action for logout
export const logoutUser = () => async (dispatch: any) => {
  try {
    dispatch(setLoading(true));

    // Here you could also call a backend logout endpoint if needed
    // await axios.post('/api/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } });

    dispatch(clearAuth());
  } catch (error) {
    console.error('Logout error:', error);
    // Even if logout fails, we should clear local state
    dispatch(clearAuth());
  }
};

// Selectors
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAuthToken = (state: { auth: AuthState }) => state.auth.token;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectLastSignInMethod = (state: { auth: AuthState }) => state.auth.lastSignInMethod;