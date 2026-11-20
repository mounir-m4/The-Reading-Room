import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, CreditCard, DollarSign, Eye, RotateCcw } from 'lucide-react';
import { PageHeader, StatCard, Toolbar, DataTable, IconButton } from '../../components/admin/AdminUI.jsx';
import { Button, Select, Modal, ConfirmDialog, Badge } from '../../components/common/UI.jsx';
import { adminApi } from '../../services/index.js';
import { formatDate, idOf, statusTone, useAdminList, useAdminMutation } from './adminUtils.js';
import { formatMoney } from '../../utils/currency.js';

const PAGE_SIZE = 12;
const STATUSES = ['pending', 'succeeded', 'failed', 'refunded'];

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-end font-medium">{value}</span>
    </div>
  );
}

function moneySummary(values, lang) {
  const entries = Object.entries(values || {});
  if (!entries.length) return formatMoney(0, 'MAD', lang);
  return entries.map(([currency, amount]) => formatMoney(amount, currency, lang)).join(' · ');
}

export default function PaymentsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const run = useAdminMutation();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState(null);
  const [toRefund, setToRefund] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadPayments = useCallback(
    () => adminApi.payments({ page, limit: PAGE_SIZE, ...(status ? { status } : {}) }),
    [page, status],
  );
  const list = useAdminList(loadPayments, [page, status]);

  const rows = useMemo(() => {
    const source = list.rows || [];
    const q = String(search || '').trim().toLowerCase();
    if (!q) return source;
    return source.filter((row) => [
      row.provider,
      row.providerTransactionId,
      row.order?.orderNumber,
      row.status,
      idOf(row),
    ].some((value) => String(value || '').toLowerCase().includes(q)));
  }, [list.rows, search]);

  const stats = useMemo(() => {
    const revenue = {};
    const refunded = {};
    let succeeded = 0;
    let failed = 0;
    (list.rows || []).forEach((row) => {
      const currency = row.currency || 'MAD';
      const amount = Number(row.amount) || 0;
      if (row.status === 'succeeded') {
        revenue[currency] = (revenue[currency] || 0) + amount;
        succeeded += 1;
      }
      if (row.status === 'refunded') {
        refunded[currency] = (refunded[currency] || 0) + amount;
      }
      if (row.status === 'failed') failed += 1;
    });
    return {
      revenue: moneySummary(revenue, lang),
      refunded: moneySummary(refunded, lang),
      succeeded,
      failed,
    };
  }, [list.rows, lang]);

  const handleRefund = async () => {
    if (!toRefund) return;
    setBusy(true);
    try {
      await run(() => adminApi.refund(idOf(toRefund)), 'Refund processed successfully');
      setToRefund(null);
      setDetail(null);
      list.reload();
    } catch {
      // Toast is shown by useAdminMutation.
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = (value) => { setStatus(value); setPage(1); };
  const changeSearch = (value) => { setSearch(value); setPage(1); };

  return (
    <div>
      <PageHeader title={t('admin.payments')} subtitle="Payment transactions and refunds" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('admin.totalRevenue')} value={stats.revenue} icon={DollarSign} tone="green" hint="Succeeded transactions on this page" />
        <StatCard label="Refunded" value={stats.refunded} icon={RotateCcw} tone="red" hint="Refunded transactions on this page" />
        <StatCard label="Successful" value={stats.succeeded} icon={CreditCard} hint="Transactions on this page" />
        <StatCard label="Failed" value={stats.failed} icon={AlertCircle} tone="red" />
      </div>

      <div className="mt-5">
        <Toolbar search={search} onSearch={changeSearch} onRefresh={list.reload}>
          <Select
            options={[{ value: '', label: t('common.all') }, ...STATUSES.map((value) => ({ value, label: value }))]}
            value={status}
            onChange={(event) => changeStatus(event.target.value)}
            className="w-40"
            aria-label={t('common.status')}
          />
        </Toolbar>
        <DataTable
          columns={[
            { key: 'order', title: 'Order', render: (row) => row.order?.orderNumber || '—' },
            { key: 'provider', title: 'Provider', render: (row) => <span className="capitalize">{row.provider || '—'}</span> },
            { key: 'transaction', title: 'Transaction', render: (row) => <span className="font-mono text-xs">{row.providerTransactionId || idOf(row)}</span> },
            { key: 'amount', title: t('common.total'), render: (row) => formatMoney(row.amount, row.currency || 'MAD', lang) },
            { key: 'status', title: t('common.status'), render: (row) => <Badge tone={statusTone(row.status)}>{row.status || '—'}</Badge> },
            { key: 'date', title: t('common.date'), render: (row) => formatDate(row.createdAt, lang, true) },
          ]}
          rows={rows}
          loading={list.loading}
          meta={list.meta}
          onPage={setPage}
          empty={t('admin.noItems')}
          actions={(row) => (
            <>
              <IconButton title={t('common.details')} onClick={() => setDetail(row)}><Eye size={16} /></IconButton>
              {row.status === 'succeeded' && (
                <IconButton title={t('admin.refund')} tone="danger" onClick={() => setToRefund(row)}><RotateCcw size={16} /></IconButton>
              )}
            </>
          )}
        />
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={t('common.details')}>
        {detail && (
          <div className="text-sm">
            <DetailRow label="Order" value={detail.order?.orderNumber || '—'} />
            <DetailRow
              label="Order total"
              value={detail.order?.total !== undefined
                ? formatMoney(detail.order.total, detail.currency || 'MAD', lang)
                : '—'}
            />
            <DetailRow label="Provider" value={<span className="capitalize">{detail.provider || '—'}</span>} />
            <DetailRow label="Transaction ID" value={detail.providerTransactionId || idOf(detail)} />
            <DetailRow label="Amount" value={formatMoney(detail.amount, detail.currency || 'MAD', lang)} />
            <DetailRow label="Status" value={<Badge tone={statusTone(detail.status)}>{detail.status || '—'}</Badge>} />
            <DetailRow label="Date" value={formatDate(detail.createdAt, lang, true)} />
            {detail.failureReason && <DetailRow label="Failure reason" value={detail.failureReason} />}
            {detail.metadata && Object.keys(detail.metadata).length > 0 && (
              <div className="mt-4">
                <p className="label mb-1">Metadata</p>
                <pre className="overflow-x-auto rounded-lg bg-sand/50 p-3 text-xs">{JSON.stringify(detail.metadata, null, 2)}</pre>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDetail(null)}>{t('common.close')}</Button>
              {detail.status === 'succeeded' && (
                <Button
                  onClick={() => { setToRefund(detail); setDetail(null); }}
                  loading={busy}
                >
                  {t('admin.refund')}
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toRefund}
        onClose={() => setToRefund(null)}
        onConfirm={handleRefund}
        loading={busy}
        title={t('admin.refund')}
        message={toRefund
          ? `Refund ${formatMoney(toRefund.amount, toRefund.currency || 'MAD', lang)}? This cannot be undone.`
          : ''}
      />
    </div>
  );
}
