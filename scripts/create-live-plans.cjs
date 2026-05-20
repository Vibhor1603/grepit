/**
 * Run this script to create Razorpay plans in Live mode.
 * 
 * Usage:
 *   RAZORPAY_KEY_ID=rzp_live_xxx RAZORPAY_KEY_SECRET=xxx node scripts/create-live-plans.js
 */

const Razorpay = require('razorpay');

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  console.error('Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables');
  console.error('Example: RAZORPAY_KEY_ID=rzp_live_xxx RAZORPAY_KEY_SECRET=xxx node scripts/create-live-plans.js');
  process.exit(1);
}

const r = new Razorpay({ key_id: keyId, key_secret: keySecret });

async function main() {
  console.log('Creating plans with key:', keyId.slice(0, 12) + '...');

  const basic = await r.plans.create({
    period: 'monthly',
    interval: 1,
    item: {
      name: 'Grepit Basic',
      amount: 1200,
      currency: 'USD',
      description: 'Basic plan - 5 repos, 100 AI queries/day',
    },
  });
  console.log('Basic plan created:', basic.id);

  const pro = await r.plans.create({
    period: 'monthly',
    interval: 1,
    item: {
      name: 'Grepit Pro',
      amount: 3000,
      currency: 'USD',
      description: 'Pro plan - 15 repos, 500 AI queries/day',
    },
  });
  console.log('Pro plan created:', pro.id);

  console.log('\nAdd these to your Vercel production env vars:');
  console.log(`RAZORPAY_BASIC_PLAN_ID=${basic.id}`);
  console.log(`RAZORPAY_PRO_PLAN_ID=${pro.id}`);
}

main().catch(err => {
  console.error('Error:', err?.error?.description || err.message);
  process.exit(1);
});
