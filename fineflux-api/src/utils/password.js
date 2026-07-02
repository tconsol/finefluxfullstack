const bcrypt = require('bcryptjs');

// Spring Security's DelegatingPasswordEncoder stores hashes as "{bcrypt}$2a$10$...".
// bcryptjs can't parse the scheme prefix, so strip it before comparing.
function stripEncoderPrefix(hash) {
  return (hash || '').replace(/^\{[^}]*\}/, '');
}

async function comparePassword(plain, storedHash) {
  return bcrypt.compare(plain, stripEncoderPrefix(storedHash));
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

module.exports = { comparePassword, hashPassword, stripEncoderPrefix };
