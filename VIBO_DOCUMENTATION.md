# grepit — Technical Documentation

## Database Schema

### subscriptions (billing state machine)
| Column | Purpose |
|--------|---------|
| entitlement_plan | What the user can access RIGHT NOW (free/starter/pro) |
| entitlement_starts_at | When current access started |
| entitlement_ends_at | When current access expires |
| razorpay_subscription_id | Razorpay sub ID |
| razorpay_status | What Razorpay thinks (active/cancelled/halted) |
| auto_renew | Whether subscription will renew |
| scheduled_change_type | Pending intent (cancel/downgrade/null) |
| scheduled_change_plan | Target plan for scheduled change |
| scheduled_change_at | When to apply the change |

### webhook_events (idempotency)
Stores raw Razorpay webhook payloads. Prevents duplicate processing via unique provider_event_id.

## API Routes

### Razorpay Billing
| Route | Method | Purpose |
|-------|--------|---------|
| /api/razorpay/create-subscription | POST | New subscription (free → paid) |
| /api/razorpay/verify-payment | POST | Verify payment signature, grant entitlement |
| /api/razorpay/change-plan | POST | Upgrade (immediate) or downgrade (deferred) |
| /api/razorpay/cancel-subscription | POST | Schedule cancellation (DB only, no Razorpay call) |
| /api/razorpay/undo-cancel | POST | Clear scheduled change (DB only) |
| /api/razorpay/webhook | POST | Handle Razorpay events (public, no auth) |

## Billing Flows

### Subscribe (free → starter/pro)
1. Frontend calls create-subscription → gets subscription_id
2. Opens Razorpay checkout modal
3. On success, calls verify-payment with signature
4. verify-payment grants entitlement in DB

### Upgrade (starter → pro)
1. Frontend calls change-plan with plan: "pro"
2. Backend calls Razorpay Update Subscription API (schedule_change_at: "now")
3. Razorpay charges prorated difference
4. Backend grants new entitlement immediately

### Downgrade (pro → starter)
1. Frontend calls change-plan with plan: "starter"
2. Backend calls Razorpay Update Subscription API (schedule_change_at: "cycle_end")
3. Backend schedules change in DB
4. On next renewal webhook, new plan is applied

### Cancel
1. Frontend calls cancel-subscription
2. Backend ONLY updates DB (scheduled_change_type: "cancel")
3. Razorpay subscription stays alive (autopay continues)
4. On next renewal webhook, backend cancels on Razorpay and downgrades to free

### Undo Cancel
1. Frontend calls undo-cancel
2. Backend clears scheduled change in DB
3. Nothing changes on Razorpay (it was never cancelled there)
4. Subscription continues as normal

## Environment Variables
```
RAZORPAY_KEY_ID=rzp_test_xxx (test) / rzp_live_xxx (prod)
RAZORPAY_KEY_SECRET=secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=same as RAZORPAY_KEY_ID
RAZORPAY_starter_PLAN_ID=plan_xxx
RAZORPAY_PRO_PLAN_ID=plan_xxx
RAZORPAY_WEBHOOK_SECRET=random hex string
```

## Webhook Events Handled
| Event | Action |
|-------|--------|
| subscription.activated | Grant entitlement |
| subscription.charged | Extend entitlement / apply scheduled changes |
| subscription.halted | Cut access (no grace period) |
| subscription.cancelled | Update razorpay_status |
| subscription.updated | Apply plan change from Razorpay |
| payment.failed | Log only (Razorpay retries) |
