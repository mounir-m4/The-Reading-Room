import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, Clock, History, Layers3 } from 'lucide-react';
import { PageHeader, StatCard, Toolbar, DataTable } from '../../components/admin/AdminUI.jsx';
import { Select, Badge } from '../../components/common/UI.jsx';
import { adminApi } from '../../services/index.js';
import { formatDate, useAdminList } from './adminUtils.js';

const ACTION_TONES = {
  create: 'green', created: 'green',
  update: 'blue', updated: 'blue',
  delete: 'red', deleted: 'red',
  refund: 'red', adjust: 'gold',
  login: 'burgundy', logout: 'gray',
};

const prettyDetails = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

export default function AuditPage() {
  const { t, i18n } = useTranslation();
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const loadAudit = useCallback(() => adminApi.audit({ q, page }), [q, page]);
  const { rows, meta, loading, reload } = useAdminList(loadAudit, [q, page]);

  const modules = useMemo(
    () => [...new Set((rows || []).map((row) => row.module).filter(Boolean))].sort(),
    [rows],
  );
  const actions = useMemo(
    () => [...new Set((rows || []).map((row) => row.action).filter(Boolean))].sort(),
    [rows],
  );

  const visibleRows = useMemo(() => (rows || []).filter((row) => (
    (!moduleFilter || row.module === moduleFilter)
    && (!actionFilter || row.action === actionFilter)
  )), [rows, moduleFilter, actionFilter]);

  const onSearch = (value) => {
    setQ(value);
    setPage(1);
  };

  const columns = [
    {
      key: 'actorName', title: 'Actor',
      render: (row) => <span className="font-medium text-ink">{row.actorName || 'System'}</span>,
    },
    {
      key: 'action', title: 'Action',
      render: (row) => (
        <Badge tone={ACTION_TONES[String(row.action || '').toLowerCase()] || 'gray'}>
          {row.action || '—'}
        </Badge>
      ),
    },
    {
      key: 'module', title: 'Module',
      render: (row) => <Badge tone="gray">{row.module || '—'}</Badge>,
    },
    {
      key: 'targetId', title: 'Target',
      render: (row) => (
        <span dir="ltr" className="font-mono text-xs text-muted">
          {String(row.targetId || '—').slice(0, 14)}
        </span>
      ),
    },
    {
      key: 'details', title: 'Details',
      render: (row) => (
        <pre className="max-w-xs overflow-x-auto whitespace-pre-wrap break-all rounded bg-sand/50 p-2 text-[11px] text-muted">
          {prettyDetails(row.details)}
        </pre>
      ),
    },
    { key: 'ip', title: 'IP', render: (row) => <span dir="ltr">{row.ip || '—'}</span> },
    {
      key: 'createdAt', title: 'Date',
      render: (row) => formatDate(row.createdAt, i18n.language, true),
    },
  ];

  return (
    <div>
      <PageHeader title={t('admin.audit')} subtitle="A chronological record of administrative actions" />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Events" value={meta?.total ?? (rows || []).length} icon={History} />
        <StatCard label="Modules" value={modules.length} icon={Layers3} tone="gold" />
        <StatCard label="Actions" value={actions.length} icon={Activity} tone="blue" />
        <StatCard label="Last event" value={formatDate(rows?.[0]?.createdAt, i18n.language, true)} icon={Clock} tone="green" />
      </div>

      <Toolbar search={q} onSearch={onSearch} onRefresh={reload}>
        <Select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          options={[
            { value: '', label: 'All modules' },
            ...modules.map((module) => ({ value: module, label: module })),
          ]}
          className="min-w-[150px]"
        />
        <Select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          options={[
            { value: '', label: 'All actions' },
            ...actions.map((action) => ({ value: action, label: action })),
          ]}
          className="min-w-[150px]"
        />
      </Toolbar>

      <DataTable
        columns={columns}
        rows={visibleRows}
        loading={loading}
        meta={meta}
        onPage={setPage}
        empty={t('admin.noItems')}
      />
    </div>
  );
}
