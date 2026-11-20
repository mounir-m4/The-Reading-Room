import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { orderApi } from '../../services/index.js';
import { Breadcrumbs, Button, Input, EmptyState } from '../../components/common/UI.jsx';

export function OrderSuccessPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const number = params.get('order');
  return (
    <div className="container-premium max-w-2xl py-20 text-center">
      <CheckCircle className="mx-auto text-emerald-600" size={64} strokeWidth={1.3} />
      <h1 className="mt-6 font-serif text-4xl font-semibold">{t('checkout.orderPlaced')}</h1>
      <p className="mt-4 text-muted">{t('checkout.orderNumber')}: <strong className="text-ink">{number}</strong></p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link to="/account/orders" className="btn-primary">{t('nav.orders')}</Link>
        <Link to="/shop" className="btn-secondary">{t('cart.continueShopping')}</Link>
      </div>
    </div>
  );
}

export function TrackOrderPage() {
  const { t } = useTranslation();
  const [number, setNumber] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const track = async (e) => {
    e.preventDefault();
    setLoading(true); setError(false);
    try { const res = await orderApi.track(number); setOrder(res.data); }
    catch { setError(true); setOrder(null); }
    finally { setLoading(false); }
  };

  return (
    <div className="container-premium max-w-3xl py-10">
      <Breadcrumbs items={[{ label: t('account.orderTracking') }]} />
      <h1 className="mt-6 font-serif text-4xl font-semibold">{t('account.orderTracking')}</h1>
      <form onSubmit={track} className="mt-7 flex flex-wrap gap-3">
        <div className="min-w-[240px] flex-1"><Input placeholder="BK-20260101-ABC123" value={number} onChange={(e) => setNumber(e.target.value)} required /></div>
        <Button type="submit" loading={loading}><Search size={16} /> {t('account.trackByNumber')}</Button>
      </form>
      {error && <p className="mt-4 text-sm text-red-600">{t('common.noResults')}</p>}
      {order && (
        <div className="card mt-8 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs text-muted">{t('checkout.orderNumber')}</p><p className="font-semibold">{order.orderNumber}</p></div>
            <span className="rounded-full bg-burgundy px-4 py-1.5 text-xs text-white">{order.status}</span>
          </div>
          <div className="mt-7 space-y-0">
            {order.statusLog?.map((log, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center"><span className="h-3 w-3 rounded-full bg-gold" />{i < order.statusLog.length - 1 && <span className="h-full w-px bg-line" />}</div>
                <div className="pb-6"><p className="text-sm font-medium">{log.status}</p><p className="text-xs text-muted">{new Date(log.at).toLocaleString()}</p>{log.note && <p className="mt-1 text-xs text-muted">{log.note}</p>}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 border-t border-line pt-5">
            {order.items.map((item, i) => <img key={i} src={item.coverImage} alt="" className="h-16 w-12 rounded object-cover" />)}
          </div>
        </div>
      )}
      {!order && !error && <div className="mt-8"><EmptyState icon={Package} title={t('account.trackByNumber')} /></div>}
    </div>
  );
}
