import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Upload } from 'lucide-react';
import { adminApi, catalogApi } from '../../services/index.js';
import { PageHeader, Toolbar, DataTable, IconButton } from '../../components/admin/AdminUI.jsx';
import { Button, Input, Textarea, Select, Modal, ConfirmDialog, Badge, Toggle } from '../../components/common/UI.jsx';
import {
  LANGUAGES, emptyLocalized, asLocalized, localizedText, idOf, useAdminList, useAdminMutation, useAdminCan,
} from './adminUtils.js';

const PER_PAGE = 10;

function makeMeta(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
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

function TaxonomyManager({ config }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const mutate = useAdminMutation();
  const can = useAdminCan();
  const canManage = can(config.permission);

  const { rows, loading, reload } = useAdminList(config.fetcher, []);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [activeOnly, setActiveOnly] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(config.emptyForm());
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows || []).filter((row) => {
      if (activeOnly && row.isActive === false) return false;
      if (!q) return true;
      const name = String(config.nameOf(row, lang) || '').toLowerCase();
      const slug = String(row.slug || '').toLowerCase();
      return name.includes(q) || slug.includes(q);
    });
  }, [rows, search, activeOnly, lang, config]);

  const meta = useMemo(() => makeMeta(filtered.length, page, PER_PAGE), [filtered.length, page]);
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filtered, page],
  );

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await mutate(adminApi.uploadImage(file));
      const url = res && res.data ? res.data.url : null;
      if (url) setForm((f) => ({ ...f, [config.imageKey]: url }));
    } catch {
      // toast handled by useAdminMutation
    } finally {
      setUploading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setForm(config.emptyForm());
    setImageUrl('');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row._id);
    setForm(config.fromItem(row));
    setImageUrl('');
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = config.toPayload(form);
      const request = editing ? config.update(editing, payload) : config.create(payload);
      await mutate(request, t(editing ? 'toast.saved' : 'toast.created'));
      setModalOpen(false);
      setPage(1);
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
      await mutate(config.remove(deleting._id), t('toast.deleted'));
      setDeleting(null);
      reload();
    } catch {
      // toast handled by useAdminMutation
    } finally {
      setDeleteLoading(false);
    }
  };

  const columns = [
    {
      key: 'name',
      title: t('common.name'),
      render: (row) => (
        <div className="flex items-center gap-3">
          {row[config.imageKey] && (
            <img src={row[config.imageKey]} alt="" className="h-10 w-10 rounded border border-line object-cover" />
          )}
          <div>
            <p className="font-medium text-ink">{config.nameOf(row, lang)}</p>
            {row.slug && <p className="text-xs text-muted">{row.slug}</p>}
          </div>
        </div>
      ),
    },
    ...(config.extraColumns ? config.extraColumns(lang) : []),
    {
      key: 'isActive',
      title: t('common.status'),
      render: (row) => (
        <Badge tone={row.isActive === false ? 'gray' : 'green'}>
          {row.isActive === false ? t('common.inactive') : t('common.active')}
        </Badge>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={t(config.titleKey)} subtitle={t('admin.management')} />

      <Toolbar
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1); }}
        onRefresh={reload}
        onAdd={canManage ? openAdd : undefined}
        addLabel={t('common.create')}
      >
        <Select
          value={activeOnly ? 'active' : ''}
          onChange={(e) => { setActiveOnly(e.target.value === 'active'); setPage(1); }}
          options={[
            { value: '', label: t('common.all') },
            { value: 'active', label: t('common.active') },
          ]}
          className="w-auto"
        />
      </Toolbar>

      <DataTable
        columns={columns}
        rows={pageRows}
        loading={loading}
        meta={meta}
        onPage={setPage}
        empty={t('admin.noItems')}
        actions={(row) => canManage ? (
          <>
            <IconButton title={t('common.edit')} onClick={() => openEdit(row)}><Pencil size={16} /></IconButton>
            <IconButton title={t('common.delete')} tone="danger" onClick={() => setDeleting(row)}><Trash2 size={16} /></IconButton>
          </>
        ) : null}
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${editing ? t('common.edit') : t('common.create')} ${t(config.titleKey)}`}>
        <form onSubmit={save}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {config.nameLocalized ? (
              <LocalizedField label={t('common.name')} value={form.name} onChange={(name) => setForm((f) => ({ ...f, name }))} />
            ) : (
              <Input label={t('common.name')} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            )}

            {config.hasDescription && (
              config.descriptionLocalized ? (
                <LocalizedField label={t('admin.description')} value={form.description} onChange={(description) => setForm((f) => ({ ...f, description }))} multiline />
              ) : (
                <Textarea label={t('admin.description')} rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="md:col-span-2" />
              )
            )}

            <div className="md:col-span-2 rounded-lg border border-line p-3">
              <p className="label mb-2">{config.imageLabel}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Input placeholder="Paste image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="min-w-[200px] flex-1" />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const url = imageUrl.trim();
                    if (url) { setForm((f) => ({ ...f, [config.imageKey]: url })); setImageUrl(''); }
                  }}
                >
                  {t('common.apply')}
                </Button>
                <label className="btn btn-secondary cursor-pointer px-3 py-1.5 text-sm">
                  {uploading ? 'Uploading…' : <><Upload size={15} className="me-1 inline" />Upload</>}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files && e.target.files[0]; if (file) upload(file); e.target.value = ''; }} />
                </label>
              </div>
              {form[config.imageKey] && <img src={form[config.imageKey]} alt="" className="mt-3 h-24 w-20 rounded border border-line object-cover" />}
            </div>

            {config.extraFields && config.extraFields(form, setForm, { rows, lang, editing })}

            <div className="md:col-span-2">
              <Toggle checked={!!form.isActive} onChange={(isActive) => setForm((f) => ({ ...f, isActive }))} label={t('common.active')} />
            </div>
          </div>

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
        message={deleting ? `${t('admin.confirmDelete')} (${config.nameOf(deleting, lang)})` : t('admin.confirmDelete')}
        loading={deleteLoading}
      />
    </div>
  );
}

const categoryConfig = {
  titleKey: 'admin.categories',
  permission: 'categories.manage',
  fetcher: () => catalogApi.categories(),
  nameLocalized: true,
  hasDescription: true,
  descriptionLocalized: true,
  imageKey: 'image',
  imageLabel: 'Image',
  emptyForm: () => ({
    name: emptyLocalized(),
    description: emptyLocalized(),
    image: '',
    parent: '',
    position: 0,
    isActive: true,
  }),
  fromItem: (item) => ({
    name: asLocalized(item.name),
    description: asLocalized(item.description),
    image: item.image || '',
    parent: idOf(item.parent),
    position: item.position === undefined || item.position === null ? 0 : item.position,
    isActive: item.isActive !== false,
  }),
  toPayload: (f) => ({
    name: f.name,
    description: f.description,
    image: f.image,
    parent: f.parent || undefined,
    position: Number(f.position) || 0,
    isActive: !!f.isActive,
  }),
  nameOf: (item, lang) => localizedText(item.name, lang),
  create: (data) => adminApi.createCategory(data),
  update: (id, data) => adminApi.updateCategory(id, data),
  remove: (id) => adminApi.deleteCategory(id),
  extraColumns: (lang) => [
    { key: 'position', title: 'Position', render: (row) => row.position ?? '—' },
  ],
  extraFields: (form, setForm, ctx) => (
    <>
      <Select
        label="Parent category"
        value={form.parent}
        onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}
        options={[
          { value: '', label: '—' },
          ...(ctx.rows || [])
            .filter((c) => c._id !== ctx.editing)
            .map((c) => ({ value: c._id, label: localizedText(c.name, ctx.lang) })),
        ]}
      />
      <Input label="Position" type="number" value={form.position} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} />
    </>
  ),
};

const authorConfig = {
  titleKey: 'admin.authors',
  permission: 'authors.manage',
  fetcher: () => catalogApi.authors(),
  nameLocalized: false,
  hasDescription: true,
  descriptionLocalized: true,
  imageKey: 'photo',
  imageLabel: 'Photo',
  emptyForm: () => ({
    name: '',
    photo: '',
    biography: emptyLocalized(),
    birthDate: '',
    nationality: '',
    isActive: true,
  }),
  fromItem: (item) => ({
    name: item.name || '',
    photo: item.photo || '',
    biography: asLocalized(item.biography),
    birthDate: item.birthDate || '',
    nationality: item.nationality || '',
    isActive: item.isActive !== false,
  }),
  toPayload: (f) => ({
    name: f.name,
    photo: f.photo,
    biography: f.biography,
    birthDate: f.birthDate || undefined,
    nationality: f.nationality || undefined,
    isActive: !!f.isActive,
  }),
  nameOf: (item) => item.name || '—',
  create: (data) => adminApi.createAuthor(data),
  update: (id, data) => adminApi.updateAuthor(id, data),
  remove: (id) => adminApi.deleteAuthor(id),
  extraColumns: () => [
    { key: 'nationality', title: 'Nationality', render: (row) => row.nationality || '—' },
    { key: 'birthDate', title: 'Birth date', render: (row) => row.birthDate || '—' },
  ],
  extraFields: (form, setForm) => (
    <>
      <Input label="Birth date" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
      <Input label="Nationality" value={form.nationality} onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))} />
    </>
  ),
};

const publisherConfig = {
  titleKey: 'admin.publishers',
  permission: 'books.edit',
  fetcher: () => catalogApi.publishers(),
  nameLocalized: false,
  hasDescription: false,
  imageKey: 'logo',
  imageLabel: 'Logo',
  emptyForm: () => ({
    name: '',
    logo: '',
    contactEmail: '',
    phone: '',
    website: '',
    address: '',
    isActive: true,
  }),
  fromItem: (item) => ({
    name: item.name || '',
    logo: item.logo || '',
    contactEmail: item.contactEmail || '',
    phone: item.phone || '',
    website: item.website || '',
    address: item.address || '',
    isActive: item.isActive !== false,
  }),
  toPayload: (f) => ({
    name: f.name,
    logo: f.logo,
    contactEmail: f.contactEmail || undefined,
    phone: f.phone || undefined,
    website: f.website || undefined,
    address: f.address || undefined,
    isActive: !!f.isActive,
  }),
  nameOf: (item) => item.name || '—',
  create: (data) => adminApi.createPublisher(data),
  update: (id, data) => adminApi.updatePublisher(id, data),
  remove: (id) => adminApi.deletePublisher(id),
  extraColumns: () => [
    { key: 'contactEmail', title: 'Email', render: (row) => row.contactEmail || '—' },
    { key: 'website', title: 'Website', render: (row) => row.website || '—' },
  ],
  extraFields: (form, setForm) => (
    <>
      <Input label="Email" type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} />
      <Input label="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
      <Input label="Website" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} />
      <Textarea label="Address" rows={2} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
    </>
  ),
};

export function CategoriesPage() {
  return <TaxonomyManager config={categoryConfig} />;
}

export function AuthorsPage() {
  return <TaxonomyManager config={authorConfig} />;
}

export function PublishersPage() {
  return <TaxonomyManager config={publisherConfig} />;
}
