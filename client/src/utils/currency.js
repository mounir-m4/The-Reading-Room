import { CURRENCIES } from './money.js';

export function formatMoney(minor = 0, currency = 'MAD', lang = 'en') {
  const cfg = CURRENCIES[currency] || CURRENCIES.MAD;
  const localeMap = { en: 'en-US', fr: 'fr-FR', ar: 'ar-MA' };
  try {
    return new Intl.NumberFormat(localeMap[lang] || cfg.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: cfg.decimals,
      maximumFractionDigits: cfg.decimals,
    }).format((Number(minor) || 0) / 100);
  } catch {
    return `${((Number(minor) || 0) / 100).toFixed(2)} ${currency}`;
  }
}

export function priceOf(book) {
  if (!book) return 0;
  return book.effectivePrice ?? (book.discountPercent ? Math.round(book.price * (1 - book.discountPercent / 100)) : book.price);
}
