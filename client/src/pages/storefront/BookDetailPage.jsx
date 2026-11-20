import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ShoppingBag, Heart, Star, Truck, ShieldCheck, RotateCcw, Minus, Plus, MessageSquare } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/index.js';
import { catalogApi, reviewApi } from '../../services/index.js';
import { addItem } from '../../store/cartSlice.js';
import { toggleWishlistItem } from '../../store/wishlistSlice.js';
import { pushToast } from '../../store/toastSlice.js';
import { ProductGrid } from '../../components/books/BookCard.jsx';
import { Breadcrumbs, Rating, Skeleton, SectionHeader, EmptyState } from '../../components/common/UI.jsx';
import { formatMoney, priceOf } from '../../utils/currency.js';
import { localize } from '../../utils/localized.js';
import ReviewForm from '../../components/books/ReviewForm.jsx';

export default function BookDetailPage() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const currency = useAppSelector((s) => s.ui.currency);
  const user = useAppSelector((s) => s.auth.user);
  const [book, setBook] = useState(null);
  const wished = useAppSelector((s) => s.wishlist.items.includes(book?._id));
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('description');
  const [reviews, setReviews] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    catalogApi.book(slug, { currency }).then((res) => {
      setBook(res.data);
      setReviews(res.data.reviews || []);
    }).catch(() => setBook(null)).finally(() => setLoading(false));
  }, [slug, currency]);

  if (loading) return <div className="container-premium grid gap-10 py-10 lg:grid-cols-2"><Skeleton className="aspect-[3/4] max-w-md" /><div className="space-y-4 py-10"><Skeleton className="h-10 w-3/4" /><Skeleton className="h-4 w-1/3" /><Skeleton className="h-24 w-full" /><Skeleton className="h-12 w-1/2" /></div></div>;
  if (!book) return <div className="container-premium py-16"><EmptyState title={t('notFound.title')} action={<Link to="/shop" className="btn-primary">{t('notFound.home')}</Link>} /></div>;

  const price = book.displayPrice ?? priceOf(book);
  const compare = book.displayCompareAtPrice;
  const title = localize(book.title, i18n.language);
  const author = typeof book.author === 'object' ? book.author : null;

  const add = async () => {
    const res = await dispatch(addItem({ book: book._id, quantity: qty }));
    dispatch(pushToast(res.error ? (res.payload || t('toast.error')) : t('toast.addedToCart'), res.error ? 'error' : 'success'));
  };

  const wish = async () => {
    await dispatch(toggleWishlistItem(book._id));
    dispatch(pushToast(t(wished ? 'toast.removedFromWishlist' : 'toast.addedToWishlist')));
  };

  return (
    <div className="container-premium py-8">
      <Helmet>
        <title>{`${title} — ${author?.name || 'The Reading Room'}`}</title>
        <meta name="description" content={localize(book.description, i18n.language)?.slice(0, 160)} />
        <meta property="og:title" content={title} />
        <meta property="og:image" content={book.coverImage} />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org', '@type': 'Book', name: title,
          author: author ? { '@type': 'Person', name: author.name } : undefined,
          isbn: book.isbn, numberOfPages: book.pages,
          offers: { '@type': 'Offer', price: (price / 100).toFixed(2), priceCurrency: currency, availability: book.stock > 0 ? 'InStock' : 'OutOfStock' },
        })}</script>
      </Helmet>
      <Breadcrumbs items={[{ label: t('nav.shop'), to: '/shop' }, { label: title }]} />

      <div className="mt-7 grid gap-10 lg:grid-cols-[minmax(0,440px)_1fr]">
        <div>
          <div className="relative overflow-hidden rounded-xl border border-line bg-sand">
            <img src={book.coverImage} alt={title} className="aspect-[3/4] w-full object-cover" />
            {book.discountPercent > 0 && <span className="absolute top-4 start-4 rounded-full bg-red-600 px-3 py-1 text-xs text-white">-{book.discountPercent}%</span>}
          </div>
          {book.images?.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto">
              {book.images.map((img, i) => <img key={i} src={img} alt="" className="h-20 w-16 shrink-0 rounded border border-line object-cover" />)}
            </div>
          )}
        </div>

        <div>
          {book.categories?.[0] && <Link to={`/categories/${book.categories[0].slug}`} className="eyebrow">{localize(book.categories[0].name, i18n.language)}</Link>}
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight sm:text-5xl">{title}</h1>
          {author && <Link to={`/authors/${author.slug}`} className="mt-3 inline-block text-lg text-muted hover:text-burgundy">{t('book.by')} {author.name}</Link>}
          <div className="mt-4 flex items-center gap-3">
            <Rating value={book.ratingAverage} count={book.ratingCount} size={16} />
            <span className="text-xs text-muted">· {book.soldCount} sold</span>
          </div>

          <div className="mt-6 flex items-end gap-3">
            <span className="font-serif text-3xl font-semibold text-burgundy">{formatMoney(price, currency, i18n.language)}</span>
            {compare && <span className="pb-1 text-lg text-muted line-through">{formatMoney(compare, currency, i18n.language)}</span>}
          </div>

          <p className="mt-5 line-clamp-4 text-sm leading-relaxed text-muted">{localize(book.description, i18n.language)}</p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-md border border-line">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-3"><Minus size={15} /></button>
              <span className="w-10 text-center text-sm font-medium">{qty}</span>
              <button onClick={() => setQty(Math.min(book.stock || 1, qty + 1))} className="px-3 py-3"><Plus size={15} /></button>
            </div>
            <button onClick={add} disabled={book.stock <= 0} className="btn-primary flex-1 py-3.5">
              <ShoppingBag size={18} /> {book.stock > 0 ? t('common.addToCart') : t('common.outOfStock')}
            </button>
            <button onClick={wish} className={`btn-secondary px-4 py-3.5 ${wished ? 'text-burgundy' : ''}`} aria-label="wishlist"><Heart size={18} fill={wished ? '#783D45' : 'none'} /></button>
          </div>

          {book.stock > 0 && book.stock <= 10 && <p className="mt-3 text-xs text-amber-600">{t('book.stockLeft', { count: book.stock })}</p>}

          <div className="mt-7 grid gap-3 rounded-lg border border-line bg-white p-4 text-xs sm:grid-cols-3">
            <span className="flex items-center gap-2"><Truck size={16} className="text-gold" /> {t('common.shipping')}</span>
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-gold" /> Secure payment</span>
            <span className="flex items-center gap-2"><RotateCcw size={16} className="text-gold" /> 14-day returns</span>
          </div>

          <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-6 text-sm sm:grid-cols-3">
            <Meta label={t('book.isbn')} value={book.isbn} />
            <Meta label={t('book.publisher')} value={typeof book.publisher === 'object' ? book.publisher?.name : '—'} />
            <Meta label={t('book.published')} value={book.publicationDate ? new Date(book.publicationDate).getFullYear() : '—'} />
            <Meta label={t('book.pages')} value={book.pages} />
            <Meta label={t('book.language')} value={book.language?.toUpperCase()} />
            <Meta label={t('book.category')} value={localize(book.categories?.[0]?.name, i18n.language)} />
          </dl>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-16">
        <div className="flex gap-6 border-b border-line">
          {['description', 'reviews', 'author'].map((key) => {
            const labels = { description: t('book.description'), reviews: `${t('book.reviews')} (${reviews.length})`, author: t('book.authorInfo') };
            return <button key={key} onClick={() => setTab(key)} className={`border-b-2 pb-3 text-sm font-medium ${tab === key ? 'border-burgundy text-burgundy' : 'border-transparent text-muted'}`}>{labels[key]}</button>;
          })}
        </div>
        <div className="py-7">
          {tab === 'description' && <p className="max-w-4xl whitespace-pre-line text-sm leading-7 text-ink/80">{localize(book.description, i18n.language)}</p>}
          {tab === 'author' && author && (
            <div className="flex max-w-3xl gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand font-serif text-3xl text-burgundy">
                {author.photo ? <img src={author.photo} alt="" className="h-full w-full object-cover" /> : author.name[0]}
              </div>
              <div><h3 className="font-serif text-2xl">{author.name}</h3><p className="mt-2 text-sm leading-relaxed text-muted">{localize(author.biography, i18n.language)}</p></div>
            </div>
          )}
          {tab === 'reviews' && (
            <div className="max-w-3xl">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3"><span className="font-serif text-4xl text-burgundy">{Number(book.ratingAverage).toFixed(1)}</span><Rating value={book.ratingAverage} count={book.ratingCount} /></div>
                {user && <button onClick={() => setReviewOpen(!reviewOpen)} className="btn-secondary text-sm"><MessageSquare size={15} /> {t('book.addReview')}</button>}
              </div>
              {reviewOpen && <ReviewForm bookId={book._id} onDone={() => { setReviewOpen(false); }} />}
              {reviews.length === 0 ? <p className="text-sm text-muted">{t('book.noReviews')}</p> : (
                <div className="space-y-5">
                  {reviews.map((r) => (
                    <div key={r._id} className="border-b border-line pb-5">
                      <div className="flex items-center justify-between"><p className="text-sm font-semibold">{r.userName}</p><span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString()}</span></div>
                      <Rating value={r.rating} />
                      {r.title && <p className="mt-2 text-sm font-medium">{r.title}</p>}
                      <p className="mt-1 text-sm text-muted">{r.comment}</p>
                      {r.adminResponse && <p className="mt-3 rounded bg-sand p-3 text-xs">{r.adminResponse}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {book.related?.length > 0 && (
        <section className="mt-10 border-t border-line pt-12">
          <SectionHeader title={t('book.related')} />
          <ProductGrid books={book.related} columns={4} />
        </section>
      )}
    </div>
  );
}

function Meta({ label, value }) {
  return <div><dt className="text-xs text-muted">{label}</dt><dd className="mt-0.5 font-medium">{value || '—'}</dd></div>;
}
