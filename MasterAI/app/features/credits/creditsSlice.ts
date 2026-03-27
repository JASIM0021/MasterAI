import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_CONFIG } from '../../config/authConfig';

interface CreditInfo {
  used: number;
  total: number; // -1 for unlimited
  available: number;
  resetDate?: string;
  resetInterval?: string;
}

interface AutomationCreditInfo extends CreditInfo {
  // Workflow creation credits
}

interface ExecutionCreditInfo extends CreditInfo {
  // Workflow execution credits
  executionCount: number;
  lastExecution?: string;
}

interface UserCredits {
  // New automation credits
  automation: AutomationCreditInfo;
  execution: ExecutionCreditInfo;

  // Legacy credits (keep for backward compatibility)
  postGeneration?: CreditInfo;
  captionGeneration?: CreditInfo;
  aiImageEdit?: CreditInfo;
  aiImageGeneration?: CreditInfo;
  lastUpdated: string;
}

interface CreditsState {
  credits: UserCredits | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CreditsState = {
  credits: null,
  isLoading: false,
  error: null,
};

// Async thunk to fetch user credits from backend
export const fetchUserCredits = createAsyncThunk(
  'credits/fetchUserCredits',
  async (_, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`${AUTH_CONFIG.api.authBaseUrl}credits`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.data.success) {
        return response.data.credits;
      } else {
        throw new Error(response.data.message || 'Failed to fetch credits');
      }
    } catch (error) {
      console.error('Fetch credits error:', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to fetch credits');
    }
  }
);

// Async thunk to deduct credits for a service
export const deductCredit = createAsyncThunk(
  'credits/deductCredit',
  async ({ service }: { service: string }, { rejectWithValue }) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.post(
        `${AUTH_CONFIG.api.authBaseUrl}credits/deduct`,
        { service },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        return {
          service,
          credits: response.data.credits,
        };
      } else {
        throw new Error(response.data.message || 'Failed to deduct credit');
      }
    } catch (error) {
      console.error('Deduct credit error:', error);
      return rejectWithValue(error.response?.data?.message || error.message || 'Failed to deduct credit');
    }
  }
);

// Async thunk to check if user can use a service
export const checkServiceAccess = createAsyncThunk(
  'credits/checkServiceAccess',
  async ({ service }: { service: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { credits: CreditsState };
      const credits = state.credits.credits;

      if (!credits) {
        // If no credits loaded, fetch them first
        throw new Error('Credits not loaded');
      }

      const serviceCredits = credits[service as keyof UserCredits] as CreditInfo;

      if (!serviceCredits) {
        throw new Error('Service not found');
      }

      // Check if user has unlimited access
      if (serviceCredits.total === -1) {
        return { canUse: true, remaining: -1 };
      }

      // Check if user has remaining credits
      const remaining = serviceCredits.total - serviceCredits.used;
      return { canUse: remaining > 0, remaining };

    } catch (error) {
      console.error('Check service access error:', error);
      return rejectWithValue(error.message || 'Failed to check service access');
    }
  }
);

const creditsSlice = createSlice({
  name: 'credits',
  initialState,
  reducers: {
    clearCredits: (state) => {
      state.credits = null;
      state.error = null;
      state.isLoading = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    // Local credit deduction for immediate UI feedback
    deductCreditLocal: (state, action: PayloadAction<{ service: string }>) => {
      if (state.credits) {
        const service = action.payload.service as keyof UserCredits;
        const serviceCredits = state.credits[service] as CreditInfo;

        if (serviceCredits && serviceCredits.total !== -1) {
          serviceCredits.used = Math.min(serviceCredits.used + 1, serviceCredits.total);
        }

        state.credits.lastUpdated = new Date().toISOString();
      }
    },

    // Update specific service credits
    updateServiceCredits: (state, action: PayloadAction<{ service: string; credits: CreditInfo }>) => {
      if (state.credits) {
        const service = action.payload.service as keyof UserCredits;
        state.credits[service] = action.payload.credits as any;
        state.credits.lastUpdated = new Date().toISOString();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user credits
      .addCase(fetchUserCredits.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserCredits.fulfilled, (state, action) => {
        state.isLoading = false;
        state.credits = action.payload;
        state.error = null;
      })
      .addCase(fetchUserCredits.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Deduct credit
      .addCase(deductCredit.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deductCredit.fulfilled, (state, action) => {
        state.isLoading = false;
        state.credits = action.payload.credits;
        state.error = null;
      })
      .addCase(deductCredit.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })

      // Check service access
      .addCase(checkServiceAccess.pending, (state) => {
        state.error = null;
      })
      .addCase(checkServiceAccess.fulfilled, (state) => {
        state.error = null;
      })
      .addCase(checkServiceAccess.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const {
  clearCredits,
  clearError,
  deductCreditLocal,
  updateServiceCredits,
} = creditsSlice.actions;

export default creditsSlice.reducer;

// Selectors
export const selectUserCredits = (state: { credits: CreditsState }) => state.credits.credits;
export const selectCreditsLoading = (state: { credits: CreditsState }) => state.credits.isLoading;
export const selectCreditsError = (state: { credits: CreditsState }) => state.credits.error;

// Helper function to get remaining credits for a service
export const selectRemainingCredits = (service: string) => (state: { credits: CreditsState }) => {
  const credits = state.credits.credits;
  if (!credits) return 0;

  const serviceCredits = credits[service as keyof UserCredits] as CreditInfo;
  if (!serviceCredits) return 0;

  if (serviceCredits.total === -1) return -1; // Unlimited
  return Math.max(0, serviceCredits.total - serviceCredits.used);
};

// Helper function to check if user can use a service
export const selectCanUseService = (service: string) => (state: { credits: CreditsState }) => {
  const credits = state.credits.credits;
  if (!credits) return false;

  const serviceCredits = credits[service as keyof UserCredits] as CreditInfo;
  if (!serviceCredits) return false;

  if (serviceCredits.total === -1) return true; // Unlimited
  return serviceCredits.used < serviceCredits.total;
};

// Helper functions for automation credits (workflow creation)
export const selectAutomationCredits = (state: { credits: CreditsState }) => {
  return state.credits.credits?.automation || null;
};

export const selectCanCreateWorkflow = (state: { credits: CreditsState }) => {
  const automationCredits = state.credits.credits?.automation;
  if (!automationCredits) return false;

  if (automationCredits.total === -1) return true; // Unlimited
  return automationCredits.used < automationCredits.total;
};

export const selectRemainingWorkflows = (state: { credits: CreditsState }) => {
  const automationCredits = state.credits.credits?.automation;
  if (!automationCredits) return 0;

  if (automationCredits.total === -1) return -1; // Unlimited
  return Math.max(0, automationCredits.total - automationCredits.used);
};

// Helper functions for execution credits (workflow execution)
export const selectExecutionCredits = (state: { credits: CreditsState }) => {
  return state.credits.credits?.execution || null;
};

export const selectCanExecuteWorkflow = (state: { credits: CreditsState }) => {
  const executionCredits = state.credits.credits?.execution;
  if (!executionCredits) return false;

  if (executionCredits.total === -1) return true; // Unlimited
  return executionCredits.used < executionCredits.total;
};

export const selectRemainingExecutions = (state: { credits: CreditsState }) => {
  const executionCredits = state.credits.credits?.execution;
  if (!executionCredits) return 0;

  if (executionCredits.total === -1) return -1; // Unlimited
  return Math.max(0, executionCredits.total - executionCredits.used);
};

// Helper to get both automation and execution credit info
export const selectAutomationCreditSummary = (state: { credits: CreditsState }) => {
  const credits = state.credits.credits;
  if (!credits) return null;

  return {
    automation: {
      used: credits.automation.used,
      total: credits.automation.total,
      available: credits.automation.available,
      resetDate: credits.automation.resetDate,
    },
    execution: {
      used: credits.execution.used,
      total: credits.execution.total,
      available: credits.execution.available,
      resetDate: credits.execution.resetDate,
      executionCount: credits.execution.executionCount,
      lastExecution: credits.execution.lastExecution,
    },
  };
};