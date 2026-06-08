import { Suspense } from "react";
import LandingPage from "../components/LandingPage";
import { SoftwareAppSchema } from "../components/Schema";

export const metadata = {
  title: "Understand any codebase in minutes | grepit",
  description:
    "Paste a GitHub URL. Get an architecture map, a Start Here path, and AI answers with file paths and line numbers. 40+ languages. Under 60 seconds.",
  keywords: [
    "AI codebase analysis",
    "architecture map",
    "github repository analyzer",
    "developer onboarding",
    "code intelligence",
    "understand codebases fast",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "grepit: Understand any codebase in minutes",
    description:
      "Map any repo in under a minute. Grounded answers with citations. Save tokens vs re-pasting context every session.",
    url: "https://grepit.co",
    siteName: "grepit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "grepit: Understand any codebase in minutes",
    description: "Architecture map + cited answers from your actual source files.",
  },
};

export default function Home() {
  return (
    <>
      <SoftwareAppSchema />
      <Suspense fallback={null}>
        <LandingPage />
      </Suspense>
    </>
  );
}
