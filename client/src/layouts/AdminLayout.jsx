import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, FolderTree, Feather, Building2, ShoppingCart, Users,
  Package, Star, Ticket, FileText, Truck, CreditCard, ShieldCheck, Settings,
  BarChart3, ScrollText, Bell, Menu, X, PanelLeftClose, PanelLeftOpen, Search, LogOut,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../hooks/index.js';
import { toggleSidebar, setMobileMenu } from '../store/uiSlice.js';
import { logoutUser } from '../store/authSlice.js';
import { LanguageSelector } from '../components/common/Selectors.jsx';
import BrandLogo from '../components/common/BrandLogo.jsx';
import { adminApi } from '../services/index.js';

const GROUPS = [
  { label: 'admin.overview', items: [
    { to: '/admin', key: 'admin.dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/reports', key: 'admin.reports', icon: BarChart3, permission: 'analytics.view' },
  ]},
  { label: 'admin.management', items: [
    { to: '/admin/books', key: 'admin.books', icon: BookOpen, permission: 'books.view' },
    { to: '/admin/categories', key: 'admin.categories', icon: FolderTree, permission: 'categories.view' },
    { to: '/admin/authors', key: 'admin.authors', icon: Feather, permission: 'authors.view' },
    { to: '/admin/publishers', key: 'admin.publishers', icon: Building2, permission: 'books.view' },
    { to: '/admin/orders', key: 'admin.orders', icon: ShoppingCart, permission: 'orders.view' },
    { to: '/admin/customers', key: 'admin.customers', icon: Users, permission: 'customers.view' },
    { to: '/admin/inventory', key: 'admin.inventory', icon: Package, permission: 'inventory.view' },
    { to: '/admin/reviews', key: 'admin.reviews', icon: Star, permission: 'reviews.manage' },
    { to: '/admin/coupons', key: 'admin.coupons', icon: Ticket, permission: 'coupons.manage' },
  ]},
  { label: 'admin.content', items: [
    { to: '/admin/cms', key: 'admin.cms', icon: FileText, permission: 'cms.manage' },
    { to: '/admin/shipping', key: 'admin.shipping', icon: Truck, permission: 'shipping.manage' },
    { to: '/admin/payments', key: 'admin.payments', icon: CreditCard, permission: 'payments.manage' },
  ]},
  { label: 'admin.system', items: [
    { to: '/admin/notifications', key: 'admin.notifications', icon: Bell },
    { to: '/admin/users', key: 'admin.users', icon: ShieldCheck, permission: 'users.manage' },
    { to: '/admin/audit', key: 'admin.audit', icon: ScrollText, permission: 'users.manage' },
    { to: '/admin/settings', key: 'admin.settings', icon: Settings, permission: 'settings.manage' },
  ]},
];

export default function AdminLayout() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const mobileOpen = useAppSelector((s) => s.ui.mobileMenuOpen);
  const admin = useAppSelector((s) => s.auth.user);
  const [notifications, setNotifications] = useState([]);

  const permissions = admin?.role?.permissions || [];
  const isSuper = admin?.role?.name === 'Super Admin';
  const can = (permission) => isSuper || !permission || permissions.includes(permission);

  useEffect(() => {
    adminApi.notifications().then((res) => setNotifications(res.data)).catch(() => {});
  }, [pathname]);

  const signOut = async () => { await dispatch(logoutUser()); navigate('/admin/login'); };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <Link to="/admin" className={`flex h-16 items-center gap-2 border-b border-white/10 px-5 ${collapsed ? 'justify-center px-0' : ''}`}>
        <BrandLogo tone="light" size="sm" compact={collapsed} />
        {!collapsed && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-gold-light">Admin</span>}
      </Link>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {GROUPS.map((group) => {
          const items = group.items.filter((i) => can(i.permission));
          if (!items.length) return null;
          return (
            <div key={group.label}>
              {!collapsed && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">{t(group.label)}</p>}
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  title={collapsed ? t(item.key) : undefined}
                  onClick={() => dispatch(setMobileMenu(false))}
                  className={({ isActive }) => `mb-0.5 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${isActive ? 'bg-burgundy text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'} ${collapsed ? 'justify-center px-0' : ''}`}
                >
                  <item.icon size={18} className="shrink-0" />
                  {!collapsed && <span>{t(item.key)}</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <button onClick={() => dispatch(toggleSidebar())} className={`hidden w-full items-center gap-3 rounded px-3 py-2 text-sm text-white/60 hover:bg-white/10 lg:flex ${collapsed ? 'justify-center' : ''}`}>
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          {!collapsed && t('admin.collapse')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F6F6F4]">
      <aside className={`fixed inset-y-0 start-0 z-40 hidden bg-ink transition-all duration-300 lg:block ${collapsed ? 'w-[72px]' : 'w-[248px]'}`}>
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => dispatch(setMobileMenu(false))} />
          <aside className="absolute inset-y-0 start-0 w-[260px] bg-ink"><SidebarContent /></aside>
        </div>
      )}

      <div className={`transition-all duration-300 ${collapsed ? 'lg:ps-[72px]' : 'lg:ps-[248px]'}`}>
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white px-4 sm:px-6">
          <button className="lg:hidden" onClick={() => dispatch(setMobileMenu(true))}><Menu size={22} /></button>
          <div className="hidden max-w-md flex-1 items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-muted sm:flex">
            <Search size={16} /><input placeholder={t('admin.searchPlaceholder')} className="w-full bg-transparent outline-none" />
          </div>
          <div className="ms-auto flex items-center gap-2">
            <LanguageSelector compact />
            <div className="relative">
              <button className="relative rounded p-2 hover:bg-sand"><Bell size={19} />
                {notifications.some((n) => !n.isRead) && <span className="absolute top-1 end-1 h-2 w-2 rounded-full bg-red-500" />}
              </button>
            </div>
            <div className="flex items-center gap-2 border-s border-line ps-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-burgundy text-xs text-white">{admin?.name?.[0] || 'A'}</span>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold leading-tight">{admin?.name}</p>
                <p className="text-[10px] text-muted">{admin?.role?.name}</p>
              </div>
              <button onClick={signOut} className="ms-1 rounded p-1.5 text-muted hover:bg-sand hover:text-burgundy" title={t('common.logout')}><LogOut size={16} /></button>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
