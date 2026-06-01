/** Grepit design tokens for Remotion compositions (mirrors index.css). */
export const REMOTION_THEME = {
  light: {
    bg: "#FFFCF7",
    surface: "#F5F0E6",
    surface2: "#FAF8F2",
    text: "#1A1F1A",
    text2: "#3D4238",
    text3: "#4A5244",
    text4: "#5E665A",
    accent: "#C47A12",
    accentBright: "#EEC679",
    accentSoft: "rgba(196, 122, 18, 0.14)",
    accentLine: "rgba(196, 122, 18, 0.34)",
    lime: "#3F8558",
    limeSoft: "rgba(63, 133, 88, 0.12)",
    limeLine: "rgba(47, 99, 68, 0.30)",
    coral: "#C43A3A",
    coralSoft: "rgba(196, 58, 58, 0.10)",
    line: "rgba(100, 85, 60, 0.17)",
  },
  dark: {
    bg: "#111113",
    surface: "#18181B",
    surface2: "#18181B",
    text: "#ECECEE",
    text2: "#C8C8CE",
    text3: "#A8A8B0",
    text4: "#888890",
    accent: "#EEC679",
    accentBright: "#F5DCA0",
    accentSoft: "rgba(238, 198, 121, 0.12)",
    accentLine: "rgba(238, 198, 121, 0.28)",
    lime: "#8EC4A4",
    limeSoft: "rgba(142, 196, 164, 0.08)",
    limeLine: "rgba(142, 196, 164, 0.22)",
    coral: "#F08080",
    coralSoft: "rgba(240, 128, 128, 0.10)",
    line: "rgba(255, 255, 255, 0.11)",
  },
};

export function formatTokens(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

export function formatCost(tokens) {
  const dollars = (tokens / 1_000_000) * 15;
  if (dollars >= 100) return `$${Math.round(dollars)}`;
  return `$${dollars.toFixed(0)}`;
}
