/**
 * Backend API integration tests (TDD — RED phase)
 *
 * Tests the Express backend endpoints that serve the Chrome extension frontend.
 * Uses child_process to spawn the real server since backend is ESM.
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
// CORS
// ================================================================

describe("CORS", () => {
  it("should include Access-Control-Allow-Origin header on responses", async () => {
    const res = await request("GET", "/health");
    expect(res.headers["access-control-allow-origin"]).toBeDefined();
  });

  it("should allow chrome-extension origins", async () => {
    const res = await request("GET", "/health");
    // Should allow all origins (or specifically chrome-extension://)
    expect(res.headers["access-control-allow-origin"]).toMatch(
      /\*|chrome-extension/
    );
  });
});

// ================================================================
// POST /api/chat — mock chatbot endpoint
// ================================================================

describe("POST /api/chat", () => {
  it("should return 400 if brandKey is missing", async () => {
    const res = await request("POST", "/api/chat", { message: "hello" });
    expect(res.status).toBe(400);
    expect(res.data.error).toBeDefined();
  });

  it("should return scripted response for known non-Canadian brand (Folgers)", async () => {
    const res = await request("POST", "/api/chat", {
      brandKey: "Folgers",
      message: "tell me about this brand",
    });
    expect(res.status).toBe(200);
    expect(res.data.responses).toBeDefined();
    expect(Array.isArray(res.data.responses)).toBe(true);
    expect(res.data.responses.length).toBeGreaterThan(0);
    // Should include origin card and comparison card for non-Canadian
    const types = res.data.responses.map((r: any) => r.type);
    expect(types).toContain("text");
    expect(types).toContain("origin-card");
  });

  it("should return scripted response for known Canadian brand (Kicking Horse)", async () => {
    const res = await request("POST", "/api/chat", {
      brandKey: "Kicking Horse",
      message: "tell me about this brand",
    });
    expect(res.status).toBe(200);
    expect(res.data.responses).toBeDefined();
    expect(res.data.responses.length).toBeGreaterThan(0);
    // Canadian brand flow should have story-card
    const types = res.data.responses.map((r: any) => r.type);
    expect(types).toContain("text");
    expect(types).toContain("origin-card");
    expect(types).toContain("story-card");
  });

  it("should return fallback response for unknown brand", async () => {
    const res = await request("POST", "/api/chat", {
      brandKey: "UnknownBrand123",
      message: "what is this?",
    });
    expect(res.status).toBe(200);
    expect(res.data.responses).toBeDefined();
    expect(res.data.responses.length).toBeGreaterThan(0);
  });

  it("should handle QA action messages", async () => {
    const res = await request("POST", "/api/chat", {
      brandKey: "Folgers",
      message: "What else do they make?",
      action: "more",
    });
    expect(res.status).toBe(200);
    expect(res.data.responses).toBeDefined();
    expect(res.data.responses.length).toBeGreaterThan(0);
  });

  it("should handle free-text messages with keyword matching", async () => {
    const res = await request("POST", "/api/chat", {
      brandKey: "Folgers",
      message: "What about honey?",
    });
    expect(res.status).toBe(200);
    expect(res.data.responses).toBeDefined();
    // Should match "honey" keyword
    const textResponses = res.data.responses.filter((r: any) => r.type === "text");
    const combined = textResponses.map((r: any) => r.content).join(" ");
    expect(combined.toLowerCase()).toContain("honey");
  });
});

// ================================================================
// GET /api/brand/:name — frontend-compatible brand data
// ================================================================

describe("GET /api/brand/:name", () => {
  it("should return brand data in frontend BrandData schema for known brand", async () => {
    const res = await request("GET", "/api/brand/Folgers");
    expect(res.status).toBe(200);

    const d = res.data;
    // Must match frontend BrandData interface
    expect(typeof d.canadian).toBe("boolean");
    expect(typeof d.flag).toBe("string");
    expect(typeof d.owner).toBe("string");
    expect(typeof d.hq).toBe("string");
  });

  it("should include alt field for non-Canadian brands", async () => {
    const res = await request("GET", "/api/brand/Folgers");
    expect(res.status).toBe(200);
    expect(res.data.canadian).toBe(false);
    expect(res.data.alt).toBeDefined();
    expect(typeof res.data.alt.name).toBe("string");
    expect(typeof res.data.alt.brand).toBe("string");
    expect(typeof res.data.alt.shortName).toBe("string");
    expect(typeof res.data.alt.province).toBe("string");
    expect(typeof res.data.alt.price).toBe("string");
    expect(typeof res.data.alt.origin).toBe("string");
  });

  it("should return Canadian brand without alt field", async () => {
    const res = await request("GET", "/api/brand/Kicking%20Horse");
    expect(res.status).toBe(200);
    expect(res.data.canadian).toBe(true);
    expect(typeof res.data.story).toBe("string");
    expect(typeof res.data.hq).toBe("string");
  });

  it("should return 404 for unknown brand", async () => {
    const res = await request("GET", "/api/brand/NonExistentBrand999");
    expect(res.status).toBe(404);
    expect(res.data.error).toBeDefined();
  });
});

// ================================================================
// Manifest host_permissions
// ================================================================

describe("manifest.json host_permissions", () => {
  it("should include localhost:8787 in host_permissions", () => {
    const manifest = require("../extention/manifest.json");
    expect(manifest.host_permissions).toBeDefined();
    expect(Array.isArray(manifest.host_permissions)).toBe(true);
    const hasLocalhost = manifest.host_permissions.some(
      (p: string) => p.includes("localhost:8787") || p.includes("127.0.0.1:8787")
    );
    expect(hasLocalhost).toBe(true);
  });
});
