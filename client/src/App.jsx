import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { HelmetProvider } from 'react-helmet-async';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { store } from './store/index.js';
import { loadMe } from './store/authSlice.js';
import i18n from './i18n.js';
import { useAppDispatch, useAppSelector } from './hooks/index.js';
import { AdminGuard, CustomerGuard, GuestGuard } from './routes/Guards.jsx';
import { Toaster } from './components/common/UI.jsx';
import StorefrontLayout from './layouts/StorefrontLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';

import HomePage from './pages/storefront/HomePage.jsx';
import ShopPage from './pages/storefront/ShopPage.jsx';
import BookDetailPage from './pages/storefront/BookDetailPage.jsx';
import CartPage from './pages/storefront/CartPage.jsx';
import CheckoutPage from './pages/storefront/CheckoutPage.jsx';
import { OrderSuccessPage, TrackOrderPage } from './pages/storefront/OrderPages.jsx';
import { AuthorPage, AuthorsPage, CategoriesPage, CategoryPage, CmsPage } from './pages/storefront/BrowsePages.jsx';
import {
  AdminLoginPage, ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage, VerifyEmailPage,
} from './pages/auth/AuthPages.jsx';
import {
  AccountAddresses, AccountLayout, AccountOverview, AccountOrders, AccountProfile,
  AccountReviews, AccountSettings, AccountWishlist, NotFoundPage,
} from './pages/account/AccountPages.jsx';

import DashboardPage from './pages/admin/DashboardPage.jsx';
import BooksPage from './pages/admin/BooksPage.jsx';
import { AuthorsPage as AdminAuthorsPage, CategoriesPage as AdminCategoriesPage, PublishersPage } from './pages/admin/TaxonomyPage.jsx';
import InventoryPage from './pages/admin/InventoryPage.jsx';
import OrdersPage from './pages/admin/OrdersPage.jsx';
import CustomersPage from './pages/admin/CustomersPage.jsx';
import ReviewsPage from './pages/admin/ReviewsPage.jsx';
import CouponsPage from './pages/admin/CouponsPage.jsx';
import CmsAdminPage from './pages/admin/CmsAdminPage.jsx';
import ShippingPage from './pages/admin/ShippingPage.jsx';
import PaymentsPage from './pages/admin/PaymentsPage.jsx';
import UsersPage from './pages/admin/UsersPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';
import ReportsPage from './pages/admin/ReportsPage.jsx';
import AuditPage from './pages/admin/AuditPage.jsx';
import NotificationsPage from './pages/admin/NotificationsPage.jsx';

function AuthBootstrap({ children }) {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);
  const { t } = useTranslation();
  const [ready, setReady] = useState(!token);

  useEffect(() => {
    if (!token) { setReady(true); return; }
    let active = true;
    dispatch(loadMe()).unwrap().catch(() => {}).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [dispatch, token]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-muted">
        {t('common.loading')}
      </div>
    );
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Storefront */}
      <Route element={<StorefrontLayout />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="books/:slug" element={<BookDetailPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="categories/:slug" element={<CategoryPage />} />
        <Route path="authors" element={<AuthorsPage />} />
        <Route path="authors/:slug" element={<AuthorPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CustomerGuard><CheckoutPage /></CustomerGuard>} />
        <Route path="order-success" element={<OrderSuccessPage />} />
        <Route path="track-order" element={<TrackOrderPage />} />
        <Route path="about" element={<CmsPage pageKey="about" />} />
        <Route path="contact" element={<CmsPage pageKey="contact" />} />
        <Route path="pages/:key" element={<CmsPage />} />

        {/* Customer account */}
        <Route path="account" element={<CustomerGuard><AccountLayout /></CustomerGuard>}>
          <Route index element={<AccountOverview />} />
          <Route path="orders" element={<AccountOrders />} />
          <Route path="track" element={<TrackOrderPage />} />
          <Route path="wishlist" element={<AccountWishlist />} />
          <Route path="addresses" element={<AccountAddresses />} />
          <Route path="reviews" element={<AccountReviews />} />
          <Route path="profile" element={<AccountProfile />} />
          <Route path="settings" element={<AccountSettings />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Customer authentication */}
      <Route path="login" element={<GuestGuard><LoginPage /></GuestGuard>} />
      <Route path="register" element={<GuestGuard><RegisterPage /></GuestGuard>} />
      <Route path="forgot-password" element={<ForgotPasswordPage />} />
      <Route path="reset-password" element={<ResetPasswordPage />} />
      <Route path="verify-email" element={<VerifyEmailPage />} />
      <Route path="admin/login" element={<AdminLoginPage />} />

      {/* Admin dashboard */}
      <Route path="admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
        <Route index element={<AdminGuard permission="analytics.view"><DashboardPage /></AdminGuard>} />
        <Route path="books" element={<AdminGuard permission="books.view"><BooksPage /></AdminGuard>} />
        <Route path="categories" element={<AdminGuard permission="categories.view"><AdminCategoriesPage /></AdminGuard>} />
        <Route path="authors" element={<AdminGuard permission="authors.view"><AdminAuthorsPage /></AdminGuard>} />
        <Route path="publishers" element={<AdminGuard permission="books.view"><PublishersPage /></AdminGuard>} />
        <Route path="orders" element={<AdminGuard permission="orders.view"><OrdersPage /></AdminGuard>} />
        <Route path="customers" element={<AdminGuard permission="customers.view"><CustomersPage /></AdminGuard>} />
        <Route path="inventory" element={<AdminGuard permission="inventory.view"><InventoryPage /></AdminGuard>} />
        <Route path="reviews" element={<AdminGuard permission="reviews.manage"><ReviewsPage /></AdminGuard>} />
        <Route path="coupons" element={<AdminGuard permission="coupons.manage"><CouponsPage /></AdminGuard>} />
        <Route path="cms" element={<AdminGuard permission="cms.manage"><CmsAdminPage /></AdminGuard>} />
        <Route path="shipping" element={<AdminGuard permission="shipping.manage"><ShippingPage /></AdminGuard>} />
        <Route path="payments" element={<AdminGuard permission="payments.manage"><PaymentsPage /></AdminGuard>} />
        <Route path="users" element={<AdminGuard permission="users.manage"><UsersPage /></AdminGuard>} />
        <Route path="audit" element={<AdminGuard permission="users.manage"><AuditPage /></AdminGuard>} />
        <Route path="settings" element={<AdminGuard permission="settings.manage"><SettingsPage /></AdminGuard>} />
        <Route path="reports" element={<AdminGuard permission="analytics.view"><ReportsPage /></AdminGuard>} />
        <Route path="notifications" element={<AdminGuard><NotificationsPage /></AdminGuard>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <HelmetProvider>
        <I18nextProvider i18n={i18n}>
          <BrowserRouter>
            <AuthBootstrap>
              <AppRoutes />
              <Toaster />
            </AuthBootstrap>
          </BrowserRouter>
        </I18nextProvider>
      </HelmetProvider>
    </Provider>
  );
}
