/**
 * Mock chat handler and brand data adapter for the Chrome extension frontend.
 *
 * Loads the frontend's brands.json and mock-chat-data.json to serve
 * scripted chatbot responses and frontend-compatible brand data.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

/* ── POST /api/chat — scripted chatbot responses ── */

export function handleChat({ brandKey, message, action, sessionId }) {
  loadFrontendData();

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
