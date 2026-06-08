import SEOLanding from "../../components/SEOLanding";
import { BreadcrumbSchema } from "../../components/Schema";

export const metadata = {
  title: "AI Dependency Graph Generator | Visualize Codebase Structure | grepit",
  description: "Automatically generate dependency graphs for any codebase. Visualize module relationships, service dependencies, and package imports with AI-powered analysis.",
  alternates: {
    canonical: "/dependency-graph-generator",
  },
  openGraph: {
    title: "AI Dependency Graph Generator | grepit",
    description: "Automatically generate dependency graphs for any codebase. Visualize module relationships, service dependencies, and package imports with AI-powered analysis.",
    url: "https://grepit.co/dependency-graph-generator",
  },
  twitter: {
    title: "AI Dependency Graph Generator | grepit",
    description: "Automatically generate dependency graphs for any codebase. Visualize module relationships, service dependencies, and package imports with AI-powered analysis.",
  },
};

export default function DependencyGraphPage() {
  const breadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Dependency Graph Generator", path: "/dependency-graph-generator" }
  ];

  const content = [
    {
      heading: "Automated Graph Generation",
      body: "Stop manually sketching diagrams. grepit parses your import statements and function calls to generate a live, interactive dependency graph."
    },
    {
      heading: "Identify Circular Dependencies",
      body: "Quickly spot architectural debt. grepit highlights circular dependencies and tightly coupled modules that could cause issues during refactoring."
    },
    {
      heading: "Service-Level Mapping",
      body: "For microservices and monorepos, grepit maps the relationships between distinct services, APIs, and shared libraries automatically."
    }
  ];

  const features = [
    "Interactive SVG-based graphs",
    "Zoomable and searchable maps",
    "Export to Mermaid or PDF",
    "Deep-link to source files from nodes",
    "Cross-language dependency tracking"
  ];

  const faq = [
    {
      question: "How detailed are the dependency graphs?",
      answer: "We offer multiple levels of granularity, from high-level package relationships down to individual function call graphs in supported languages."
    },
    {
      question: "Can I use the graphs in my documentation?",
      answer: "Absolutely. You can export any graph as a high-resolution image or a Mermaid diagram for use in GitHub READMEs or internal docs."
    }
  ];

  return (
    <>
      <BreadcrumbSchema items={breadcrumbs} />
      <SEOLanding
        title="Dependency Graph Generator"
        subtitle="See how your code actually fits together."
        description="grepit's dependency graph generator is the fastest way to understand a complex codebase's topology. We turn thousands of files into a single, navigable map of relationships."
        content={content}
        features={features}
        faq={faq}
      />
    </>
  );
}
