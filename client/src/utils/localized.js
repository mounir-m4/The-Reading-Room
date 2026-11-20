export function localize(value, lang = 'en') {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[lang] || value.en || value.fr || value.ar || Object.values(value)[0] || '';
}
