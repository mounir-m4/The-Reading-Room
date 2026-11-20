import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, User, ShoppingBag, Heart, MapPin, Star, Settings, KeyRound, PackageSearch } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/index.js';
import { authApi, catalogApi, orderApi, reviewApi } from '../../services/index.js';
import { pushToast } from '../../store/toastSlice.js';
import { Breadcrumbs, Button, Input, Select, EmptyState, Skeleton, Pagination, Modal } from '../../components/common/UI.jsx';
import { ProductGrid } from '../../components/books/BookCard.jsx';
import { formatMoney } from '../../utils/currency.js';
import { localize } from '../../utils/localized.js';

const TABS = [
  { to: '/account', key: 'account.overview', icon: LayoutDashboard, end: true },
  { to: '/account/orders', key: 'account.orders', icon: ShoppingBag },
  { to: '/account/track', key: 'account.orderTracking', icon: PackageSearch },
  { to: '/account/wishlist', key: 'account.wishlist', icon: Heart },
  { to: '/account/addresses', key: 'account.addresses', icon: MapPin },
  { to: '/account/reviews', key: 'account.reviews', icon: Star },
  { to: '/account/profile', key: 'account.profile', icon: User },
  { to: '/account/settings', key: 'account.settings', icon: Settings },
];

export function AccountLayout() {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  return (
    <div className="container-premium py-8">
      <Breadcrumbs items={[{ label: t('account.title') }]} />
      <h1 className="mt-6 font-serif text-4xl font-semibold">{t('account.hello', { name: user?.name?.split(' ')[0] || '' })}</h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-[230px_1fr]">
        <aside className="h-fit rounded-lg border border-line bg-white p-2">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `mb-0.5 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition ${isActive ? 'bg-burgundy text-white' : 'text-muted hover:bg-sand hover:text-ink'}`}>
              <tab.icon size={17} /> {t(tab.key)}
            </NavLink>
          ))}
        </aside>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  );
}

export function AccountOverview() {
  const { t, i18n } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const currency = useAppSelector((s) => s.ui.currency);
  const [orders, setOrders] = useState(null);
  useEffect(() => { orderApi.mine({ limit: 5 }).then((r) => setOrders(r)).catch(() => {}); }, []);
  const spent = orders?.data?.reduce((sum, o) => sum + (o.paymentStatus === 'Paid' ? o.total : 0), 0) || 0;
  return (
    <div>
      <p className="mb-6 text-sm text-muted">{t('account.overviewSub')}</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t('account.totalOrders')} value={orders?.meta?.total ?? '—'} />
        <Stat label={t('account.totalSpent')} value={formatMoney(spent, 'MAD', i18n.language)} />
        <Stat label={t('nav.wishlist')} value={user?.wishlist?.length ?? '—'} />
      </div>
      <div className="card mt-6 p-5">
        <h2 className="font-serif text-xl">{t('account.orders')}</h2>
        {!orders ? <Skeleton className="mt-4 h-24" /> : orders.data.length === 0 ? <p className="mt-4 text-sm text-muted">{t('account.noOrders')}</p> : (
          <div className="mt-4 divide-y divide-line">
            {orders.data.slice(0, 4).map((o) => (
              <div key={o._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div><p className="text-sm font-medium">{o.orderNumber}</p><p className="text-xs text-muted">{new Date(o.createdAt).toLocaleDateString()}</p></div>
                <span className="text-sm font-semibold text-burgundy">{formatMoney(o.displayTotal || o.total, currency, i18n.language)}</span>
                <span className="rounded-full bg-sand px-3 py-1 text-xs">{o.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return <div className="card p-5"><p className="text-xs text-muted">{label}</p><p className="mt-2 font-serif text-3xl font-semibold text-burgundy">{value}</p></div>;
}

export function AccountOrders() {
  const { t, i18n } = useTranslation();
  const currency = useAppSelector((s) => s.ui.currency);
  const [orders, setOrders] = useState({ data: [], meta: null });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  useEffect(() => { orderApi.mine({ page, limit: 10 }).then((r) => setOrders(r)).catch(() => {}); }, [page]);
  return (
    <div>
      {orders.data.length === 0 ? <EmptyState title={t('account.noOrders')} /> : (
        <div className="space-y-4">
          {orders.data.map((o) => (
            <div key={o._id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-sand/40 px-5 py-3 text-xs">
                <div className="flex flex-wrap gap-5"><span>{t('checkout.orderNumber')}: <strong>{o.orderNumber}</strong></span><span>{new Date(o.createdAt).toLocaleDateString()}</span><span>{t('common.status')}: <strong>{o.status}</strong></span></div>
                <button onClick={() => setSelected(o)} className="text-burgundy underline">{t('common.details')}</button>
              </div>
              <div className="p-5">
                {o.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <img src={item.coverImage} alt="" className="h-14 w-10 rounded object-cover" />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{localize(item.title, i18n.language)}</p><p className="text-xs text-muted">×{item.quantity}</p></div>
                    <span className="text-sm">{formatMoney(item.lineDisplayTotal || item.lineTotal, currency, i18n.language)}</span>
                  </div>
                ))}
                <div className="mt-3 flex justify-end border-t border-line pt-3 text-sm font-semibold">{t('common.total')}: <span className="ms-2 text-burgundy">{formatMoney(o.displayTotal || o.total, currency, i18n.language)}</span></div>
              </div>
            </div>
          ))}
          <Pagination meta={orders.meta} onPage={setPage} />
        </div>
      )}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.orderNumber}>
        {selected && (
          <div className="space-y-3 text-sm">
            <p><span className="text-muted">{t('common.status')}:</span> {selected.status}</p>
            <p><span className="text-muted">{t('admin.paymentStatus')}:</span> {selected.paymentStatus}</p>
            <p><span className="text-muted">{t('common.shipping')}:</span> {selected.shippingLabel}</p>
            <p><span className="text-muted">{t('checkout.shipping')}:</span> {selected.shippingAddress?.addressLine1}, {selected.shippingAddress?.city}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function AccountWishlist() {
  const { t } = useTranslation();
  const ids = useAppSelector((s) => s.wishlist.items);
  const [books, setBooks] = useState([]);
  useEffect(() => {
    if (!ids.length) { setBooks([]); return; }
    catalogApi.books({ ids: ids.join(',') }).then((r) => setBooks(r.data)).catch(() => {});
  }, [ids.join(',')]);
  return books.length ? <ProductGrid books={books} /> : <EmptyState icon={Heart} title={t('account.noWishlist')} action={<a href="/shop" className="btn-primary">{t('cart.startShopping')}</a>} />;
}

const profileSchema = z.object({ name: z.string().min(2), phone: z.string().optional(), language: z.enum(['en', 'fr', 'ar']), currency: z.enum(['MAD', 'EUR', 'USD', 'GBP']) });

export function AccountProfile() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', phone: user?.phone || '', language: user?.language || 'en', currency: user?.currency || 'MAD' },
  });
  const submit = async (values) => {
    try { await authApi.updateProfile(values); dispatch(pushToast(t('toast.saved'))); }
    catch { dispatch(pushToast(t('toast.error'), 'error')); }
  };
  return (
    <div className="card max-w-2xl p-6">
      <h2 className="font-serif text-2xl">{t('account.profile')}</h2>
      <form onSubmit={handleSubmit(submit)} className="mt-6 space-y-4">
        <Input label={t('auth.name')} {...register('name')} error={errors.name?.message} />
        <Input label={t('common.phone')} {...register('phone')} />
        <div className="grid grid-cols-2 gap-4">
          <Select label={t('common.language')} options={[{ value: 'en', label: 'English' }, { value: 'fr', label: 'Français' }, { value: 'ar', label: 'العربية' }]} {...register('language')} />
          <Select label={t('common.currency')} options={['MAD', 'EUR', 'USD', 'GBP']} {...register('currency')} />
        </div>
        <Button type="submit" loading={isSubmitting}>{t('common.save')}</Button>
      </form>
    </div>
  );
}

export function AccountAddresses() {
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  return (
    <div>
      {user?.addresses?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {user.addresses.map((a, i) => (
            <div key={i} className="card p-5">
              <div className="flex items-center justify-between"><h3 className="font-medium">{a.label}</h3>{a.isDefault && <span className="rounded bg-burgundy/10 px-2 py-1 text-xs text-burgundy">{t('account.default')}</span>}</div>
              <p className="mt-3 text-sm text-muted">{a.fullName}<br />{a.addressLine1}<br />{a.city}, {a.country}<br />{a.phone}</p>
            </div>
          ))}
        </div>
      ) : <EmptyState icon={MapPin} title={t('account.addresses')} subtitle={t('empty.subtitle')} />}
    </div>
  );
}

export function AccountReviews() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState([]);
  useEffect(() => { reviewApi.mine().then((r) => setItems(r.data)).catch(() => {}); }, []);
  return items.length ? (
    <div className="space-y-3">{items.map((r) => (
      <div key={r._id} className="card p-5">
        <div className="flex justify-between"><p className="font-medium">{localize(r.book?.title, i18n.language)}</p><span className="text-gold">{'★'.repeat(r.rating)}</span></div>
        <p className="mt-2 text-sm text-muted">{r.comment}</p>
        <span className="mt-2 inline-block text-xs text-muted">{r.status}</span>
      </div>
    ))}</div>
  ) : <EmptyState icon={Star} title={t('account.reviews')} />;
}

const pwSchema = z.object({ currentPassword: z.string().min(8), newPassword: z.string().min(8), confirm: z.string().min(8) }).refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export function AccountSettings() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(pwSchema) });
  const submit = async (values) => {
    try { await authApi.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword }); dispatch(pushToast(t('toast.saved'))); }
    catch (error) { dispatch(pushToast(error.response?.data?.error?.message || t('toast.error'), 'error')); }
  };
  return (
    <div className="card max-w-lg p-6">
      <h2 className="flex items-center gap-2 font-serif text-2xl"><KeyRound size={20} /> {t('auth.changePassword')}</h2>
      <form onSubmit={handleSubmit(submit)} className="mt-6 space-y-4">
        <Input label={t('auth.currentPassword')} type="password" {...register('currentPassword')} error={errors.currentPassword?.message} />
        <Input label={t('auth.newPassword')} type="password" {...register('newPassword')} error={errors.newPassword?.message} />
        <Input label={t('auth.confirmPassword')} type="password" {...register('confirm')} error={errors.confirm?.message} />
        <Button type="submit">{t('common.save')}</Button>
      </form>
    </div>
  );
}

export function NotFoundPage() {
  const { t } = useTranslation();
  return <div className="container-premium py-24 text-center"><p className="font-serif text-8xl text-gold">404</p><h1 className="mt-4 font-serif text-4xl">{t('notFound.title')}</h1><p className="mt-3 text-muted">{t('notFound.subtitle')}</p><Link to="/" className="btn-primary mt-8">{t('notFound.home')}</Link></div>;
}
