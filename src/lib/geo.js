/**
 * Geo-detection utility for dual-gateway billing.
 * 
 * Uses Vercel's x-vercel-ip-country header (available on deployed apps).
 * Falls back to "INTERNATIONAL" if header is not present (local dev).
 * 
 * Returns the payment provider to use:
 * - "razorpay" for Indian users (INR checkout)
 * - "lemonsqueezy" for international users (USD checkout)
 */

/**
 * Detect user's country from request headers.
 * @param {Headers|object} headers - Request headers
 * @returns {string} ISO country code (e.g., "IN", "US") or "XX" if unknown
 */
export function getCountryFromHeaders(headers) {
  // Vercel provides this automatically on deployed apps
  const country = headers.get?.("x-vercel-ip-country")
    || headers.get?.("cf-ipcountry") // Cloudflare
    || null;
  return country || "XX";
}

/**
 * Determine which payment provider to use based on user's location.
 * @param {Headers|object} headers - Request headers
 * @returns {"razorpay" | "lemonsqueezy"} Payment provider
 */
export function getPaymentProvider(headers) {
  const country = getCountryFromHeaders(headers);
  
  // In local dev (no geo header), default to Razorpay for testing
  // Set FORCE_PAYMENT_PROVIDER=lemonsqueezy in .env.local to test LS locally
  if (country === "XX") {
    return process.env.FORCE_PAYMENT_PROVIDER || "razorpay";
  }
  
  return country === "IN" ? "razorpay" : "lemonsqueezy";
}

/**
 * Check if user is from India.
 * @param {Headers|object} headers - Request headers
 * @returns {boolean}
 */
export function isIndianUser(headers) {
  return getCountryFromHeaders(headers) === "IN";
}
