/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F8F6F2",
        sand: "#E5E1D8",
        ink: "#000000",
        "ink-light": "#1A1A1A",
        "ink-muted": "#404040",
        "ink-faint": "#A3A3A3",
        purple: "#C4B5FD",
        "purple-light": "#DDD6FE",
        lime: "#BEF264",
        "lime-light": "#D9F99D",
        blue: "#BAE6FD",
        peach: "#FCD34D",
        "d-bg": "#000000",
        "d-card": "#0A0A0A",
        "d-border": "#FFFFFF",
        "d-text": "#F8F6F2",
        "d-muted": "#A3A3A3",
        "d-subtle": "#737373",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "SF Mono", "monospace"],
      },
      boxShadow: {
        "brutal": "4px 4px 0px 0px #000000",
        "brutal-lg": "6px 6px 0px 0px #000000",
        "brutal-sm": "2px 2px 0px 0px #000000",
        "brutal-dark": "4px 4px 0px 0px #FFFFFF",
        "brutal-dark-lg": "6px 6px 0px 0px #FFFFFF",
        "brutal-dark-sm": "2px 2px 0px 0px #FFFFFF",
      },
      borderWidth: {
        '3': '3px',
      }
    },
  },
  plugins: [],
};
