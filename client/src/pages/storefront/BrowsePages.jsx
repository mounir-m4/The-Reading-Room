import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/index.js';
import { catalogApi, cmsApi } from '../../services/index.js';
import { ProductGrid } from '../../components/books/BookCard.jsx';
import { Breadcrumbs, EmptyState, Skeleton, SectionHeader } from '../../components/common/UI.jsx';
import { localize } from '../../utils/localized.js';

export function CategoryPage() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const currency = useAppSelector((s) => s.ui.currency);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    catalogApi.category(slug, { currency }).then((r) => setData(r.data)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [slug, currency]);
  const name = data ? localize(data.category.name, i18n.language) : '';
  return (
    <div className="container-premium py-8">
      <Helmet><title>{`${name || t('nav.categories')} — The Reading Room`}</title></Helmet>
      <Breadcrumbs items={[{ label: t('nav.categories'), to: '/categories' }, { label: name }]} />
      <h1 className="mt-6 font-serif text-4xl font-semibold">{name}</h1>
      <p className="mt-2 text-sm text-muted">{localize(data?.category?.description, i18n.language)}</p>
      <div className="mt-9">{loading ? <ProductGrid books={[]} loading /> : <ProductGrid books={data?.books || []} />}</div>
      {!loading && !data?.books?.length && <EmptyState title={t('catalog.noBooks')} />}
    </div>
  );
}

export function AuthorPage() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const currency = useAppSelector((s) => s.ui.currency);
  const [data, setData] = useState(null);
  useEffect(() => { catalogApi.author(slug, { currency }).then((r) => setData(r.data)).catch(() => setData(null)); }, [slug, currency]);
  const author = data?.author;
  return (
    <div className="container-premium py-8">
      <Helmet><title>{`${author?.name || t('nav.authors')} — The Reading Room`}</title></Helmet>
      <Breadcrumbs items={[{ label: t('nav.authors'), to: '/authors' }, { label: author?.name }]} />
      <div className="mt-8 flex flex-col items-center gap-5 rounded-xl bg-sand p-8 text-center sm:flex-row sm:text-start">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white font-serif text-4xl text-burgundy">
          {author?.photo ? <img src={author.photo} alt="" className="h-full w-full object-cover" /> : author?.name?.[0]}
        </div>
        <div><h1 className="font-serif text-4xl font-semibold">{author?.name}</h1><p className="mt-2 max-w-2xl text-sm text-muted">{localize(author?.biography, i18n.language)}</p></div>
      </div>
      <div className="mt-10"><SectionHeader title={t('nav.shop')} /><ProductGrid books={data?.books || []} loading={!data} /></div>
    </div>
  );
}

export function CategoriesPage() {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState([]);
  useEffect(() => { catalogApi.categories().then((r) => setItems(r.data)).catch(() => {}); }, []);
  return (
    <div className="container-premium py-8">
      <Breadcrumbs items={[{ label: t('nav.categories') }]} />
      <h1 className="mt-6 font-serif text-4xl font-semibold">{t('home.shopByCategory')}</h1>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((cat) => (
          <Link key={cat._id} to={`/categories/${cat.slug}`} className="card group overflow-hidden transition hover:shadow-lift">
            <div className="aspect-[16/10] overflow-hidden bg-sand">
              {cat.image ? <img src={cat.image} alt="" className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full items-center justify-center font-serif text-4xl text-burgundy/40">{localize(cat.name, i18n.language)?.[0]}</div>}
            </div>
            <div className="p-4"><h2 className="font-serif text-lg">{localize(cat.name, i18n.language)}</h2><p className="mt-1 line-clamp-2 text-xs text-muted">{localize(cat.description, i18n.language)}</p></div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AuthorsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  useEffect(() => { catalogApi.authors().then((r) => setItems(r.data)).catch(() => {}); }, []);
  return (
    <div className="container-premium py-8">
      <Breadcrumbs items={[{ label: t('nav.authors') }]} />
      <h1 className="mt-6 font-serif text-4xl font-semibold">{t('nav.authors')}</h1>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {items.map((a) => (
          <Link key={a._id} to={`/authors/${a.slug}`} className="card flex flex-col items-center p-5 text-center transition hover:shadow-lift">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-sand font-serif text-3xl text-burgundy">
              {a.photo ? <img src={a.photo} alt="" className="h-full w-full object-cover" /> : a.name[0]}
            </div>
            <p className="mt-4 font-medium">{a.name}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CmsPage({ pageKey }) {
  const { key } = useParams();
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(null);
  const resolvedKey = pageKey || key;
  useEffect(() => { cmsApi.page(resolvedKey).then((r) => setPage(r.data)).catch(() => {}); }, [resolvedKey]);
  return (
    <div className="container-premium max-w-4xl py-12">
      <Helmet><title>{`${page?.title?.en || resolvedKey || t('common.loading')} — The Reading Room`}</title></Helmet>
      <Breadcrumbs items={[{ label: page?.title?.en || resolvedKey }]} />
      <h1 className="mt-7 font-serif text-4xl font-semibold">{page ? localize(page.title, i18n.language) : <Skeleton className="h-10 w-1/2" />}</h1>
      <p className="mt-6 whitespace-pre-line text-sm leading-8 text-ink/80">{page ? localize(page.body, i18n.language) : t('common.loading')}</p>
    </div>
  );
}
