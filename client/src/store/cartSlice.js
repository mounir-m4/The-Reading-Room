import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cartApi } from '../services/index.js';

export const fetchCart = createAsyncThunk('cart/fetch', async (currency, { rejectWithValue }) => {
  try { return (await cartApi.get(currency)).data; } catch (e) { return rejectWithValue(e.message); }
});
export const addItem = createAsyncThunk('cart/add', async ({ book, quantity }, { rejectWithValue }) => {
  try { return (await cartApi.add(book, quantity)).data; } catch (e) { return rejectWithValue(e.response?.data?.error?.message || e.message); }
});
export const updateItem = createAsyncThunk('cart/update', async ({ bookId, quantity }, { rejectWithValue }) => {
  try { return (await cartApi.update(bookId, quantity)).data; } catch (e) { return rejectWithValue(e.message); }
});
export const removeItem = createAsyncThunk('cart/remove', async (bookId, { rejectWithValue }) => {
  try { return (await cartApi.remove(bookId)).data; } catch (e) { return rejectWithValue(e.message); }
});
export const clearCart = createAsyncThunk('cart/clear', async (_, { rejectWithValue }) => {
  try { return (await cartApi.clear()).data; } catch (e) { return rejectWithValue(e.message); }
});
export const applyCoupon = createAsyncThunk('cart/coupon', async (code, { rejectWithValue }) => {
  try { return (await cartApi.coupon(code)).data; } catch (e) { return rejectWithValue(e.response?.data?.error?.message || e.message); }
});

const initialState = { items: [], itemCount: 0, subtotal: 0, displaySubtotal: 0, currency: 'MAD', coupon: null, loading: false, error: null, open: false };

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCurrency(state, action) { state.currency = action.payload; },
    toggleCart(state, action) { state.open = action.payload ?? !state.open; },
  },
  extraReducers: (builder) => {
    const pending = (s) => { s.loading = true; s.error = null; };
    const fulfilled = (s, a) => {
      s.loading = false;
      if (a.payload?.items) {
        s.items = a.payload.items;
        s.itemCount = a.payload.itemCount;
        s.subtotal = a.payload.subtotal;
        s.displaySubtotal = a.payload.displaySubtotal;
        s.currency = a.payload.currency;
        if (a.payload.coupon) s.coupon = a.payload.coupon;
      }
    };
    const rejected = (s, a) => { s.loading = false; s.error = a.payload; };
    [fetchCart, addItem, updateItem, removeItem, clearCart, applyCoupon].forEach((thunk) => {
      const onFulfilled = thunk === clearCart
        ? (s, a) => {
          fulfilled(s, a);
          s.items = []; s.itemCount = 0; s.subtotal = 0; s.displaySubtotal = 0; s.coupon = null;
        }
        : fulfilled;
      builder.addCase(thunk.pending, pending).addCase(thunk.fulfilled, onFulfilled).addCase(thunk.rejected, rejected);
    });
  },
});

export const { setCurrency, toggleCart } = cartSlice.actions;
export default cartSlice.reducer;
