import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, CheckCircle, AlertTriangle, Pencil, Trash2, ImagePlus, Upload, X } from 'lucide-react';
import { adminApi, catalogApi } from '../../services/index.js';
import { PageHeader, Toolbar, DataTable, IconButton, StatCard } from '../../components/admin/AdminUI.jsx';
import { Button, Input, Textarea, Select, Checkbox, Modal, ConfirmDialog, Badge } from '../../components/common/UI.jsx';
import {
  LANGUAGES, emptyLocalized, asLocalized, localizedText, toMinor, fromMinor,
  commaList, idOf, formatDate, statusTone, useAdminList, useAdminMutation, useAdminCan, idOptions,
} from './adminUtils.js';
import { formatMoney } from '../../utils/currency.js';

const emptyBook = () => ({
  title: emptyLocalized(),
  subtitle: emptyLocalized(),
  description: emptyLocalized(),
  slug: '',
  isbn: '',
  author: '',
  categories: [],
  publisher: '',
  publicationDate: '',
  pages: '',
  language: 'en',
  coverImage: '',
  images: [],
  price: '',
  compareAtPrice: '',
  stock: '',
  lowStockThreshold: '',
  featured: false,
  bestSeller: false,
  newArrival: false,
  trending: false,
  isPublished: false,
  tags: '',
  seoTitle: emptyLocalized(),
  seoDescription: emptyLocalized(),
});

function populateBook(book) {
  const base = emptyBook();
  if (!book) return base;
  return {
    ...base,
    ...book,
    title: asLocalized(book.title),
    subtitle: asLocalized(book.subtitle),
    description: asLocalized(book.description),
    author: idOf(book.author),
    categories: (book.categories || []).map(idOf).filter(Boolean),
    publisher: idOf(book.publisher),
    publicationDate: book.publicationDate ? String(book.publicationDate).slice(0, 10) : '',
    pages: book.pages === undefined || book.pages === null ? '' : book.pages,
    language: book.language || 'en',
    coverImage: book.coverImage || '',
    images: Array.isArray(book.images) ? book.images : [],
    price: book.price === undefined || book.price === null ? '' : fromMinor(book.price),
    compareAtPrice: book.compareAtPrice === undefined || book.compareAtPrice === null ? '' : fromMinor(book.compareAtPrice),
    stock: book.stock === undefined || book.stock === null ? '' : book.stock,
    lowStockThreshold: book.lowStockThreshold === undefined || book.lowStockThreshold === null ? '' : book.lowStockThreshold,
    tags: Array.isArray(book.tags) ? book.tags.join(', ') : '',
    seoTitle: asLocalized(book.seo && book.seo.title),
    seoDescription: asLocalized(book.seo && book.seo.description),
  };
}

function buildPayload(form) {
  return {
    title: form.title,
    subtitle: form.subtitle,
    description: form.description,
    slug: form.slug,
    isbn: form.isbn,
    author: form.author,
    categories: form.categories,
    publisher: form.publisher || undefined,
    publicationDate: form.publicationDate || undefined,
    pages: form.pages === '' ? undefined : Number(form.pages),
    language: form.language,
    coverImage: form.coverImage,
    images: form.images,
    price: toMinor(form.price),
    compareAtPrice: form.compareAtPrice === '' ? undefined : toMinor(form.compareAtPrice),
    stock: form.stock === '' ? undefined : Number(form.stock),
    lowStockThreshold: form.lowStockThreshold === '' ? undefined : Number(form.lowStockThreshold),
    featured: !!form.featured,
    bestSeller: !!form.bestSeller,
    newArrival: !!form.newArrival,
    trending: !!form.trending,
    isPublished: !!form.isPublished,
    tags: commaList(form.tags),
    seo: { title: form.seoTitle, description: form.seoDescription },
  };
}

function LocalizedField({ label, value, onChange, multiline = false }) {
  const val = value || emptyLocalized();
  return (
    <div className="rounded-lg border border-line p-3 md:col-span-2">
      <p className="label mb-2">{label}</p>
      <div className="grid gap-3 md:grid-cols-3">
        {LANGUAGES.map((lang) => (
          multiline ? (
            <Textarea
              key={lang}
              label={lang.toUpperCase()}
              rows={3}
              value={val[lang] || ''}
              onChange={(e) => onChange({ ...val, [lang]: e.target.value })}
            />
          ) : (
            <Input
              key={lang}
              label={lang.toUpperCase()}
              value={val[lang] || ''}
              onChange={(e) => onChange({ ...val, [lang]: e.target.value })}
            />
          )
        ))}
      </div>
    </div>
  );
}

export default function BooksPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const mutate = useAdminMutation();
  const can = useAdminCan();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ author: '', category: '', language: '', status: '' });
  const [selected, setSelected] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyBook());
  const [formLoading, setFormLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [galleryUrl, setGalleryUrl] = useState('');

  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [taxes, setTaxes] = useState({ categories: [], authors: [], publishers: [] });

  useEffect(() => {
    Promise.all([catalogApi.categories(), catalogApi.authors(), catalogApi.publishers()])
      .then(([c, a, p]) => setTaxes({
        categories: c && c.data ? c.data : [],
        authors: a && a.data ? a.data : [],
        publishers: p && p.data ? p.data : [],
      }))
      .catch(() => {});
  }, []);

  const params = useMemo(() => ({
    page,
    limit: 10,
    q: search || undefined,
    author: filters.author || undefined,
    category: filters.category || undefined,
    language: filters.language || undefined,
    isPublished: filters.status === 'published' ? true : filters.status === 'draft' ? false : undefined,
  }), [page, search, filters]);

  const loader = useCallback(() => adminApi.books(params), [params]);
  const { rows, meta, loading, reload } = useAdminList(loader, [params]);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const toggleSelected = (id, checked) => {
    setSelected((prev) => (checked ? [...prev, id] : prev.filter((x) => x !== id)));
  };

  const runBulk = async () => {
    if (!bulkAction || !selected.length) return;
    setBulkLoading(true);
    try {
      await mutate(adminApi.bulkBooks({ ids: selected, action: bulkAction }), t('toast.saved'));
      setSelected([]);
      setBulkAction('');
      reload();
    } catch {
      // toast handled by useAdminMutation
    } finally {
      setBulkLoading(false);
    }
  };

  const upload = async (file, target) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await mutate(adminApi.uploadImage(file));
      const url = res && res.data ? res.data.url : null;
      if (url) {
        if (target === 'cover') setForm((f) => ({ ...f, coverImage: url }));
        else setForm((f) => ({ ...f, images: [...f.images, url] }));
      }
    } catch {
      // toast handled by useAdminMutation
    } finally {
      setUploading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyBook());
    setGalleryUrl('');
    setFormLoading(false);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row._id);
    setForm(populateBook(row));
    setGalleryUrl('');
    setFormLoading(true);
    setModalOpen(true);
    adminApi.book(row._id)
      .then((res) => setForm(populateBook(res && res.data)))
      .catch(() => {})
      .finally(() => setFormLoading(false));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = buildPayload(form);
      const request = editing ? adminApi.updateBook(editing, payload) : adminApi.createBook(payload);
      await mutate(request, t(editing ? 'toast.saved' : 'toast.created'));
      setModalOpen(false);
      reload();
    } catch {
      // toast handled by useAdminMutation
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await mutate(adminApi.deleteBook(deleting._id), t('toast.deleted'));
      setDeleting(null);
      setSelected((prev) => prev.filter((id) => id !== deleting._id));
      reload();
    } catch {
      // toast handled by useAdminMutation
    } finally {
      setDeleteLoading(false);
    }
  };

  const addGalleryUrl = () => {
    const url = galleryUrl.trim();
    if (!url) return;
    setForm((f) => ({ ...f, images: [...f.images, url] }));
    setGalleryUrl('');
  };

  const removeGalleryImage = (index) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  };

  const columns = [
    {
      key: 'select',
      title: '',
      render: (row) => (
        <Checkbox
          checked={selected.includes(row._id)}
          onChange={(e) => toggleSelected(row._id, e.target.checked)}
        />
      ),
    },
    {
      key: 'title',
      title: t('common.name'),
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.coverImage && <img src={row.coverImage} alt="" className="h-12 w-9 rounded border border-line object-cover" />}
          <div className="max-w-xs">
            <p className="font-medium text-ink">{localizedText(row.title, lang)}</p>
            <p className="truncate text-xs text-muted">{row.isbn || row.slug || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'author',
      title: t('admin.author'),
      render: (row) => (row.author && row.author.name) || '—',
    },
    {
      key: 'price',
      title: t('admin.price'),
      render: (row) => formatMoney(row.price || 0, 'MAD', lang),
    },
    {
      key: 'stock',
      title: t('admin.stock'),
      render: (row) => {
        const threshold = Number(row.lowStockThreshold || 5);
        const stock = Number(row.stock || 0);
        const tone = stock <= 0 ? 'red' : stock <= threshold ? 'amber' : 'green';
        return <Badge tone={tone}>{stock}</Badge>;
      },
    },
    {
      key: 'status',
      title: t('common.status'),
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={row.isPublished ? 'green' : 'gray'}>{row.isPublished ? t('admin.published') : t('common.inactive')}</Badge>
          {row.featured && <Badge tone="gold">{t('common.featured')}</Badge>}
          {row.discountPercent > 0 && <Badge tone={statusTone('active')}>-{row.discountPercent}%</Badge>}
        </div>
      ),
    },
    {
      key: 'date',
      title: t('common.date'),
      render: (row) => formatDate(row.publicationDate || row.createdAt, lang),
    },
  ];

  const authorOptions = useMemo(() => idOptions(taxes.authors, 'name', lang), [taxes.authors, lang]);
  const categoryOptions = useMemo(() => idOptions(taxes.categories, 'name', lang), [taxes.categories, lang]);
  const publisherOptions = useMemo(() => idOptions(taxes.publishers, 'name', lang), [taxes.publishers, lang]);

  return (
    <div>
      <PageHeader title={t('admin.books')} subtitle={t('admin.management')} />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('admin.totalBooks')} value={meta ? meta.total : rows.length} icon={BookOpen} />
        <StatCard label={t('admin.published')} value={rows.filter((r) => r.isPublished).length} icon={CheckCircle} tone="green" hint="On this page" />
        <StatCard label={t('admin.lowStock')} value={rows.filter((r) => Number(r.stock || 0) <= Number(r.lowStockThreshold || 5)).length} icon={AlertTriangle} tone="red" hint="On this page" />
      </div>

      <Toolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onRefresh={reload}
        onAdd={can('books.create') ? openAdd : undefined}
        addLabel={t('admin.addBook')}
      >
        <Select
          value={filters.author}
          onChange={(e) => setFilter('author', e.target.value)}
          options={[{ value: '', label: t('admin.author') }, ...authorOptions]}
          className="w-auto"
        />
        <Select
          value={filters.category}
          onChange={(e) => setFilter('category', e.target.value)}
          options={[{ value: '', label: t('admin.categories') }, ...categoryOptions]}
          className="w-auto"
        />
        <Select
          value={filters.language}
          onChange={(e) => setFilter('language', e.target.value)}
          options={[
            { value: '', label: t('admin.searchPlaceholder') },
            ...['en', 'fr', 'ar', 'other'].map((l) => ({ value: l, label: l.toUpperCase() })),
          ]}
          className="w-auto"
        />
        <Select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          options={[
            { value: '', label: t('common.all') },
            { value: 'published', label: t('admin.published') },
            { value: 'draft', label: t('common.inactive') },
          ]}
          className="w-auto"
        />
        {can('books.edit') && (
          <>
            <Select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              options={[
                { value: '', label: t('admin.bulkActions') },
                { value: 'publish', label: t('admin.publish') },
                { value: 'unpublish', label: t('admin.unpublish') },
              ]}
              className="w-auto"
            />
            <Button variant="secondary" size="sm" loading={bulkLoading} disabled={!bulkAction || !selected.length} onClick={runBulk}>
              {t('common.apply')}
            </Button>
          </>
        )}
      </Toolbar>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        meta={meta}
        onPage={setPage}
        empty={t('admin.noItems')}
        actions={(row) => (
          <>
            {can('books.edit') && <IconButton title={t('common.edit')} onClick={() => openEdit(row)}><Pencil size={16} /></IconButton>}
            {can('books.delete') && <IconButton title={t('common.delete')} tone="danger" onClick={() => setDeleting(row)}><Trash2 size={16} /></IconButton>}
          </>
        )}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t('admin.editBook') : t('admin.addBook')} wide>
        <form onSubmit={save}>
          <fieldset disabled={formLoading} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <LocalizedField label={t('admin.bookTitle')} value={form.title} onChange={(title) => setForm((f) => ({ ...f, title }))} />
            <LocalizedField label="Subtitle" value={form.subtitle} onChange={(subtitle) => setForm((f) => ({ ...f, subtitle }))} />
            <LocalizedField label={t('admin.description')} value={form.description} onChange={(description) => setForm((f) => ({ ...f, description }))} multiline />

            <Input label="Slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="my-book" />
            <Input label={t('admin.isbn')} value={form.isbn} onChange={(e) => setForm((f) => ({ ...f, isbn: e.target.value }))} />
            <Select
              label={t('admin.author')}
              required
              value={form.author}
              onChange={(e) => setForm((f) => ({ ...f, author: e.target.value }))}
              options={[{ value: '', label: t('validation.select') }, ...authorOptions]}
            />
            <Select
              label={t('admin.categories')}
              multiple
              value={form.categories}
              onChange={(e) => setForm((f) => ({ ...f, categories: Array.from(e.target.selectedOptions || []).map((o) => o.value) }))}
              options={categoryOptions}
              className="min-h-[96px]"
            />
            <Select
              label={t('catalog.publishers')}
              value={form.publisher}
              onChange={(e) => setForm((f) => ({ ...f, publisher: e.target.value }))}
              options={[{ value: '', label: '—' }, ...publisherOptions]}
            />
            <Input label={t('book.published')} type="date" value={form.publicationDate} onChange={(e) => setForm((f) => ({ ...f, publicationDate: e.target.value }))} />
            <Input label={t('book.pages')} type="number" min="0" value={form.pages} onChange={(e) => setForm((f) => ({ ...f, pages: e.target.value }))} />
            <Select
              label={t('book.language')}
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              options={[
                ...LANGUAGES.map((l) => ({ value: l, label: l.toUpperCase() })),
                { value: 'other', label: 'Other' },
              ]}
            />
            <Input label={`${t('admin.price')} (MAD)`} required type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
            <Input label={`${t('admin.comparePrice')} (MAD)`} type="number" step="0.01" min="0" value={form.compareAtPrice} onChange={(e) => setForm((f) => ({ ...f, compareAtPrice: e.target.value }))} />
            <Input label={t('admin.stock')} type="number" min="0" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
            <Input label={t('admin.lowStockThreshold')} type="number" min="0" value={form.lowStockThreshold} onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))} />
            <Input label="Tags (comma separated)" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} className="md:col-span-2" />

            <div className="md:col-span-2 rounded-lg border border-line p-3">
              <p className="label mb-2">{t('admin.coverImage')}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Input placeholder="Paste image URL" value={form.coverImage} onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))} className="min-w-[200px] flex-1" />
                <label className="btn btn-secondary cursor-pointer px-3 py-2 text-sm">
                  {uploading ? 'Uploading…' : <><Upload size={15} className="me-1 inline" />Upload</>}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files && e.target.files[0]; if (file) upload(file, 'cover'); e.target.value = ''; }} />
                </label>
              </div>
              {form.coverImage && <img src={form.coverImage} alt="Cover preview" className="mt-3 h-28 w-20 rounded border border-line object-cover" />}
            </div>

            <div className="md:col-span-2 rounded-lg border border-line p-3">
              <p className="label mb-2"><ImagePlus size={14} className="me-1 inline" />Gallery images</p>
              <div className="flex flex-wrap gap-2">
                {form.images.map((url, i) => (
                  <div key={i} className="relative h-20 w-16 overflow-hidden rounded border border-line">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removeGalleryImage(i)} className="absolute top-0 end-0 rounded bg-white/90 p-0.5 text-red-600"><X size={12} /></button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input placeholder="Paste image URL" value={galleryUrl} onChange={(e) => setGalleryUrl(e.target.value)} className="min-w-[200px] flex-1" />
                <Button type="button" variant="secondary" size="sm" onClick={addGalleryUrl}>Add URL</Button>
                <label className="btn btn-secondary cursor-pointer px-3 py-1.5 text-sm">
                  {uploading ? 'Uploading…' : 'Upload image'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files && e.target.files[0]; if (file) upload(file, 'gallery'); e.target.value = ''; }} />
                </label>
              </div>
            </div>

            <LocalizedField label="SEO title" value={form.seoTitle} onChange={(seoTitle) => setForm((f) => ({ ...f, seoTitle }))} />
            <LocalizedField label="SEO description" value={form.seoDescription} onChange={(seoDescription) => setForm((f) => ({ ...f, seoDescription }))} multiline />

            <div className="md:col-span-2 grid grid-cols-2 gap-3 rounded-lg border border-line p-3 sm:grid-cols-3">
              <Checkbox label={t('common.featured')} checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} />
              <Checkbox label={t('admin.bestSeller')} checked={form.bestSeller} onChange={(e) => setForm((f) => ({ ...f, bestSeller: e.target.checked }))} />
              <Checkbox label={t('admin.newArrival')} checked={form.newArrival} onChange={(e) => setForm((f) => ({ ...f, newArrival: e.target.checked }))} />
              <Checkbox label="Trending" checked={form.trending} onChange={(e) => setForm((f) => ({ ...f, trending: e.target.checked }))} />
              <Checkbox label={t('admin.published')} checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} />
            </div>
          </fieldset>

          <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={saving}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title={t('common.delete')}
        message={deleting ? `${t('admin.confirmDelete')} (${localizedText(deleting.title, lang)})` : t('admin.confirmDelete')}
        loading={deleteLoading}
      />
    </div>
  );
}
