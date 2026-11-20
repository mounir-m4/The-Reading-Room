import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/index.js';
import { addItem } from '../../store/cartSlice.js';
import { toggleWishlistItem } from '../../store/wishlistSlice.js';
import { pushToast } from '../../store/toastSlice.js';
import { formatMoney, priceOf } from '../../utils/currency.js';
import { localize } from '../../utils/localized.js';
import { Badge, Rating, Skeleton } from '../common/UI.jsx';

export function BookCard({ book, view = 'grid' }) {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const currency = useAppSelector((s) => s.ui.currency);
  const wished = useAppSelector((s) => s.wishlist.items.includes(book._id));

  const price = book.displayPrice ?? priceOf(book);
  const compare = book.displayCompareAtPrice ?? (book.compareAtPrice ? Math.round(book.compareAtPrice * (book.exchangeRate || 1)) : null);
  const author = typeof book.author === 'object' ? book.author?.name : '';

  const handleAdd = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (book.stock <= 0) return;
    const res = await dispatch(addItem({ book: book._id, quantity: 1 }));
    if (!res.error) dispatch(pushToast(t('toast.addedToCart')));
    else dispatch(pushToast(res.payload || t('toast.error'), 'error'));
  };

  const handleWish = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await dispatch(toggleWishlistItem(book._id));
    dispatch(pushToast(t(wished ? 'toast.removedFromWishlist' : 'toast.addedToWishlist')));
  };

  if (view === 'list') {
    return (
      <article className="card flex gap-4 overflow-hidden p-3 transition hover:shadow-lift sm:gap-6 sm:p-5">
        <Link to={`/books/${book.slug}`} className="w-24 shrink-0 sm:w-36">
          <img src={book.coverImage} alt={localize(book.title, i18n.language)} loading="lazy" className="aspect-[3/4] w-full rounded object-cover" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link to={`/books/${book.slug}`} className="font-serif text-lg font-semibold hover:text-burgundy">{localize(book.title, i18n.language)}</Link>
              <p className="text-sm text-muted">{t('book.by')} {author}</p>
            </div>
            <button onClick={handleWish} aria-label="wishlist" className="text-muted hover:text-burgundy">
              <Heart size={19} fill={wished ? '#783D45' : 'none'} className={wished ? 'text-burgundy' : ''} />
            </button>
          </div>
          <p className="mt-2 line-clamp-2 hidden text-sm text-muted sm:block">{localize(book.description, i18n.language)}</p>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-burgundy">{formatMoney(price, currency, i18n.language)}</span>
                {compare && <span className="text-xs text-muted line-through">{formatMoney(compare, currency, i18n.language)}</span>}
              </div>
              <Rating value={book.ratingAverage} count={book.ratingCount} />
            </div>
            <button onClick={handleAdd} disabled={book.stock <= 0} className="btn-primary px-4 py-2 text-xs">
              <ShoppingBag size={15} />{book.stock > 0 ? t('common.addToCart') : t('common.outOfStock')}
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="card group relative flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative overflow-hidden bg-sand">
        <Link to={`/books/${book.slug}`} className="block">
          <img
            src={book.coverImage || '/placeholder-book.svg'}
            alt={localize(book.title, i18n.language)}
            loading="lazy"
            className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        </Link>
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap justify-between gap-1 p-3">
          <div className="flex flex-col gap-1">
            {book.discountPercent > 0 && <Badge tone="red">-{book.discountPercent}%</Badge>}
            {book.newArrival && <Badge tone="gold">{t('common.new')}</Badge>}
          </div>
          <button onClick={handleWish} aria-label="wishlist" className="pointer-events-auto rounded-full bg-white/90 p-2 text-ink shadow-sm backdrop-blur transition hover:text-burgundy">
            <Heart size={16} fill={wished ? '#783D45' : 'none'} className={wished ? 'text-burgundy' : ''} />
          </button>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-full gap-2 bg-gradient-to-t from-white via-white to-transparent p-3 pt-8 transition-transform duration-300 group-hover:translate-y-0">
          <button onClick={handleAdd} disabled={book.stock <= 0} className="btn-primary pointer-events-auto flex-1 py-2 text-xs">
            <ShoppingBag size={14} /> {book.stock > 0 ? t('common.addToCart') : t('common.outOfStock')}
          </button>
          <Link to={`/books/${book.slug}`} className="btn-secondary pointer-events-auto px-3 py-2" aria-label="view"><Eye size={15} /></Link>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <Link to={`/books/${book.slug}`} className="line-clamp-2 font-serif text-base font-semibold leading-snug hover:text-burgundy">
          {localize(book.title, i18n.language)}
        </Link>
        <p className="mt-1 truncate text-xs text-muted">{author}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-burgundy">{formatMoney(price, currency, i18n.language)}</span>
            {compare && <span className="text-xs text-muted line-through">{formatMoney(compare, currency, i18n.language)}</span>}
          </div>
          <Rating value={book.ratingAverage} count={book.ratingCount} />
        </div>
        {book.stock > 0 && book.stock <= book.lowStockThreshold && (
          <p className="mt-2 text-[11px] text-amber-600">{t('book.stockLeft', { count: book.stock })}</p>
        )}
      </div>
    </article>
  );
}

export function ProductGrid({ books = [], loading, view = 'grid', columns = 4 }) {
  const classes = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' };
  if (loading) return <div className={`grid grid-cols-2 gap-5 ${classes[columns]}`}>{Array.from({ length: 8 }).map((_, i) => <BookCardSkeleton key={i} />)}</div>;
  return (
    <div className={view === 'list' ? 'flex flex-col gap-4' : `grid grid-cols-2 gap-4 sm:gap-6 ${classes[columns]}`}>
      {books.map((book) => <BookCard key={book._id || book.id} book={book} view={view} />)}
    </div>
  );
}

function BookCardSkeleton() {
  return (
    <div className="card overflow-hidden p-3">
      <Skeleton className="aspect-[3/4] w-full" />
      <Skeleton className="mt-4 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <Skeleton className="mt-4 h-5 w-1/3" />
    </div>
  );
}
