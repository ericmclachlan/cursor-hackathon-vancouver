/**
 * Identifies company/brand names on web pages using the local brands database,
 * then uses the LLM to assess Canada-relatedness and provide history for Canadian brands.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ── Load brands database into memory ── */

let brandsDb = [];
let brandsByName = new Map(); // lowercase name → brand record

function loadBrands() {
  if (brandsDb.length) return;
  try {
    const raw = readFileSync(join(__dirname, "..", "data", "brands.json"), "utf-8");
    const data = JSON.parse(raw);
    brandsDb = data.brands || [];
    for (const brand of brandsDb) {
      brandsByName.set(brand.name.toLowerCase(), brand);
    }
    console.log(`Loaded ${brandsDb.length} brands (${data.canadian_count} Canadian)`);
  } catch (e) {
    console.error("Failed to load brands.json:", e.message);
  }
}

// Load on startup
loadBrands();

/**
 * Look up a company in the local database (case-insensitive).
 */
export function lookupBrand(name) {
  return brandsByName.get(name.toLowerCase()) || null;
}

/**
 * Get all known brand names for matching against page text.
 */
export function getAllBrandNames() {
  return brandsDb.map((b) => b.name);
}

/* ── OpenRouter LLM helpers ── */

function chatCompletionsUrl() {
  const base = (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
  return `${base}/chat/completions`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildHeaders() {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
  };
  const referer = process.env.OPENROUTER_SITE_URL;
  if (referer) headers["HTTP-Referer"] = referer;
  headers["X-Title"] = process.env.OPENROUTER_APP_NAME || "Brand Highlighter";
  return headers;
}

async function callLLM({ system, user, temperature = 0.2 }) {
  const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash";
  const body = JSON.stringify({
    model,
    temperature,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });

  const maxAttempts = Math.min(6, Math.max(1, Number(process.env.OPENROUTER_RETRY_ATTEMPTS || 3)));
  let data;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(chatCompletionsUrl(), {
      method: "POST",
      headers: buildHeaders(),
      body,
    });

    if (res.ok) {
      data = await res.json();
      break;
    }

    const errText = await res.text();
    const retryable = res.status === 429 || res.status === 503;
    if (retryable && attempt < maxAttempts - 1) {
      const delayMs = Math.min(20_000, 2000 * 2 ** attempt);
      await sleep(delayMs);
      continue;
    }

    throw new Error(`OpenRouter error ${res.status}: ${errText.slice(0, 500)}`);
  }

  return data?.choices?.[0]?.message?.content || null;
}

/* ── Brand detection: match page text against database ── */

/**
 * Scans page chunks and finds brand names from our database that appear in the text.
 * No LLM call needed — pure string matching against 14k known brands.
 */
export async function runAgent({ goal, chunks, fallbackWord }) {
  const word = (fallbackWord || "Google").trim() || "Google";
  loadBrands();

  const pageText = chunks.map((c) => c.text).join(" ").toLowerCase();
  const found = [];

  for (const brand of brandsDb) {
    if (found.length >= 30) break;
    const name = brand.name;
    // Skip very short names (likely false positives)
    if (name.length < 3) continue;
    if (pageText.includes(name.toLowerCase())) {
      found.push(name);
    }
  }

  if (!found.length) {
    return { phrases: [word], source: "fallback" };
  }

  return { phrases: found, source: "database" };
}

/* ── Company info: database first, then LLM for Canadian history ── */

/**
 * Returns company info. First checks the local database, then asks the LLM
 * to assess Canada-relatedness and provide history for Canadian companies.
 */
export async function getCompanyInfo(companyName) {
  loadBrands();
  const dbRecord = lookupBrand(companyName);

  if (!dbRecord) {
    // Not in our database
    return {
      company: companyName,
      info: null,
      isCanadian: false,
      source: "not-found",
    };
  }

  const { canadian_signals } = dbRecord;
  const isCanadian =
    canadian_signals.country_is_canada ||
    canadian_signals.founded_in_canada ||
    canadian_signals.listed_on_tsx;

  // Build base info from database
  const info = {
    name: dbRecord.name,
    founded: dbRecord.inception_date || "Unknown",
    founders: dbRecord.founders?.length ? dbRecord.founders.join(", ") : "Unknown",
    headquarters: dbRecord.hq_location_name
      ? `${dbRecord.hq_location_name}, ${dbRecord.country_name}`
      : dbRecord.country_name || "Unknown",
    country: dbRecord.country_name || "Unknown",
    industry: dbRecord.industries?.length ? dbRecord.industries.join(", ") : "Unknown",
    website: dbRecord.website || null,
    stockExchanges: dbRecord.stock_exchanges || [],
    canadianSignals: canadian_signals,
    isCanadian,
  };

  // If Canadian, ask the LLM for rich history
  if (isCanadian && process.env.OPENROUTER_API_KEY) {
    const system = `You are a Canadian business historian. Given a Canadian company and its basic data, write a compelling summary of its history and significance to Canada.

Return JSON only:
{
  "description": "2-3 sentence description of what the company does",
  "history": "4-6 sentence history focusing on the company's Canadian roots, milestones, and impact on Canada",
  "canadianSignificance": "2-3 sentences on why this company matters to Canada (jobs, culture, innovation, etc.)",
  "products": ["Major products or services"],
  "funFact": "One interesting fact about the company's Canadian heritage"
}`;

    const user = `Company: ${dbRecord.name}
Founded: ${dbRecord.inception_date || "Unknown"}
Founders: ${dbRecord.founders?.join(", ") || "Unknown"}
HQ: ${info.headquarters}
Industries: ${dbRecord.industries?.join(", ") || "Unknown"}
Website: ${dbRecord.website || "N/A"}`;

    try {
      const content = await callLLM({ system, user, temperature: 0.3 });
      if (content) {
        const llmInfo = JSON.parse(content);
        Object.assign(info, llmInfo);
      }
    } catch (e) {
      console.error("LLM enrichment failed:", e.message);
      info.description = `${dbRecord.name} is a Canadian company in ${info.industry}.`;
    }
  } else if (!isCanadian) {
    info.description = `${dbRecord.name} is based in ${info.headquarters}. This is not a Canadian company.`;
  }

  return {
    company: companyName,
    info,
    isCanadian,
    source: isCanadian ? "database+llm" : "database",
  };
}
