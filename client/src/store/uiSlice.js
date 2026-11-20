import { createSlice } from '@reduxjs/toolkit';
import i18n from '../i18n.js';
import { SUPPORTED_CURRENCIES } from '../utils/money.js';

const read = (key, fallback) => {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
};

const initialState = {
  language: read('bookstore_lang', 'en'),
  currency: SUPPORTED_CURRENCIES.includes(read('bookstore_currency', 'MAD')) ? read('bookstore_currency', 'MAD') : 'MAD',
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  settings: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLanguage(state, action) {
      state.language = action.payload;
      localStorage.setItem('bookstore_lang', action.payload);
      i18n.changeLanguage(action.payload);
    },
    setCurrency(state, action) {
      state.currency = action.payload;
      localStorage.setItem('bookstore_currency', action.payload);
    },
    toggleSidebar(state) { state.sidebarCollapsed = !state.sidebarCollapsed; },
    setMobileMenu(state, action) { state.mobileMenuOpen = action.payload; },
    setSettings(state, action) { state.settings = action.payload; },
  },
});

export const { setLanguage, setCurrency, toggleSidebar, setMobileMenu, setSettings } = uiSlice.actions;
export default uiSlice.reducer;
