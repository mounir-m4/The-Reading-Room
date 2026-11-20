import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/layout/Header.jsx';
import Footer from '../components/layout/Footer.jsx';
import CartDrawer from '../components/cart/CartDrawer.jsx';
import { useAppDispatch, useAppSelector } from '../hooks/index.js';
import { fetchCart } from '../store/cartSlice.js';
import { fetchWishlist } from '../store/wishlistSlice.js';
import { loadMe } from '../store/authSlice.js';
import { cmsApi } from '../services/index.js';
import { setSettings } from '../store/uiSlice.js';

export default function StorefrontLayout() {
  const dispatch = useAppDispatch();
  const { pathname } = useLocation();
  const token = useAppSelector((s) => s.auth.token);
  const currency = useAppSelector((s) => s.ui.currency);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname]);
  useEffect(() => { dispatch(fetchCart(currency)); }, [dispatch, currency]);
  useEffect(() => { if (token) { dispatch(loadMe()); dispatch(fetchWishlist()); } }, [dispatch, token]);
  useEffect(() => {
    cmsApi.settings().then((res) => dispatch(setSettings(res.data))).catch(() => {});
  }, [dispatch]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1"><Outlet /></main>
      <Footer />
      <CartDrawer />
    </div>
  );
}
