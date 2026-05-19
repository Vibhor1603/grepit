/**
 * Check if an email is from a disposable/temporary email provider.
 * Uses CheckDisposable Email API (https://checkdisposable.email).
 * 
 * Fails open — if the API is down or key is missing, allows the email through.
 * Free tier: 500 checks/month.
 */

export async function isDisposableEmail(email) {
  const key = process.env.CDE_KEY;
  if (!key) return false; // Skip check if not configured

  try {
    const res = await fetch(
      `https://api.checkdisposable.email/v1/check?email=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) return false; // Fail open
    const data = await res.json();
    return data.is_disposable === true;
  } catch {
    return false; // Fail open
  }
}
