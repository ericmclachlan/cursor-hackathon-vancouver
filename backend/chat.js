/**
 * Chat handler with LLM integration and caching.
 *
 * When OPENROUTER_API_KEY is set, uses the LLM for brand flows, QA, and free-text.
 * Falls back to scripted mock responses when LLM is unavailable or fails.
 * Caches LLM responses to avoid duplicate API calls.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { callLLM } from "./agent.js";
import { createCache } from "./cache.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ── LLM response cache ── */

const CACHE_TTL = Number(process.env.CACHE_TTL_MS || 3600_000); // 1 hour default
const chatResponseCache = createCache({ ttlMs: CACHE_TTL });

export function getChatCache() {
  return chatResponseCache;
}

/* ── Load frontend brand data ── */

let frontendBrands = {};
let mockChatData = {};

function loadFrontendData() {
  if (Object.keys(frontendBrands).length) return;
  try {
    const brandsRaw = readFileSync(
      join(__dirname, "..", "extention", "brands.json"),
      "utf-8"
    );
    frontendBrands = JSON.parse(brandsRaw);
    console.log(`Loaded ${Object.keys(frontendBrands).length} frontend brands`);
  } catch (e) {
    console.error("Failed to load frontend brands.json:", e.message);
  }

  try {
    const chatRaw = readFileSync(
      join(__dirname, "..", "extention", "sidepanel", "mock-chat-data.json"),
      "utf-8"
    );
    mockChatData = JSON.parse(chatRaw);
    console.log("Loaded mock chat data");
  } catch (e) {
    console.error("Failed to load mock-chat-data.json:", e.message);
  }
}

loadFrontendData();

/* ── GET /api/brand/:name — return frontend BrandData schema ── */

export function getBrandForFrontend(name) {
  loadFrontendData();

  // Exact match first
  if (frontendBrands[name]) return frontendBrands[name];

  // Case-insensitive match
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(frontendBrands)) {
    if (key.toLowerCase() === lower) return val;
  }

  return null;
}

/**
 * Returns all brand name keys from the frontend brands.json registry.
 */
export function getAllFrontendBrandNames() {
  loadFrontendData();
  return Object.keys(frontendBrands);
}

/* ── Cache key builder ── */

function cacheKey(brandKey, action, message) {
  return `${brandKey}:${action || "flow"}:${message || ""}`;
}

/* ── LLM System Prompts ── */

const BRAND_FLOW_SYSTEM = `You are CanadaFirst, a friendly Canadian brand advisor in a Chrome extension sidebar chat.
Given brand data (JSON), produce a conversational chat flow that tells the user about the brand.

For CANADIAN brands:
- Greet warmly, mention the brand is Canadian
- Show pride in their Canadian heritage
- Tell their story and significance

For NON-CANADIAN brands:
- Note where they're from
- Recommend the Canadian alternative (if provided in brand data)
- Compare pricing and origin

Return ONLY valid JSON in this exact format:
{
  "responses": [
    { "type": "text", "content": "<HTML content for chat bubble>", "delayMs": <number 400-1200> },
    { "type": "origin-card", "content": "<JSON string with flag, name, detail, canadian fields>", "delayMs": 400 },
    { "type": "comparison-card", "content": "<JSON string with current and alternative>", "delayMs": 800 },
    { "type": "story-card", "content": "<JSON string with brand, story, location>", "delayMs": 400 }
  ]
}

Use appropriate card types. Text content can include <strong>, <br>, <span class="status-badge canadian"> tags.
Keep responses concise and enthusiastic about Canadian brands.`;

const QA_SYSTEM = `You are CanadaFirst, a friendly Canadian brand advisor.
The user is asking a follow-up question about a brand.

Actions:
- "more": What else does the Canadian alternative make?
- "similar": Suggest similar Canadian brands in the same category
- "local": Where to buy locally (focus on Vancouver/BC area)

Return ONLY valid JSON:
{
  "responses": [
    { "type": "text", "content": "<HTML content>", "delayMs": 800 }
  ]
}

Keep answers helpful, specific, and focused on Canadian options. Use <strong> and <br> for formatting.`;

const FREETEXT_SYSTEM = `You are CanadaFirst, a friendly Canadian brand advisor in a Chrome extension chat.
The user is typing a free-text question. Answer helpfully, always steering toward Canadian alternatives and brands.

Return ONLY valid JSON:
{
  "responses": [
    { "type": "text", "content": "<HTML content>", "delayMs": 800 }
  ]
}

Keep answers concise (1-3 sentences). Use <strong> and <br> for formatting.`;

/* ── POST /api/chat — LLM-powered with mock fallback ── */

export async function handleChat({ brandKey, message, action, sessionId }) {
  loadFrontendData();

  const key = cacheKey(brandKey, action, message);

  // Check cache first
  const cached = chatResponseCache.get(key);
  if (cached) {
    return { responses: cached, source: "cache" };
  }

  // Try LLM if API key is configured
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const llmResult = await callLLMForChat({ brandKey, message, action });
      if (llmResult) {
        chatResponseCache.set(key, llmResult);
        return { responses: llmResult, source: "llm" };
      }
    } catch (e) {
      console.error("LLM chat failed, falling back to mock:", e.message);
    }
  }

  // Fall back to mock responses
  const mockResult = handleChatMock({ brandKey, message, action });
  return { ...mockResult, source: "mock" };
}

/* ── LLM call dispatcher ── */

async function callLLMForChat({ brandKey, message, action }) {
  const brandData = getBrandForFrontend(brandKey);

  if (action) {
    return await callLLMForQA(action, brandKey, brandData);
  }

  if (message) {
    return await callLLMForFreeText(message, brandKey, brandData);
  }

  return await callLLMForBrandFlow(brandKey, brandData);
}

async function callLLMForBrandFlow(brandKey, brandData) {
  const brandContext = brandData
    ? JSON.stringify({ brandKey, ...brandData }, null, 2)
    : `Brand: ${brandKey} (no detailed data available)`;

  const content = await callLLM({
    system: BRAND_FLOW_SYSTEM,
    user: `Generate a chat flow for this brand:\n${brandContext}`,
    temperature: 0.3,
  });

  return parseLLMResponse(content);
}

async function callLLMForQA(action, brandKey, brandData) {
  const altBrand = brandData?.alt?.brand || brandKey;

  const content = await callLLM({
    system: QA_SYSTEM,
    user: `Action: ${action}\nBrand: ${brandKey}\nCanadian alternative: ${altBrand}\nBrand data: ${JSON.stringify(brandData || {}, null, 2)}`,
    temperature: 0.4,
  });

  return parseLLMResponse(content);
}

async function callLLMForFreeText(message, brandKey, brandData) {
  const content = await callLLM({
    system: FREETEXT_SYSTEM,
    user: `User question: ${message}\nContext brand: ${brandKey}\nBrand data: ${JSON.stringify(brandData || {}, null, 2)}`,
    temperature: 0.5,
  });

  return parseLLMResponse(content);
}

function parseLLMResponse(content) {
  if (!content) return null;
  const parsed = JSON.parse(content);
  if (!parsed.responses || !Array.isArray(parsed.responses)) return null;
  return parsed.responses;
}

/* ── Mock fallback (original scripted logic) ── */

function handleChatMock({ brandKey, message, action }) {
  // If QA action, return QA response
  if (action) {
    return { responses: buildQAResponse(action, brandKey) };
  }

  // If free-text with keyword match
  if (message) {
    const lower = message.toLowerCase();
    const fallbacks = mockChatData.fallbackResponses || {};
    for (const [keyword, response] of Object.entries(fallbacks)) {
      if (keyword !== "default" && lower.includes(keyword)) {
        return {
          responses: [{ type: "text", content: response, delayMs: 1200 }],
        };
      }
    }
  }

  // Check mock-chat-data for scripted flows
  const flows = mockChatData.flows || {};
  if (flows[brandKey]) {
    return { responses: flows[brandKey].responses };
  }

  // Build a dynamic response from brands.json data
  const brandData = getBrandForFrontend(brandKey);
  if (brandData) {
    return { responses: buildBrandFlow(brandKey, brandData) };
  }

  // Fallback for unknown brand
  const defaultMsg =
    mockChatData.fallbackResponses?.default ||
    "I don't have info on that brand yet. Try clicking a 🍁 tag on the page!";
  return {
    responses: [{ type: "text", content: defaultMsg, delayMs: 800 }],
  };
}

function buildBrandFlow(brandKey, data) {
  const responses = [];

  if (data.canadian) {
    responses.push({
      type: "text",
      content: `You clicked on <strong>${brandKey}</strong> — great choice! Let me tell you about this one. 🍁`,
      delayMs: 1100,
    });
    responses.push({
      type: "origin-card",
      content: JSON.stringify({
        flag: "🇨🇦",
        name: brandKey,
        detail: `✓ Canadian — ${data.hq}`,
        canadian: true,
      }),
      delayMs: 400,
    });
    responses.push({
      type: "text",
      content: `<span class="status-badge canadian">✓ Canadian</span><br><br><strong>${brandKey}</strong> is proudly Canadian! ${data.owner} is headquartered in ${data.hq}. You're supporting a Canadian brand. 🇨🇦`,
      delayMs: 1200,
    });
    if (data.story) {
      responses.push({
        type: "story-card",
        content: JSON.stringify({
          brand: brandKey,
          story: data.story,
          location: data.storyLoc || data.hq,
        }),
        delayMs: 400,
      });
    }
  } else {
    responses.push({
      type: "text",
      content: `I spotted <strong>${brandKey}</strong> — let me look that up for you...`,
      delayMs: 1100,
    });
    responses.push({
      type: "origin-card",
      content: JSON.stringify({
        flag: data.flag,
        name: brandKey,
        detail: `Not Canadian — ${data.owner}, ${data.hq}`,
        canadian: false,
      }),
      delayMs: 400,
    });
    if (data.alt) {
      responses.push({
        type: "text",
        content: `<strong>${brandKey}</strong> is owned by ${data.owner}, based in ${data.hq}. But I've got a great Canadian alternative — <strong>${data.alt.brand}</strong> from ${data.alt.origin}! ${data.flag}→🇨🇦`,
        delayMs: 1300,
      });
      responses.push({
        type: "comparison-card",
        content: JSON.stringify({
          current: { name: brandKey, owner: data.owner, hq: data.hq, flag: data.flag },
          alternative: {
            name: data.alt.name,
            brand: data.alt.brand,
            price: data.alt.price,
            shipping: data.alt.shipping,
            origin: data.alt.origin,
          },
        }),
        delayMs: 1600,
      });
      responses.push({
        type: "story-card",
        content: JSON.stringify({
          brand: data.alt.brand,
          story: data.alt.story,
          location: data.alt.storyLoc,
        }),
        delayMs: 500,
      });
    }
  }

  return responses;
}

function buildQAResponse(action, brandKey) {
  const brandData = getBrandForFrontend(brandKey);
  const altBrand = brandData?.alt?.brand || brandKey;

  if (action === "more") {
    return [
      {
        type: "text",
        content: `${altBrand} has a great lineup! They offer several roast profiles and blends — check their website for the full collection. Most are available on Amazon.ca too. All roasted in ${brandData?.alt?.origin || "Canada"}. 🇨🇦`,
        delayMs: 1200,
      },
    ];
  } else if (action === "similar") {
    return [
      {
        type: "text",
        content: `Here are more Canadian options:<br><br>☕ <strong>Kicking Horse</strong> — Invermere, BC<br>☕ <strong>Salt Spring Coffee</strong> — Salt Spring Island, BC<br>☕ <strong>Ethical Bean</strong> — Vancouver, BC<br>☕ <strong>Pilot Coffee</strong> — Toronto, ON<br>☕ <strong>Detour Coffee</strong> — Hamilton, ON<br><br>All roasted in Canada! 🍁`,
        delayMs: 1200,
      },
    ];
  } else if (action === "local") {
    return [
      {
        type: "text",
        content: `In the Vancouver area, find Canadian coffee at <strong>Save-On-Foods</strong>, <strong>Whole Foods</strong>, <strong>Choices Markets</strong>, and <strong>London Drugs</strong>. Most roasters also ship free across Canada! 📦`,
        delayMs: 1200,
      },
    ];
  }

  return [
    {
      type: "text",
      content: "I'm not sure about that — try asking about a specific brand!",
      delayMs: 800,
    },
  ];
}
