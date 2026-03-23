// ================================================================
// CanadaFirst API Client — global namespace (no module system)
// Loaded via <script> before sidepanel.js
// ================================================================

interface ApiChatParams {
  brandKey: string;
  message?: string;
  action?: string;
  sessionId?: string;
}

interface ApiChatResponse {
  type: string;
  content: string;
  delayMs: number;
}

interface ApiBrandDetectResult {
  brands: Record<string, BrandData>;
}

const CanadaFirstAPI = {
  async healthCheck(baseUrl: string): Promise<boolean> {
    try {
      const res = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) return false;
      const data = await res.json();
      return data.ok === true;
    } catch {
      return false;
    }
  },

  async getBrand(baseUrl: string, name: string): Promise<BrandData | null> {
    try {
      const res = await fetch(`${baseUrl}/api/brand/${encodeURIComponent(name)}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  async chat(baseUrl: string, params: ApiChatParams): Promise<{ responses: ApiChatResponse[]; source?: string }> {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new Error(`Chat API error: ${res.status}`);
    }
    return await res.json();
  },

  async detectBrands(baseUrl: string, pageText: string): Promise<ApiBrandDetectResult> {
    const truncated = pageText.slice(0, 50000);
    const res = await fetch(`${baseUrl}/api/detect-brands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: truncated }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      throw new Error(`Detect brands API error: ${res.status}`);
    }
    return await res.json();
  },
};
