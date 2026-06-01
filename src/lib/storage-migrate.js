const MIGRATION_FLAG = "grepit-storage-migrated-v1";

const LOCAL_MIGRATIONS = [
  ["vibo-analyses", "grepit-analyses"],
  ["vibo-left-panel", "grepit-left-panel"],
  ["vibo-right-panel", "grepit-right-panel"],
  ["vibo-theme", "grepit-theme"],
  ["vibo-cookie-consent", "grepit-cookie-consent"],
  ["vibo-hover-explain-coach-v1", "grepit-hover-explain-coach-v1"],
];

const SESSION_MIGRATIONS = [
  ["vibo-mobile-notice-dismissed", "grepit-mobile-notice-dismissed"],
  ["vibo-pending-repo", "grepit-pending-repo"],
  ["vibo-pending-upload", "grepit-pending-upload"],
];

function migrateStore(store, migrations) {
  for (const [oldKey, newKey] of migrations) {
    try {
      const val = store.getItem(oldKey);
      if (val === null) continue;
      if (store.getItem(newKey) === null) store.setItem(newKey, val);
      store.removeItem(oldKey);
    } catch {}
  }
}

/** One-time rename of legacy `vibo-*` keys to `grepit-*`. */
export function migrateLegacyStorage() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(MIGRATION_FLAG) === "1") return;
    migrateStore(localStorage, LOCAL_MIGRATIONS);
    migrateStore(sessionStorage, SESSION_MIGRATIONS);
    localStorage.setItem(MIGRATION_FLAG, "1");
  } catch {}
}
