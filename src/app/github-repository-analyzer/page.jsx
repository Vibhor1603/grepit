import SEOLanding from "../../components/SEOLanding";
import { BreadcrumbSchema } from "../../components/Schema";

export const metadata = {
  title: "GitHub Repository Analyzer | Understand Any Repo in Seconds | grepit",
  description: "The ultimate tool for analyzing GitHub repositories. Get architecture maps, dependency graphs, and AI-powered code insights for any public or private repo.",
  alternates: {
    canonical: "/github-repository-analyzer",
  },
};

export default function GitHubAnalyzerPage() {
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "GitHub Analyzer", path: "/github-repository-analyzer" }
  ];

  const content = [
    {
      heading: "Zero-Setup Analysis",
      body: "Just paste a GitHub URL. grepit clones, indexes, and analyzes the repository instantly. No local setup or environment configuration required."
    },
    {
      heading: "Dependency Discovery",
      body: "Automatically discover how services and modules depend on each other. Visualize the 'spider web' of your repository's dependencies."
    },
    {
      heading: "Semantic Code Search",
      body: "Ask questions like 'where is the auth logic?' or 'how are database migrations handled?' and get exact file paths and code snippets."
    }
  ];

  const features = [
    "Supports GitHub public and private repos",
    "Works with monorepos and polyrepos",
    "Real-time architecture visualization",
    "Interactive dependency graphs",
    "AI-generated 'Start Here' documentation"
  ];

  const faq = [
    {
      question: "Can I analyze private GitHub repositories?",
      answer: "Yes. By connecting your GitHub account, grepit can securely analyze private repositories you have access to."
    },
    {
      question: "What languages are supported?",
      answer: "We support over 40 languages including JavaScript, TypeScript, Python, Go, Rust, Java, and C++."
    }
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      <SEOLanding
        title="GitHub Repository Analyzer"
        subtitle="Paste a URL. Get full codebase intelligence."
        description="grepit is the world's most advanced GitHub repository analyzer. We use AI and static analysis to turn a wall of code into an understandable map of architectural intent."
        content={content}
        features={features}
        faq={faq}
      />
    </>
  );
}
