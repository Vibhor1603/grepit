import { Suspense } from "react";
import LandingPage from "../components/LandingPage";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://grepit.dev";

export const metadata = {
  title: "grepit: Understand any codebase in minutes",
  description:
    "Paste a GitHub URL. Get an architecture map, a Start Here path, and AI answers with file paths and line numbers. 40+ languages. Under 60 seconds.",
  keywords: [
    "codebase analysis",
    "architecture map",
    "github repository",
    "developer onboarding",
    "code intelligence",
    "AST analysis",
  ],
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "grepit: Understand any codebase in minutes",
    description:
      "Map any repo in under a minute. Grounded answers with citations. Save tokens vs re-pasting context every session.",
    url: siteUrl,
    siteName: "grepit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "grepit: Understand any codebase in minutes",
    description: "Architecture map + cited answers from your actual source files.",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "grepit",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  description:
    "Understand any codebase in minutes. Architecture maps, onboarding paths, and grounded Q&A with file:line citations.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Suspense fallback={null}>
        <LandingPage />
      </Suspense>
    </>
  );
}
