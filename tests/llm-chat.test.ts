/**
 * Unit tests for LLM-powered chat handler (TDD)
 *
 * Since the backend uses ESM (import.meta.url) which doesn't play well with
 * Jest's CJS transform, these tests hit the running backend server — same
 * approach as backend-api.test.ts.
 *
 * Prerequisites: backend server running on localhost:8787 with OPENROUTER_API_KEY set.
 * For CI without API key, the mock fallback path is tested instead.
 */

const http = require("http");

const BASE = "http://127.0.0.1:8787";

function request(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<{ status: number; data: any; headers: Record<string, string> }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method,
        headers: {
          "Content-Type": "application/json",
          Origin: "chrome-extension://fake-extension-id",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res: any) => {
        let raw = "";
        res.on("data", (chunk: string) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(raw),
              headers: res.headers,
            });
          } catch {
            resolve({ status: res.statusCode, data: raw, headers: res.headers });
          }
        });
      }
    );
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ================================================================
// POST /api/chat — LLM or mock responses with source field
// ================================================================

describe("POST /api/chat — source field and response structure", () => {
  it("should include a source field in response (llm, cache, or mock)", async () => {
    const res = await request("POST", "/api/chat", { brandKey: "Folgers" });
    expect(res.status).toBe(200);
    expect(res.data.source).toBeDefined();
    expect(["llm", "cache", "mock"]).toContain(res.data.source);
  });

  it("should return valid responses array for brand flow", async () => {
    const res = await request("POST", "/api/chat", { brandKey: "Folgers" });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.responses)).toBe(true);
    expect(res.data.responses.length).toBeGreaterThan(0);

    // Each response should have type, content, delayMs
    for (const r of res.data.responses) {
      expect(typeof r.type).toBe("string");
      expect(typeof r.content).toBe("string");
      expect(typeof r.delayMs).toBe("number");
    }
  });

  it("should return valid responses for Canadian brand", async () => {
    const res = await request("POST", "/api/chat", { brandKey: "Kicking Horse" });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.responses)).toBe(true);
    expect(res.data.responses.length).toBeGreaterThan(0);
    const types = res.data.responses.map((r: any) => r.type);
    expect(types).toContain("text");
  });

  it("should return valid responses for QA action", async () => {
    const res = await request("POST", "/api/chat", {
      brandKey: "Folgers",
      action: "more",
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.responses)).toBe(true);
    expect(res.data.responses.length).toBeGreaterThan(0);
    expect(["llm", "cache", "mock"]).toContain(res.data.source);
  });

  it("should return valid responses for free-text message", async () => {
    const res = await request("POST", "/api/chat", {
      brandKey: "Folgers",
      message: "Tell me about Canadian honey brands",
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data.responses)).toBe(true);
    expect(res.data.responses.length).toBeGreaterThan(0);
    expect(["llm", "cache", "mock"]).toContain(res.data.source);
  });
});

// ================================================================
// Caching behavior
// ================================================================

describe("POST /api/chat — caching", () => {
  it("should return cached response on second identical request", async () => {
    // Use a unique brand+message combo to avoid interference
    const params = { brandKey: "Folgers", message: "cache-test-" + Date.now() };

    const res1 = await request("POST", "/api/chat", params);
    expect(res1.status).toBe(200);

    const res2 = await request("POST", "/api/chat", params);
    expect(res2.status).toBe(200);

    // Second call should be from cache (if first was LLM) or same source
    if (res1.data.source === "llm") {
      expect(res2.data.source).toBe("cache");
    }
    // Responses should match
    expect(res2.data.responses).toEqual(res1.data.responses);
  });

  it("should use different cache entries for different actions", async () => {
    const res1 = await request("POST", "/api/chat", { brandKey: "Folgers" });
    const res2 = await request("POST", "/api/chat", {
      brandKey: "Folgers",
      action: "more",
    });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    // Different responses expected for flow vs QA
    expect(res1.data.responses).not.toEqual(res2.data.responses);
  });
});

// ================================================================
// Health endpoint reports agent type
// ================================================================

describe("GET /health — agent indicator", () => {
  it("should report whether openrouter or fallback is active", async () => {
    const res = await request("GET", "/health");
    expect(res.status).toBe(200);
    expect(res.data.ok).toBe(true);
    expect(["openrouter", "fallback"]).toContain(res.data.agent);
  });
});
