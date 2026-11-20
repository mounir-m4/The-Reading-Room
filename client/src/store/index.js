import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice.js';
import cart from './cartSlice.js';
import wishlist from './wishlistSlice.js';
import ui from './uiSlice.js';
import toast from './toastSlice.js';

export const store = configureStore({
  reducer: { auth, cart, wishlist, ui, toast },
  middleware: (getDefault) => getDefault({ serializableCheck: false }),
});
