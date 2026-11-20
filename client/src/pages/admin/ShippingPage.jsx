import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Truck } from 'lucide-react';
import { PageHeader, StatCard, Toolbar, DataTable, IconButton } from '../../components/admin/AdminUI.jsx';
import { Button, Input, Toggle, Modal, ConfirmDialog, Badge } from '../../components/common/UI.jsx';
import { adminApi } from '../../services/index.js';
import { LANGUAGES, emptyLocalized, asLocalized, commaList, idOf, fromMinor, toMinor, useAdminList, useAdminMutation } from './adminUtils.js';
import { localize } from '../../utils/localized.js';
import { formatMoney } from '../../utils/currency.js';

const PAGE_SIZE = 10;

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
  React.useEffect(() => { setPage(1); }, [query]);
  const meta = useMemo(() => localMeta(filtered.length, page, size), [filtered.length, page, size]);
  const visibleRows = useMemo(
    () => filtered.slice((meta.page - 1) * size, meta.page * size),
    [filtered, meta.page, size],
  );
  return { rows: visibleRows, meta, onPage: setPage };
}

function LocalizedFields({ label, value, onChange, className = '' }) {
  const current = asLocalized(value);
  return (
    <div className={className}>
      <p className="label mb-1">{label}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {LANGUAGES.map((lang) => (
          <Input
            key={lang}
            label={lang.toUpperCase()}
            value={current[lang] || ''}
            onChange={(event) => onChange({ ...current, [lang]: event.target.value })}
          />
        ))}
      </div>
    </div>
  );
}

const emptyZoneForm = () => ({
  name: emptyLocalized(),
  countries: '',
  cities: '',
  price: '0.00',
  freeShippingThreshold: '0.00',
  estimatedDaysMin: 2,
  estimatedDaysMax: 5,
  codAvailable: true,
  isActive: true,
  order: 0,
});

export default function ShippingPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const run = useAdminMutation();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);
  const [editingId, setEditingId] = useState('');
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadZones = useCallback(() => adminApi.zones(), []);
  const list = useAdminList(loadZones, [loadZones]);
  const view = useLocalList(list.rows, search);

  const stats = useMemo(() => {
    const rows = list.rows || [];
    return {
      total: rows.length,
      active: rows.filter((row) => row.isActive !== false).length,
      cod: rows.filter((row) => !!row.codAvailable).length,
    };
  }, [list.rows]);

  const openForm = (row) => {
    setEditingId(row ? idOf(row) : '');
    setForm(row ? {
      name: asLocalized(row.name),
      countries: (row.countries || []).join(', '),
      cities: (row.cities || []).join(', '),
      price: fromMinor(row.price),
      freeShippingThreshold: fromMinor(row.freeShippingThreshold),
      estimatedDaysMin: row.estimatedDaysMin ?? 2,
      estimatedDaysMax: row.estimatedDaysMax ?? 5,
      codAvailable: !!row.codAvailable,
      isActive: row.isActive !== false,
      order: row.order ?? 0,
    } : emptyZoneForm());
  };

  const closeForm = () => { setForm(null); setEditingId(''); };

  const handleSave = async () => {
    if (!form) return;
    setBusy(true);
    try {
      const min = Math.max(1, Number(form.estimatedDaysMin) || 2);
      const max = Math.max(min, Number(form.estimatedDaysMax) || min);
      const payload = {
        name: form.name,
        countries: commaList(form.countries),
        cities: commaList(form.cities),
        price: toMinor(form.price),
        freeShippingThreshold: toMinor(form.freeShippingThreshold),
        estimatedDaysMin: min,
        estimatedDaysMax: max,
        codAvailable: !!form.codAvailable,
        isActive: !!form.isActive,
        order: Number(form.order) || 0,
      };
      await run(() => adminApi.saveZone(payload, editingId || undefined), t('toast.saved'));
      closeForm();
      list.reload();
    } catch {
      // Toast is shown by useAdminMutation.
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await run(() => adminApi.deleteZone(idOf(toDelete)), t('toast.deleted'));
      setToDelete(null);
      list.reload();
    } catch {
      // Toast is shown by useAdminMutation.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title={t('admin.shipping')} subtitle="Delivery zones, pricing and estimated timelines" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Shipping zones" value={stats.total} icon={Truck} tone="gold" />
        <StatCard label={t('common.active')} value={stats.active} tone="green" />
        <StatCard label="Cash on delivery" value={stats.cod} tone="blue" />
      </div>

      <div className="mt-5">
        <Toolbar search={search} onSearch={setSearch} onRefresh={list.reload} onAdd={() => openForm()} addLabel={t('common.create')} />
        <DataTable
          columns={[
            { key: 'name', title: t('common.name'), render: (row) => localize(row.name, lang) || '—' },
            { key: 'countries', title: 'Countries', render: (row) => (row.countries || []).join(', ') || '—' },
            { key: 'cities', title: 'Cities', render: (row) => (row.cities || []).join(', ') || '—' },
            { key: 'price', title: t('common.price'), render: (row) => formatMoney(row.price || 0, 'MAD', lang) },
            {
              key: 'threshold',
              title: 'Free shipping from',
              render: (row) => (row.freeShippingThreshold ? formatMoney(row.freeShippingThreshold, 'MAD', lang) : '—'),
            },
            {
              key: 'delivery',
              title: 'Delivery (days)',
              render: (row) => `${row.estimatedDaysMin ?? '—'}–${row.estimatedDaysMax ?? '—'}`,
            },
            {
              key: 'cod',
              title: 'COD',
              render: (row) => <Badge tone={row.codAvailable ? 'green' : 'gray'}>{row.codAvailable ? t('common.yes') : t('common.no')}</Badge>,
            },
            {
              key: 'status',
              title: t('common.status'),
              render: (row) => <Badge tone={row.isActive !== false ? 'green' : 'gray'}>{row.isActive !== false ? t('common.active') : t('common.inactive')}</Badge>,
            },
            { key: 'order', title: t('admin.order'), render: (row) => row.order },
          ]}
          rows={view.rows}
          loading={list.loading}
          meta={view.meta}
          onPage={view.onPage}
          empty={t('admin.noItems')}
          actions={(row) => (
            <>
              <IconButton title={t('common.edit')} onClick={() => openForm(row)}><Pencil size={16} /></IconButton>
              <IconButton title={t('common.delete')} tone="danger" onClick={() => setToDelete(row)}><Trash2 size={16} /></IconButton>
            </>
          )}
        />
      </div>

      <Modal
        open={!!form}
        onClose={closeForm}
        title={`${editingId ? t('common.edit') : t('common.create')} — ${t('admin.shipping')}`}
        wide
      >
        {form && (
          <div className="space-y-4">
            <LocalizedFields label={t('common.name')} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Countries (comma separated)"
                value={form.countries}
                placeholder="Morocco, France"
                onChange={(event) => setForm((current) => ({ ...current, countries: event.target.value }))}
              />
              <Input
                label="Cities (comma separated)"
                value={form.cities}
                placeholder="Casablanca, Rabat"
                onChange={(event) => setForm((current) => ({ ...current, cities: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Price (MAD)"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
              />
              <Input
                label="Free shipping threshold (MAD)"
                type="number"
                step="0.01"
                min="0"
                value={form.freeShippingThreshold}
                onChange={(event) => setForm((current) => ({ ...current, freeShippingThreshold: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Min days"
                type="number"
                min="1"
                value={form.estimatedDaysMin}
                onChange={(event) => setForm((current) => ({ ...current, estimatedDaysMin: event.target.value }))}
              />
              <Input
                label="Max days"
                type="number"
                min="1"
                value={form.estimatedDaysMax}
                onChange={(event) => setForm((current) => ({ ...current, estimatedDaysMax: event.target.value }))}
              />
              <Input
                label={t('admin.order')}
                type="number"
                value={form.order ?? 0}
                onChange={(event) => setForm((current) => ({ ...current, order: event.target.value }))}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-line p-3">
                <Toggle
                  checked={!!form.codAvailable}
                  onChange={(value) => setForm((current) => ({ ...current, codAvailable: value }))}
                  label="Cash on delivery available"
                />
              </div>
              <div className="rounded-lg border border-line p-3">
                <Toggle
                  checked={!!form.isActive}
                  onChange={(value) => setForm((current) => ({ ...current, isActive: value }))}
                  label={t('common.active')}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={closeForm}>{t('common.cancel')}</Button>
              <Button onClick={handleSave} loading={busy}>{t('common.save')}</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        loading={busy}
        title={t('common.delete')}
        message={toDelete ? `${t('admin.confirmDelete')} ${localize(toDelete.name, lang)}` : ''}
      />
    </div>
  );
}
