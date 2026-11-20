import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity, DollarSign, Download, FileSpreadsheet, FileText, Package,
  ShoppingCart, Ticket, Users,
} from 'lucide-react';
import { PageHeader, StatCard, Toolbar, DataTable } from '../../components/admin/AdminUI.jsx';
import { Button, Input, Select } from '../../components/common/UI.jsx';
import { adminApi } from '../../services/index.js';
import { formatMoney } from '../../utils/currency.js';
import { formatDate, useAdminList, useAdminMutation, useAdminCan } from './adminUtils.js';

const REPORT_TYPES = [
  { value: 'sales', label: 'Sales' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'customers', label: 'Customers' },
  { value: 'coupons', label: 'Coupons' },
];

const PERIODS = [
  { value: 'today', labelKey: 'admin.today' },
  { value: '7d', labelKey: 'admin.last7' },
  { value: '30d', labelKey: 'admin.last30' },
  { value: '90d', labelKey: 'admin.last90' },
  { value: 'year', labelKey: 'admin.year' },
];

const MONEY_KEYS = new Set(['total', 'subtotal', 'revenue', 'price', 'averageOrder']);
const CARD_ICONS = [DollarSign, ShoppingCart, Users, Package, Ticket, Activity];
const CARD_TONES = ['burgundy', 'gold', 'blue', 'green', 'red'];
const REPORT_CURRENCY = 'MAD';

const humanize = (key) => String(key)
  .replace(/[_-]/g, ' ')
  .replace(/([a-z])([A-Z])/g, '$1 $2')
  .replace(/^./, (char) => char.toUpperCase());

function downloadFile(data, filename, mime) {
  const blob = data instanceof Blob ? data : new Blob([data ?? ''], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const mutate = useAdminMutation();
  const lang = i18n.language;

  const [filters, setFilters] = useState({ type: 'sales', period: '30d', from: '', to: '' });
  const [applied, setApplied] = useState(filters);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState('');

  const loadReport = useCallback(() => adminApi.report({
    type: applied.type,
    period: applied.period,
    ...(applied.from ? { from: applied.from } : {}),
    ...(applied.to ? { to: applied.to } : {}),
  }), [applied]);
  const { rows, meta, loading, reload } = useAdminList(loadReport, [applied]);
  const can = useAdminCan();

  const renderCell = (key, value) => {
    if (value === null || value === undefined || value === '') return '—';
    if (MONEY_KEYS.has(key) && typeof value === 'number') {
      return formatMoney(value, REPORT_CURRENCY, lang);
    }
    if (key === 'createdAt' || key === 'date' || key.endsWith('At')) {
      const formatted = formatDate(value, lang, true);
      if (formatted !== '—') return formatted;
    }
    if (typeof value === 'object') {
      try { return JSON.stringify(value); } catch { return String(value); }
    }
    if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no');
    return String(value);
  };

  const keys = useMemo(() => {
    const first = (rows || []).find((row) => row && typeof row === 'object' && !Array.isArray(row));
    return first ? Object.keys(first).slice(0, 8) : [];
  }, [rows]);

  const columns = keys.map((key) => ({
    key,
    title: humanize(key),
    render: (row) => renderCell(key, row?.[key]),
  }));

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter((row) => Object.values(row || {})
      .some((value) => String(value ?? '').toLowerCase().includes(q)));
  }, [rows, search]);

  const totals = meta && typeof meta === 'object' ? meta : {};
  const totalEntries = Object.entries(totals).slice(0, 4);
  const reportTitle = `${t('admin.reports')} — ${applied.type}`;

  const generate = () => setApplied({ ...filters });

  const handleExport = async (kind) => {
    if (!rows || rows.length === 0) return;
    setExporting(kind);
    try {
      if (kind === 'csv') {
        const res = await mutate(adminApi.exportCsv(rows), t('toast.saved'));
        downloadFile(res, `report-${applied.type}.csv`, 'text/csv;charset=utf-8;');
      } else if (kind === 'xlsx') {
        const res = await mutate(adminApi.exportXlsx(rows), t('toast.saved'));
        downloadFile(
          res,
          `report-${applied.type}.xlsx`,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
      } else {
        const res = await mutate(adminApi.exportPdf(rows, reportTitle), t('toast.saved'));
        downloadFile(res, `report-${applied.type}.pdf`, 'application/pdf');
      }
    } catch {
      // Toast is handled by useAdminMutation.
    } finally {
      setExporting('');
    }
  };

  const exportDisabled = loading || !rows || rows.length === 0;

  return (
    <div>
      <PageHeader
        title={t('admin.reports')}
        subtitle="Generate and export store reports"
        actions={can('reports.export') ? (
          <>
            <Button variant="secondary" onClick={() => handleExport('csv')} disabled={exportDisabled} loading={exporting === 'csv'}>
              <FileText size={16} /> {t('admin.exportCsv')}
            </Button>
            <Button variant="secondary" onClick={() => handleExport('xlsx')} disabled={exportDisabled} loading={exporting === 'xlsx'}>
              <FileSpreadsheet size={16} /> {t('admin.exportExcel')}
            </Button>
            <Button variant="secondary" onClick={() => handleExport('pdf')} disabled={exportDisabled} loading={exporting === 'pdf'}>
              <Download size={16} /> {t('admin.exportPdf')}
            </Button>
          </>
        ) : null}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white p-4">
        <Select
          label={t('admin.reportType')}
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          options={REPORT_TYPES}
          className="min-w-[160px]"
        />
        <Select
          label="Period"
          value={filters.period}
          onChange={(e) => setFilters({ ...filters, period: e.target.value })}
          options={PERIODS.map((period) => ({ value: period.value, label: t(period.labelKey) }))}
          className="min-w-[140px]"
        />
        <Input
          label="From"
          type="date"
          value={filters.from}
          onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          className="min-w-[150px]"
        />
        <Input
          label="To"
          type="date"
          value={filters.to}
          onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          className="min-w-[150px]"
        />
        <Button onClick={generate} loading={loading}>{t('admin.generate')}</Button>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {totalEntries.length > 0 ? totalEntries.map(([key, value], index) => (
          <StatCard
            key={key}
            label={humanize(key)}
            value={MONEY_KEYS.has(key) && typeof value === 'number'
              ? formatMoney(value, REPORT_CURRENCY, lang)
              : typeof value === 'number' ? value.toLocaleString(lang) : String(value ?? '—')}
            icon={CARD_ICONS[index % CARD_ICONS.length]}
            tone={CARD_TONES[index % CARD_TONES.length]}
          />
        )) : (
          <StatCard label="Rows" value={rows?.length || 0} icon={Activity} />
        )}
      </div>

      <Toolbar search={search} onSearch={setSearch} onRefresh={reload} />

      <DataTable
        columns={columns}
        rows={visibleRows}
        loading={loading}
        empty={t('admin.noItems')}
      />

      {rows && rows.length === 0 && !loading && (
        <p className="mt-3 text-center text-xs text-muted">
          No data for this report. Try a different type or period.
        </p>
      )}
    </div>
  );
}
