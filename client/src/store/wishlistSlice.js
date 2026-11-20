import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cartApi } from '../services/index.js';

const loadLocal = () => {
  try { return JSON.parse(localStorage.getItem('bookstore_wishlist') || '[]'); } catch { return []; }
};

export const fetchWishlist = createAsyncThunk('wishlist/fetch', async (_, { getState, rejectWithValue }) => {
  if (!getState().auth.user) return loadLocal();
  try { return (await cartApi.wishlist()).data.items.map((line) => line.book); } catch (e) { return rejectWithValue(e.message); }
});

export const toggleWishlistItem = createAsyncThunk('wishlist/toggle', async (bookId, { getState }) => {
  const state = getState().wishlist;
  const exists = state.items.includes(bookId);
  const next = exists ? state.items.filter((id) => id !== bookId) : [...state.items, bookId];
  localStorage.setItem('bookstore_wishlist', JSON.stringify(next));
  if (getState().auth.user) {
    try { await cartApi.toggleWishlist(bookId); } catch { /* local state remains authoritative for UX */ }
  }
  return { bookId, active: !exists };
});

const initialState = { items: loadLocal(), loading: false };

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (s) => { s.loading = true; })
      .addCase(fetchWishlist.fulfilled, (s, a) => {
        s.loading = false;
        if (a.payload?.length) s.items = a.payload.map((b) => b._id || b.book?._id || b);
      })
      .addCase(fetchWishlist.rejected, (s) => { s.loading = false; })
      .addCase(toggleWishlistItem.fulfilled, (s, a) => {
        const { bookId, active } = a.payload;
        s.items = active ? [...new Set([...s.items, bookId])] : s.items.filter((id) => id !== bookId);
      });
  },
});

export default wishlistSlice.reducer;
