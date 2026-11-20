import React from 'react';
import { Search, Plus, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Skeleton, Pagination, EmptyState, Button } from '../common/UI.jsx';

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="font-serif text-3xl font-semibold text-ink">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}</div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'burgundy', hint }) {
  const tones = {
    burgundy: 'bg-burgundy/10 text-burgundy', gold: 'bg-gold/15 text-gold',
    green: 'bg-emerald-100 text-emerald-700', red: 'bg-red-100 text-red-600', blue: 'bg-blue-100 text-blue-700',
  };
  return (
    <div className="rounded-xl border border-line bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div><p className="text-xs font-medium text-muted">{label}</p><p className="mt-2 text-2xl font-semibold text-ink">{value ?? '—'}</p></div>
        {Icon && <span className={`rounded-lg p-2.5 ${tones[tone]}`}><Icon size={19} /></span>}
      </div>
      {hint && <p className="mt-3 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

export function Toolbar({ search, onSearch, onRefresh, onAdd, addLabel, children }) {
  const { t } = useTranslation();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1 sm:max-w-sm">
        <Search className="absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted" />
        <input value={search || ''} onChange={(e) => onSearch?.(e.target.value)} placeholder={t('admin.searchPlaceholder')} className="input ps-9 text-sm" />
      </div>
      {children}
      {onRefresh && <button onClick={onRefresh} className="btn-secondary px-3 py-2"><RefreshCw size={16} /></button>}
      {onAdd && <Button onClick={onAdd} className="py-2"><Plus size={16} /> {addLabel}</Button>}
    </div>
  );
}

export function DataTable({ columns = [], rows = [], loading, meta, onPage, empty, actions, actionsTitle = 'Actions' }) {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-start text-sm">
          <thead className="border-b border-line bg-sand/50 text-xs uppercase tracking-wider text-muted">
            <tr>{columns.map((c) => <th key={c.key} className="whitespace-nowrap px-4 py-3 text-start font-semibold">{c.title}</th>)}{actions && <th className="px-4 py-3 text-end">{actionsTitle}</th>}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading ? Array.from({ length: 6 }).map((_, i) => (
              <tr key={i}>{[...columns, ...(actions ? [{}] : [])].map((c, j) => <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>)}</tr>
            )) : rows.length === 0 ? (
              <tr><td colSpan={columns.length + (actions ? 1 : 0)} className="py-14"><EmptyState title={empty || 'No items found'} /></td></tr>
            ) : rows.map((row, i) => (
              <tr key={row._id || i} className="hover:bg-sand/30">
                {columns.map((c) => <td key={c.key} className="whitespace-nowrap px-4 py-3">{c.render ? c.render(row) : row[c.key] ?? '—'}</td>)}
                {actions && <td className="px-4 py-3"><div className="flex justify-end gap-1">{actions(row)}</div></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {meta && <div className="border-t border-line px-4 py-3"><Pagination meta={meta} onPage={onPage} /></div>}
    </div>
  );
}

export function IconButton({ children, title, onClick, tone = 'default' }) {
  const tones = { default: 'text-muted hover:bg-sand hover:text-ink', danger: 'text-muted hover:bg-red-50 hover:text-red-600', primary: 'text-burgundy hover:bg-burgundy/10' };
  return <button title={title} onClick={onClick} className={`rounded-md p-2 transition ${tones[tone]}`}>{children}</button>;
}
