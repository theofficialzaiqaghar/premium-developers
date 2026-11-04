class BlogError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'BlogError';
    this.code = code;
    this.details = details || undefined;
  }
}

const CODES = Object.freeze({
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  VALIDATION: 'VALIDATION',
  SLUG_EXISTS: 'SLUG_EXISTS',
  SLUG_CONFLICT: 'SLUG_CONFLICT',
  NOT_FOUND: 'NOT_FOUND',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  REDIS: 'REDIS',
  BACKUP_INVALID: 'BACKUP_INVALID',
  IMPORT_CONFLICT: 'IMPORT_CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CSRF_INVALID: 'CSRF_INVALID',
  RATE_LIMITED: 'RATE_LIMITED'
});

module.exports = { BlogError, CODES };
