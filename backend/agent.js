/**
 * Picks highlight phrases via OpenRouter (OpenAI-compatible API), or falls back
 * to a single word when OPENROUTER_API_KEY is unset.
 */

function chatCompletionsUrl() {
  const base = (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
  return `${base}/chat/completions`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runAgent({ goal, chunks, fallbackWord }) {
  const word = (fallbackWord || "your").trim() || "your";

  if (!process.env.OPENROUTER_API_KEY) {
    return {
      phrases: [word],
      source: "fallback",
    };
  }

  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  const payloadChunks = chunks.map((c) => ({
    id: c.id,
    text: String(c.text).slice(0, 6000),
  }));

  const system = `You choose literal phrases to highlight in web page text for the user's goal.
Rules:
- Return only phrases that appear exactly in the provided chunks (copy-paste, same casing is optional: prefer the exact casing as in the chunk).
- Short phrases (1–6 words) work best.
- At most 20 phrases total, no duplicates.
- Output JSON only: {"phrases": string[]}`;

  const user = `Goal: ${goal || "Highlight noteworthy terms."}

Chunks (JSON):
${JSON.stringify(payloadChunks)}`;

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
  };

  const referer = process.env.OPENROUTER_SITE_URL;
  if (referer) headers["HTTP-Referer"] = referer;

  const title = process.env.OPENROUTER_APP_NAME || "Word Highlighter";
  headers["X-Title"] = title;

  const body = JSON.stringify({
    model,
    temperature: 0.2,
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
      headers,
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
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return { phrases: [word], source: "openrouter-empty", raw: data };
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { phrases: [word], source: "openrouter-parse", snippet: content.slice(0, 200) };
  }

  const phrases = Array.isArray(parsed.phrases)
    ? parsed.phrases.map((p) => String(p).trim()).filter(Boolean).slice(0, 25)
    : [];

  if (!phrases.length) {
    return { phrases: [word], source: "openrouter-no-phrases" };
  }

  return { phrases, source: "openrouter" };
}
