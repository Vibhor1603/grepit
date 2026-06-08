import "../index.css";
import "@xyflow/react/dist/style.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Providers from "../components/Providers";
import { THEME_INIT_SCRIPT } from "../components/ThemeProvider";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { OrganizationSchema } from "../components/Schema";

export const metadata = {
  metadataBase: new URL("https://grepit.co"),
  title: {
    default: "grepit | AI Codebase Intelligence & Architecture Visualization",
    template: "%s | grepit",
  },
  description:
    "Understand any codebase in minutes. AI-powered architecture maps, semantic code search, and repository intelligence for developers. Supporting 40+ languages.",
  keywords: [
    "AI codebase analysis",
    "repository AI assistant",
    "architecture visualization",
    "semantic code search",
    "AI code review",
    "understand codebases",
    "github repo analyzer",
    "software architecture AI",
  ],
  authors: [{ name: "grepit Team" }],
  creator: "grepit",
  publisher: "grepit",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://grepit.co",
    siteName: "grepit",
    title: "grepit | Understand any codebase in minutes",
    description: "Map any repository, get cited answers from source files, and visualize architecture in under 60 seconds.",
    images: [
      {
        url: "/logo.svg", // Replace with actual OG image when available
        width: 1200,
        height: 630,
        alt: "grepit: AI Codebase Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "grepit | AI Codebase Intelligence",
    description: "Understand any codebase in minutes with AI-powered architecture maps and cited answers.",
    creator: "@grepit",
    images: ["/logo.svg"], // Replace with actual Twitter card image
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        {/* Sets `dark` class on <html> before paint, no FOUC. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased">
        <OrganizationSchema />
        <Providers>{children}</Providers>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
