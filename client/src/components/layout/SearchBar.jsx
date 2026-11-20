import React, { useEffect, useRef, useState } from 'react';
import { Search, X, Clock, BookOpen, User, Folder } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDebounce } from '../../hooks/index.js';
import { catalogApi } from '../../services/index.js';
import { localize } from '../../utils/localized.js';

export default function SearchBar({ dark = false }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bookstore_recent_searches') || '[]'); } catch { return []; }
  });
  const debounced = useDebounce(query, 250);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!debounced.trim()) { setResults(null); return; }
    let active = true;
    catalogApi.search(debounced).then((res) => { if (active) setResults(res.data); }).catch(() => {});
    return () => { active = false; };
  }, [debounced]);

  const saveSearch = (value) => {
    const next = [value, ...recent.filter((r) => r !== value)].slice(0, 5);
    setRecent(next);
    localStorage.setItem('bookstore_recent_searches', JSON.stringify(next));
  };

  const submit = (e) => {
    e?.preventDefault();
    if (!query.trim()) return;
    saveSearch(query.trim());
    setOpen(false);
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
  };

  const pick = (path) => { setOpen(false); setQuery(''); navigate(path); };

  return (
    <div ref={ref} className="relative w-full">
      <form onSubmit={submit} className={`flex items-center rounded-full border ${dark ? 'border-white/20 bg-white/10' : 'border-line bg-white'} px-4 py-2 transition focus-within:border-burgundy`}>
        <Search size={17} className={dark ? 'text-white/70' : 'text-muted'} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={t('common.searchPlaceholder')}
          className={`w-full bg-transparent px-3 text-sm outline-none ${dark ? 'text-white placeholder:text-white/50' : ''}`}
          aria-label={t('common.search')}
        />
        {query && <button type="button" onClick={() => setQuery('')} className="text-muted"><X size={15} /></button>}
      </form>

      {open && (query || recent.length > 0) && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-white shadow-lift">
          {!query && (
            <div className="border-b border-line px-4 py-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted"><Clock size={12} /> Recent</p>
              {recent.map((r) => <button key={r} onClick={() => { setQuery(r); }} className="block w-full rounded px-2 py-1.5 text-start text-sm hover:bg-sand">{r}</button>)}
            </div>
          )}
          {query && results && (
            <div className="max-h-[420px] overflow-y-auto p-2">
              {results.books?.length > 0 && (
                <>
                  <p className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted"><BookOpen size={12} /> Books</p>
                  {results.books.map((b) => (
                    <button key={b._id} onClick={() => pick(`/books/${b.slug}`)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-start hover:bg-sand">
                      <img src={b.coverImage} alt="" className="h-12 w-9 rounded object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{localize(b.title, i18n.language)}</span>
                        <span className="block truncate text-xs text-muted">{b.author?.name || ''}</span>
                      </span>
                    </button>
                  ))}
                </>
              )}
              {results.authors?.length > 0 && (
                <>
                  <p className="mt-1 flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted"><User size={12} /> Authors</p>
                  {results.authors.map((a) => (
                    <button key={a._id} onClick={() => pick(`/authors/${a.slug}`)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-start text-sm hover:bg-sand">{a.name}</button>
                  ))}
                </>
              )}
              {results.categories?.length > 0 && (
                <>
                  <p className="mt-1 flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted"><Folder size={12} /> Categories</p>
                  {results.categories.map((c) => (
                    <button key={c._id} onClick={() => pick(`/categories/${c.slug}`)} className="block w-full rounded px-2 py-1.5 text-start text-sm hover:bg-sand">{localize(c.name, i18n.language)}</button>
                  ))}
                </>
              )}
              <button onClick={submit} className="mt-2 w-full rounded-lg bg-sand px-3 py-2 text-center text-sm font-medium text-burgundy hover:bg-sand/80">
                {t('common.search')}: “{query}”
              </button>
            </div>
          )}
          {query && results && !results.books?.length && !results.authors?.length && !results.categories?.length && (
            <p className="px-4 py-6 text-center text-sm text-muted">{t('common.noResults')}</p>
          )}
        </div>
      )}
    </div>
  );
}
