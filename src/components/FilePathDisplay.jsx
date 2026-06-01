export function splitFilePath(path) {
  if (!path) return { dir: "", name: "" };
  const normalized = String(path).replace(/\\/g, "/");
  const i = normalized.lastIndexOf("/");
  if (i === -1) return { dir: "", name: normalized };
  return { dir: normalized.slice(0, i + 1), name: normalized.slice(i + 1) };
}

export function looksLikeFilePath(text) {
  if (!text || typeof text !== "string") return false;
  return (
    /^[\w\-./]+\.(js|ts|jsx|tsx|css|json|md|html|py|rb|go|rs|yaml|yml|toml|sql|sh|env|vue|svelte|astro|mjs|cjs|tsx?)$/i.test(
      text,
    ) || (text.includes("/") && /\.\w{1,6}$/.test(text))
  );
}

/**
 * Shows directory (muted, ellipsized) + filename (bold, never broken mid-word).
 */
export default function FilePathDisplay({
  path,
  className = "",
  block = false,
  onClick,
  title,
}) {
  const { dir, name } = splitFilePath(path);
  const Tag = onClick ? "button" : "span";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title ?? path}
      className={`file-path-display ${block ? "file-path-display--block" : ""} ${onClick ? "file-path-display--interactive" : ""} ${className}`}
    >
      {dir ? <span className="file-path-display__dir">{dir}</span> : null}
      <span className="file-path-display__name">{name || path}</span>
    </Tag>
  );
}
