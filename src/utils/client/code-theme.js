import { themes } from "prism-react-renderer";

/** Dark chat / code snippet theme — tuned for vb-chat surfaces. */
export const viboCodeThemeDark = {
  ...themes.vsDark,
  plain: { color: "#b0b0b8", backgroundColor: "transparent" },
  styles: [
    { types: ["keyword", "builtin"], style: { color: "#E0FC10" } },
    { types: ["function", "method"], style: { color: "#7ca8e8" } },
    { types: ["string", "char"], style: { color: "#7dd3a8" } },
    { types: ["number", "boolean"], style: { color: "#e4c06c" } },
    { types: ["comment"], style: { color: "#4a4a54", fontStyle: "italic" } },
    { types: ["class-name", "type"], style: { color: "#b4a0d4" } },
    { types: ["operator", "punctuation"], style: { color: "#787884" } },
    { types: ["variable", "constant"], style: { color: "#eaeaec" } },
    { types: ["property"], style: { color: "#7cc8d4" } },
    { types: ["tag"], style: { color: "#e87c7c" } },
    { types: ["attr-name"], style: { color: "#e4c06c" } },
    { types: ["attr-value"], style: { color: "#7dd3a8" } },
  ],
};

/** Light chat / code snippet theme — warm cream palette, same role contrast as dark. */
export const viboCodeThemeLight = {
  ...themes.vsLight,
  plain: { color: "#3D4238", backgroundColor: "transparent" },
  styles: [
    { types: ["keyword", "builtin"], style: { color: "#9A5F0A", fontWeight: "600" } },
    { types: ["function", "method"], style: { color: "#2B5F9E" } },
    { types: ["string", "char"], style: { color: "#2F6344" } },
    { types: ["number", "boolean"], style: { color: "#8A5A12" } },
    { types: ["comment"], style: { color: "#6B7568", fontStyle: "italic" } },
    { types: ["class-name", "type"], style: { color: "#5E4A82" } },
    { types: ["operator", "punctuation"], style: { color: "#5E665A" } },
    { types: ["variable", "constant"], style: { color: "#1A1F1A" } },
    { types: ["property"], style: { color: "#2A6675" } },
    { types: ["tag"], style: { color: "#A63D3D" } },
    { types: ["attr-name"], style: { color: "#8A5A12" } },
    { types: ["attr-value"], style: { color: "#2F6344" } },
  ],
};

export function getViboCodeTheme(isDark) {
  return isDark ? viboCodeThemeDark : viboCodeThemeLight;
}
