const mongoose = require('mongoose');

// At transform time, Decimal128 fields are still live Decimal128 instances (not yet the
// { $numberDecimal: "123" } plain object JSON.stringify later produces by calling their
// own .toJSON()). Java's Jackson flattened BigDecimal to a plain JSON number, and the
// frontend does arithmetic/template-strings directly on these fields (e.g.
// `${tankCapacity} Liters`), so the unconverted value shows up as "[object Object]" / NaN.
// Recursively convert every Decimal128 instance to a plain number.
function unwrapDecimals(value) {
  if (Array.isArray(value)) return value.map(unwrapDecimals);
  if (value instanceof mongoose.Types.Decimal128) return Number(value.toString());
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      value[key] = unwrapDecimals(value[key]);
    }
    return value;
  }
  return value;
}

// Spring/Jackson serialized entities with an "id" field (from Mongo's _id) and no
// internal bookkeeping fields. Mongoose defaults to exposing raw _id/__v, which breaks
// every frontend call site keyed on `.id`. Apply this to every schema so responses
// match what the frontend expects.
function applyJsonTransform(schema, hiddenFields = []) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      delete ret._id;
      delete ret._class; // Spring Data Mongo bookkeeping, still present on rows written by the old Java backend
      for (const field of hiddenFields) delete ret[field];
      unwrapDecimals(ret);
      return ret;
    }
  });
}

module.exports = { applyJsonTransform };
