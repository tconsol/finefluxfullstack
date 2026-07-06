const env = require('./env');

// Origins may contain a single leading wildcard subdomain, e.g. "https://*.fineflux.com".
const patterns = env.corsOrigins.map((origin) => {
  if (!origin.includes('*')) return origin;
  const escaped = origin.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace('\\*', '[^.]+');
  return new RegExp(`^${escaped}$`);
});

function originCheck(requestOrigin, callback) {
  if (!requestOrigin || !patterns.length) return callback(null, true);
  const allowed = patterns.some((p) => (p instanceof RegExp ? p.test(requestOrigin) : p === requestOrigin));
  callback(null, allowed);
}

module.exports = {
  origin: patterns.length ? originCheck : true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Employee-Id', 'X-Correlation-Id'],
  exposedHeaders: ['X-Correlation-Id']
};
