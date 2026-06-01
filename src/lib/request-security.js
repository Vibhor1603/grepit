const PROMPT_INJECTION_INPUT_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/i,
  /disregard\s+(?:all\s+)?(?:previous|prior|above)\s+instructions?/i,
  /\boverride\b.*\binstructions?\b/i,
  /\bsystem\s+prompt\b/i,
  /\bdeveloper\s+message\b/i,
  /\breveal\b.*\b(prompt|instructions|secret|key|token)\b/i,
  /^\s*(user|assistant|system)\s*:/im,
];

const SQLI_PATTERNS = [
  /\bunion\s+all\s+select\b/i,
  /\bunion\s+select\b/i,
  /\bselect\b[\s\S]*\bfrom\b[\s\S]*\bwhere\b/i,
  /\binsert\s+into\b/i,
  /\bupdate\b[\s\S]*\bset\b/i,
  /\bdelete\s+from\b/i,
  /\bdrop\s+table\b/i,
  /\bor\s+1\s*=\s*1\b/i,
  /['"`]\s*;\s*--/i,
];

export const MAX_QUERY_CHARS = 2_000;
export const MAX_EMAIL_CHARS = 254;
export const MAX_JSON_BODY_BYTES = 32_768;

function hasUnsafeControlChars(value) {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);
}

export function enforceJsonBodySize(headersList, maxBytes = MAX_JSON_BODY_BYTES) {
  const raw = headersList.get("content-length");
  if (!raw) return { ok: true };

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return { ok: true };
  if (parsed <= maxBytes) return { ok: true };

  return {
    ok: false,
    status: 413,
    error: `Payload too large (max ${maxBytes} bytes)`,
  };
}

export function validateUserQueryInput(raw, { maxChars = MAX_QUERY_CHARS } = {}) {
  if (typeof raw !== "string") {
    return { ok: false, status: 400, code: "INVALID_QUERY", error: "query must be a string" };
  }

  const value = raw.trim();
  if (!value) {
    return { ok: false, status: 400, code: "EMPTY_QUERY", error: "query is required and cannot be empty" };
  }
  if (value.length > maxChars) {
    return {
      ok: false,
      status: 400,
      code: "QUERY_TOO_LARGE",
      error: `query too long (max ${maxChars} characters)`,
    };
  }
  if (hasUnsafeControlChars(value)) {
    return {
      ok: false,
      status: 400,
      code: "INVALID_QUERY_CHARS",
      error: "query contains unsupported control characters",
    };
  }

  if (PROMPT_INJECTION_INPUT_PATTERNS.some((pattern) => pattern.test(value))) {
    return {
      ok: false,
      status: 400,
      code: "PROMPT_INJECTION_DETECTED",
      error: "query rejected due to prompt-injection patterns",
    };
  }

  if (SQLI_PATTERNS.some((pattern) => pattern.test(value))) {
    return {
      ok: false,
      status: 400,
      code: "SQLI_PATTERN_DETECTED",
      error: "query rejected due to unsafe SQL-like patterns",
    };
  }

  return { ok: true, value };
}

export function validateEmailInput(raw) {
  if (typeof raw !== "string") {
    return { ok: false, status: 400, error: "Email required" };
  }

  const email = raw.trim().toLowerCase();
  if (!email) {
    return { ok: false, status: 400, error: "Email required" };
  }
  if (email.length > MAX_EMAIL_CHARS) {
    return { ok: false, status: 400, error: "Email is too long" };
  }
  if (hasUnsafeControlChars(email)) {
    return { ok: false, status: 400, error: "Email is invalid" };
  }

  // Pragmatic email check for API gatekeeping before provider-level validation.
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    return { ok: false, status: 400, error: "Email is invalid" };
  }

  return { ok: true, value: email };
}
