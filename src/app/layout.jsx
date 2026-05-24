import "../index.css";
import Providers from "../components/Providers";
import { Analytics } from "@vercel/analytics/next";
import MobileNotice from "../components/MobileNotice";

export const metadata = {
  title: "grepit — Understand Any Codebase",
  description: "AI-powered codebase intelligence. Architecture analysis, dependency maps, and deep insights for any repository.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-vb-bg text-vb-ink antialiased">
        <Providers>{children}</Providers>
        <MobileNotice />
        <Analytics />
      </body>
    </html>
  );
}
