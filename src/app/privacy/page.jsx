export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-vb-bg text-vb-ink px-6 md:px-8 py-24 max-w-[720px] mx-auto">
      <h1 className="text-[32px] font-semibold tracking-tight mb-2">Privacy Policy</h1>
      <p className="text-[13px] text-vb-ink4 mb-10">Last updated: {new Date().toISOString().split("T")[0]}</p>

      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">1. Information We Collect</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          We collect information you provide when creating an account, including your email address and name.
          When you analyze a repository, we collect the repository URL and the generated analysis results.
          For paid subscriptions, Stripe processes your payment information — we do not store full payment details.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">2. How We Use Information</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          We use your information to provide and improve the Service, process subscriptions, communicate with you
          about your account, and ensure the security of our platform. Analysis data is used to generate insights
          and is not shared with third parties.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">3. Data Storage and Security</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          Repository analysis results are stored securely in our database. We implement industry-standard security
          measures to protect your data. Analysis data is retained until you delete your account or request removal.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">4. Third-Party Services</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          We use the following third-party services:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1 text-[14px] text-vb-ink2 leading-relaxed">
          <li><strong>Clerk</strong> — authentication and user management</li>
          <li><strong>Stripe</strong> — payment processing</li>
          <li><strong>GitHub API</strong> — repository data access</li>
          <li><strong>Groq / OpenRouter</strong> — AI model inference</li>
          <li><strong>Neon</strong> — database hosting</li>
          <li><strong>Sentry</strong> — error monitoring</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">5. Cookies</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          We use essential cookies for authentication and session management. We do not use tracking cookies
          or third-party advertising cookies.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">6. Your Rights</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          You may request access to, correction of, or deletion of your personal data at any time by contacting us.
          You may also delete your account, which will remove all associated data from our systems within 30 days.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">7. Changes to This Policy</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          We may update this Privacy Policy from time to time. We will notify you of significant changes via email
          or through the Service.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">8. Contact</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          For privacy-related inquiries, contact us at{" "}
          <a href="mailto:hello@vibo.dev" className="text-vb-accent hover:underline">hello@vibo.dev</a>.
        </p>
      </section>
    </div>
  );
}
