const { dayjs, IST } = require('../config/timezone');

function toIstSecondPlus5(source, sourceZone) {
  if (!source) return null;
  const base = sourceZone ? dayjs(source).tz(sourceZone) : dayjs(source);
  return base.tz(IST).add(5, 'second').startOf('second').toDate();
}

function normalize(s) {
  return (s || '').trim().toLowerCase();
}

function buildKey(istDate, productNorm, gunsNorm, price) {
  const ts = dayjs(istDate).tz(IST).format('YYYY-MM-DDTHH:mm:ss');
  return `${ts}|${productNorm}|${gunsNorm}|${Number(price).toFixed(2)}`;
}

module.exports = { toIstSecondPlus5, normalize, buildKey };
