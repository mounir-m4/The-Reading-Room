import { ExchangeRate } from '../models/Operations.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Fallback indicative rates: 1 MAD equals ...
const STATIC_RATES = { MAD: 1, EUR: 0.091, USD: 0.10, GBP: 0.079 };
const CACHE_TTL = 6 * 60 * 60 * 1000;

let cache = { rates: null, at: 0 };

export async function getRates({ force = false } = {}) {
  if (!force && cache.rates && Date.now() - cache.at < CACHE_TTL) return cache.rates;

  const stored = await ExchangeRate.findOne().sort({ fetchedAt: -1 });
  if (!force && stored && Date.now() - stored.fetchedAt.getTime() < CACHE_TTL) {
    cache = { rates: stored.rates.toObject ? stored.rates.toObject() : stored.rates, at: stored.fetchedAt.getTime() };
    return cache.rates;
  }

  let rates = STATIC_RATES;
  if (env.fx.provider === 'openaccess' && env.fx.apiKey) {
    try {
      const res = await fetch(`https://api.exchangerate-api.com/v4/latest/MAD`);
      if (res.ok) {
        const json = await res.json();
        rates = { MAD: 1, EUR: json.rates?.EUR, USD: json.rates?.USD, GBP: json.rates?.GBP };
      }
    } catch (error) {
      logger.warn('FX provider failed, using cached/static rates:', error.message);
    }
  }

  rates = Object.fromEntries(
    Object.entries(rates).filter(([, value]) => Number.isFinite(value) && value > 0),
  );
  await ExchangeRate.create({ base: 'MAD', rates, provider: env.fx.provider });
  cache = { rates, at: Date.now() };
  return rates;
}

export async function convertFromBase(amountMinor, currency) {
  if (!currency || currency === 'MAD') return { amount: amountMinor, rate: 1 };
  const rates = await getRates();
  const rate = rates[currency] || 1;
  return { amount: Math.round(amountMinor * rate), rate };
}

export function convertToBase(amountMinor, currency, rate = 1) {
  return Math.round(amountMinor / (rate || 1));
}

/** Price a base-MAD minor amount for display in the requested currency. */
export async function displayPrice(priceMinor, currency) {
  const { amount, rate } = await convertFromBase(priceMinor, currency);
  return { price: amount, compareAtPrice: null, rate, currency };
}
