/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Deep black base with subtle warm undertone
        "vb-bg":      "#0a0a0c",
        "vb-bg1":     "#111113",
        "vb-bg2":     "#19191c",
        "vb-bg3":     "#222225",
        "vb-surface": "#16161a",
        "vb-chat":    "#141416",
        "vb-border":  "rgba(255,255,255,0.06)",
        "vb-border2": "rgba(255,255,255,0.10)",
        "vb-border3": "rgba(255,255,255,0.14)",
        // Primary accent: electric lime
        "vb-accent":     "#E0FC10",
        "vb-accent-dim": "#b8d00e",
        "vb-accent-bright": "#eafd60",
        // Supporting muted tones
        "vb-green":   "#7dd3a8",
        "vb-violet":  "#b4a0d4",
        "vb-cyan":    "#7cc8d4",
        "vb-amber":   "#e4c06c",
        "vb-red":     "#ef4444",
        "vb-blue":    "#7ca8e8",
        "vb-pink":    "#d4a0b4",
        "vb-ink":     "#eaeaec",
        "vb-ink2":    "#b0b0b8",
        "vb-ink3":    "#787884",
        "vb-ink4":    "#4a4a54",
        // Legacy tokens for view components
        "vb-lime":    "#E0FC10",
        cream: "#F8F6F2",
        sand: "#E5E1D8",
        ink: "#eaeaec",
        "ink-light": "#d0d0d8",
        "ink-muted": "#b0b0b8",
        "ink-faint": "#787884",
        purple: "#b4a0d4",
        "purple-light": "#c8b8e0",
        lime: "#E0FC10",
        "lime-light": "#eafd60",
        blue: "#7ca8e8",
        peach: "#e4c06c",
        "d-bg": "#0a0a0c",
        "d-card": "#111113",
        "d-border": "rgba(255,255,255,0.06)",
        "d-text": "#eaeaec",
        "d-muted": "#b0b0b8",
        "d-subtle": "#787884",
      },
      fontFamily: {
        sans: ["'-apple-system'", "BlinkMacSystemFont", "'SF Pro Display'", "'Instrument Sans'", "system-ui", "sans-serif"],
        mono: ["'SF Mono'", "'IBM Plex Mono'", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        "vb": "8px",
        "vb2": "12px",
        "vb3": "16px",
      },
      boxShadow: {
        "vb-sm": "0 2px 8px rgba(0,0,0,0.2)",
        "vb-md": "0 4px 16px rgba(0,0,0,0.3)",
        "vb-lg": "0 8px 32px rgba(0,0,0,0.4)",
        "vb-xl": "0 12px 48px rgba(0,0,0,0.5)",
        "vb-glow": "0 0 0 1px rgba(74,222,128,0.15), 0 8px 32px rgba(0,0,0,0.4)",
      },
      animation: {
        "pulse-dot": "pulse-dot 2s ease infinite",
        "fade-in": "fadeIn 0.3s ease both",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "blink": "blink 2s ease infinite",
        "glow": "glow 3s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "marquee": "marquee 35s linear infinite",
      },
      keyframes: {
        "marquee": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "fadeIn": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slideUp": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "scaleIn": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" },
        },
        "glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
