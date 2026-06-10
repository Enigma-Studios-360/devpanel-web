/**
 * One-shot localStorage key migration helper.
 *
 * The product renamed from "DevPanel" to "DevHub", which means our storage
 * keys (`devpanel.token`, `devpanel.theme`, ...) need to move to
 * `devhub.*`. We do NOT want to log everyone out, lose their theme
 * preference, or forget which tutorials they finished — so the migration
 * is *soft*: if the new key is empty and the old key has data, we copy it
 * across and delete the old one.
 *
 * Run lazily, on first read, so the helper works whether the user opens
 * the app fresh or returns from a previous session.
 */

/**
 * Read a localStorage value, migrating from a legacy key if present.
 *
 * Priority: returns `newKey` if set, otherwise migrates the value of
 * `oldKey` into `newKey` (and removes `oldKey`) and returns it.
 *
 * Safe in SSR — returns null when `localStorage` is undefined.
 */
export function readWithMigration(
  newKey: string,
  oldKey: string,
): string | null {
  if (typeof localStorage === 'undefined') return null;
  const current = localStorage.getItem(newKey);
  if (current !== null) return current;
  const legacy = localStorage.getItem(oldKey);
  if (legacy !== null) {
    try {
      localStorage.setItem(newKey, legacy);
      localStorage.removeItem(oldKey);
    } catch {
      // Storage quota / disabled — leave both keys alone; next read tries again.
    }
    return legacy;
  }
  return null;
}

/**
 * Write to the new key. Provided for symmetry with {@link readWithMigration};
 * callers can still use `localStorage.setItem` directly — this just keeps
 * the SSR guard in one place.
 */
export function safeSet(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore quota / disabled
  }
}

/** Symmetric remove with SSR guard. */
export function safeRemove(key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
