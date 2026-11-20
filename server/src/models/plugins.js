import mongoose from 'mongoose';

const languages = ['en', 'fr', 'ar'];

export const localizedSchema = new mongoose.Schema(
  languages.reduce((acc, lang) => {
    acc[lang] = { type: String, default: '' };
    return acc;
  }, {}),
  { _id: false },
);

export const localized = (extra = {}) =>
  new mongoose.Schema(
    languages.reduce((acc, lang) => {
      acc[lang] = { type: String, default: '' };
      return acc;
    }, extra),
    { _id: false },
  );

export function resolveLocalized(value, lang = 'en') {
  if (!value) return '';
  if (typeof value === 'string') return value;
  const order = [lang, 'en', 'fr', 'ar', ...languages];
  for (const key of order) {
    if (value[key] && String(value[key]).trim()) return value[key];
  }
  return '';
}

export function toJSONPlugin(schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      // Keep `_id` for existing callers while also exposing a string `id`.
      // Removing `_id` here breaks populated relations in admin forms.
      ret.id = ret._id?.toString();
      return ret;
    },
  });
}
