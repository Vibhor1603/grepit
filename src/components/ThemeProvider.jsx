"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "grepit-theme";
const THEMES = ["light", "dark", "system"];
const THEME_TRANSITION_MS = 220;
const ThemeContext = createContext(null);

function readStoredTheme() {
  if (typeof window === "undefined") return "light";
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("vibo-theme");
    if (THEMES.includes(raw)) return raw;
  } catch {}
  return "light";
}

function resolveTheme(theme) {
  if (theme !== "system") return theme;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyClass(resolved) {
  const root = document.documentElement;
  if (resolved === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

/** Fast, low-overhead theme switch tuned for UI responsiveness. */
function applyThemeClass(resolved) {
  if (typeof document === "undefined") return;

  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    applyClass(resolved);
    return;
  }

  if (typeof document.startViewTransition === "function") {
    document.startViewTransition(() => {
      applyClass(resolved);
    });
    return;
  }

  const root = document.documentElement;
  root.classList.add("theme-transitioning");
  applyClass(resolved);
  window.setTimeout(() => {
    root.classList.remove("theme-transitioning");
  }, THEME_TRANSITION_MS);
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("light");

  useEffect(() => {
    setThemeState(readStoredTheme());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if (theme !== "system") return;
      const resolved = resolveTheme("system");
      const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
      if (current !== resolved) applyThemeClass(resolved);
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (!THEMES.includes(next)) return;
    if (typeof document === "undefined") {
      setThemeState(next);
      return;
    }

    const resolved = resolveTheme(next);
    const current = document.documentElement.classList.contains("dark") ? "dark" : "light";

    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}

    if (current !== resolved) applyThemeClass(resolved);
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolveTheme(theme) === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolved: resolveTheme(theme),
      setTheme,
      toggle,
    }),
    [theme, setTheme, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      theme: "light",
      resolved: "light",
      setTheme: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}

export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var k = "${STORAGE_KEY}";
    var stored = localStorage.getItem(k) || localStorage.getItem("vibo-theme");
    var theme = stored || "light";
    var resolved = theme;
    if (theme === "system") {
      resolved = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    var root = document.documentElement;
    if (resolved === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  } catch (e) {}
})();
`;
