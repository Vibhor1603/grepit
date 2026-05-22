/**
 * Email notification service using Resend.
 * Free tier: 3000 emails/month, no credit card required.
 * Sign up at resend.com → get API key → add RESEND_API_KEY to env.
 * 
 * Falls back silently if not configured (no errors, just skips).
 */

import * as Sentry from "@sentry/nextjs";
import { Resend } from 'resend';

let _resend = null;

function getResend() {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Grepit <notifications@grepit.co>';

/**
 * Send a plan upgrade confirmation email.
 */
export async function sendPlanUpgradeEmail({ to, name, plan, price }) {
  const resend = getResend();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Welcome to Grepit ${plan} 🎉`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 600; margin: 0;">grep<span style="color: #E0FC10;">it</span></h1>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">You're on ${plan} now!</h2>
          <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Hey ${name || 'there'}, your subscription is active. Here's what you've unlocked:
          </p>
          <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="font-size: 13px; color: #333; margin: 0 0 8px;"><strong>${plan} Plan</strong> — ${price}/month</p>
            <ul style="font-size: 13px; color: #555; padding-left: 16px; margin: 0; line-height: 1.8;">
              ${plan === 'Team' ? `
                <li>1,000 AI queries/day</li>
                <li>100 repositories</li>
                <li>Priority analysis queue</li>
                <li>Large codebase support</li>
              ` : `
                <li>150 AI queries/day</li>
                <li>15 repositories</li>
                <li>PDF export</li>
                <li>Private repositories</li>
              `}
            </ul>
          </div>
          <p style="color: #555; font-size: 13px; line-height: 1.6;">
            Manage your subscription anytime from your <a href="https://grepit.co/profile" style="color: #E0FC10; text-decoration: none; font-weight: 500;">profile page</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="color: #999; font-size: 11px; text-align: center;">Grepit — Understand any codebase instantly.</p>
        </div>
      `,
    });
  } catch (err) {
    Sentry.captureException(err, {
      level: "warning",
      tags: { source: "email", emailType: "upgrade" },
      extra: { to, plan },
    });
    console.warn('[email] Failed to send upgrade email:', err.message);
  }
}

/**
 * Send a plan downgrade/cancellation email.
 */
export async function sendPlanDowngradeEmail({ to, name, previousPlan }) {
  const resend = getResend();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Your Grepit ${previousPlan} subscription has ended`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 600; margin: 0;">grep<span style="color: #E0FC10;">it</span></h1>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Subscription ended</h2>
          <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Hey ${name || 'there'}, your ${previousPlan} subscription has been cancelled. You're now on the Free plan.
          </p>
          <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
            <p style="font-size: 13px; color: #333; margin: 0 0 8px;"><strong>Free Plan</strong></p>
            <ul style="font-size: 13px; color: #555; padding-left: 16px; margin: 0; line-height: 1.8;">
              <li>3 public repositories</li>
              <li>20 AI queries/day</li>
              <li>starter health report</li>
            </ul>
          </div>
          <p style="color: #555; font-size: 13px; line-height: 1.6;">
            Your existing analyses are still accessible. You can <a href="https://grepit.co/?scrollTo=pricing" style="color: #E0FC10; text-decoration: none; font-weight: 500;">resubscribe anytime</a>.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="color: #999; font-size: 11px; text-align: center;">Grepit — Understand any codebase instantly.</p>
        </div>
      `,
    });
  } catch (err) {
    Sentry.captureException(err, {
      level: "warning",
      tags: { source: "email", emailType: "downgrade" },
      extra: { to, previousPlan },
    });
    console.warn('[email] Failed to send downgrade email:', err.message);
  }
}

/**
 * Send a payment failed notification.
 */
export async function sendPaymentFailedEmail({ to, name, plan }) {
  const resend = getResend();
  if (!resend) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Action needed: Payment failed for Grepit ${plan}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 600; margin: 0;">grep<span style="color: #E0FC10;">it</span></h1>
          </div>
          <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">Payment failed</h2>
          <p style="color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Hey ${name || 'there'}, we couldn't process your payment for the ${plan} plan. Please update your payment method to keep your subscription active.
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="https://grepit.co/profile" style="display: inline-block; background: #E0FC10; color: #0a0a0c; padding: 12px 24px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none;">
              Update payment method
            </a>
          </div>
          <p style="color: #999; font-size: 12px; line-height: 1.6;">
            If payment isn't resolved within 3 days, your subscription will be cancelled and you'll be moved to the Free plan.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="color: #999; font-size: 11px; text-align: center;">Grepit — Understand any codebase instantly.</p>
        </div>
      `,
    });
  } catch (err) {
    Sentry.captureException(err, {
      level: "warning",
      tags: { source: "email", emailType: "payment_failed" },
      extra: { to, plan },
    });
    console.warn('[email] Failed to send payment failed email:', err.message);
  }
}
