import SEOLanding from "../../components/SEOLanding";
import { BreadcrumbSchema } from "../../components/Schema";

export const metadata = {
  title: "AI Code Review Tool | Automated Codebase Intelligence | grepit",
  description: "Accelerate your code reviews with AI. Get architecture insights, dependency analysis, and semantic code search for any repository in seconds.",
  alternates: {
    canonical: "/ai-code-review",
  },
  openGraph: {
    title: "AI Code Review Tool | grepit",
    description: "Accelerate your code reviews with AI. Get architecture insights, dependency analysis, and semantic code search for any repository in seconds.",
    url: "https://grepit.co/ai-code-review",
  },
  twitter: {
    title: "AI Code Review Tool | grepit",
    description: "Accelerate your code reviews with AI. Get architecture insights, dependency analysis, and semantic code search for any repository in seconds.",
  },
};

export default function AICodeReviewPage() {
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "AI Code Review", path: "/ai-code-review" }
  ];
  
  const content = [
    {
      heading: "Automated Architecture Mapping",
      body: "Instantly visualize how code components interact. No more manual drawing — let AI map your codebase architecture in real-time."
    },
    {
      heading: "Semantic Intelligence",
      body: "Go beyond grep. Search your codebase using natural language and get answers grounded in your actual source files with line-level citations."
    },
    {
      heading: "Accelerated Onboarding",
      body: "Drop new developers into complex repos and let grepit explain the 'Start Here' path, critical paths, and core logic automatically."
    }
  ];

  const features = [
    "Supports 40+ programming languages",
    "Deep AST-based relationship mapping",
    "Grounded AI chat with source citations",
    "Security-first: No code stored permanently",
    "Lightning fast: Analysis in under 60 seconds"
  ];

  const faq = [
    {
      question: "How does grepit perform code reviews?",
      answer: "grepit uses advanced LLMs and codebase indexing to analyze patterns, identify potential architectural flaws, and provide semantic insights that traditional linters miss."
    },
    {
      question: "Is my code secure?",
      answer: "Yes. grepit analyzes code in transient environments and does not store your source code permanently. We only keep a semantic index for your session."
    }
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      <SEOLanding
        title="AI Code Review"
        subtitle="Better than a manual audit. Faster than a senior engineer."
        description="grepit transforms how teams understand and review code. By combining semantic search with architecture visualization, we provide a code intelligence layer that sits on top of your existing workflow."
        content={content}
        features={features}
        faq={faq}
      />
    </>
  );
}
