import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock environment variables
process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/grepit_test";
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_placeholder";
process.env.CLERK_SECRET_KEY = "sk_test_placeholder";
process.env.GROQ_API_KEY = "gsk_test_placeholder";
process.env.ADMIN_SECRET = "test-admin-secret";
// process.env.UPSTASH_REDIS_REST_URL = "http://localhost:6379";
// process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams('id=test-id'),
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

// Mock @clerk/nextjs
vi.mock('@clerk/nextjs', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: 'test-user-123' })),
  currentUser: vi.fn(() => Promise.resolve({ id: 'test-user-123', emailAddresses: [{ emailAddress: 'test@example.com' }] })),
  clerkClient: {
    users: {
      getUser: vi.fn(),
      updateUser: vi.fn(),
    }
  },
  ClerkProvider: ({ children }) => children,
  SignIn: () => null,
  SignUp: () => null,
  UserButton: () => null,
}));

// Mock @sentry/nextjs
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  init: vi.fn(),
  withSentryConfig: (config) => config,
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock @upstash/redis
vi.mock('@upstash/redis', () => {
  const Redis = vi.fn();
  Redis.prototype.get = vi.fn();
  Redis.prototype.set = vi.fn();
  Redis.prototype.incr = vi.fn();
  Redis.prototype.expire = vi.fn();
  return { Redis };
});

// Mock @upstash/ratelimit
vi.mock('@upstash/ratelimit', () => {
  const Ratelimit = vi.fn();
  Ratelimit.prototype.limit = vi.fn().mockResolvedValue({ success: true, remaining: 10, reset: Date.now() + 1000 });
  Ratelimit.slidingWindow = vi.fn();
  Ratelimit.fixedWindow = vi.fn();
  return { Ratelimit };
});

// Mock fetch globally
global.fetch = vi.fn();

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
