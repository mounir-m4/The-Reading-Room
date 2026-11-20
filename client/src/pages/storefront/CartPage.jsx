import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag, ArrowRight, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/index.js';
import { removeItem, updateItem, applyCoupon, clearCart } from '../../store/cartSlice.js';
import { pushToast } from '../../store/toastSlice.js';
import { Breadcrumbs, EmptyState, Button } from '../../components/common/UI.jsx';
import { formatMoney } from '../../utils/currency.js';
import { localize } from '../../utils/localized.js';

export default function CartPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const cart = useAppSelector((s) => s.cart);
  const currency = useAppSelector((s) => s.ui.currency);
  const [code, setCode] = useState('');

  const apply = async (e) => {
    e.preventDefault();
    const res = await dispatch(applyCoupon(code));
    dispatch(pushToast(res.error ? (res.payload || t('cart.invalidCoupon')) : t('toast.couponApplied'), res.error ? 'error' : 'success'));
  };

  if (!cart.items.length) return (
    <div className="container-premium py-16">
      <EmptyState icon={ShoppingBag} title={t('cart.empty')} subtitle={t('cart.emptySub')} action={<Link to="/shop" className="btn-primary">{t('cart.startShopping')}</Link>} />
    </div>
  );

  return (
    <div className="container-premium py-8">
      <Breadcrumbs items={[{ label: t('cart.title') }]} />
      <h1 className="mt-6 font-serif text-4xl font-semibold">{t('cart.title')} <span className="text-lg font-sans text-muted">({t('cart.itemCount', { count: cart.itemCount })})</span></h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {cart.items.map((line) => (
            <div key={line.book._id} className="card flex gap-4 overflow-hidden p-3 sm:p-4">
              <Link to={`/books/${line.book.slug}`} className="w-20 shrink-0 sm:w-28">
                <img src={line.book.coverImage} alt="" className="aspect-[3/4] w-full rounded object-cover" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link to={`/books/${line.book.slug}`} className="font-serif text-lg font-semibold hover:text-burgundy">{localize(line.book.title, i18n.language)}</Link>
                    <p className="text-xs text-muted">{line.book.author?.name}</p>
                  </div>
                  <button onClick={() => dispatch(removeItem(line.book._id))} className="text-muted hover:text-red-600" aria-label="remove"><Trash2 size={17} /></button>
                </div>
                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                  <div className="flex items-center rounded-md border border-line">
                    <button onClick={() => dispatch(updateItem({ bookId: line.book._id, quantity: Math.max(1, line.quantity - 1) }))} className="px-3 py-1.5">−</button>
                    <span className="w-9 text-center text-sm">{line.quantity}</span>
                    <button onClick={() => dispatch(updateItem({ bookId: line.book._id, quantity: Math.min(line.maxQuantity || 99, line.quantity + 1) }))} className="px-3 py-1.5">+</button>
                  </div>
                  <span className="font-semibold text-burgundy">{formatMoney(line.displayLineTotal || line.lineTotal, currency, i18n.language)}</span>
                </div>
                {!line.available && <p className="mt-2 text-xs text-red-600">{t('cart.stockWarning', { count: line.maxQuantity })}</p>}
              </div>
            </div>
          ))}
          <div className="flex justify-between">
            <Link to="/shop" className="text-sm text-burgundy hover:underline">← {t('cart.continueShopping')}</Link>
            <button onClick={() => dispatch(clearCart())} className="text-sm text-muted hover:text-red-600">{t('common.clearAll')}</button>
          </div>
        </div>

        <aside className="h-fit rounded-lg border border-line bg-white p-6">
          <h2 className="font-serif text-xl font-semibold">{t('cart.orderSummary')}</h2>
          <form onSubmit={apply} className="mt-5">
            <label className="label">{t('cart.couponPlaceholder')}</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted" />
                <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SAVE10" className="input ps-9 text-sm" />
              </div>
              <Button type="submit" variant="secondary" className="px-3">{t('common.apply')}</Button>
            </div>
          </form>
          <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t('common.subtotal')}</dt><dd>{formatMoney(cart.displaySubtotal, currency, i18n.language)}</dd></div>
            {cart.coupon && <div className="flex justify-between text-emerald-700"><dt>{t('common.discount')} ({cart.coupon})</dt><dd>—</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">{t('common.shipping')}</dt><dd className="text-muted">{t('common.free')}</dd></div>
            <div className="flex justify-between border-t border-line pt-4 text-lg font-semibold"><dt>{t('common.total')}</dt><dd className="text-burgundy">{formatMoney(cart.displaySubtotal, currency, i18n.language)}</dd></div>
          </dl>
          <Link to="/checkout" className="btn-primary mt-6 flex w-full py-3">{t('cart.checkout')} <ArrowRight size={17} className="rtl:rotate-180" /></Link>
          <p className="mt-3 text-center text-[11px] text-muted">Taxes and shipping calculated at checkout</p>
        </aside>
      </div>
    </div>
  );
}
