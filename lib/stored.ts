/**
 * What this device remembers, as something React can subscribe to.
 *
 * `localStorage` is an external store, and the way to read one in a component
 * is `useSyncExternalStore` — not an effect that copies it into state after
 * mount, which renders the page once wrong and then again right. This is the
 * three functions that hook needs.
 *
 * A `storage` event only fires in *other* tabs, so writes made here tell this
 * tab's listeners themselves.
 *
 * Every access is wrapped: in a private window, or with storage blocked, the
 * accessor itself throws. Nothing on this page may depend on it working.
 */
const listeners = new Set<() => void>();

export function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string | null): void {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private mode, or storage full. Whatever asked is not remembered here.
  }
  listeners.forEach((tell) => tell());
}

export function parseStored<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
