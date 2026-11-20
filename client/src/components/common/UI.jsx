import React from 'react';
import { X, AlertCircle, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/index.js';
import { removeToast } from '../../store/toastSlice.js';

export function Button({ variant = 'primary', size = 'md', className = '', loading, children, ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: '', lg: 'px-7 py-3 text-base' };
  return (
    <button
      className={`btn btn-${variant} ${sizes[size] || ''} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export const Input = React.forwardRef(function Input({ label, error, icon: Icon, className = '', ...props }, ref) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted" />}
        <input ref={ref} className={`input ${Icon ? 'ps-10' : ''} ${error ? 'border-red-500' : ''}`} {...props} />
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
});

export const Textarea = React.forwardRef(function Textarea({ label, error, rows = 4, className = '', ...props }, ref) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <textarea ref={ref} rows={rows} className={`input resize-y ${error ? 'border-red-500' : ''}`} {...props} />
      {error && <p className="field-error">{error}</p>}
    </div>
  );
});

export const Select = React.forwardRef(function Select({ label, error, options = [], className = '', ...props }, ref) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <select ref={ref} className={`input ${error ? 'border-red-500' : ''}`} {...props}>
        {options.map((o) => {
          const value = typeof o === 'string' ? o : o.value;
          const text = typeof o === 'string' ? o : o.label;
          return <option key={value} value={value}>{text}</option>;
        })}
      </select>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
});

export const Checkbox = React.forwardRef(function Checkbox({ label, ...props }, ref) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
      <input ref={ref} type="checkbox" className="h-4 w-4 accent-burgundy" {...props} />
      {label}
    </label>
  );
});

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      {label && <span>{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-burgundy' : 'bg-line'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'start-[22px]' : 'start-0.5'}`} />
      </button>
    </label>
  );
}

export function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white shadow-lift ${wide ? 'max-w-4xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-muted hover:bg-sand" aria-label="Close"><X size={20} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, loading }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={title || t('common.confirm')}>
      <p className="text-sm text-muted">{message || t('admin.confirmDelete')}</p>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
        <Button className="bg-red-600 hover:bg-red-700" onClick={onConfirm} loading={loading}>{t('common.delete')}</Button>
      </div>
    </Modal>
  );
}

export function Toaster() {
  const toasts = useAppSelector((s) => s.toast.toasts);
  const dispatch = useAppDispatch();
  React.useEffect(() => {
    if (!toasts.length) return undefined;
    const timer = setTimeout(() => dispatch(removeToast(toasts[0].id)), 3500);
    return () => clearTimeout(timer);
  }, [toasts, dispatch]);
  return (
    <div className="pointer-events-none fixed bottom-5 end-5 z-[200] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-lg border bg-white px-4 py-3 shadow-lift ${toast.type === 'error' ? 'border-red-300' : 'border-line'}`}
        >
          {toast.type === 'error' ? <AlertCircle className="mt-0.5 shrink-0 text-red-500" size={18} /> : <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gold" />}
          <p className="flex-1 text-sm">{toast.message}</p>
          <button onClick={() => dispatch(removeToast(toast.id))} className="text-muted hover:text-ink"><X size={15} /></button>
        </div>
      ))}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

export function BookCardSkeleton() {
  return (
    <div className="card overflow-hidden p-3">
      <Skeleton className="aspect-[3/4] w-full" />
      <Skeleton className="mt-4 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <Skeleton className="mt-4 h-5 w-1/3" />
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white/50 px-6 py-16 text-center">
      <Icon className="mb-4 text-gold" size={40} strokeWidth={1.3} />
      <h3 className="text-xl font-semibold">{title}</h3>
      {subtitle && <p className="mt-2 max-w-md text-sm text-muted">{subtitle}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={AlertCircle}
      title={message || t('common.error')}
      action={onRetry && <Button variant="secondary" onClick={onRetry}>{t('common.refresh')}</Button>}
    />
  );
}

export function Breadcrumbs({ items = [] }) {
  return (
    <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
      <Link to="/" className="hover:text-burgundy">Home</Link>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <ChevronRight className="h-3 w-3 rtl:rotate-180" />
          {item.to ? <Link to={item.to} className="hover:text-burgundy">{item.label}</Link> : <span className="text-ink">{item.label}</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}

export function Pagination({ meta, onPage }) {
  const { t } = useTranslation();
  if (!meta || meta.totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
    const start = Math.max(1, Math.min(meta.page - 2, meta.totalPages - 4));
    return start + i;
  }).filter((p) => p <= meta.totalPages);
  return (
    <div className="mt-10 flex items-center justify-center gap-1.5">
      <button disabled={!meta.hasPrev} onClick={() => onPage(meta.page - 1)} className="btn-ghost px-2 py-2" aria-label={t('common.previous')}>
        <ChevronLeft className="rtl:rotate-180" size={18} />
      </button>
      {pages.map((p) => (
        <button key={p} onClick={() => onPage(p)} className={`h-9 w-9 rounded-md text-sm ${p === meta.page ? 'bg-burgundy text-white' : 'hover:bg-sand'}`}>{p}</button>
      ))}
      <button disabled={!meta.hasNext} onClick={() => onPage(meta.page + 1)} className="btn-ghost px-2 py-2" aria-label={t('common.next')}>
        <ChevronRight className="rtl:rotate-180" size={18} />
      </button>
    </div>
  );
}

export function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Rating({ value = 0, count, size = 14 }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <span className="text-gold" style={{ fontSize: size }}>★</span>
      <span>{Number(value).toFixed(1)}</span>
      {count !== undefined && <span>({count})</span>}
    </span>
  );
}

export function Badge({ children, tone = 'burgundy' }) {
  const tones = {
    burgundy: 'bg-burgundy text-white',
    gold: 'bg-gold text-white',
    green: 'bg-emerald-600 text-white',
    red: 'bg-red-600 text-white',
    gray: 'bg-sand text-ink',
    amber: 'bg-amber-500 text-white',
  };
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${tones[tone] || tones.gray}`}>{children}</span>;
}
