import React, { useCallback, useState } from 'react';
import { Eye, ShoppingCart, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader, StatCard, Toolbar, DataTable, IconButton } from '../../components/admin/AdminUI.jsx';
import { Button, Select, Textarea, Modal, ConfirmDialog, Badge } from '../../components/common/UI.jsx';
import { adminApi, orderApi } from '../../services/index.js';
import {
  ORDER_STATUSES, PAYMENT_STATUSES, formatDate, idOf, statusTone,
  useAdminList, useAdminMutation, useAdminCan,
} from './adminUtils.js';
import { formatMoney } from '../../utils/currency.js';
import { localize } from '../../utils/localized.js';

const PAYMENT_METHODS = ['stripe', 'cod', 'mock'];
const FINAL_STATUSES = ['Delivered', 'Cancelled', 'Refunded'];

function Info({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 break-words text-sm text-ink">{value ?? '—'}</p>
    </div>
  );
}

export default function OrdersPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').split('-')[0];

  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [form, setForm] = useState({ status: 'Pending', paymentStatus: 'Pending', note: '' });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const params = { page };
    if (q) params.q = q;
    if (status) params.status = status;
    if (paymentStatus) params.paymentStatus = paymentStatus;
    if (paymentMethod) params.paymentMethod = paymentMethod;
    return adminApi.orders(params);
  }, [page, q, status, paymentStatus, paymentMethod]);

  const { rows, meta, loading, reload } = useAdminList(load, [page, q, status, paymentStatus, paymentMethod]);
  const mutate = useAdminMutation();
  const can = useAdminCan();

  /** Minor totals are stored in MAD; display* fields, when present, are in the order currency. */
  const money = (order, minorKey, displayKey) => {
    const display = order?.[displayKey];
    const hasDisplay = display !== undefined && display !== null && display !== '';
    return formatMoney(
      hasDisplay ? display : order?.[minorKey],
      hasDisplay ? (order?.currency || 'MAD') : 'MAD',
      lang,
    );
  };

  const loadDetail = useCallback(async (id) => {
    if (!id) return null;
    setDetailLoading(true);
    try {
      const res = await orderApi.get(id);
      const data = res?.data || null;
      setDetail(data);
      return data;
    } catch {
      setDetail(null);
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openDetail = async (order) => {
    setSelected(order);
    setDetail(null);
    setForm({
      status: order.status || 'Pending',
      paymentStatus: order.paymentStatus || 'Pending',
      note: '',
    });
    setCancelOpen(false);
    setCancelReason('');
    await loadDetail(idOf(order));
  };

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const save = async () => {
    const id = idOf(detail || selected);
    if (!id) return;
    setBusy(true);
    try {
      await mutate(
        adminApi.updateOrder(id, {
          status: form.status,
          paymentStatus: form.paymentStatus,
          note: form.note,
        }),
        t('toast.saved'),
      );
      await loadDetail(id);
      reload();
    } catch {
      // Error toast is handled by useAdminMutation.
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    const id = idOf(detail || selected);
    if (!id) return;
    setBusy(true);
    try {
      await mutate(adminApi.cancelOrder(id, cancelReason), t('toast.saved'));
      setCancelOpen(false);
      await loadDetail(id);
      reload();
    } catch {
      // Error toast is handled by useAdminMutation.
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: 'orderNumber',
      title: t('checkout.orderNumber'),
      render: (row) => <span className="font-medium text-ink">{row.orderNumber || '—'}</span>,
    },
    {
      key: 'customer',
      title: t('admin.customers'),
      render: (row) => (
        <div className="max-w-[220px]">
          <p className="truncate text-ink">{[row.customer?.firstName, row.customer?.lastName].filter(Boolean).join(' ') || '—'}</p>
          <p className="truncate text-xs text-muted">{row.customer?.email || row.customer?.phone || '—'}</p>
        </div>
      ),
    },
    { key: 'date', title: t('common.date'), render: (row) => formatDate(row.createdAt, lang, true) },
    {
      key: 'total',
      title: t('common.total'),
      render: (row) => <span className="font-semibold text-ink">{money(row, 'total', 'displayTotal')}</span>,
    },
    {
      key: 'status',
      title: t('common.status'),
      render: (row) => <Badge tone={statusTone(row.status)}>{row.status || '—'}</Badge>,
    },
    {
      key: 'payment',
      title: t('admin.paymentStatus'),
      render: (row) => <Badge tone={statusTone(row.paymentStatus)}>{row.paymentStatus || '—'}</Badge>,
    },
    {
      key: 'method',
      title: t('checkout.payment'),
      render: (row) => <span className="capitalize text-muted">{row.paymentMethod || '—'}</span>,
    },
  ];

  const address = detail?.shippingAddress;
  const addressText = address
    ? [
        address.fullName,
        address.addressLine1,
        address.addressLine2,
        [address.city, address.region, address.postalCode].filter(Boolean).join(' '),
        address.country,
      ].filter(Boolean).join(', ')
    : '—';

  const totalRows = [
    [t('common.subtotal'), money(detail, 'subtotal', 'displaySubtotal')],
    [t('common.shipping'), money(detail, 'shipping', 'displayShipping')],
    [t('common.tax'), money(detail, 'tax', 'displayTax')],
    [t('common.discount'), money(detail, 'discount', 'displayDiscount')],
    [t('common.total'), money(detail, 'total', 'displayTotal')],
  ];

  return (
    <div>
      <PageHeader
        title={t('admin.orders')}
        subtitle={t('admin.overview')}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('admin.totalOrders')} value={meta?.total ?? rows.length} icon={ShoppingCart} />
        <StatCard label={t('admin.pendingOrders')} value={rows.filter((r) => r.status === 'Pending').length} tone="gold" />
        <StatCard label={t('admin.payments')} value={rows.filter((r) => r.paymentStatus === 'Paid').length} tone="green" />
      </div>

      <Toolbar
        search={q}
        onSearch={changeFilter(setQ)}
        onRefresh={reload}
      >
        <Select
          className="w-auto min-w-[140px]"
          value={status}
          onChange={(e) => changeFilter(setStatus)(e.target.value)}
          options={[{ value: '', label: `${t('admin.orderStatus')}: ${t('common.all')}` }, ...ORDER_STATUSES]}
        />
        <Select
          className="w-auto min-w-[150px]"
          value={paymentStatus}
          onChange={(e) => changeFilter(setPaymentStatus)(e.target.value)}
          options={[{ value: '', label: `${t('admin.paymentStatus')}: ${t('common.all')}` }, ...PAYMENT_STATUSES]}
        />
        <Select
          className="w-auto min-w-[130px]"
          value={paymentMethod}
          onChange={(e) => changeFilter(setPaymentMethod)(e.target.value)}
          options={[{ value: '', label: `${t('checkout.payment')}: ${t('common.all')}` }, ...PAYMENT_METHODS]}
        />
      </Toolbar>

      <DataTable
        columns={columns}
        rows={rows}
        loading={loading}
        meta={meta}
        onPage={setPage}
        empty={t('admin.noItems')}
        actions={(row) => (
          <IconButton key="view" title={t('common.details')} onClick={() => openDetail(row)}>
            <Eye size={17} />
          </IconButton>
        )}
      />

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={detail?.orderNumber || selected?.orderNumber || t('common.details')}
        wide
      >
        {detailLoading ? (
          <p className="py-10 text-center text-sm text-muted">{t('common.loading')}</p>
        ) : !detail ? (
          <p className="py-10 text-center text-sm text-muted">{t('admin.noItems')}</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info label={t('common.date')} value={formatDate(detail.createdAt, lang, true)} />
              <Info label={t('common.status')} value={<Badge tone={statusTone(detail.status)}>{detail.status}</Badge>} />
              <Info label={t('admin.paymentStatus')} value={<Badge tone={statusTone(detail.paymentStatus)}>{detail.paymentStatus}</Badge>} />
              <Info label={t('checkout.payment')} value={<span className="capitalize">{detail.paymentMethod || '—'}</span>} />
              <Info label={t('admin.customers')} value={[detail.customer?.firstName, detail.customer?.lastName].filter(Boolean).join(' ') || '—'} />
              <Info label={t('common.email')} value={detail.customer?.email || '—'} />
              <Info label={t('common.phone')} value={detail.customer?.phone || '—'} />
              <Info label={t('common.currency')} value={detail.currency || 'MAD'} />
            </div>

            <section>
              <h4 className="mb-3 font-serif text-lg font-semibold">{t('admin.books')}</h4>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-start text-sm">
                  <thead className="border-b border-line bg-sand/50 text-xs text-muted">
                    <tr>
                      <th className="px-3 py-2 text-start">{t('common.name')}</th>
                      <th className="px-3 py-2 text-start">{t('common.quantity')}</th>
                      <th className="px-3 py-2 text-end">{t('common.price')}</th>
                      <th className="px-3 py-2 text-end">{t('common.total')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {(detail.items || []).map((item, index) => (
                      <tr key={item._id || index}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {item.coverImage && <img src={item.coverImage} alt="" className="h-12 w-9 rounded object-cover" />}
                            <div>
                              <p className="text-ink">{localize(item.title, i18n.language) || '—'}</p>
                              {item.authorName && <p className="text-xs text-muted">{item.authorName}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">{item.quantity}</td>
                        <td className="px-3 py-2 text-end">{money(item, 'unitPrice', 'unitDisplayPrice')}</td>
                        <td className="px-3 py-2 text-end font-medium">{money(item, 'lineTotal', 'lineDisplayTotal')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-lg border border-line p-4">
                <h4 className="mb-3 font-serif text-lg font-semibold">{t('cart.orderSummary')}</h4>
                <div className="space-y-1.5 text-sm">
                  {totalRows.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <span className="text-muted">{label}</span>
                      <span className={label === t('common.total') ? 'font-semibold text-ink' : ''}>{value}</span>
                    </div>
                  ))}
                </div>
                {detail.exchangeRate ? (
                  <p className="mt-3 text-xs text-muted">Exchange rate: {detail.exchangeRate}</p>
                ) : null}
              </section>

              <section className="rounded-lg border border-line p-4">
                <h4 className="mb-3 font-serif text-lg font-semibold">{t('checkout.shipping')}</h4>
                <p className="whitespace-pre-line text-sm text-ink">{addressText}</p>
                {detail.notes && <p className="mt-3 text-sm text-muted">Notes: {detail.notes}</p>}
              </section>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {can('orders.manage') && <section>
                <h4 className="mb-3 font-serif text-lg font-semibold">{t('admin.updateStatus')}</h4>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label={t('admin.orderStatus')}
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                    options={ORDER_STATUSES}
                  />
                  <Select
                    label={t('admin.paymentStatus')}
                    value={form.paymentStatus}
                    onChange={(e) => setForm((prev) => ({ ...prev, paymentStatus: e.target.value }))}
                    options={PAYMENT_STATUSES}
                  />
                  <Textarea
                    label="Note"
                    rows={2}
                    className="sm:col-span-2"
                    value={form.note}
                    onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setSelected(null)}>{t('common.close')}</Button>
                  <Button onClick={save} loading={busy}>{t('common.save')}</Button>
                </div>
              </section>}

              <section>
                <h4 className="mb-3 font-serif text-lg font-semibold">Status timeline</h4>
                {(detail.statusLog || []).length ? (
                  <ol className="space-y-3">
                    {detail.statusLog.map((entry, index) => (
                      <li key={index} className="flex gap-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge tone={statusTone(entry.status)}>{entry.status}</Badge>
                            <span className="text-xs text-muted">{formatDate(entry.at, lang, true)}</span>
                          </div>
                          {entry.note && <p className="mt-1 text-xs text-muted">{entry.note}</p>}
                          {entry.changedBy && <p className="mt-0.5 text-[11px] text-muted">by {entry.changedBy}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted">{t('admin.noItems')}</p>
                )}

                {detail.payments?.length ? (
                  <div className="mt-5 border-t border-line pt-4">
                    <h5 className="mb-2 text-sm font-semibold">Payments</h5>
                    <div className="space-y-2">
                      {detail.payments.map((payment, index) => (
                        <div key={payment._id || index} className="flex flex-wrap justify-between gap-2 text-xs">
                          <span className="capitalize">{payment.provider}</span>
                          <span className="text-muted">{formatMoney(payment.amount, payment.currency || detail.currency || 'MAD', lang)}</span>
                          <Badge tone={statusTone(payment.status)}>{payment.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            </div>

            {can('orders.manage') && !FINAL_STATUSES.includes(detail.status) && (
              <section className="rounded-lg border border-red-200 bg-red-50/40 p-4">
                <h4 className="text-sm font-semibold text-red-700">Cancel order</h4>
                <Textarea
                  className="mt-3"
                  label={t('admin.reason')}
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <div className="mt-3 flex justify-end">
                  <Button variant="ghost" className="text-red-600" onClick={() => setCancelOpen(true)}>
                    <XCircle size={15} className="me-1" /> Cancel order
                  </Button>
                </div>
              </section>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={cancel}
        title="Cancel order"
        message={`Cancel order ${detail?.orderNumber || selected?.orderNumber || ''}? This cannot be undone.`}
        loading={busy}
      />
    </div>
  );
}
