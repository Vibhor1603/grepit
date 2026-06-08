import FAQContent from "./FAQContent";
import Schema from "../../components/Schema";

export const metadata = {
  title: "Frequently Asked Questions | grepit",
  description: "Common questions about grepit codebase intelligence, security, pricing, and language support. Everything engineers want to know.",
  alternates: {
    canonical: "/faq",
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is grepit?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "An intelligent spatial environment for understanding software architecture. Paste a GitHub URL and grepit returns a navigable architecture map, a Start Here onboarding traversal, and grounded answers citing source files."
      }
    },
    {
      "@type": "Question",
      "name": "Is my code stored?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Source code is processed in isolated serverless workers and not permanently stored. Temporary caches are purged within 24 hours."
      }
    },
    {
      "@type": "Question",
      "name": "What languages are supported?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "40+ languages including TypeScript, JavaScript, Python, Go, Rust, Java, and many frameworks like Next.js and React."
      }
    }
  ]
};

export default function FAQPage() {
  return (
    <>
      <Schema data={faqSchema} />
      <FAQContent />
    </>
  );
}
