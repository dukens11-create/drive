import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';

export type LiveAlert = { id: string; title: string; message: string; createdAt: string };

type RealtimeState = {
  socketConnected: boolean;
  liveOrderCount: number;
  alerts: LiveAlert[];
};

const realtimeSlice = createSlice({
  name: 'realtime',
  initialState: {
    socketConnected: false,
    liveOrderCount: 3,
    alerts: []
  } as RealtimeState,
  reducers: {
    setSocketConnected(state, action: PayloadAction<boolean>) {
      state.socketConnected = action.payload;
    },
    setLiveOrderCount(state, action: PayloadAction<number>) {
      state.liveOrderCount = action.payload;
    },
    pushAlert(state, action: PayloadAction<Omit<LiveAlert, 'id' | 'createdAt'> & { id?: string; createdAt?: string }>) {
      state.alerts.unshift({
        id: action.payload.id || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        createdAt: action.payload.createdAt || new Date().toISOString(),
        title: action.payload.title,
        message: action.payload.message
      });
      state.alerts = state.alerts.slice(0, 12);
    }
  }
});

type SessionState = {
  verified: boolean;
  email: string;
};

const sessionSlice = createSlice({
  name: 'session',
  initialState: { verified: false, email: '' } as SessionState,
  reducers: {
    setVerified(state, action: PayloadAction<boolean>) {
      state.verified = action.payload;
    },
    setEmail(state, action: PayloadAction<string>) {
      state.email = action.payload;
    }
  }
});

export const { setSocketConnected, setLiveOrderCount, pushAlert } = realtimeSlice.actions;
export const { setVerified, setEmail } = sessionSlice.actions;

export const store = configureStore({
  reducer: {
    realtime: realtimeSlice.reducer,
    session: sessionSlice.reducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
