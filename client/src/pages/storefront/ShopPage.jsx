import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, Grid2X2, List, X, Star } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/index.js';
import { catalogApi } from '../../services/index.js';
import { ProductGrid } from '../../components/books/BookCard.jsx';
import { Breadcrumbs, Pagination, EmptyState, Button } from '../../components/common/UI.jsx';
import { useDebounce } from '../../hooks/index.js';

const SORT_OPTIONS = [
  ['newest', 'catalog.sortNewest'], ['oldest', 'catalog.sortOldest'],
  ['priceAsc', 'catalog.sortPriceAsc'], ['priceDesc', 'catalog.sortPriceDesc'],
  ['bestSellers', 'catalog.sortBest'], ['popular', 'catalog.sortPopular'], ['rating', 'catalog.sortRating'],
];

export default function ShopPage() {
  const { t, i18n } = useTranslation();
  const currency = useAppSelector((s) => s.ui.currency);
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ data: [], meta: null });
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cats, setCats] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [localSearch, setLocalSearch] = useState(params.get('q') || '');
  const search = useDebounce(localSearch, 350);

  const queryString = params.toString();
  const page = Number(params.get('page') || 1);

  useEffect(() => { catalogApi.categories().then((r) => setCats(r.data)).catch(() => {}); catalogApi.authors().then((r) => setAuthors(r.data)).catch(() => {}); }, []);
  useEffect(() => {
    if (search !== (params.get('q') || '')) setParam('q', search || null, true);
  }, [search]);

  const setParam = (key, value, resetPage = true) => {
    const next = new URLSearchParams(params);
    if (value === null || value === '' || value === false) next.delete(key);
    else next.set(key, String(value));
    if (resetPage) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    setLoading(true);
    const apiParams = Object.fromEntries(params);
    apiParams.currency = currency;
    catalogApi.books(apiParams).then((res) => setData(res)).catch(() => {}).finally(() => setLoading(false));
  }, [queryString, currency]);

  const activeFilters = useMemo(() => [...params.keys()].filter((k) => !['page', 'sort', 'view', 'currency'].includes(k)), [params]);

  const clearAll = () => { setParams(new URLSearchParams(), { replace: true }); setLocalSearch(''); };

  return (
    <div className="container-premium py-8">
      <Helmet><title>{`${t('catalog.title')} — The Reading Room`}</title><meta name="description" content={t('catalog.subtitle')} /></Helmet>
      <Breadcrumbs items={[{ label: t('catalog.title') }]} />
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-semibold">{t('catalog.title')}</h1>
          <p className="mt-2 text-sm text-muted">{t('catalog.results', { count: data.meta?.total || 0 })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFiltersOpen(!filtersOpen)} className="btn-secondary lg:hidden"><SlidersHorizontal size={16} /> {t('common.filter')}</button>
          <select value={params.get('sort') || 'newest'} onChange={(e) => setParam('sort', e.target.value === 'newest' ? null : e.target.value)} className="input w-auto py-2 text-sm">
            {SORT_OPTIONS.map(([value, key]) => <option key={value} value={value}>{t(key)}</option>)}
          </select>
          <div className="hidden rounded-md border border-line p-1 sm:flex">
            <button onClick={() => setView('grid')} className={`rounded p-1.5 ${view === 'grid' ? 'bg-burgundy text-white' : 'text-muted'}`}><Grid2X2 size={16} /></button>
            <button onClick={() => setView('list')} className={`rounded p-1.5 ${view === 'list' ? 'bg-burgundy text-white' : 'text-muted'}`}><List size={16} /></button>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-7">
        <aside className={`w-64 shrink-0 ${filtersOpen ? 'fixed inset-y-0 start-0 z-[90] overflow-y-auto bg-white p-5 shadow-lift lg:static lg:z-auto lg:p-0 lg:shadow-none' : 'hidden'} lg:block`}>
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <h3 className="font-semibold">{t('common.filter')}</h3>
            <button onClick={() => setFiltersOpen(false)}><X size={20} /></button>
          </div>
          <div className="space-y-6 rounded-lg border border-line bg-white p-5">
            <div>
              <label className="label">{t('common.search')}</label>
              <input value={localSearch} onChange={(e) => setLocalSearch(e.target.value)} placeholder={t('common.searchPlaceholder')} className="input text-sm" />
            </div>

            <FilterGroup title={t('catalog.categories')}>
              {cats.map((c) => (
                <FilterOption key={c._id} label={i18n.language === 'ar' ? c.name.ar || c.name.en : i18n.language === 'fr' ? c.name.fr || c.name.en : c.name.en} checked={(params.get('category') || '').split(',').includes(c._id)} onChange={() => toggleMulti('category', c._id)} />
              ))}
            </FilterGroup>

            <FilterGroup title={t('catalog.authors')}>
              {authors.slice(0, 12).map((a) => <FilterOption key={a._id} label={a.name} checked={(params.get('author') || '').split(',').includes(a._id)} onChange={() => toggleMulti('author', a._id)} />)}
            </FilterGroup>

            <FilterGroup title={t('catalog.priceRange')}>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Min" defaultValue={params.get('minPrice') || ''} onBlur={(e) => setParam('minPrice', e.target.value || null)} className="input px-2 py-1.5 text-sm" />
                <span className="text-muted">–</span>
                <input type="number" placeholder="Max" defaultValue={params.get('maxPrice') || ''} onBlur={(e) => setParam('maxPrice', e.target.value || null)} className="input px-2 py-1.5 text-sm" />
              </div>
            </FilterGroup>

            <FilterGroup title={t('catalog.rating')}>
              {[4, 3, 2].map((r) => (
                <button key={r} onClick={() => setParam('rating', params.get('rating') === String(r) ? null : r)} className={`flex w-full items-center gap-1.5 rounded px-1 py-1.5 text-sm ${params.get('rating') === String(r) ? 'text-burgundy' : ''}`}>
                  <span className="text-gold">{'★'.repeat(r)}</span><span className="text-muted">& up</span>
                </button>
              ))}
            </FilterGroup>

            <FilterGroup title={t('catalog.availability')}>
              <FilterOption label={t('catalog.inStockOnly')} checked={params.get('inStock') === 'true'} onChange={(v) => setParam('inStock', v ? 'true' : null)} />
              <FilterOption label={t('catalog.discounts')} checked={params.get('discounted') === 'true'} onChange={(v) => setParam('discounted', v ? 'true' : null)} />
            </FilterGroup>

            <FilterGroup title={t('catalog.languages')}>
              {[['en', 'English'], ['fr', 'Français'], ['ar', 'العربية']].map(([code, label]) => (
                <FilterOption key={code} label={label} checked={(params.get('language') || '').split(',').includes(code)} onChange={() => toggleMulti('language', code)} />
              ))}
            </FilterGroup>

            {activeFilters.length > 0 && <Button variant="secondary" className="w-full text-sm" onClick={clearAll}>{t('catalog.clearFilters')}</Button>}
          </div>
        </aside>
        {filtersOpen && <div className="fixed inset-0 z-[85] bg-ink/40 lg:hidden" onClick={() => setFiltersOpen(false)} />}

        <div className="min-w-0 flex-1">
          {activeFilters.length > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {activeFilters.map((key) => (
                <button key={key} onClick={() => setParam(key, null)} className="inline-flex items-center gap-1.5 rounded-full border border-burgundy/30 bg-burgundy/5 px-3 py-1 text-xs text-burgundy">
                  {key}: {params.get(key)} <X size={12} />
                </button>
              ))}
              <button onClick={clearAll} className="text-xs text-muted underline">{t('common.clearAll')}</button>
            </div>
          )}

          {data.data.length === 0 && !loading ? (
            <EmptyState icon={Star} title={t('catalog.noBooks')} subtitle={t('catalog.noBooksSub')} action={<Button onClick={clearAll}>{t('catalog.clearFilters')}</Button>} />
          ) : (
            <ProductGrid books={data.data} loading={loading} view={view} />
          )}
          <Pagination meta={data.meta} onPage={(p) => setParam('page', p, false)} />
        </div>
      </div>
    </div>
  );

  function toggleMulti(key, value) {
    const current = (params.get(key) || '').split(',').filter(Boolean);
    const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    setParam(key, next.join(',') || null);
  }
}

function FilterGroup({ title, children }) {
  return (
    <div className="border-t border-line pt-5">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink">{title}</h4>
      <div className="max-h-52 space-y-1.5 overflow-y-auto pe-1">{children}</div>
    </div>
  );
}

function FilterOption({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted hover:text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-burgundy" />
      <span className="truncate">{label}</span>
    </label>
  );
}
