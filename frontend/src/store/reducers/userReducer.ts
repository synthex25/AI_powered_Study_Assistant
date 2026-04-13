import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../../types';

interface UserState {
  user: User | null;
  token: string | null;
  role: string | null;
}

interface SetUserPayload {
  user: User;
  token: string;
  role?: string;
}

const initialState: UserState = {
  user: null,
  token: null,
  role: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<SetUserPayload>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.role = action.payload.role ?? null;
    },
    clearUser: (state) => {
      state.user = null;
      state.token = null;
      state.role = null;
    },
    setHasSeenOnboarding: (state, action: PayloadAction<boolean>) => {
      if (state.user) {
        state.user.hasSeenOnboarding = action.payload;
      }
    },
  },
});

export const { setUser, clearUser, setHasSeenOnboarding } = userSlice.actions;

export default userSlice.reducer;
