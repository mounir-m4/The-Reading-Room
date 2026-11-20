export function slugify(input = '') {
  return String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function uniqueSlug(base, existing = new Set()) {
  const root = slugify(base) || 'item';
  let slug = root;
  let i = 2;
  while (existing.has(slug)) slug = `${root}-${i++}`;
  return slug;
}
