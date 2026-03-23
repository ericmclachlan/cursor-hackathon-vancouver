/**
 * Simple in-memory cache with TTL expiration.
 *
 * Usage:
 *   import { createCache } from "./cache.js";
 *   const cache = createCache({ ttlMs: 3600_000 }); // 1 hour
 *   cache.set("key", value);
 *   cache.get("key"); // value or undefined if expired
 */

/**
 * @param {{ ttlMs: number }} opts
 */
export function createCache({ ttlMs }) {
  /** @type {Map<string, { data: any, expires: number }>} */
  const store = new Map();

  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expires) {
        store.delete(key);
        return undefined;
      }
      return entry.data;
    },

    set(key, value) {
      store.set(key, { data: value, expires: Date.now() + ttlMs });
    },

    has(key) {
      const val = this.get(key); // triggers expiry check
      return val !== undefined;
    },

    clear() {
      store.clear();
    },

    size() {
      return store.size;
    },
  };
}
