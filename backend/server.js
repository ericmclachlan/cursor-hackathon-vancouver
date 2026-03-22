import "dotenv/config";
import express from "express";
import { runAgent } from "./agent.js";

const PORT = Number(process.env.PORT || 8787);
const app = express();

app.set("trust proxy", 1);

app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.type("text/plain").send(
    "Word highlighter API is running. POST /api/highlight (JSON). Browser test page: GET /playground (same origin — avoids other sites’ CSP blocking localhost)."
  );
});

app.get("/playground", (_req, res) => {
  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Highlight API playground</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 52rem; margin: 1.5rem auto; padding: 0 1rem; }
    label { display: block; margin-top: 1rem; font-weight: 600; }
    textarea { width: 100%; min-height: 6rem; font-family: inherit; }
    button { margin-top: 1rem; padding: 0.5rem 1rem; cursor: pointer; }
    pre { background: #f4f4f4; padding: 1rem; overflow: auto; border-radius: 6px; }
    .note { color: #444; font-size: 0.9rem; margin-top: 1.5rem; }
  </style>
</head>
<body>
  <h1>POST /api/highlight</h1>
  <p>This page is served from <strong>this same server</strong>, so <code>fetch</code> is same-origin and is not blocked by another site’s Content-Security-Policy.</p>
  <label for="text">Sample page text</label>
  <textarea id="text">your cat and your dog went to the park.</textarea>
  <label for="goal">Goal (sent to the agent)</label>
  <textarea id="goal" rows="2">Highlight salient phrases.</textarea>
  <label for="fallback">Fallback word if agent is off</label>
  <input id="fallback" type="text" value="your" style="width: 12rem" />
  <div>
    <button type="button" id="run">Run highlight request</button>
  </div>
  <label for="out">Response JSON</label>
  <pre id="out">(click Run)</pre>
  <p class="note">Running <code>fetch('http://localhost:8787/…')</code> from DevTools on <em>other</em> domains often fails: their CSP only allows <code>'self'</code>, and localhost is not their origin.</p>
  <script>
    document.getElementById("run").onclick = async () => {
      const text = document.getElementById("text").value;
      const goal = document.getElementById("goal").value;
      const fallbackWord = document.getElementById("fallback").value || "your";
      const out = document.getElementById("out");
      out.textContent = "Loading…";
      try {
        const r = await fetch("/api/highlight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goal,
            chunks: [{ id: "0", text }],
            fallbackWord,
          }),
        });
        const data = await r.json();
        out.textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        out.textContent = String(e);
      }
    };
  </script>
</body>
</html>`);
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, agent: process.env.OPENROUTER_API_KEY ? "openrouter" : "fallback" });
});

app.post("/api/highlight", async (req, res) => {
  try {
    const { goal, chunks, fallbackWord } = req.body || {};
    if (!Array.isArray(chunks) || !chunks.length) {
      return res.status(400).json({ error: "chunks array required", phrases: [] });
    }
    const normalized = chunks
      .map((c, i) => ({
        id: String(c?.id ?? i),
        text: String(c?.text ?? ""),
      }))
      .filter((c) => c.text.trim());

    const result = await runAgent({
      goal: typeof goal === "string" ? goal : "",
      chunks: normalized.slice(0, 80),
      fallbackWord: typeof fallbackWord === "string" ? fallbackWord : "your",
    });

    res.json({
      phrases: result.phrases,
      source: result.source,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      error: e?.message || "server error",
      phrases: [String(req.body?.fallbackWord || "your")],
      source: "error",
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(
    `Word highlighter API on http://localhost:${PORT} (agent: ${process.env.OPENROUTER_API_KEY ? "OpenRouter" : "fallback"})`
  );
});

server.on("error", (err) => {
  if (err?.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the other process or run: PORT=8788 npm start (and set BACKEND_URL in extention/config.js + host_permissions in manifest.json).`
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
