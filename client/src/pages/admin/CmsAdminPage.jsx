import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, Toolbar, DataTable, IconButton } from '../../components/admin/AdminUI.jsx';
import { Button, Input, Textarea, Select, Toggle, Modal, ConfirmDialog, Badge } from '../../components/common/UI.jsx';
import { adminApi } from '../../services/index.js';
import { LANGUAGES, emptyLocalized, asLocalized, formatDate, idOf, useAdminList, useAdminMutation } from './adminUtils.js';
import { localize } from '../../utils/localized.js';

const TABS = [
  { key: 'sections', label: 'admin.homepageSections' },
  { key: 'pages', label: 'admin.pages' },
  { key: 'banners', label: 'admin.banners' },
  { key: 'testimonials', label: 'admin.testimonials' },
  { key: 'newsletter', label: 'admin.newsletter' },
];

const SECTION_KEYS = [
  'featured', 'bestSellers', 'newArrivals', 'categories', 'authors', 'trending',
  'recommended', 'offers', 'banners', 'testimonials', 'newsletter', 'recentlyViewed',
];
const BANNER_POSITIONS = ['hero', 'home-top', 'home-mid', 'home-bottom', 'sidebar'];
const RATINGS = [1, 2, 3, 4, 5];
const PAGE_SIZE = 10;

function normalizeSections(rows = []) {
  const byKey = new Map((rows || []).filter((row) => row && SECTION_KEYS.includes(row.key)).map((row) => [row.key, row]));
  return SECTION_KEYS.map((key, index) => {
    const section = byKey.get(key) || {};
    return {
      ...section,
      key,
      title: asLocalized(section.title),
      subtitle: asLocalized(section.subtitle),
      isVisible: section.isVisible !== false,
      order: Number.isFinite(Number(section.order)) ? Number(section.order) : index,
      settings: section.settings || {},
    };
  });
}

function localMeta(total, page, size) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / size));
  const current = Math.min(Math.max(1, page || 1), totalPages);
  return {
    page: current,
    limit: size,
    total: total || 0,
    totalPages,
    hasPrev: current > 1,
    hasNext: current < totalPages,
  };
}

function useLocalList(rows, query, size = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const list = rows || [];
    const q = String(query || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, query]);
  useEffect(() => { setPage(1); }, [query]);
  const meta = useMemo(() => localMeta(filtered.length, page, size), [filtered.length, page, size]);
  const visibleRows = useMemo(
    () => filtered.slice((meta.page - 1) * size, meta.page * size),
    [filtered, meta.page, size],
  );
  return { rows: visibleRows, meta, onPage: setPage };
}

function LocalizedFields({ label, value, onChange, multiline = false, rows = 3, className = '' }) {
  const current = asLocalized(value);
  return (
    <div className={className}>
      <p className="label mb-1">{label}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {LANGUAGES.map((lang) => (
          multiline ? (
            <Textarea
              key={lang}
              label={lang.toUpperCase()}
              rows={rows}
              value={current[lang] || ''}
              onChange={(event) => onChange({ ...current, [lang]: event.target.value })}
            />
          ) : (
            <Input
              key={lang}
              label={lang.toUpperCase()}
              value={current[lang] || ''}
              onChange={(event) => onChange({ ...current, [lang]: event.target.value })}
            />
          )
        ))}
      </div>
    </div>
  );
}

const emptyPageForm = () => ({
  key: '',
  title: emptyLocalized(),
  body: emptyLocalized(),
  metaDescription: emptyLocalized(),
  isActive: true,
});

const emptyBannerForm = () => ({
  title: emptyLocalized(),
  subtitle: emptyLocalized(),
  ctaLabel: emptyLocalized(),
  image: '',
  link: '',
  position: 'home-mid',
  isActive: true,
  order: 0,
});

const emptyTestimonialForm = () => ({
  name: '',
  role: '',
  avatar: '',
  quote: emptyLocalized(),
  rating: 5,
  isActive: true,
  order: 0,
});

export default function CmsAdminPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const run = useAdminMutation();
  const [tab, setTab] = useState('sections');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);

  const loadSections = useCallback(() => adminApi.sections(), []);
  const loadPages = useCallback(() => adminApi.pages(), []);
  const loadBanners = useCallback(() => adminApi.banners(), []);
  const loadTestimonials = useCallback(() => adminApi.testimonials(), []);
  const loadSubscribers = useCallback(() => adminApi.subscribers(), []);

  const sectionList = useAdminList(loadSections, [loadSections]);
  const pageList = useAdminList(loadPages, [loadPages]);
  const bannerList = useAdminList(loadBanners, [loadBanners]);
  const testimonialList = useAdminList(loadTestimonials, [loadTestimonials]);
  const subscriberList = useAdminList(loadSubscribers, [loadSubscribers]);

  const [draftSections, setDraftSections] = useState([]);
  const [sectionForm, setSectionForm] = useState(null);
  const [pageForm, setPageForm] = useState(null);
  const [editingPageId, setEditingPageId] = useState('');
  const [pageToDelete, setPageToDelete] = useState(null);
  const [bannerForm, setBannerForm] = useState(null);
  const [editingBannerId, setEditingBannerId] = useState('');
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerToDelete, setBannerToDelete] = useState(null);
  const [testimonialForm, setTestimonialForm] = useState(null);
  const [editingTestimonialId, setEditingTestimonialId] = useState('');
  const [testimonialFile, setTestimonialFile] = useState(null);
  const [testimonialToDelete, setTestimonialToDelete] = useState(null);
  const [subscriberView, setSubscriberView] = useState(null);

  useEffect(() => { setDraftSections(normalizeSections(sectionList.rows)); }, [sectionList.rows]);

  const sectionsView = useLocalList(draftSections, search);
  const pagesView = useLocalList(pageList.rows, search);
  const bannersView = useLocalList(bannerList.rows, search);
  const testimonialsView = useLocalList(testimonialList.rows, search);
  const subscribersView = useLocalList(subscriberList.rows, search);

  const openPageForm = (row) => {
    setEditingPageId(row ? idOf(row) : '');
    setPageForm(row ? {
      key: row.key || '',
      title: asLocalized(row.title),
      body: asLocalized(row.body),
      metaDescription: asLocalized(row.metaDescription),
      isActive: row.isActive !== false,
    } : emptyPageForm());
  };

  const closePageForm = () => { setPageForm(null); setEditingPageId(''); };

  const openBannerForm = (row) => {
    setEditingBannerId(row ? idOf(row) : '');
    setBannerFile(null);
    setBannerForm(row ? {
      title: asLocalized(row.title),
      subtitle: asLocalized(row.subtitle),
      ctaLabel: asLocalized(row.ctaLabel),
      image: row.image || '',
      link: row.link || '',
      position: row.position || 'home-mid',
      isActive: row.isActive !== false,
      order: row.order ?? 0,
    } : emptyBannerForm());
  };

  const closeBannerForm = () => { setBannerForm(null); setEditingBannerId(''); setBannerFile(null); };

  const openTestimonialForm = (row) => {
    setEditingTestimonialId(row ? idOf(row) : '');
    setTestimonialFile(null);
    setTestimonialForm(row ? {
      name: row.name || '',
      role: row.role || '',
      avatar: row.avatar || '',
      quote: asLocalized(row.quote),
      rating: row.rating || 5,
      isActive: row.isActive !== false,
      order: row.order ?? 0,
    } : emptyTestimonialForm());
  };

  const closeTestimonialForm = () => { setTestimonialForm(null); setEditingTestimonialId(''); setTestimonialFile(null); };

  const handleSaveSections = async () => {
    setBusy(true);
    try {
      const payload = draftSections.map((section) => ({
        key: section.key,
        title: section.title,
        subtitle: section.subtitle,
        isVisible: !!section.isVisible,
        order: Number(section.order) || 0,
        settings: section.settings || {},
      }));
      await run(() => adminApi.updateSections(payload), t('toast.saved'));
      sectionList.reload();
    } catch {
      // Toast is shown by useAdminMutation.
    } finally {
      setBusy(false);
    }
  };

  const saveSectionForm = () => {
    if (!sectionForm) return;
    setDraftSections((current) => current.map((section) => (
      section.key === sectionForm.key
        ? { ...section, ...sectionForm, order: Number(sectionForm.order) || 0 }
        : section
    )));
    setSectionForm(null);
  };

  const handleSavePage = async () => {
    if (!pageForm) return;
    setBusy(true);
    try {
      const payload = {
        key: String(pageForm.key || '').trim(),
        title: pageForm.title,
        body: pageForm.body,
        metaDescription: pageForm.metaDescription,
        isActive: !!pageForm.isActive,
      };
      await run(() => adminApi.savePage(payload), t('toast.saved'));
      closePageForm();
      pageList.reload();
    } catch {
      // Toast is shown by useAdminMutation.
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePage = async () => {
    if (!pageToDelete) return;
    setBusy(true);
    try {
      await run(() => adminApi.deletePage(idOf(pageToDelete)), t('toast.deleted'));
      setPageToDelete(null);
      pageList.reload();
    } catch {
      // Toast is shown by useAdminMutation.
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBanner = async () => {
    if (!bannerForm) return;
    setBusy(true);
    try {
      await run(async () => {
        let image = bannerForm.image || '';
        if (bannerFile) {
          const uploaded = await adminApi.uploadImage(bannerFile);
          image = uploaded?.data?.url || image;
        }
        const payload = {
          title: bannerForm.title,
          subtitle: bannerForm.subtitle,
          ctaLabel: bannerForm.ctaLabel,
          image,
          link: bannerForm.link || '',
          position: bannerForm.position || 'home-mid',
          isActive: !!bannerForm.isActive,
          order: Number(bannerForm.order) || 0,
        };
        return adminApi.saveBanner(payload, editingBannerId || undefined);
      }, t('toast.saved'));
      closeBannerForm();
      bannerList.reload();
    } catch {
      // Toast is shown by useAdminMutation.
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteBanner = async () => {
    if (!bannerToDelete) return;
    setBusy(true);
    try {
      await run(() => adminApi.deleteBanner(idOf(bannerToDelete)), t('toast.deleted'));
      setBannerToDelete(null);
      bannerList.reload();
    } catch {
      // Toast is shown by useAdminMutation.
    } finally {
      setBusy(false);
    }
  };

  const handleSaveTestimonial = async () => {
    if (!testimonialForm) return;
    setBusy(true);
    try {
      await run(async () => {
        let avatar = testimonialForm.avatar || '';
        if (testimonialFile) {
          const uploaded = await adminApi.uploadImage(testimonialFile);
          avatar = uploaded?.data?.url || avatar;
        }
        const payload = {
          name: testimonialForm.name || '',
          role: testimonialForm.role || '',
          avatar,
          quote: testimonialForm.quote,
          rating: Number(testimonialForm.rating) || 5,
          isActive: !!testimonialForm.isActive,
          order: Number(testimonialForm.order) || 0,
        };
        return adminApi.saveTestimonial(payload, editingTestimonialId || undefined);
      }, t('toast.saved'));
      closeTestimonialForm();
      testimonialList.reload();
    } catch {
      // Toast is shown by useAdminMutation.
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteTestimonial = async () => {
    if (!testimonialToDelete) return;
    setBusy(true);
    try {
      await run(() => adminApi.deleteTestimonial(idOf(testimonialToDelete)), t('toast.deleted'));
      setTestimonialToDelete(null);
      testimonialList.reload();
    } catch {
      // Toast is shown by useAdminMutation.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={t('admin.cms')}
        subtitle={t('admin.content')}
        actions={tab === 'sections' ? (
          <Button onClick={handleSaveSections} loading={busy}>{t('admin.saveChanges')}</Button>
        ) : null}
      />

      <div className="mb-5 flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-md px-3 py-2 text-xs font-medium transition ${tab === item.key ? 'bg-burgundy text-white' : 'text-muted hover:bg-sand hover:text-ink'}`}
          >
            {t(item.label)}
          </button>
        ))}
      </div>

      {tab === 'sections' && (
        <div>
          <Toolbar search={search} onSearch={setSearch} onRefresh={sectionList.reload} />
          <DataTable
            columns={[
              { key: 'key', title: 'Key', render: (row) => <span className="font-mono text-xs">{row.key}</span> },
              { key: 'title', title: t('common.name'), render: (row) => localize(row.title, lang) || '—' },
              { key: 'subtitle', title: 'Subtitle', render: (row) => localize(row.subtitle, lang) || '—' },
              {
                key: 'visibility',
                title: t('admin.visibility'),
                render: (row) => (
                  <Badge tone={row.isVisible ? 'green' : 'gray'}>
                    {row.isVisible ? t('common.yes') : t('common.no')}
                  </Badge>
                ),
              },
              { key: 'order', title: t('admin.order'), render: (row) => row.order },
            ]}
            rows={sectionsView.rows}
            loading={sectionList.loading}
            meta={sectionsView.meta}
            onPage={sectionsView.onPage}
            empty={t('admin.noItems')}
            actions={(row) => (
              <IconButton
                title={t('common.edit')}
                onClick={() => setSectionForm({ ...row, title: asLocalized(row.title), subtitle: asLocalized(row.subtitle) })}
              >
                <Pencil size={16} />
              </IconButton>
            )}
          />
        </div>
      )}

      {tab === 'pages' && (
        <div>
          <Toolbar search={search} onSearch={setSearch} onRefresh={pageList.reload} onAdd={() => openPageForm()} addLabel={t('common.create')} />
          <DataTable
            columns={[
              { key: 'key', title: 'Key', render: (row) => <span className="font-mono text-xs">{row.key || '—'}</span> },
              { key: 'title', title: t('common.name'), render: (row) => localize(row.title, lang) || '—' },
              {
                key: 'status',
                title: t('common.status'),
                render: (row) => <Badge tone={row.isActive ? 'green' : 'gray'}>{row.isActive ? t('common.active') : t('common.inactive')}</Badge>,
              },
              { key: 'updatedAt', title: t('common.update'), render: (row) => formatDate(row.updatedAt, lang) },
            ]}
            rows={pagesView.rows}
            loading={pageList.loading}
            meta={pagesView.meta}
            onPage={pagesView.onPage}
            empty={t('admin.noItems')}
            actions={(row) => (
              <>
                <IconButton title={t('common.edit')} onClick={() => openPageForm(row)}><Pencil size={16} /></IconButton>
                <IconButton title={t('common.delete')} tone="danger" onClick={() => setPageToDelete(row)}><Trash2 size={16} /></IconButton>
              </>
            )}
          />
        </div>
      )}

      {tab === 'banners' && (
        <div>
          <Toolbar search={search} onSearch={setSearch} onRefresh={bannerList.reload} onAdd={() => openBannerForm()} addLabel={t('common.create')} />
          <DataTable
            columns={[
              { key: 'title', title: t('common.name'), render: (row) => localize(row.title, lang) || '—' },
              { key: 'position', title: 'Position', render: (row) => <Badge tone="gold">{row.position || '—'}</Badge> },
              { key: 'link', title: 'Link', render: (row) => row.link || '—' },
              {
                key: 'status',
                title: t('common.status'),
                render: (row) => <Badge tone={row.isActive ? 'green' : 'gray'}>{row.isActive ? t('common.active') : t('common.inactive')}</Badge>,
              },
              { key: 'order', title: t('admin.order'), render: (row) => row.order },
            ]}
            rows={bannersView.rows}
            loading={bannerList.loading}
            meta={bannersView.meta}
            onPage={bannersView.onPage}
            empty={t('admin.noItems')}
            actions={(row) => (
              <>
                <IconButton title={t('common.edit')} onClick={() => openBannerForm(row)}><Pencil size={16} /></IconButton>
                <IconButton title={t('common.delete')} tone="danger" onClick={() => setBannerToDelete(row)}><Trash2 size={16} /></IconButton>
              </>
            )}
          />
        </div>
      )}

      {tab === 'testimonials' && (
        <div>
          <Toolbar search={search} onSearch={setSearch} onRefresh={testimonialList.reload} onAdd={() => openTestimonialForm()} addLabel={t('common.create')} />
          <DataTable
            columns={[
              { key: 'name', title: t('common.name'), render: (row) => row.name || '—' },
              { key: 'role', title: 'Role', render: (row) => row.role || '—' },
              { key: 'quote', title: 'Quote', render: (row) => (localize(row.quote, lang) || '—').slice(0, 70) },
              { key: 'rating', title: t('common.rating'), render: (row) => `${row.rating || 5} / 5` },
              {
                key: 'status',
                title: t('common.status'),
                render: (row) => <Badge tone={row.isActive ? 'green' : 'gray'}>{row.isActive ? t('common.active') : t('common.inactive')}</Badge>,
              },
            ]}
            rows={testimonialsView.rows}
            loading={testimonialList.loading}
            meta={testimonialsView.meta}
            onPage={testimonialsView.onPage}
            empty={t('admin.noItems')}
            actions={(row) => (
              <>
                <IconButton title={t('common.edit')} onClick={() => openTestimonialForm(row)}><Pencil size={16} /></IconButton>
                <IconButton title={t('common.delete')} tone="danger" onClick={() => setTestimonialToDelete(row)}><Trash2 size={16} /></IconButton>
              </>
            )}
          />
        </div>
      )}

      {tab === 'newsletter' && (
        <div>
          <Toolbar search={search} onSearch={setSearch} onRefresh={subscriberList.reload} />
          <DataTable
            columns={[
              { key: 'email', title: t('common.email'), render: (row) => row.email || '—' },
              { key: 'language', title: t('common.language'), render: (row) => (row.language || 'en').toUpperCase() },
              {
                key: 'status',
                title: t('common.status'),
                render: (row) => <Badge tone={row.isActive !== false ? 'green' : 'gray'}>{row.isActive !== false ? t('common.active') : t('common.inactive')}</Badge>,
              },
              { key: 'createdAt', title: t('common.date'), render: (row) => formatDate(row.createdAt, lang) },
            ]}
            rows={subscribersView.rows}
            loading={subscriberList.loading}
            meta={subscribersView.meta}
            onPage={subscribersView.onPage}
            empty={t('admin.noItems')}
            actions={(row) => (
              <IconButton title={t('common.details')} onClick={() => setSubscriberView(row)}><Eye size={16} /></IconButton>
            )}
          />
        </div>
      )}

      <Modal open={!!sectionForm} onClose={() => setSectionForm(null)} title={`${t('common.edit')} — ${t('admin.homepageSections')}`} wide>
        {sectionForm && (
          <div className="space-y-4">
            <p className="font-mono text-xs text-muted">{sectionForm.key}</p>
            <LocalizedFields label={t('common.name')} value={sectionForm.title} onChange={(value) => setSectionForm((current) => ({ ...current, title: value }))} />
            <LocalizedFields label="Subtitle" value={sectionForm.subtitle} onChange={(value) => setSectionForm((current) => ({ ...current, subtitle: value }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-line p-3">
                <Toggle
                  checked={!!sectionForm.isVisible}
                  onChange={(value) => setSectionForm((current) => ({ ...current, isVisible: value }))}
                  label={t('admin.visibility')}
                />
              </div>
              <Input
                label={t('admin.order')}
                type="number"
                value={sectionForm.order ?? 0}
                onChange={(event) => setSectionForm((current) => ({ ...current, order: event.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setSectionForm(null)}>{t('common.cancel')}</Button>
              <Button onClick={saveSectionForm}>{t('common.save')}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!pageForm}
        onClose={closePageForm}
        title={`${editingPageId ? t('common.edit') : t('common.create')} — ${t('admin.pages')}`}
        wide
      >
        {pageForm && (
          <div className="space-y-4">
            <Input
              label="Key"
              value={pageForm.key}
              disabled={!!editingPageId}
              onChange={(event) => setPageForm((current) => ({ ...current, key: event.target.value }))}
            />
            <LocalizedFields label={t('common.name')} value={pageForm.title} onChange={(value) => setPageForm((current) => ({ ...current, title: value }))} />
            <LocalizedFields label="Body" multiline rows={7} value={pageForm.body} onChange={(value) => setPageForm((current) => ({ ...current, body: value }))} />
            <LocalizedFields label="Meta description" multiline rows={2} value={pageForm.metaDescription} onChange={(value) => setPageForm((current) => ({ ...current, metaDescription: value }))} />
            <div className="rounded-lg border border-line p-3">
              <Toggle
                checked={!!pageForm.isActive}
                onChange={(value) => setPageForm((current) => ({ ...current, isActive: value }))}
                label={t('common.active')}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={closePageForm}>{t('common.cancel')}</Button>
              <Button onClick={handleSavePage} loading={busy} disabled={!String(pageForm.key || '').trim()}>{t('common.save')}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!bannerForm}
        onClose={closeBannerForm}
        title={`${editingBannerId ? t('common.edit') : t('common.create')} — ${t('admin.banners')}`}
        wide
      >
        {bannerForm && (
          <div className="space-y-4">
            <LocalizedFields label={t('common.name')} value={bannerForm.title} onChange={(value) => setBannerForm((current) => ({ ...current, title: value }))} />
            <LocalizedFields label="Subtitle" value={bannerForm.subtitle} onChange={(value) => setBannerForm((current) => ({ ...current, subtitle: value }))} />
            <LocalizedFields label="CTA label" value={bannerForm.ctaLabel} onChange={(value) => setBannerForm((current) => ({ ...current, ctaLabel: value }))} />
            <Input label="Image URL" value={bannerForm.image} placeholder="https://…" onChange={(event) => setBannerForm((current) => ({ ...current, image: event.target.value }))} />
            <Input label="Or upload image" type="file" accept="image/*" onChange={(event) => setBannerFile(event.target.files?.[0] || null)} />
            {bannerFile && <p className="text-xs text-muted">{bannerFile.name}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Link" value={bannerForm.link} onChange={(event) => setBannerForm((current) => ({ ...current, link: event.target.value }))} />
              <Select
                label="Position"
                options={BANNER_POSITIONS}
                value={bannerForm.position}
                onChange={(event) => setBannerForm((current) => ({ ...current, position: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('admin.order')} type="number" value={bannerForm.order ?? 0} onChange={(event) => setBannerForm((current) => ({ ...current, order: event.target.value }))} />
              <div className="rounded-lg border border-line p-3">
                <Toggle
                  checked={!!bannerForm.isActive}
                  onChange={(value) => setBannerForm((current) => ({ ...current, isActive: value }))}
                  label={t('common.active')}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={closeBannerForm}>{t('common.cancel')}</Button>
              <Button onClick={handleSaveBanner} loading={busy}>{t('common.save')}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!testimonialForm}
        onClose={closeTestimonialForm}
        title={`${editingTestimonialId ? t('common.edit') : t('common.create')} — ${t('admin.testimonials')}`}
        wide
      >
        {testimonialForm && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('common.name')} value={testimonialForm.name} onChange={(event) => setTestimonialForm((current) => ({ ...current, name: event.target.value }))} />
              <Input label="Role" value={testimonialForm.role} onChange={(event) => setTestimonialForm((current) => ({ ...current, role: event.target.value }))} />
            </div>
            <LocalizedFields label="Quote" multiline rows={4} value={testimonialForm.quote} onChange={(value) => setTestimonialForm((current) => ({ ...current, quote: value }))} />
            <Input label="Avatar URL" value={testimonialForm.avatar} placeholder="https://…" onChange={(event) => setTestimonialForm((current) => ({ ...current, avatar: event.target.value }))} />
            <Input label="Or upload avatar" type="file" accept="image/*" onChange={(event) => setTestimonialFile(event.target.files?.[0] || null)} />
            {testimonialFile && <p className="text-xs text-muted">{testimonialFile.name}</p>}
            <div className="grid gap-4 sm:grid-cols-3">
              <Select
                label={t('common.rating')}
                options={RATINGS.map((value) => ({ value, label: `${value} ★` }))}
                value={testimonialForm.rating}
                onChange={(event) => setTestimonialForm((current) => ({ ...current, rating: event.target.value }))}
              />
              <Input label={t('admin.order')} type="number" value={testimonialForm.order ?? 0} onChange={(event) => setTestimonialForm((current) => ({ ...current, order: event.target.value }))} />
              <div className="rounded-lg border border-line p-3">
                <Toggle
                  checked={!!testimonialForm.isActive}
                  onChange={(value) => setTestimonialForm((current) => ({ ...current, isActive: value }))}
                  label={t('common.active')}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={closeTestimonialForm}>{t('common.cancel')}</Button>
              <Button onClick={handleSaveTestimonial} loading={busy}>{t('common.save')}</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!subscriberView} onClose={() => setSubscriberView(null)} title={t('admin.newsletter')}>
        {subscriberView && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted">{t('common.email')}</span><span className="font-medium">{subscriberView.email || '—'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted">{t('common.language')}</span><span className="font-medium">{(subscriberView.language || 'en').toUpperCase()}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted">{t('common.status')}</span><Badge tone={subscriberView.isActive !== false ? 'green' : 'gray'}>{subscriberView.isActive !== false ? t('common.active') : t('common.inactive')}</Badge></div>
            <div className="flex justify-between gap-4"><span className="text-muted">{t('common.date')}</span><span className="font-medium">{formatDate(subscriberView.createdAt, lang, true)}</span></div>
            <div className="flex justify-end pt-4">
              <Button variant="ghost" onClick={() => setSubscriberView(null)}>{t('common.close')}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pageToDelete}
        onClose={() => setPageToDelete(null)}
        onConfirm={handleDeletePage}
        loading={busy}
        title={t('common.delete')}
        message={pageToDelete ? `${t('admin.confirmDelete')} ${localize(pageToDelete.title, lang)}` : ''}
      />
      <ConfirmDialog
        open={!!bannerToDelete}
        onClose={() => setBannerToDelete(null)}
        onConfirm={handleDeleteBanner}
        loading={busy}
        title={t('common.delete')}
        message={bannerToDelete ? `${t('admin.confirmDelete')} ${localize(bannerToDelete.title, lang)}` : ''}
      />
      <ConfirmDialog
        open={!!testimonialToDelete}
        onClose={() => setTestimonialToDelete(null)}
        onConfirm={handleDeleteTestimonial}
        loading={busy}
        title={t('common.delete')}
        message={testimonialToDelete ? `${t('admin.confirmDelete')} ${testimonialToDelete.name || ''}` : ''}
      />
    </div>
  );
}
