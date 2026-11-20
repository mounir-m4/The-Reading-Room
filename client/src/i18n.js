import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en/translation.json';
import fr from './locales/fr/translation.json';
import ar from './locales/ar/translation.json';

const resources = { en: { translation: en }, fr: { translation: fr }, ar: { translation: ar } };

export const LANGUAGE_NAMES = { en: 'English', fr: 'Français', ar: 'العربية' };

export function applyDirection(lang) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
  document.body.dataset.dir = dir;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr', 'ar'],
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'], lookupLocalStorage: 'bookstore_lang' },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

applyDirection(i18n.resolvedLanguage || i18n.language || 'en');
i18n.on('languageChanged', applyDirection);

export default i18n;
