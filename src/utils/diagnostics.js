const SENSITIVE_KEY = /password|passwd|token|secret|authorization|cookie|api[_-]?key|credential/i;
const SENSITIVE_ASSIGNMENT =
  /((?:password|passwd|token|secret|authorization|cookie|api[_-]?key|credential)\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;&]+)/gi;

function redactString(value, secrets = []) {
  let redacted = value.replace(SENSITIVE_ASSIGNMENT, '$1[REDACTED]');
  redacted = redacted.replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]');
  for (const secret of secrets.filter(Boolean)) {
    redacted = redacted.split(secret).join('[REDACTED]');
  }
  return redacted;
}

function redactSensitive(value, secrets = []) {
  if (typeof value === 'string') return redactString(value, secrets);
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item, secrets));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactSensitive(item, secrets),
      ]),
    );
  }
  return value;
}

function safeErrorMessage(error, secrets = []) {
  const message = error instanceof Error ? error.message : String(error);
  return redactString(message, secrets);
}

module.exports = { redactSensitive, safeErrorMessage };
