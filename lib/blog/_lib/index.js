/** Blog CMS storage layer (Phase 2). HTTP routes arrive in Phase 3. */
const constants = require('./constants');
const keys = require('./keys');
const { BlogError, CODES } = require('./errors');
const redis = require('./redis');
const validate = require('./validate');
const store = require('./store');
const backup = require('./backup');

module.exports = {
  ...constants,
  keys,
  BlogError,
  CODES,
  ...redis,
  ...validate,
  ...store,
  ...backup
};
