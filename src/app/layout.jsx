import "../index.css";
import Providers from "../components/Providers";
import Script from "next/script";

export const metadata = {
  title: "Vibo — Understand Any Codebase",
  description: "AI-powered codebase intelligence. Architecture analysis, dependency maps, and deep insights for any repository.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
      </head>
      <body
        className="font-sans"
        style={{
          "--font-inter": '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
          "--font-mono": '"IBM Plex Mono", "SFMono-Regular", "Menlo", monospace',
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
