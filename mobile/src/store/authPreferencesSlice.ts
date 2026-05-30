import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type AuthPreferencesState = {
  rememberMe: boolean;
};

export const DEFAULT_REMEMBER_ME = true;

const initialState: AuthPreferencesState = {
  rememberMe: DEFAULT_REMEMBER_ME,
};

const authPreferencesSlice = createSlice({
  name: 'authPreferences',
  initialState,
  reducers: {
    setRememberMe(state, action: PayloadAction<boolean>) {
      state.rememberMe = action.payload;
    },
  },
});

export const { setRememberMe } = authPreferencesSlice.actions;
export const authPreferencesReducer = authPreferencesSlice.reducer;
