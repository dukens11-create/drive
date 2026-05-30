import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type AuthPreferencesState = {
  rememberMe: boolean;
};

const initialState: AuthPreferencesState = {
  rememberMe: true,
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
