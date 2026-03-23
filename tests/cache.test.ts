/**
 * Unit tests for in-memory cache (TDD — RED phase)
 */

// We'll import from the backend cache module once it exists.
// For now, define the interface we expect and test against it.

// The cache module should export: createCache({ ttlMs }) => { get, set, has, clear, size }

describe("Cache", () => {
  let createCache: (opts: { ttlMs: number }) => {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
    has: (key: string) => boolean;
    clear: () => void;
    size: () => number;
  };

  beforeAll(async () => {
    // Dynamic import since backend is ESM — we use ts-jest with commonjs for tests
    // but the actual module is JS ESM. We'll use require for the compiled version.
    const mod = await import("../backend/cache.js");
    createCache = mod.createCache;
  });

  it("should export createCache function", () => {
    expect(typeof createCache).toBe("function");
  });

  describe("basic operations", () => {
    let cache: ReturnType<typeof createCache>;

    beforeEach(() => {
      cache = createCache({ ttlMs: 60_000 });
    });

    it("should return undefined for missing keys", () => {
      expect(cache.get("nonexistent")).toBeUndefined();
    });

    it("should store and retrieve values", () => {
      const data = { responses: [{ type: "text", content: "hello" }] };
      cache.set("brand:Folgers:flow", data);
      expect(cache.get("brand:Folgers:flow")).toEqual(data);
    });

    it("should report has() correctly", () => {
      expect(cache.has("key")).toBe(false);
      cache.set("key", "value");
      expect(cache.has("key")).toBe(true);
    });

    it("should report size correctly", () => {
      expect(cache.size()).toBe(0);
      cache.set("a", 1);
      cache.set("b", 2);
      expect(cache.size()).toBe(2);
    });

    it("should clear all entries", () => {
      cache.set("a", 1);
      cache.set("b", 2);
      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.get("a")).toBeUndefined();
    });

    it("should overwrite existing keys", () => {
      cache.set("key", "old");
      cache.set("key", "new");
      expect(cache.get("key")).toBe("new");
      expect(cache.size()).toBe(1);
    });
  });

  describe("TTL expiration", () => {
    it("should expire entries after TTL", () => {
      const cache = createCache({ ttlMs: 50 }); // 50ms TTL
      cache.set("key", "value");
      expect(cache.get("key")).toBe("value");

      // Wait for expiration
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(cache.get("key")).toBeUndefined();
          expect(cache.has("key")).toBe(false);
          resolve();
        }, 100);
      });
    });

    it("should not expire entries before TTL", () => {
      const cache = createCache({ ttlMs: 5000 });
      cache.set("key", "value");
      expect(cache.get("key")).toBe("value");
    });
  });
});
