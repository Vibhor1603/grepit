import "../index.css";
import Providers from "../components/Providers";

export const metadata = {
  title: "Vibo — Understand Any Codebase",
  description: "AI-powered codebase intelligence. Architecture analysis, dependency maps, and deep insights for any repository.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans bg-vb-bg text-vb-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
