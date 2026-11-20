import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi, cartApi } from '../services/index.js';
import { tokenStore } from '../services/api.js';

export const loginUser = createAsyncThunk('auth/login', async (data, { rejectWithValue }) => {
  try {
    const res = await authApi.login(data);
    tokenStore.set(res.data.accessToken);
    try { await cartApi.merge(localStorage.getItem('bookstore_session_id') || ''); } catch { /* non-blocking */ }
    return res.data.user;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error?.message || 'Login failed');
  }
});

export const loginAdmin = createAsyncThunk('auth/loginAdmin', async (data, { rejectWithValue }) => {
  try {
    const res = await authApi.adminLogin(data);
    tokenStore.set(res.data.accessToken);
    return res.data.admin;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error?.message || 'Login failed');
  }
});

export const registerUser = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
  try {
    const res = await authApi.register(data);
    tokenStore.set(res.data.accessToken);
    try { await cartApi.merge(localStorage.getItem('bookstore_session_id') || ''); } catch { /* non-blocking */ }
    return res.data.user;
  } catch (error) {
    return rejectWithValue(error.response?.data?.error?.message || 'Registration failed');
  }
});

export const loadMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const res = await authApi.me();
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.status || 401);
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try { await authApi.logout(); } catch { /* ignore */ }
  tokenStore.clear();
});

const persisted = (() => {
  try { return JSON.parse(localStorage.getItem('bookstore_user') || 'null'); } catch { return null; }
})();

const initialState = {
  user: persisted,
  type: persisted ? 'user' : null,
  token: tokenStore.get(),
  status: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      state.user = action.payload.user;
      state.type = action.payload.type || (action.payload.user?.role ? 'admin' : 'user');
      state.token = action.payload.token;
    },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (s) => { s.status = 'loading'; s.error = null; })
      .addCase(loginUser.fulfilled, (s, a) => {
        s.status = 'succeeded'; s.user = a.payload; s.type = 'user'; s.token = tokenStore.get();
        localStorage.setItem('bookstore_user', JSON.stringify(a.payload));
      })
      .addCase(loginUser.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload; })
      .addCase(registerUser.fulfilled, (s, a) => {
        s.status = 'succeeded'; s.user = a.payload; s.type = 'user'; s.token = tokenStore.get();
        localStorage.setItem('bookstore_user', JSON.stringify(a.payload));
      })
      .addCase(registerUser.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload; })
      .addCase(loginAdmin.fulfilled, (s, a) => {
        s.status = 'succeeded'; s.user = a.payload; s.type = 'admin'; s.token = tokenStore.get();
      })
      .addCase(loginAdmin.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload; })
      .addCase(loadMe.fulfilled, (s, a) => { s.user = a.payload.user; s.type = a.payload.type; })
      .addCase(loadMe.rejected, (s) => { s.user = null; s.type = null; s.token = null; tokenStore.clear(); })
      .addCase(logoutUser.fulfilled, (s) => {
        s.user = null; s.type = null; s.token = null;
        localStorage.removeItem('bookstore_user');
      });
  },
});

export const { setCredentials, clearError } = authSlice.actions;
export default authSlice.reducer;
