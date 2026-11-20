/**
 * Lightweight NoSQL injection protection: strip keys beginning with `$` or containing `.`
 * from request data. Runs before validation so schemas see clean input.
 */
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.entries(value).reduce((acc, [key, val]) => {
      if (!key.startsWith('$') && !key.includes('.')) acc[key] = clean(val);
      return acc;
    }, {});
  }
  return value;
}

export function mongoSanitize(req, _res, next) {
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  if (req.params) req.params = clean(req.params);
  next();
}
