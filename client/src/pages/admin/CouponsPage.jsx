import React, { useCallback, useMemo, useState } from 'react';
import { Pencil, Tag, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader, StatCard, Toolbar, DataTable, IconButton } from '../../components/admin/AdminUI.jsx';
import { Button, Input, Select, Checkbox, Modal, ConfirmDialog, Badge } from '../../components/common/UI.jsx';
import { adminApi } from '../../services/index.js';
import {
  LANGUAGES, asLocalized, emptyLocalized, formatDate, fromMinor, idOf,
  localizedText, toMinor, useAdminList, useAdminMutation,
} from './adminUtils.js';
import { formatMoney } from '../../utils/currency.js';

const TYPES = [
  { value: 'percent', label: 'Percent (%)' },
  { value: 'fixed', label: 'Fixed amount (MAD)' },
];

function emptyForm() {
  return {
    code: '',
    description: emptyLocalized(),
    type: 'percent',
    value: '',
    minPurchase: '0',
    maxDiscount: '0',
    startsAt: '',
    expiresAt: '',
    usageLimit: '0',
    perUserLimit: '1',
    isActive: true,
  };
}

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function toIsoDate(value) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formFromCoupon(coupon) {
  return {
    code: coupon.code || '',
    description: asLocalized(coupon.description),
    type: coupon.type === 'fixed' ? 'fixed' : 'percent',
    value: coupon.type === 'fixed' ? fromMinor(coupon.value) : String(coupon.value ?? ''),
    minPurchase: fromMinor(coupon.minPurchase),
    maxDiscount: fromMinor(coupon.maxDiscount),
    startsAt: toDateInput(coupon.startsAt),
    expiresAt: toDateInput(coupon.expiresAt),
    usageLimit: String(coupon.usageLimit ?? 0),
    perUserLimit: String(coupon.perUserLimit ?? 1),
    isActive: coupon.isActive !== false,
  };
}

function couponStatusKey(coupon) {
  if (!coupon?.isActive) return 'inactive';
  const now = Date.now();
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < now) return 'expired';
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return 'scheduled';
  return 'active';
}

export default function CouponsPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').split('-')[0];

  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [toDelete, setToDelete] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const params = { page };
    if (q) params.q = q;
    if (status) params.status = status;
    return adminApi.coupons(params);
  }, [page, q, status]);

  const { rows, meta, loading, reload } = useAdminList(load, [page, q, status]);
  const mutate = useAdminMutation();

  const statusMeta = {
    active: { label: t('common.active'), tone: 'green' },
    scheduled: { label: 'Scheduled', tone: 'blue' },
    expired: { label: 'Expired', tone: 'red' },
    inactive: { label: t('common.inactive'), tone: 'gray' },
  };

  // Coupon listing is not server-filtered; narrow the current page locally.
  const visibleRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((coupon) => {
      if (status && couponStatusKey(coupon) !== status) return false;
      if (!needle) return true;
      return [coupon.code, localizedText(coupon.description, lang)]
        .some((value) => String(value || '').toLowerCase().includes(needle));
    });
  }, [rows, q, status, lang]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (coupon) => {
    setEditing(coupon);
    setForm(formFromCoupon(coupon));
    setModalOpen(true);
  };

  const save = async () => {
    setBusy(true);
    const payload = {
      code: String(form.code || '').trim().toUpperCase(),
      description: asLocalized(form.description),
      type: form.type,
      value: form.type === 'fixed' ? toMinor(form.value) : Number(form.value) || 0,
      minPurchase: toMinor(form.minPurchase),
      maxDiscount: toMinor(form.maxDiscount),
      usageLimit: Number(form.usageLimit) || 0,
      perUserLimit: Number(form.perUserLimit) || 1,
      isActive: !!form.isActive,
      startsAt: toIsoDate(form.startsAt),
      expiresAt: form.expiresAt ? (toIsoDate(form.expiresAt) ?? null) : null,
    };
    try {
      await mutate(
        editing ? adminApi.updateCoupon(idOf(editing), payload) : adminApi.createCoupon(payload),
        editing ? t('toast.saved') : t('toast.created'),
      );
      setModalOpen(false);
      setEditing(null);
      reload();
    } catch {
      // Error toast is handled by useAdminMutation.
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await mutate(adminApi.deleteCoupon(idOf(toDelete)), t('toast.deleted'));
      setToDelete(null);
      reload();
    } catch {
      // Error toast is handled by useAdminMutation.
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: 'code',
      title: 'Code',
      render: (row) => <span className="font-semibold uppercase tracking-wide text-ink">{row.code || '—'}</span>,
    },
    {
      key: 'description',
      title: 'Description',
      render: (row) => <span className="text-muted">{localizedText(row.description, lang)}</span>,
    },
    {
      key: 'value',
      title: t('common.price'),
      render: (row) => (
        <span className="font-medium">
          {row.type === 'percent' ? `${row.value ?? 0}%` : formatMoney(row.value, 'MAD', lang)}
        </span>
      ),
    },
    {
      key: 'minPurchase',
      title: 'Min purchase',
      render: (row) => formatMoney(row.minPurchase, 'MAD', lang),
    },
    {
      key: 'usage',
      title: 'Usage',
      render: (row) => `${row.usedCount || 0} / ${row.usageLimit || '∞'}`,
    },
    {
      key: 'validity',
      title: t('common.date'),
      render: (row) => (
        <span className="text-xs text-muted">
          {formatDate(row.startsAt, lang)} — {row.expiresAt ? formatDate(row.expiresAt, lang) : '∞'}
        </span>
      ),
    },
    {
      key: 'status',
      title: t('common.status'),
      render: (row) => {
        const metaStatus = statusMeta[couponStatusKey(row)] || statusMeta.inactive;
        return <Badge tone={metaStatus.tone}>{metaStatus.label}</Badge>;
      },
    },
  ];

  return (
    <div>
      <PageHeader title={t('admin.coupons')} subtitle="Manage discount codes" />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('admin.coupons')} value={meta?.total ?? rows.length} icon={Tag} />
        <StatCard label={t('common.active')} value={rows.filter((r) => couponStatusKey(r) === 'active').length} tone="green" />
        <StatCard label="Expired" value={rows.filter((r) => couponStatusKey(r) === 'expired').length} tone="red" />
      </div>

      <Toolbar
        search={q}
        onSearch={(value) => { setQ(value); setPage(1); }}
        onRefresh={reload}
        onAdd={openCreate}
        addLabel={t('common.create')}
      >
        <Select
          className="w-auto min-w-[150px]"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          options={[
            { value: '', label: `${t('common.status')}: ${t('common.all')}` },
            { value: 'active', label: t('common.active') },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'expired', label: 'Expired' },
            { value: 'inactive', label: t('common.inactive') },
          ]}
        />
      </Toolbar>

      <DataTable
        columns={columns}
        rows={visibleRows}
        loading={loading}
        meta={meta}
        onPage={setPage}
        empty={t('admin.noItems')}
        actions={(row) => (
          <React.Fragment key={idOf(row)}>
            <IconButton key="edit" title={t('common.edit')} onClick={() => openEdit(row)}>
              <Pencil size={17} />
            </IconButton>
            <IconButton key="delete" title={t('common.delete')} tone="danger" onClick={() => setToDelete(row)}>
              <Trash2 size={17} />
            </IconButton>
          </React.Fragment>
        )}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `${t('common.edit')} ${editing.code || ''}` : t('admin.coupons')}
        wide
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Code"
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              placeholder="SAVE10"
            />
            <Select
              label="Type"
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              options={TYPES}
            />
            <Input
              label={form.type === 'percent' ? 'Discount (%)' : 'Discount amount (MAD)'}
              type="number"
              min="0"
              step={form.type === 'percent' ? '1' : '0.01'}
              value={form.value}
              onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
            />
            <Input
              label="Max discount (MAD)"
              type="number"
              min="0"
              step="0.01"
              value={form.maxDiscount}
              onChange={(e) => setForm((prev) => ({ ...prev, maxDiscount: e.target.value }))}
            />
            <Input
              label="Min purchase (MAD)"
              type="number"
              min="0"
              step="0.01"
              value={form.minPurchase}
              onChange={(e) => setForm((prev) => ({ ...prev, minPurchase: e.target.value }))}
            />
            <Input
              label="Usage limit (0 = unlimited)"
              type="number"
              min="0"
              value={form.usageLimit}
              onChange={(e) => setForm((prev) => ({ ...prev, usageLimit: e.target.value }))}
            />
            <Input
              label="Per-user limit"
              type="number"
              min="0"
              value={form.perUserLimit}
              onChange={(e) => setForm((prev) => ({ ...prev, perUserLimit: e.target.value }))}
            />
            <Input
              label="Starts at"
              type="date"
              value={form.startsAt}
              onChange={(e) => setForm((prev) => ({ ...prev, startsAt: e.target.value }))}
            />
            <Input
              label="Expires at"
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
            />
          </div>

          <div>
            <p className="label">{'Description'}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {LANGUAGES.map((language) => (
                <Input
                  key={language}
                  label={language.toUpperCase()}
                  value={form.description[language] || ''}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    description: { ...prev.description, [language]: e.target.value },
                  }))}
                />
              ))}
            </div>
          </div>

          <Checkbox
            label={t('common.active')}
            checked={form.isActive}
            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
          />

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={save} loading={busy}>{t('common.save')}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={t('common.delete')}
        message={`${t('admin.confirmDelete')} ${toDelete?.code || ''}`}
        loading={busy}
      />
    </div>
  );
}
