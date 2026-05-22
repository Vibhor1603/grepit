"use client";

import { useState } from "react";
import Link from "next/link";

const faqs = [
  {
    question: "What is grepit?",
    answer:
      "grepit is an AI-powered codebase analysis platform. Paste a GitHub repository URL, and get architecture diagrams, security audit reports, code quality insights, and an AI chat that understands your entire codebase. It works with both public and private repositories.",
  },
  {
    question: "Is my code stored?",
    answer:
      "No. We process your code to generate analysis results (summaries, diagrams, security findings) but do not permanently store raw source code. Code is fetched from GitHub, analyzed, and discarded. Only the generated insights are retained. Temporary caches are purged within 24 hours.",
  },
  {
    question: "Does it work with private repos?",
    answer:
      "Yes. Connect your GitHub account from the Profile page to grant grepit access to your private repositories. We request only the minimum permissions necessary to read repository content for analysis. You can revoke access at any time from your GitHub settings.",
  },
  {
    question: "What languages are supported?",
    answer:
      "grepit supports all major programming languages. Our parser handles 40+ file types including JavaScript, TypeScript, Python, Java, Go, Rust, C/C++, Ruby, PHP, Swift, Kotlin, and more. The AI analysis works with any language that appears in your repository.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "Go to Profile → Cancel. Your subscription will be cancelled immediately, but you retain access to all paid features until the end of your current billing period. You will not be charged again after cancellation.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "Refunds may be issued within 48 hours of your first subscription if the Service does not work as described (e.g., core features are non-functional). After that window, we do not provide refunds for partial billing periods or unused time. See our Refund Policy for full details.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept credit/debit cards, UPI, and netbanking via Dodo Payments. All payments are processed securely through Dodo's payment infrastructure.",
  },
  {
    question: "Is there a free plan?",
    answer:
      "Yes. The Free plan includes 1 repository with 15 AI queries per day. It's a great way to try grepit before committing to a paid plan. No credit card is required to get started.",
  },
  {
    question: "Can I upgrade or downgrade anytime?",
    answer:
      "Yes. Upgrades take effect immediately — you'll be charged a prorated amount for the remainder of your current billing cycle. Downgrades take effect at the start of your next billing cycle, so you keep access to your current plan's features until then.",
  },
  {
    question: "How secure is my data?",
    answer:
      "We use encryption in transit (TLS 1.2+) for all communications, do not permanently store raw source code, and follow security best practices including access controls and encrypted databases. Our infrastructure providers maintain SOC 2 compliance. See our Privacy Policy for full details.",
  },
 
];

function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="border-b border-white/[0.06]">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-5 text-left cursor-pointer"
      >
        <span className="text-[15px] font-medium text-vb-ink pr-4">{question}</span>
        <span className="text-vb-ink4 text-[20px] shrink-0 leading-none select-none">
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen && (
        <p className="text-[14px] text-vb-ink2 leading-relaxed pb-5 pr-8">
          {answer}
        </p>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState(null);

  const handleToggle = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-vb-bg text-vb-ink px-6 md:px-8 py-24 max-w-[720px] mx-auto">
      <Link href="/" className="text-[13px] text-vb-accent hover:underline mb-8 inline-block">&larr; Back to home</Link>

      <h1 className="text-[32px] font-semibold tracking-tight mb-2">Frequently Asked Questions</h1>
      <p className="text-[14px] text-vb-ink2 leading-relaxed mb-10">
        Everything you need to know about grepit. Can&apos;t find what you&apos;re looking for? Reach out to us at{" "}
        <a href="mailto:support@grepit.co" className="text-vb-accent hover:underline">support@grepit.co</a>.
      </p>

      <div className="border-t border-white/[0.06]">
        {faqs.map((faq, index) => (
          <FAQItem
            key={index}
            question={faq.question}
            answer={faq.answer}
            isOpen={openIndex === index}
            onToggle={() => handleToggle(index)}
          />
        ))}
      </div>
    </div>
  );
}
