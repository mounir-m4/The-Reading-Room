import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Globe2, Share2, Store as StoreIcon } from 'lucide-react';
import { PageHeader, StatCard } from '../../components/admin/AdminUI.jsx';
import { Button, Input, Textarea, Select, Toggle } from '../../components/common/UI.jsx';
import { adminApi, cmsApi } from '../../services/index.js';
import { LANGUAGES, fromMinor, toMinor, useAdminList, useAdminMutation } from './adminUtils.js';

const LANGUAGE_OPTIONS = LANGUAGES.map((lang) => ({
  value: lang,
  label: { en: 'English', fr: 'Français', ar: 'العربية' }[lang] || lang.toUpperCase(),
}));
const CURRENCY_OPTIONS = ['MAD', 'EUR', 'USD', 'GBP'].map((code) => ({ value: code, label: code }));

const LIST_KEYS = new Set(['store.supportedLanguages', 'store.supportedCurrencies']);
const BOOL_KEYS = new Set(['payment.stripeEnabled', 'payment.codEnabled', 'maintenance.enabled']);
const NUMBER_KEYS = new Set(['tax.rate']);
const MONEY_KEYS = new Set(['shipping.defaultPrice']);

const DRAFT_KEYS = [
  'store.name', 'store.description', 'store.email', 'store.phone', 'store.address',
  'store.logo', 'store.favicon', 'store.defaultLanguage', 'store.supportedLanguages',
  'store.defaultCurrency', 'store.supportedCurrencies', 'tax.rate', 'shipping.defaultPrice',
  'payment.stripeEnabled', 'payment.codEnabled', 'maintenance.enabled',
  'social.instagram', 'social.facebook', 'seo.defaultTitle', 'seo.defaultDescription',
];

const splitList = (value) => String(value || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

const buildDraft = (settings = {}) => {
  const get = (key, fallback) => (
    settings && settings[key] !== undefined && settings[key] !== null ? settings[key] : fallback
  );
  const asList = (key, fallback) => {
    const value = get(key, fallback);
    return Array.isArray(value) ? value.join(', ') : String(value || '');
  };
  return {
    'store.name': String(get('store.name', '')),
    'store.description': String(get('store.description', '')),
    'store.email': String(get('store.email', '')),
    'store.phone': String(get('store.phone', '')),
    'store.address': String(get('store.address', '')),
    'store.logo': String(get('store.logo', '')),
    'store.favicon': String(get('store.favicon', '')),
    'store.defaultLanguage': String(get('store.defaultLanguage', 'en')),
    'store.supportedLanguages': asList('store.supportedLanguages', ['en', 'fr', 'ar']),
    'store.defaultCurrency': String(get('store.defaultCurrency', 'MAD')),
    'store.supportedCurrencies': asList('store.supportedCurrencies', ['MAD', 'EUR', 'USD', 'GBP']),
    'tax.rate': Number(get('tax.rate', 0)) || 0,
    'shipping.defaultPrice': fromMinor(get('shipping.defaultPrice', 0)),
    'payment.stripeEnabled': Boolean(get('payment.stripeEnabled', false)),
    'payment.codEnabled': Boolean(get('payment.codEnabled', true)),
    'maintenance.enabled': Boolean(get('maintenance.enabled', false)),
    'social.instagram': String(get('social.instagram', '')),
    'social.facebook': String(get('social.facebook', '')),
    'seo.defaultTitle': String(get('seo.defaultTitle', '')),
    'seo.defaultDescription': String(get('seo.defaultDescription', '')),
  };
};

const normalize = (key, value) => {
  if (LIST_KEYS.has(key)) return splitList(value);
  if (BOOL_KEYS.has(key)) return Boolean(value);
  if (NUMBER_KEYS.has(key)) return Number(value) || 0;
  if (MONEY_KEYS.has(key)) return toMinor(value);
  return typeof value === 'string' ? value.trim() : value ?? '';
};

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const mutate = useAdminMutation();
  const loadSettings = useCallback(() => cmsApi.settings(), []);
  const { rows: settings, loading, reload } = useAdminList(loadSettings, []);
  const [draft, setDraft] = useState(() => buildDraft());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(buildDraft(settings));
  }, [settings]);

  const changedKeys = useMemo(() => {
    const initial = buildDraft(settings);
    return DRAFT_KEYS.filter((key) => (
      JSON.stringify(normalize(key, draft[key])) !== JSON.stringify(normalize(key, initial[key]))
    ));
  }, [draft, settings]);

  const set = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const saveChanges = async () => {
    const payload = {};
    changedKeys.forEach((key) => { payload[key] = normalize(key, draft[key]); });

    setSaving(true);
    try {
      await mutate(adminApi.saveSettings(payload), t('toast.saved'));
      reload();
    } catch {
      // Toast is handled by useAdminMutation.
    } finally {
      setSaving(false);
    }
  };

  const cardClass = 'rounded-xl border border-line bg-white p-5 shadow-soft';
  const gridClass = 'grid gap-4 sm:grid-cols-2';

  return (
    <div>
      <PageHeader
        title={t('admin.settings')}
        subtitle="Configure your store, taxes, payments and integrations"
        actions={(
          <Button onClick={saveChanges} loading={saving} disabled={loading}>
            {t('admin.saveChanges')}
          </Button>
        )}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label={t('admin.storeName')} value={draft['store.name'] || '—'} icon={StoreIcon} />
        <StatCard label={t('admin.defaultLanguage')} value={draft['store.defaultLanguage']?.toUpperCase() || '—'} icon={Globe2} tone="gold" />
        <StatCard label={t('admin.defaultCurrency')} value={draft['store.defaultCurrency'] || '—'} icon={CreditCard} tone="blue" />
      </div>

      {changedKeys.length > 0 && (
        <p className="mb-4 rounded-lg border border-gold/40 bg-gold/10 px-4 py-2 text-xs text-ink">
          {changedKeys.length} unsaved {changedKeys.length === 1 ? 'change' : 'changes'}.
        </p>
      )}

      <div className="space-y-5">
        {/* Store identity */}
        <section className={cardClass}>
          <div className="mb-5 flex items-center gap-2">
            <StoreIcon size={18} className="text-burgundy" />
            <h2 className="font-serif text-lg font-semibold">Store identity</h2>
          </div>
          <div className={gridClass}>
            <Input
              label={t('admin.storeName')}
              value={draft['store.name']}
              onChange={(e) => set('store.name', e.target.value)}
            />
            <Input
              label="Store email"
              type="email"
              value={draft['store.email']}
              onChange={(e) => set('store.email', e.target.value)}
            />
            <Input
              label="Store phone"
              value={draft['store.phone']}
              onChange={(e) => set('store.phone', e.target.value)}
            />
            <Input
              label="Address"
              value={draft['store.address']}
              onChange={(e) => set('store.address', e.target.value)}
            />
            <Textarea
              label="Store description"
              rows={3}
              className="sm:col-span-2"
              value={draft['store.description']}
              onChange={(e) => set('store.description', e.target.value)}
            />
            <Input
              label="Logo URL"
              value={draft['store.logo']}
              onChange={(e) => set('store.logo', e.target.value)}
              placeholder="/uploads/logo.png"
            />
            <Input
              label="Favicon URL"
              value={draft['store.favicon']}
              onChange={(e) => set('store.favicon', e.target.value)}
              placeholder="/uploads/favicon.ico"
            />
          </div>
        </section>

        {/* Localization & tax */}
        <section className={cardClass}>
          <div className="mb-5 flex items-center gap-2">
            <Globe2 size={18} className="text-burgundy" />
            <h2 className="font-serif text-lg font-semibold">Localization &amp; tax</h2>
          </div>
          <div className={gridClass}>
            <Select
              label={t('admin.defaultLanguage')}
              value={draft['store.defaultLanguage']}
              onChange={(e) => set('store.defaultLanguage', e.target.value)}
              options={LANGUAGE_OPTIONS}
            />
            <Input
              label="Supported languages (comma-separated)"
              value={draft['store.supportedLanguages']}
              onChange={(e) => set('store.supportedLanguages', e.target.value)}
              placeholder="en, fr, ar"
            />
            <Select
              label={t('admin.defaultCurrency')}
              value={draft['store.defaultCurrency']}
              onChange={(e) => set('store.defaultCurrency', e.target.value)}
              options={CURRENCY_OPTIONS}
            />
            <Input
              label="Supported currencies (comma-separated)"
              value={draft['store.supportedCurrencies']}
              onChange={(e) => set('store.supportedCurrencies', e.target.value)}
              placeholder="MAD, EUR, USD, GBP"
            />
            <Input
              label={t('admin.taxRate')}
              type="number"
              min="0"
              step="0.01"
              value={draft['tax.rate']}
              onChange={(e) => set('tax.rate', e.target.value)}
            />
          </div>
        </section>

        {/* Payments & maintenance */}
        <section className={cardClass}>
          <div className="mb-5 flex items-center gap-2">
            <CreditCard size={18} className="text-burgundy" />
            <h2 className="font-serif text-lg font-semibold">Payments &amp; maintenance</h2>
          </div>
          <div className={gridClass}>
            <Input
              label="Default shipping price (MAD)"
              type="number"
              min="0"
              step="0.01"
              value={draft['shipping.defaultPrice']}
              onChange={(e) => set('shipping.defaultPrice', e.target.value)}
            />
            <div className="space-y-4 rounded-lg border border-line p-4">
              <Toggle
                label="Stripe enabled"
                checked={Boolean(draft['payment.stripeEnabled'])}
                onChange={(checked) => set('payment.stripeEnabled', checked)}
              />
              <Toggle
                label="Cash on delivery enabled"
                checked={Boolean(draft['payment.codEnabled'])}
                onChange={(checked) => set('payment.codEnabled', checked)}
              />
            </div>
            <div className="rounded-lg border border-line p-4 sm:col-span-2">
              <Toggle
                label={t('admin.maintenance')}
                checked={Boolean(draft['maintenance.enabled'])}
                onChange={(checked) => set('maintenance.enabled', checked)}
              />
              <p className="mt-2 text-xs text-muted">
                When enabled, customers see a maintenance notice instead of the storefront.
              </p>
            </div>
          </div>
        </section>

        {/* Social & SEO */}
        <section className={cardClass}>
          <div className="mb-5 flex items-center gap-2">
            <Share2 size={18} className="text-burgundy" />
            <h2 className="font-serif text-lg font-semibold">{t('admin.socialLinks')} &amp; SEO</h2>
          </div>
          <div className={gridClass}>
            <Input
              label="Instagram"
              value={draft['social.instagram']}
              onChange={(e) => set('social.instagram', e.target.value)}
              placeholder="https://instagram.com/..."
            />
            <Input
              label="Facebook"
              value={draft['social.facebook']}
              onChange={(e) => set('social.facebook', e.target.value)}
              placeholder="https://facebook.com/..."
            />
            <Input
              label="Default SEO title"
              value={draft['seo.defaultTitle']}
              onChange={(e) => set('seo.defaultTitle', e.target.value)}
            />
            <Textarea
              label="Default SEO description"
              rows={3}
              value={draft['seo.defaultDescription']}
              onChange={(e) => set('seo.defaultDescription', e.target.value)}
            />
          </div>
        </section>
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={saveChanges} loading={saving} disabled={loading}>
          {t('admin.saveChanges')}
        </Button>
      </div>
      <p className="mt-3 text-[11px] text-muted">
        Editing locale: {i18n.language}. Values are stored as flat keys and only changed keys are saved.
      </p>
    </div>
  );
}
