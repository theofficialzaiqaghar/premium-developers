class AiProviderError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'AiProviderError';
    this.code = code;
    this.details = details;
  }
}

const CODES = Object.freeze({
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  UNAVAILABLE: 'UNAVAILABLE',
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  TIMEOUT: 'TIMEOUT',
  GENERATION_FAILED: 'GENERATION_FAILED',
  INSUFFICIENT_RESOURCES: 'INSUFFICIENT_RESOURCES'
});

module.exports = { AiProviderError, CODES };
