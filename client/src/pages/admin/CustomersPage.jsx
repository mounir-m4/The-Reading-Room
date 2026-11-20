import React, { useCallback, useState } from 'react';
import { Eye, UserCheck, UserX, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageHeader, StatCard, Toolbar, DataTable, IconButton } from '../../components/admin/AdminUI.jsx';
import { Select, Modal, ConfirmDialog, Badge } from '../../components/common/UI.jsx';
import { adminApi } from '../../services/index.js';
import { formatDate, idOf, statusTone, useAdminList, useAdminMutation, useAdminCan } from './adminUtils.js';
import { formatMoney } from '../../utils/currency.js';
import { localize } from '../../utils/localized.js';

function nameOf(user) {
  if (!user) return '—';
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '—';
}

function Info({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1 break-words text-sm text-ink">{value ?? '—'}</div>
    </div>
  );
}

export default function CustomersPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').split('-')[0];

  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [isActive, setIsActive] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toToggle, setToToggle] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const params = { page };
    if (q) params.q = q;
    if (isActive) params.isActive = isActive;
    return adminApi.customers(params);
  }, [page, q, isActive]);

  const { rows, meta, loading, reload } = useAdminList(load, [page, q, isActive]);
  const mutate = useAdminMutation();
  const can = useAdminCan();

  const money = (order) => {
    const display = order?.displayTotal;
    const hasDisplay = display !== undefined && display !== null && display !== '';
    return formatMoney(
      hasDisplay ? display : order?.total,
      hasDisplay ? (order?.currency || 'MAD') : 'MAD',
      lang,
    );
  };

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    setDetailLoading(true);
    try {
      const res = await adminApi.customer(id);
      setDetail(res?.data || null);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const openDetail = async (row) => {
    setSelected(row);
    setDetail(null);
    await loadDetail(idOf(row));
  };

  const toggleCustomer = async (customer) => {
    if (!customer) return;
    const id = idOf(customer);
    setBusy(true);
    try {
      await mutate(adminApi.toggleCustomer(id, !customer.isActive), t('toast.saved'));
      setToToggle(null);
      if (idOf(selected) === id) await loadDetail(id);
      reload();
    } catch {
      // Error toast is handled by useAdminMutation.
    } finally {
      setBusy(false);
    }
  };

  const columns = [
    {
      key: 'name',
      title: t('common.name'),
      render: (row) => <span className="font-medium text-ink">{nameOf(row)}</span>,
    },
    { key: 'email', title: t('common.email'), render: (row) => row.email || '—' },
    { key: 'phone', title: t('common.phone'), render: (row) => row.phone || '—' },
    {
      key: 'isActive',
      title: t('common.status'),
      render: (row) => <Badge tone={row.isActive ? 'green' : 'gray'}>{row.isActive ? t('common.active') : t('common.inactive')}</Badge>,
    },
    { key: 'orders', title: t('admin.totalOrders'), render: (row) => row.orderCount ?? 0 },
    {
      key: 'spending',
      title: t('account.totalSpent'),
      render: (row) => formatMoney(row.lifetimeSpending, 'MAD', lang),
    },
    { key: 'createdAt', title: t('common.date'), render: (row) => formatDate(row.createdAt, lang) },
  ];

  const user = detail?.user;
  const orders = detail?.orders || [];
  const reviews = detail?.reviews || [];

  return (
    <div>
      <PageHeader title={t('admin.customers')} subtitle={t('admin.overview')} />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('admin.totalCustomers')} value={meta?.total ?? rows.length} icon={Users} />
        <StatCard label={t('common.active')} value={rows.filter((r) => r.isActive).length} tone="green" />
        <StatCard label={t('common.inactive')} value={rows.filter((r) => !r.isActive).length} tone="red" />
      </div>

      <Toolbar
        search={q}
        onSearch={(value) => { setQ(value); setPage(1); }}
        onRefresh={reload}
      >
        <Select
          className="w-auto min-w-[150px]"
          value={isActive}
          onChange={(e) => { setIsActive(e.target.value); setPage(1); }}
          options={[
            { value: '', label: `${t('common.status')}: ${t('common.all')}` },
            { value: 'true', label: t('common.active') },
            { value: 'false', label: t('common.inactive') },
          ]}
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
          <React.Fragment key={idOf(row)}>
            <IconButton title={t('common.details')} onClick={() => openDetail(row)}>
              <Eye size={17} />
            </IconButton>
            {can('customers.manage') && <IconButton
              title={row.isActive ? t('common.inactive') : t('common.active')}
              tone={row.isActive ? 'danger' : 'primary'}
              onClick={() => (row.isActive ? setToToggle(row) : toggleCustomer(row))}
            >
              {row.isActive ? <UserX size={17} /> : <UserCheck size={17} />}
            </IconButton>}
          </React.Fragment>
        )}
      />

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={nameOf(user || selected)}
        wide
      >
        {detailLoading ? (
          <p className="py-10 text-center text-sm text-muted">{t('common.loading')}</p>
        ) : !user ? (
          <p className="py-10 text-center text-sm text-muted">{t('admin.noItems')}</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Info label={t('common.email')} value={user.email} />
              <Info label={t('common.phone')} value={user.phone} />
              <Info
                label={t('common.status')}
                value={<Badge tone={user.isActive ? 'green' : 'gray'}>{user.isActive ? t('common.active') : t('common.inactive')}</Badge>}
              />
              <Info label={t('common.date')} value={formatDate(user.createdAt, lang, true)} />
              <Info label={t('admin.totalOrders')} value={orders.length} />
              <Info label={t('account.totalSpent')} value={formatMoney(user.lifetimeSpending ?? 0, 'MAD', lang)} />
              <Info label="Verification" value={user.isVerified ? 'Verified' : 'Not verified'} />
              <Info label={t('common.language')} value={user.language || '—'} />
            </div>

            <section>
              <h4 className="mb-3 font-serif text-lg font-semibold">{t('account.orders')}</h4>
              {orders.length ? (
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full text-start text-sm">
                    <thead className="border-b border-line bg-sand/50 text-xs text-muted">
                      <tr>
                        <th className="px-3 py-2 text-start">{t('checkout.orderNumber')}</th>
                        <th className="px-3 py-2 text-start">{t('common.date')}</th>
                        <th className="px-3 py-2 text-start">{t('common.status')}</th>
                        <th className="px-3 py-2 text-end">{t('common.total')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {orders.slice(0, 10).map((order, index) => (
                        <tr key={idOf(order) || index}>
                          <td className="px-3 py-2 font-medium">{order.orderNumber || '—'}</td>
                          <td className="px-3 py-2">{formatDate(order.createdAt, lang)}</td>
                          <td className="px-3 py-2"><Badge tone={statusTone(order.status)}>{order.status}</Badge></td>
                          <td className="px-3 py-2 text-end">{money(order)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted">{t('admin.noItems')}</p>
              )}
            </section>

            <section>
              <h4 className="mb-3 font-serif text-lg font-semibold">{t('account.reviews')}</h4>
              {reviews.length ? (
                <div className="space-y-3">
                  {reviews.map((review, index) => (
                    <div key={idOf(review) || index} className="rounded-lg border border-line p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-ink">{localize(review.book?.title, lang) || '—'}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gold">★ {review.rating}</span>
                          <Badge tone={statusTone(review.status)}>{review.status}</Badge>
                        </div>
                      </div>
                      {review.title && <p className="mt-1 text-sm text-ink">{review.title}</p>}
                      {review.comment && <p className="mt-1 line-clamp-2 text-xs text-muted">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">{t('admin.noItems')}</p>
              )}
            </section>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toToggle}
        onClose={() => setToToggle(null)}
        onConfirm={() => toggleCustomer(toToggle)}
        title={toToggle?.isActive ? 'Disable customer' : 'Enable customer'}
        message={toToggle?.isActive
          ? `Disable ${nameOf(toToggle)}? They will not be able to sign in.`
          : `Enable ${nameOf(toToggle)}? They will be able to sign in again.`}
        loading={busy}
      />
    </div>
  );
}
