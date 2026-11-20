import React, { useCallback, useMemo, useState } from 'react';
import { Check, Flag, MessageSquare, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader, StatCard, Toolbar, DataTable, IconButton } from '../../components/admin/AdminUI.jsx';
import { Button, Select, Textarea, Checkbox, Modal, ConfirmDialog, Badge } from '../../components/common/UI.jsx';
import { adminApi } from '../../services/index.js';
import {
  REVIEW_STATUSES, formatDate, idOf, statusTone, useAdminList, useAdminMutation,
} from './adminUtils.js';
import { localize } from '../../utils/localized.js';

export default function ReviewsPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').split('-')[0];

  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [reported, setReported] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ status: 'pending', adminResponse: '', isReported: false });
  const [toDelete, setToDelete] = useState(null);
  const [busyId, setBusyId] = useState('');
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    const params = { page };
    if (q) params.q = q;
    if (status) params.status = status;
    if (reported) params.reported = 'true';
    return adminApi.reviews(params);
  }, [page, q, status, reported]);

  const { rows, meta, loading, reload } = useAdminList(load, [page, q, status, reported]);
  const mutate = useAdminMutation();

  // The public API ignores `q`; narrow the current page locally as well.
  const visibleRows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => [
      localize(row.book?.title, lang),
      row.user?.name,
      row.user?.email,
      row.title,
      row.comment,
    ].some((value) => String(value || '').toLowerCase().includes(needle)));
  }, [rows, q, lang]);

  const openModerate = (row) => {
    setSelected(row);
    setForm({
      status: row.status || 'pending',
      adminResponse: row.adminResponse || '',
      isReported: !!row.isReported,
    });
  };

  const moderate = async (row, payload, message = t('toast.saved')) => {
    const id = idOf(row);
    if (!id) return;
    setBusyId(id);
    try {
      await mutate(adminApi.moderateReview(id, payload), message);
      if (idOf(selected) === id) setForm((prev) => ({ ...prev, ...payload }));
      reload();
    } catch {
      // Error toast is handled by useAdminMutation.
    } finally {
      setBusyId('');
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await mutate(adminApi.deleteReview(idOf(toDelete)), t('toast.deleted'));
      if (idOf(selected) === idOf(toDelete)) setSelected(null);
      setToDelete(null);
      reload();
    } catch {
      // Error toast is handled by useAdminMutation.
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: 'book',
      title: t('admin.books'),
      render: (row) => (
        <div className="max-w-[200px]">
          <p className="truncate font-medium text-ink">{localize(row.book?.title, lang) || '—'}</p>
          {row.book?.slug && <p className="truncate text-xs text-muted">{row.book.slug}</p>}
        </div>
      ),
    },
    {
      key: 'user',
      title: t('admin.customers'),
      render: (row) => (
        <div className="max-w-[180px]">
          <p className="truncate text-ink">{row.user?.name || '—'}</p>
          <p className="truncate text-xs text-muted">{row.user?.email || ''}</p>
        </div>
      ),
    },
    {
      key: 'rating',
      title: t('common.rating'),
      render: (row) => <span className="whitespace-nowrap text-gold">★ {Number(row.rating || 0).toFixed(1)}</span>,
    },
    {
      key: 'review',
      title: t('book.reviews'),
      render: (row) => (
        <div className="max-w-[260px]">
          {row.title && <p className="truncate text-ink">{row.title}</p>}
          {row.comment && <p className="truncate text-xs text-muted">{row.comment}</p>}
          {row.helpful ? <p className="mt-0.5 text-[11px] text-muted">{row.helpful} helpful</p> : null}
        </div>
      ),
    },
    {
      key: 'status',
      title: t('common.status'),
      render: (row) => <Badge tone={statusTone(row.status)}>{row.status || '—'}</Badge>,
    },
    {
      key: 'reported',
      title: 'Reported',
      render: (row) => (row.isReported ? <Badge tone="red">Reported</Badge> : <span className="text-muted">—</span>),
    },
    { key: 'createdAt', title: t('common.date'), render: (row) => formatDate(row.createdAt, lang) },
  ];

  return (
    <div>
      <PageHeader title={t('admin.reviews')} subtitle={t('admin.overview')} />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('admin.reviews')} value={meta?.total ?? rows.length} icon={MessageSquare} />
        <StatCard label={t('book.reviewsPending')} value={rows.filter((r) => r.status === 'pending').length} tone="gold" />
        <StatCard label="Reported" value={rows.filter((r) => r.isReported).length} tone="red" icon={Flag} />
      </div>

      <Toolbar
        search={q}
        onSearch={(value) => { setQ(value); setPage(1); }}
        onRefresh={reload}
      >
        <Select
          className="w-auto min-w-[150px]"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          options={[{ value: '', label: `${t('common.status')}: ${t('common.all')}` }, ...REVIEW_STATUSES]}
        />
        <Checkbox
          label="Reported only"
          checked={reported}
          onChange={(e) => { setReported(e.target.checked); setPage(1); }}
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
            {row.status !== 'approved' && (
              <IconButton
                key="approve"
                title="Approve"
                tone="primary"
                onClick={() => moderate(row, { status: 'approved' })}
              >
                <Check size={17} />
              </IconButton>
            )}
            {row.status !== 'rejected' && (
              <IconButton
                key="reject"
                title="Reject"
                tone="danger"
                onClick={() => moderate(row, { status: 'rejected' })}
              >
                <X size={17} />
              </IconButton>
            )}
            <IconButton key="respond" title="Response" onClick={() => openModerate(row)}>
              <MessageSquare size={17} />
            </IconButton>
            <IconButton
              key="report"
              title={row.isReported ? 'Clear report' : 'Mark as reported'}
              tone={row.isReported ? 'danger' : 'default'}
              onClick={() => moderate(row, { isReported: !row.isReported })}
            >
              <Flag size={17} />
            </IconButton>
            <IconButton key="delete" title={t('common.delete')} tone="danger" onClick={() => setToDelete(row)}>
              <Trash2 size={17} />
            </IconButton>
          </React.Fragment>
        )}
      />

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`${t('admin.reviews')} — ${localize(selected?.book?.title, lang) || '—'}`}
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg border border-line bg-sand/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-ink">{selected.title || localize(selected.book?.title, lang) || '—'}</p>
                <span className="text-sm text-gold">★ {Number(selected.rating || 0).toFixed(1)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-muted">{selected.comment || '—'}</p>
              <p className="mt-2 text-xs text-muted">
                {selected.user?.name || '—'} · {formatDate(selected.createdAt, lang, true)}
              </p>
            </div>

            <Select
              label={t('common.status')}
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
              options={REVIEW_STATUSES}
            />
            <Textarea
              label="Admin response"
              rows={4}
              value={form.adminResponse}
              onChange={(e) => setForm((prev) => ({ ...prev, adminResponse: e.target.value }))}
            />
            <Checkbox
              label="Reported by users"
              checked={form.isReported}
              onChange={(e) => setForm((prev) => ({ ...prev, isReported: e.target.checked }))}
            />
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="ghost" onClick={() => setSelected(null)}>{t('common.close')}</Button>
              <Button
                onClick={() => moderate(selected, form)}
                loading={busyId === idOf(selected)}
              >
                {t('common.save')}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
        title={t('common.delete')}
        message={`${t('admin.confirmDelete')} ${localize(toDelete?.book?.title, lang) || ''}`}
        loading={deleting}
      />
    </div>
  );
}
