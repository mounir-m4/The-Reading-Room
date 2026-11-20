import React from 'react';
import { Link } from 'react-router-dom';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/index.js';
import { toggleCart, removeItem, updateItem } from '../../store/cartSlice.js';
import { formatMoney } from '../../utils/currency.js';
import { localize } from '../../utils/localized.js';

export default function CartDrawer() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const { open, items, displaySubtotal, itemCount } = useAppSelector((s) => s.cart);
  const currency = useAppSelector((s) => s.ui.currency);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-ink/40" onClick={() => dispatch(toggleCart(false))} />
      <aside className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-white shadow-lift">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h3 className="font-serif text-xl font-semibold">{t('cart.title')}</h3>
            <p className="text-xs text-muted">{t('cart.itemCount', { count: itemCount })}</p>
          </div>
          <button onClick={() => dispatch(toggleCart(false))} className="rounded p-1 hover:bg-sand"><X size={22} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag size={44} className="mb-4 text-gold" strokeWidth={1.2} />
              <p className="font-serif text-xl">{t('cart.empty')}</p>
              <p className="mt-2 text-sm text-muted">{t('cart.emptySub')}</p>
              <Link to="/shop" onClick={() => dispatch(toggleCart(false))} className="btn-primary mt-6">{t('cart.startShopping')}</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((line) => (
                <div key={line.book._id} className="flex gap-3 border-b border-line pb-4">
                  <Link to={`/books/${line.book.slug}`} onClick={() => dispatch(toggleCart(false))}>
                    <img src={line.book.coverImage} alt="" className="h-24 w-16 rounded object-cover" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link to={`/books/${line.book.slug}`} onClick={() => dispatch(toggleCart(false))} className="line-clamp-2 text-sm font-medium hover:text-burgundy">
                      {localize(line.book.title, i18n.language)}
                    </Link>
                    <p className="text-xs text-muted">{formatMoney(line.displayLineTotal || line.lineTotal, currency, i18n.language)}</p>
                    {!line.available && <p className="text-xs text-red-600">{t('cart.stockWarning', { count: line.maxQuantity })}</p>}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded border border-line">
                        <button onClick={() => dispatch(updateItem({ bookId: line.book._id, quantity: Math.max(1, line.quantity - 1) }))} className="px-2 py-1 text-sm">−</button>
                        <span className="w-7 text-center text-xs">{line.quantity}</span>
                        <button onClick={() => dispatch(updateItem({ bookId: line.book._id, quantity: Math.min(line.maxQuantity || 99, line.quantity + 1) }))} className="px-2 py-1 text-sm">+</button>
                      </div>
                      <button onClick={() => dispatch(removeItem(line.book._id))} className="text-muted hover:text-red-600"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-line p-5">
            <div className="mb-4 flex items-center justify-between text-sm">
              <span className="text-muted">{t('common.subtotal')}</span>
              <span className="text-lg font-semibold">{formatMoney(displaySubtotal, currency, i18n.language)}</span>
            </div>
            <Link to="/checkout" onClick={() => dispatch(toggleCart(false))} className="btn-primary w-full">{t('cart.checkout')}</Link>
            <Link to="/cart" onClick={() => dispatch(toggleCart(false))} className="btn-ghost mt-2 w-full">{t('common.view')} {t('common.cart')}</Link>
          </div>
        )}
      </aside>
    </div>
  );
}
