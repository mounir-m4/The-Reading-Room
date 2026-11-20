// Monetary amounts are integer minor units of the base currency (MAD).
export const CURRENCIES = {
  MAD: { code: 'MAD', symbol: 'د.م.', decimals: 2, locale: 'fr-MA' },
  EUR: { code: 'EUR', symbol: '€', decimals: 2, locale: 'fr-FR' },
  USD: { code: 'USD', symbol: '$', decimals: 2, locale: 'en-US' },
  GBP: { code: 'GBP', symbol: '£', decimals: 2, locale: 'en-GB' },
};

export function toMinor(major) {
  return Math.round(Number(major) * 100);
}

export function fromMinor(minor) {
  return (Number(minor) || 0) / 100;
}

export function formatMoney(minor, currency = 'MAD', locale) {
  const cfg = CURRENCIES[currency] || CURRENCIES.MAD;
  return new Intl.NumberFormat(locale || cfg.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: cfg.decimals,
  }).format(fromMinor(minor));
}
