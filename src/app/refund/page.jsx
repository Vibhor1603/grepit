import Link from "next/link";

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-vb-bg text-vb-ink px-6 md:px-8 py-24 max-w-[720px] mx-auto">
      <Link href="/" className="text-[13px] text-vb-accent hover:underline mb-8 inline-block">&larr; Back to home</Link>

      <h1 className="text-[32px] font-semibold tracking-tight mb-2">Refund Policy</h1>
      <p className="text-[13px] text-vb-ink4 mb-10">Last updated: May 21, 2026</p>

      <p className="text-[14px] text-vb-ink2 leading-relaxed mb-10">
        This Refund Policy outlines the terms under which refunds may be issued for paid subscriptions to Grepit (&ldquo;the Service&rdquo;), operated at grepit.co. By subscribing to a paid plan, you agree to the terms described below.
      </p>

      {/* Section 1 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">1. General Policy</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          All paid subscriptions to Grepit — including Basic ($12/mo, 3 repositories) and Pro ($30/mo, 7 repositories) — are billed on a recurring monthly basis. We do not provide refunds for:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li>Partial billing periods or unused days remaining in a billing cycle.</li>
          <li>Unused features, AI queries, or repository slots.</li>
          <li>Periods during which you chose not to use the Service.</li>
        </ul>
      </section>

      {/* Section 2 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">2. Exceptions</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          We may issue a refund under the following limited circumstances:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li><strong>First Subscription — 48-Hour Window:</strong> If you subscribe to a paid plan for the first time and the Service does not work as described (e.g., core features are non-functional, analysis fails to generate results), you may request a full refund within 48 hours of your initial subscription payment.</li>
          <li><strong>Duplicate Charges:</strong> If you are charged more than once for the same billing period due to a technical error, we will refund the duplicate charge.</li>
          <li><strong>Service Outage:</strong> In rare cases of extended, unscheduled downtime (exceeding 72 consecutive hours) that prevents you from using the Service entirely, we may issue a prorated credit at our discretion.</li>
        </ul>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mt-3">
          Refund eligibility is determined at our sole discretion. Disagreement with AI-generated analysis results, subjective dissatisfaction with output quality, or failure to use the Service does not constitute grounds for a refund.
        </p>
      </section>

      {/* Section 3 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">3. How to Request a Refund</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          To request a refund, send an email to <a href="mailto:support@grepit.co" className="text-vb-accent hover:underline">support@grepit.co</a> with the following:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li><strong>Subject Line:</strong> &ldquo;Refund Request&rdquo;</li>
          <li>Your registered email address.</li>
          <li>Date of the charge you are disputing.</li>
          <li>A brief description of why you are requesting a refund.</li>
          <li>Any relevant screenshots or error details (if applicable).</li>
        </ul>
      </section>

      {/* Section 4 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">4. Processing Time</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          Once a refund is approved, it will be processed within 5–10 business days. The refund will be credited to your original payment method. Depending on your bank or payment provider, it may take an additional 3–5 business days for the refund to appear in your account.
        </p>
      </section>

      {/* Section 5 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">5. Cancellation vs. Refund</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          Cancellation and refunds are separate actions:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li><strong>Cancellation:</strong> You may cancel your subscription at any time from your Profile page. When you cancel, you retain access to paid features until the end of your current billing period. No prorated refund is issued for the remaining days.</li>
          <li><strong>Refund:</strong> A refund reverses a charge and is only issued under the exceptions described in Section 2 above.</li>
        </ul>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mt-3">
          If you cancel mid-cycle, your subscription remains active until the period ends. You will not be charged again after cancellation.
        </p>
      </section>

      {/* Section 6 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">6. Upgrades</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          When you upgrade from one plan to another (e.g., Basic to Pro), you are charged a prorated amount for the remainder of your current billing cycle. These prorated upgrade charges are non-refundable. If you wish to downgrade after upgrading, the downgrade will take effect at the start of your next billing cycle — no refund is issued for the prorated upgrade charge already paid.
        </p>
      </section>

      {/* Section 7 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">7. Downgrades</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          When you downgrade your plan (e.g., Pro to Basic, or any paid plan to Free), no refund is issued for the price difference between your current plan and the lower plan. The downgrade takes effect at the start of your next billing cycle. You retain access to your current plan&apos;s features until the end of the current period.
        </p>
      </section>

      {/* Section 8 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">8. Chargebacks</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          If you believe a charge is incorrect or unauthorized, we strongly encourage you to contact us at <a href="mailto:support@grepit.co" className="text-vb-accent hover:underline">support@grepit.co</a> before initiating a chargeback or dispute with your bank or payment provider.
        </p>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          Filing a chargeback without first contacting us may result in immediate suspension of your account pending investigation. We are committed to resolving billing issues quickly and fairly — in most cases, reaching out to our support team will resolve the matter faster than a formal dispute process.
        </p>
      </section>

      {/* Section 9 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">9. Contact</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          If you have questions about this Refund Policy or need assistance with a billing issue, please contact us:
        </p>
        <ul className="list-none space-y-1 text-[14px] text-vb-ink2 leading-relaxed">
          <li><strong>Email:</strong> <a href="mailto:support@grepit.co" className="text-vb-accent hover:underline">support@grepit.co</a></li>
          <li><strong>Subject:</strong> &ldquo;Refund Request&rdquo; or &ldquo;Billing Inquiry&rdquo;</li>
          <li><strong>Website:</strong> <a href="https://grepit.co" className="text-vb-accent hover:underline">grepit.co</a></li>
        </ul>
      </section>
    </div>
  );
}
