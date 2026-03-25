import { IBM_Plex_Mono, Inter } from "next/font/google";
import "../index.css";
import Providers from "../components/Providers";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const ibmMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-mono" });

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
      <body className={`${inter.variable} ${ibmMono.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
