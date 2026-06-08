import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isInternalAdminEnabled } from './lib/internal-admin-gate';

const isInternalAdminRoute = createRouteMatcher([
  '/internal-admin(.*)',
  '/api/internal/admin(.*)',
]);

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/sso-callback(.*)',
  '/api/auth(.*)',
  '/api/dodo/webhook(.*)',
  '/api/admin(.*)',
  '/api/share/(.*)',
  '/share/(.*)',
  '/terms',
  '/privacy',
  '/refund',
  '/faq',
  '/sitemap.xml',
  '/robots.txt',
  '/internal-admin(.*)',
  '/api/internal/admin(.*)',
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
  const host = request.headers.get('host');
  const isProduction = process.env.VERCEL_ENV === 'production';
  const isCanonical = host === 'grepit.co';
  const isVercel = host?.includes('.vercel.app');

  // 1. ── Canonical Domain Enforcement ──
  // Redirect non-canonical production traffic to grepit.co
  if (isProduction && !isCanonical && !isVercel && host !== 'localhost:3000') {
    const url = request.nextUrl.clone();
    url.host = 'grepit.co';
    url.protocol = 'https:';
    return NextResponse.redirect(url, 301);
  }

  // 2. ── Internal Admin Gate ──
  if (isInternalAdminRoute(request) && !isInternalAdminEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  // 3. ── API Rate Limiting ──
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const allowed = await checkIpRateLimit(request);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }
  }

  // 4. ── Clerk Auth Protection ──
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // 5. ── SEO & Robots Headers ──
  const response = NextResponse.next();
  
  // Prevent indexing of preview deployments, staging, or non-production environments
  if (!isProduction || !isCanonical || isVercel) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, nosnippet, noarchive');
  }

  // Canonical host enforcement header
  if (isProduction && isCanonical) {
    response.headers.set('Link', '<https://grepit.co' + request.nextUrl.pathname + '>; rel="canonical"');
  }

  return response;
}, {
  signInUrl: '/sign-in',
  signUpUrl: '/sign-up',
});

export const config = {
  matcher: [
    // Clerk proxy path for production vercel.app domain
    '/__clerk/(.*)',
    // Exclude monitoring tunnel route, Next.js internals, and static files
    '/((?!monitoring|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|xml|txt)).*)',
    '/(api|trpc)(.*)',
  ],
};
