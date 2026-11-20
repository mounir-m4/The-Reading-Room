import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/index.js';
import { errorMessage } from '../../services/api.js';
import { pushToast } from '../../store/toastSlice.js';

export const LANGUAGES = ['en', 'fr', 'ar'];
export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];
export const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Refunded', 'Partially Refunded'];
export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'];

export const emptyLocalized = () => ({ en: '', fr: '', ar: '' });

export function asLocalized(value) {
  if (typeof value === 'string') return { en: value, fr: '', ar: '' };
  return { ...emptyLocalized(), ...(value || {}) };
}

export function localizedText(value, lang = 'en') {
  if (!value) return '—';
  if (typeof value === 'string') return value;
  return value[lang] || value.en || value.fr || value.ar || Object.values(value)[0] || '—';
}

/** Prices are entered in major MAD units in the admin and stored as minor units. */
export const toMinor = (value) => Math.round((Number(value) || 0) * 100);
export const fromMinor = (value) => ((Number(value) || 0) / 100).toFixed(2);

export const commaList = (value) => String(value || '').split(',').map((v) => v.trim()).filter(Boolean);
export const lineList = (value) => String(value || '').split('\n').map((v) => v.trim()).filter(Boolean);
export const idOf = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return value._id ?? value.id ?? '';
  return value;
};

export function formatDate(value, lang = 'en', withTime = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const locale = { en: 'en-US', fr: 'fr-FR', ar: 'ar-MA' }[lang] || 'en-US';
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric', month: 'short', day: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

const TONES = {
  Pending: 'amber', Confirmed: 'blue', Processing: 'blue', Shipped: 'gold',
  Delivered: 'green', Cancelled: 'red', Refunded: 'gray', 'Partially Refunded': 'gold',
  Paid: 'green', Failed: 'red', approved: 'green', pending: 'amber', rejected: 'red',
  succeeded: 'green', refunded: 'gray', active: 'green',
};
export const statusTone = (status) => TONES[status] || 'gray';

/**
 * Loads an admin resource and keeps pagination/filter state in sync.
 * `loader` should be wrapped in useCallback by the caller or be stable enough
 * that only the values in `deps` should trigger a refetch.
 */
export function useAdminList(loader, deps = []) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.resolve(loader())
      .then((res) => {
        if (!active) return;
        setRows(res?.data || []);
        setMeta(res?.meta || null);
      })
      .catch(() => {
        if (!active) return;
        setRows([]);
        setMeta(null);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { rows, setRows, meta, loading, reload };
}

/** True when the signed-in admin holds the permission (super admins always do). */
export function useAdminCan() {
  const admin = useAppSelector((s) => s.auth.user);
  const role = admin?.role || {};
  const permissions = role.permissions || [];
  const isSuper = role.name === 'Super Admin' || role.slug === 'super-admin';
  return (permission) => Boolean(isSuper || !permission || permissions.includes(permission));
}

/** Runs a mutation with a user-facing success/error toast. */
export function useAdminMutation() {
  const dispatch = useAppDispatch();
  return useCallback(async (request, successMessage) => {
    try {
      const result = await request;
      if (successMessage) dispatch(pushToast(successMessage));
      return result;
    } catch (error) {
      dispatch(pushToast(errorMessage(error), 'error'));
      throw error;
    }
  }, [dispatch]);
}

export function idOptions(items, label = 'name', lang = 'en') {
  return (items || []).map((item) => ({
    value: item._id,
    label: localizedText(item[label], lang) || item.name || item.email || item._id,
  }));
}
