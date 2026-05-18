import { NextResponse } from "next/server";

/**
 * Allowed origins for CORS.
 */
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://vibo-code-analyst.vercel.app',
  process.env.NEXTAUTH_URL,
].filter(Boolean);

/**
 * Add CORS headers to a response.
 */
export function withCors(response, request) {
  const origin = request?.headers?.get('origin') || '';
  if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

/**
 * Standard error response — never expose internal error details to client.
 */
export function apiError(message, status = 500, details = null) {
  // Map internal errors to user-friendly messages
  const userMessages = {
    'Analysis not found': 'This analysis could not be found.',
    'Access denied': 'You don\'t have access to this resource.',
    'Rate limit exceeded': 'You\'ve hit the rate limit. Please wait a moment.',
    'AI not configured': 'AI service is temporarily unavailable.',
    'Database is not configured': 'Service temporarily unavailable.',
  };

  const safeMessage = userMessages[message] || message;

  if (process.env.NODE_ENV === 'development' && details) {
    console.error(`[API Error] ${message}:`, details);
  }

  return NextResponse.json({ error: safeMessage }, { status });
}

/**
 * Standard success response with minimal payload.
 */
export function apiSuccess(data, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Rate limit error with retry-after header.
 */
export function rateLimitError(resetIn) {
  const seconds = Math.ceil(resetIn / 1000);
  const res = NextResponse.json(
    { error: `Too many requests. Try again in ${seconds}s.`, retryAfter: seconds },
    { status: 429 }
  );
  res.headers.set('Retry-After', String(seconds));
  return res;
}

/**
 * Validate that a string is a valid UUID.
 */
export function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
