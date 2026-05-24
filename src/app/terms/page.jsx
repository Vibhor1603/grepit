import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-vb-bg text-vb-ink px-6 md:px-8 py-24 max-w-[720px] mx-auto">
      <Link href="/" className="text-[13px] text-vb-accent hover:underline mb-8 inline-block">&larr; Back to home</Link>

      <h1 className="text-[32px] font-semibold tracking-tight mb-2">Terms of Service</h1>
      <p className="text-[13px] text-vb-ink4 mb-10">Last updated: May 19, 2026</p>

      <p className="text-[14px] text-vb-ink2 leading-relaxed mb-10">
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of grepit (&ldquo;the Service&rdquo;), operated at grepit.co by grepit (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). Please read these Terms carefully before using the Service.
      </p>

      {/* Section 1 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">1. Acceptance of Terms</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          By creating an account, accessing, or using the Service, you agree to be bound by these Terms, our Privacy Policy, and any additional terms referenced herein. If you are using the Service on behalf of an organization, you represent and warrant that you have the authority to bind that organization to these Terms, and &ldquo;you&rdquo; refers to both you individually and the organization. If you do not agree to these Terms, you must not access or use the Service.
        </p>
      </section>

      {/* Section 2 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">2. Description of Service</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          grepit is a software-as-a-service (SaaS) platform that provides AI-powered codebase analysis tools, including but not limited to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li><strong>Codebase Analysis:</strong> Automated analysis of GitHub repositories to generate insights about code quality, structure, patterns, and potential issues.</li>
          <li><strong>AI Chat:</strong> Interactive AI-powered conversations about your codebase, enabling you to ask questions and receive contextual answers.</li>
          <li><strong>Security Audits:</strong> Automated identification of potential security vulnerabilities, dependency risks, and best practice violations.</li>
          <li><strong>Architecture Diagrams:</strong> AI-generated visual representations of your codebase architecture, component relationships, and data flows.</li>
          <li><strong>Reports &amp; Exports:</strong> Downloadable analysis reports in various formats for documentation and team sharing.</li>
        </ul>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mt-3">
          The Service integrates with GitHub via OAuth to access repositories you authorize. Analysis is performed using artificial intelligence models and the results are provided for informational purposes only.
        </p>
      </section>

      {/* Section 3 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">3. Eligibility</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          You must be at least 16 years of age to use the Service. By using the Service, you represent and warrant that you are at least 16 years old and have the legal capacity to enter into these Terms. If you are using the Service on behalf of a company, organization, or other entity, you represent that you have the authority to bind that entity to these Terms. If you do not meet these requirements, you must not access or use the Service.
        </p>
      </section>

      {/* Section 4 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">4. User Accounts</h2>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li><strong>Account Creation:</strong> You must create an account to use the Service. You may register using your email address or through GitHub OAuth.</li>
          <li><strong>Accuracy:</strong> You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate and complete.</li>
          <li><strong>Security:</strong> You are responsible for safeguarding your account credentials and for all activities that occur under your account. You must notify us immediately at <a href="mailto:support@grepit.co" className="text-vb-accent hover:underline">support@grepit.co</a> if you suspect unauthorized access to your account.</li>
          <li><strong>One Account Per Person:</strong> Each individual may maintain only one account. Creating multiple accounts to circumvent usage limits or for any other purpose is prohibited.</li>
          <li><strong>Account Sharing:</strong> You may not share your account credentials with others.</li>
        </ul>
      </section>

      {/* Section 5 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">5. Subscriptions &amp; Billing</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          grepit offers the following subscription tiers:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li><strong>Free Tier:</strong> Limited access to the Service at no cost, subject to the restrictions described in Section 6.</li>
          <li><strong>starter Tier:</strong> Enhanced access with higher usage limits, private repository support, and additional features, billed on a recurring monthly basis.</li>
          <li><strong>Pro Tier:</strong> Multi-user access with expanded limits, priority queue, large codebase support, and advanced features, billed on a recurring monthly basis.</li>
        </ul>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mt-3 mb-2">
          <strong>Billing Terms:</strong>
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li>Paid subscriptions are processed through our payment provider (Dodo Payments). By subscribing, you authorize recurring charges to your payment method at the then-current rate.</li>
          <li>Billing cycles begin on the date of your initial subscription and recur monthly or annually depending on your selected plan.</li>
          <li>All fees are exclusive of applicable taxes, which will be added where required by law.</li>
          <li><strong>Cancellation:</strong> You may cancel your subscription at any time through your account billing portal. Cancellation takes effect at the end of the current billing period. You will retain access to paid features until the end of your paid period.</li>
          <li><strong>No Refunds:</strong> We do not provide refunds for partial billing periods, unused time, or unused features. If you cancel mid-cycle, you will not receive a prorated refund for the remaining days.</li>
          <li><strong>Price Changes:</strong> We may change subscription prices with at least 30 days&apos; prior written notice (via email or in-app notification). Price changes take effect at the start of your next billing cycle following the notice period. If you do not agree to a price change, you may cancel before it takes effect.</li>
          <li><strong>Failed Payments:</strong> If a payment fails, we will attempt to charge your payment method up to 3 additional times over 14 days. If all attempts fail, your subscription will be downgraded to the Free tier.</li>
        </ul>
      </section>

      {/* Section 6 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">6. Free Tier Limitations</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          The Free tier is subject to the following limitations (which may be updated from time to time):
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li>Maximum of 3 connected repositories at any time.</li>
          <li>Maximum of 20 AI queries per day (resets at midnight UTC).</li>
          <li>Access limited to public repositories only.</li>
          <li>starter analysis features only — advanced security audits, architecture diagrams, and export features may be restricted.</li>
          <li>No priority support or guaranteed response times.</li>
        </ul>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mt-3">
          We reserve the right to modify Free tier limitations at any time without prior notice. Attempts to circumvent these limitations (including creating multiple accounts) constitute a violation of these Terms.
        </p>
      </section>

      {/* Section 7 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">7. Acceptable Use</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          You agree not to use the Service to:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li>Analyze repositories containing malware, viruses, or other malicious code with the intent to distribute or weaponize such code.</li>
          <li>Analyze repositories containing illegal content, including but not limited to child exploitation material, content that violates export control laws, or stolen intellectual property.</li>
          <li>Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code, algorithms, or underlying architecture of the Service.</li>
          <li>Scrape, crawl, or use automated means to extract data from the Service beyond what is provided through our intended interfaces.</li>
          <li>Circumvent, disable, or interfere with rate limits, usage quotas, security features, or access controls.</li>
          <li>Use the Service to compete with grepit or to build a substantially similar product or service.</li>
          <li>Impersonate any person or entity, or falsely state or misrepresent your affiliation with any person or entity.</li>
          <li>Transmit spam, chain letters, or other unsolicited communications through the Service.</li>
          <li>Interfere with or disrupt the integrity or performance of the Service or its underlying infrastructure.</li>
          <li>Attempt to gain unauthorized access to the Service, other user accounts, or computer systems or networks connected to the Service.</li>
          <li>Use the Service in any manner that violates applicable local, state, national, or international law or regulation.</li>
        </ul>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mt-3">
          We reserve the right to investigate and take appropriate action against anyone who violates these provisions, including removing content, suspending or terminating accounts, and reporting violations to law enforcement authorities.
        </p>
      </section>

      {/* Section 8 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">8. Intellectual Property</h2>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li><strong>Your Code:</strong> You retain all ownership rights to the source code and repositories you submit for analysis. Nothing in these Terms transfers ownership of your code to us.</li>
          <li><strong>Our Service:</strong> grepit retains all rights, title, and interest in and to the Service, including all software, algorithms, user interfaces, designs, trademarks, service marks, and other intellectual property embodied in or associated with the Service. These Terms do not grant you any right to use our trademarks or branding.</li>
          <li><strong>Generated Reports:</strong> Analysis reports, insights, diagrams, and other outputs generated by the Service based on your code are licensed to you for your personal or internal business use. You may share, distribute, or incorporate these outputs as you see fit. We retain no ownership claim over the content of generated reports specific to your code.</li>
          <li><strong>Feedback:</strong> If you provide feedback, suggestions, or ideas about the Service, you grant us a non-exclusive, royalty-free, perpetual, irrevocable, worldwide license to use, modify, and incorporate such feedback into the Service without obligation to you.</li>
        </ul>
      </section>

      {/* Section 9 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">9. Repository &amp; Code Data</h2>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li><strong>Authorization:</strong> By connecting a repository to the Service, you represent and warrant that you have the legal right and authority to grant us access to that repository and its contents for analysis purposes.</li>
          <li><strong>No Ownership Claim:</strong> We do not claim any ownership rights over your code, repositories, or any intellectual property contained therein.</li>
          <li><strong>Limited License:</strong> You grant us a limited, non-exclusive, revocable license to access, read, and process your repository content solely for the purpose of providing the Service (generating analysis, answering queries, creating diagrams).</li>
          <li><strong>Analysis Results:</strong> The analysis results, reports, and insights generated from your code belong to you. You may use them for any lawful purpose.</li>
          <li><strong>Third-Party Code:</strong> If your repository contains third-party code (open-source dependencies, licensed libraries), you are responsible for ensuring that submitting such code for analysis does not violate any applicable licenses or agreements.</li>
          <li><strong>Organizational Repositories:</strong> If you analyze repositories belonging to an organization, you represent that you have obtained appropriate authorization from the organization to do so.</li>
        </ul>
      </section>

      {/* Section 10 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">10. AI-Generated Content</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          The Service uses artificial intelligence to generate analysis results, insights, and recommendations. You acknowledge and agree that:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li><strong>No Guarantee of Accuracy:</strong> AI-generated content may contain errors, inaccuracies, hallucinations, or omissions. We do not guarantee the accuracy, completeness, or reliability of any AI-generated output.</li>
          <li><strong>Not Professional Advice:</strong> AI-generated analysis does not constitute legal advice, security certification, compliance verification, or professional architectural consultation. You should not rely solely on AI-generated outputs for critical decisions.</li>
          <li><strong>User Responsibility:</strong> You are solely responsible for reviewing, verifying, and validating all AI-generated content before acting on it or incorporating it into your work. Any decisions made based on AI-generated content are made at your own risk.</li>
          <li><strong>Security Findings:</strong> Security audit results are informational only and do not represent a comprehensive security assessment. They should not be treated as a substitute for professional penetration testing or security review.</li>
          <li><strong>No Liability:</strong> We disclaim all liability for any damages, losses, or consequences arising from your reliance on AI-generated content.</li>
        </ul>
      </section>

      {/* Section 11 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">11. API Usage &amp; Rate Limits</h2>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li><strong>Rate Limits:</strong> The Service enforces rate limits based on your subscription tier. These limits are designed to ensure fair usage and service stability for all users.</li>
          <li><strong>Automated Access:</strong> Automated, programmatic, or scripted access to the Service (beyond normal browser usage) requires prior written permission from us. Unauthorized automated access may result in immediate account termination.</li>
          <li><strong>Abuse:</strong> Excessive usage that degrades service quality for other users, repeated rate limit violations, or patterns consistent with abuse may result in temporary throttling, suspension, or permanent termination of your account.</li>
          <li><strong>Fair Use:</strong> Even within stated limits, we reserve the right to throttle or restrict access if your usage pattern is disproportionate or adversely affects other users or system stability.</li>
        </ul>
      </section>

      {/* Section 12 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">12. Availability &amp; Uptime</h2>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li><strong>Best Effort:</strong> We strive to maintain high availability but provide the Service on a &ldquo;best effort&rdquo; basis. We do not guarantee uninterrupted, error-free, or continuous access to the Service.</li>
          <li><strong>No SLA for Free Tier:</strong> Free tier users are not entitled to any service level agreement (SLA) or uptime guarantees.</li>
          <li><strong>Maintenance:</strong> We may perform scheduled or emergency maintenance that temporarily interrupts the Service. We will endeavor to provide advance notice of scheduled maintenance when possible.</li>
          <li><strong>Third-Party Dependencies:</strong> The Service depends on third-party providers (GitHub, AI providers, hosting infrastructure). Outages or degradation of these providers may affect Service availability, and we are not liable for such disruptions.</li>
          <li><strong>Data Availability:</strong> While we maintain regular backups, we do not guarantee against data loss. You are responsible for maintaining your own copies of any critical data.</li>
          <li><strong>Service Discontinuation:</strong> We may discontinue the Service at any time by providing at least 30 days&apos; prior written notice via email to all registered users. Upon discontinuation: (a) no new subscriptions will be accepted; (b) all active subscriptions will be cancelled at the end of the notice period (no further charges); (c) the Service will remain accessible during the notice period so you may export your data; (d) no refunds will be issued for the current billing period. After the notice period, all user data will be deleted in accordance with our Privacy Policy.</li>
        </ul>
      </section>

      {/* Section 13 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">13. Limitation of Liability</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
        </p>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li>THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.</li>
          <li>WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, ERROR-FREE, OR THAT DEFECTS WILL BE CORRECTED. WE DO NOT WARRANT THE ACCURACY OR RELIABILITY OF ANY AI-GENERATED CONTENT.</li>
          <li>IN NO EVENT SHALL VIBO, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATED TO YOUR USE OF OR INABILITY TO USE THE SERVICE.</li>
          <li>OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED US DOLLARS ($100).</li>
          <li>SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN WARRANTIES OR LIABILITY. IN SUCH JURISDICTIONS, OUR LIABILITY SHALL BE LIMITED TO THE MAXIMUM EXTENT PERMITTED BY LAW.</li>
        </ul>
      </section>

      {/* Section 14 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">14. Indemnification</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          You agree to indemnify, defend, and hold harmless grepit, its officers, directors, employees, agents, and affiliates from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising out of or related to: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party rights, including intellectual property rights; (d) your analysis of repositories you did not have authorization to access; or (e) any content or data you submit to the Service. This indemnification obligation survives termination of these Terms and your use of the Service.
        </p>
      </section>

      {/* Section 15 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">15. Termination</h2>
        <ul className="list-disc pl-6 space-y-2 text-[14px] text-vb-ink2 leading-relaxed">
          <li><strong>Termination by You:</strong> You may delete your account at any time through your account settings or by contacting us. Upon deletion, your data will be removed in accordance with our Privacy Policy (within 30 days).</li>
          <li><strong>Termination by Us:</strong> We may suspend or terminate your account immediately, without prior notice or liability, if: (a) you breach any provision of these Terms; (b) your use poses a security risk to the Service or other users; (c) your use may subject us to legal liability; (d) your account has been inactive for more than 12 months on the Free tier; or (e) we are required to do so by law.</li>
          <li><strong>Effect of Termination:</strong> Upon termination, your right to use the Service ceases immediately. We may delete your account data, analysis results, and associated content. Provisions that by their nature should survive termination shall survive, including Sections 8, 10, 13, 14, 16, and 18.</li>
          <li><strong>No Refund on Termination for Cause:</strong> If we terminate your account for violation of these Terms, you are not entitled to any refund of prepaid fees.</li>
        </ul>
      </section>

      {/* Section 16 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">16. Dispute Resolution</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          <strong>Governing Law:</strong> These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions.
        </p>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          <strong>Informal Resolution:</strong> Before initiating any formal dispute resolution, you agree to first contact us at <a href="mailto:support@grepit.co" className="text-vb-accent hover:underline">support@grepit.co</a> and attempt to resolve the dispute informally for at least 30 days.
        </p>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          <strong>Arbitration:</strong> If informal resolution fails, any dispute, controversy, or claim arising out of or relating to these Terms or the Service shall be resolved by binding arbitration in accordance with the Arbitration and Conciliation Act, 1996 of India. The arbitration shall be conducted in English, and the seat of arbitration shall be New Delhi, India. The arbitrator&apos;s decision shall be final and binding.
        </p>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          <strong>Class Action Waiver:</strong> You agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class, consolidated, or representative action.
        </p>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          <strong>Jurisdiction:</strong> Subject to the arbitration clause above, the courts of New Delhi, India shall have exclusive jurisdiction over any disputes arising from these Terms.
        </p>
      </section>

      {/* Section 17 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">17. Severability</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, such provision shall be modified to the minimum extent necessary to make it valid and enforceable, or if modification is not possible, shall be severed from these Terms. The invalidity or unenforceability of any provision shall not affect the validity or enforceability of the remaining provisions, which shall continue in full force and effect.
        </p>
      </section>

      {/* Section 18 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">18. Entire Agreement</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          These Terms, together with our Privacy Policy and any other legal notices or agreements published by us on the Service, constitute the entire agreement between you and grepit regarding your use of the Service. These Terms supersede all prior or contemporaneous communications, proposals, and agreements, whether oral or written, between you and us regarding the Service. No waiver of any provision of these Terms shall be deemed a further or continuing waiver of such provision or any other provision. Our failure to exercise or enforce any right or provision of these Terms shall not constitute a waiver of such right or provision.
        </p>
      </section>

      {/* Section 19 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">19. Changes to Terms</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed">
          We reserve the right to modify these Terms at any time. For material changes (including changes to pricing, liability limitations, or dispute resolution), we will provide at least 30 days&apos; prior notice via email or a prominent notice within the Service. Non-material changes (such as clarifications or formatting updates) may take effect immediately upon posting. Your continued use of the Service after the effective date of any changes constitutes your acceptance of the revised Terms. If you do not agree to the modified Terms, you must stop using the Service and may delete your account.
        </p>
      </section>

      {/* Section 20 */}
      <section className="mb-10">
        <h2 className="text-[18px] font-semibold mb-3">20. Contact</h2>
        <p className="text-[14px] text-vb-ink2 leading-relaxed mb-3">
          If you have questions about these Terms of Service, please contact us:
        </p>
        <ul className="list-none space-y-1 text-[14px] text-vb-ink2 leading-relaxed">
          <li><strong>General:</strong> <a href="mailto:support@grepit.co" className="text-vb-accent hover:underline">support@grepit.co</a></li>
          <li><strong>Legal:</strong> <a href="mailto:support@grepit.co" className="text-vb-accent hover:underline">support@grepit.co</a></li>
          <li><strong>Website:</strong> <a href="https://grepit.co" className="text-vb-accent hover:underline">grepit.co</a></li>
        </ul>
      </section>
    </div>
  );
}
