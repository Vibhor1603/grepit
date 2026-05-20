import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/api/auth(.*)',
  '/api/razorpay/webhook(.*)',
  '/api/admin(.*)',
  '/api/share/(.*)',
  '/share/(.*)',
  '/terms',
  '/privacy',
]);

// ── IP-based global rate limit (edge-compatible) ──
// Lightweight sliding window using Upstash REST API directly
// 200 requests per minute per IP across all routes
const IP_LIMIT = 200;
const IP_WINDOW_SEC = 60;

async function checkIpRateLimit(request) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return true; // Skip if not configured (local dev)

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  
  const key = `ip-mw:${ip}`;

  try {
    // INCR + EXPIRE in a pipeline
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, IP_WINDOW_SEC],
      ]),
    });
    const data = await res.json();
    const count = data?.[0]?.result || 0;
    return count <= IP_LIMIT;
  } catch {
    // If Redis is unreachable, fail open
    return true;
  }
}

export default clerkMiddleware(async (auth, request) => {
  // Global IP rate limit on API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const allowed = await checkIpRateLimit(request);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
}, {
  signInUrl: '/sign-in',
  signUpUrl: '/sign-up',
});

export const config = {
  matcher: [
    // Exclude monitoring tunnel route, Next.js internals, and static files
    '/((?!monitoring|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
