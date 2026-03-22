// ================================================================
// CanadaFirst Side Panel — Scripted Flow (Phase 1)
// ================================================================

interface BrandAlt {
  name: string;
  brand: string;
  shortName: string;
  province: string;
  price: string;
  pricePerG: string;
  shipping: string;
  origin: string;
  story: string;
  storyHook: string;
  storyLoc: string;
  scenicImg: string;
  scenicLabel: string;
  producerImg: string;
  producerLabel: string;
}

interface BrandData {
  canadian: boolean;
  flag: string;
  owner: string;
  hq: string;
  story?: string;
  storyHook?: string;
  storyLoc?: string;
  scenicImg?: string;
  scenicLabel?: string;
  producerImg?: string;
  producerLabel?: string;
  alt?: BrandAlt;
}

// ================================================================
// DOM REFS
// ================================================================
const sbMessages = document.getElementById("sbMessages") as HTMLDivElement;
const sbInput = document.getElementById("sbInput") as HTMLInputElement;
const sbSend = document.getElementById("sbSend") as HTMLButtonElement;

// ================================================================
// HELPERS
// ================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function scrollSB(): void {
  requestAnimationFrame(() => {
    sbMessages.scrollTop = sbMessages.scrollHeight;
  });
}

function addTyping(): void {
  const d = document.createElement("div");
  d.className = "typing";
  d.id = "typ";
  d.innerHTML = '<div class="td"></div><div class="td"></div><div class="td"></div>';
  sbMessages.appendChild(d);
  scrollSB();
}

function removeTyping(): void {
  const t = document.getElementById("typ");
  if (t) t.remove();
}

function addM(type: string, html: string): void {
  removeTyping();
  const d = document.createElement("div");
  d.className = `m ${type}`;
  const mockLabel = type === "agent" ? `<div class="m-mock-label">Demo response</div>` : "";
  d.innerHTML = `<div class="m-bubble">${html}</div>${mockLabel}`;
  sbMessages.appendChild(d);
  scrollSB();
}

function addHTML(html: string): HTMLElement {
  removeTyping();
  const w = document.createElement("div");
  w.innerHTML = html;
  const el = w.firstElementChild as HTMLElement;
  sbMessages.appendChild(el);
  scrollSB();
  return el;
}

function clearMessages(): void {
  sbMessages.innerHTML = "";
}

// ================================================================
// SIDEBAR FLOWS
// ================================================================

async function openSidebarFor(brandKey: string, data: BrandData): Promise<void> {
  clearMessages();

  await sleep(300);
  addTyping();
  await sleep(1100);

  if (data.canadian) {
    // ---- CANADIAN ----
    addM(
      "agent",
      `You clicked on <strong>${brandKey}</strong> — great choice! Let me tell you about this one. 🍁`
    );
    addTyping();
    await sleep(1200);

    addHTML(`
      <div class="origin-card">
        <div class="oc-header">
          <div class="oc-flag ca">🇨🇦</div>
          <div class="oc-info">
            <div class="oc-name">${brandKey}</div>
            <div class="oc-detail ca">✓ Canadian — ${data.hq}</div>
          </div>
        </div>
      </div>
    `);
    await sleep(400);

    addM(
      "agent",
      `<span class="status-badge canadian">✓ Canadian</span><br><br><strong>${brandKey}</strong> is proudly Canadian! ${data.owner} is headquartered in ${data.hq}. You're supporting a Canadian brand. 🇨🇦`
    );
    addTyping();
    await sleep(1200);

    addHTML(`
      <div class="story-sb">
        <div class="st-hd">📖 The ${brandKey} Story</div>
        <div class="st-body">${data.story || ""}</div>
        <div class="st-loc">📍 ${data.storyLoc || ""}</div>
      </div>
    `);
    await sleep(400);

    addM(
      "agent",
      "Every Canadian purchase makes a difference! Want a badge to show your support?"
    );
    await sleep(200);
    const btn = addHTML(
      `<button class="gen-badge">🍁 Generate "We Buy Canadian" Badge</button>`
    );
    btn.addEventListener("click", () => genBadge(brandKey));
  } else {
    // ---- NOT CANADIAN ----
    addM(
      "agent",
      `I spotted <strong>${brandKey}</strong> — let me look that up for you...`
    );
    addTyping();
    await sleep(1300);

    addHTML(`
      <div class="origin-card">
        <div class="oc-header">
          <div class="oc-flag foreign">${data.flag}</div>
          <div class="oc-info">
            <div class="oc-name">${brandKey}</div>
            <div class="oc-detail foreign">Not Canadian — ${data.owner}, ${data.hq}</div>
          </div>
        </div>
      </div>
    `);
    await sleep(400);

    const a = data.alt!;
    addM(
      "agent",
      `<strong>${brandKey}</strong> is owned by ${data.owner}, based in ${data.hq}. But I've got a great Canadian alternative — <strong>${a.brand}</strong> from ${a.origin}! ${data.flag}→🇨🇦`
    );
    addTyping();
    await sleep(1600);

    addHTML(`
      <div class="cmp-card">
        <div class="cmp-title">⚖️ Side-by-Side</div>
        <div class="cmp-cols">
          <div class="cmp-col">
            <div class="cmp-label">${data.flag} Current</div>
            <div class="cmp-pname">${brandKey}</div>
            <div class="cmp-pbrand">${data.owner}</div>
            <div class="cmp-row"><span class="l">Origin</span><span class="v">${data.hq}</span></div>
          </div>
          <div class="cmp-col ca-col">
            <div class="cmp-label">🍁 Canadian</div>
            <div class="cmp-pname">${a.name}</div>
            <div class="cmp-pbrand">${a.brand}</div>
            <div class="cmp-row"><span class="l">Price</span><span class="v good">${a.price}</span></div>
            <div class="cmp-row"><span class="l">Shipping</span><span class="v">${a.shipping}</span></div>
            <div class="cmp-row"><span class="l">Origin</span><span class="v good">${a.origin} 🇨🇦</span></div>
          </div>
        </div>
        <div class="cmp-note">💡 Support Canadian — switch to ${a.brand}!</div>
      </div>
    `);
    await sleep(500);

    addHTML(`
      <div class="story-sb">
        <div class="st-hd">📖 The ${a.brand} Story</div>
        <div class="st-body">${a.story}</div>
        <div class="st-loc">📍 ${a.storyLoc}</div>
      </div>
    `);
    await sleep(400);

    const qaEl = addHTML(`
      <div class="qa">
        <button class="qa-btn" data-action="more" data-brand="${brandKey}">What else do they make?</button>
        <button class="qa-btn" data-action="similar" data-brand="${brandKey}">Similar Canadian brands?</button>
        <button class="qa-btn" data-action="local" data-brand="${brandKey}">Where to buy locally?</button>
      </div>
    `);
    qaEl.querySelectorAll(".qa-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const target = e.currentTarget as HTMLElement;
        handleQA(
          target.dataset.action!,
          target.dataset.brand!,
          data
        );
      });
    });
    await sleep(200);

    const badgeBtn = addHTML(
      `<button class="gen-badge">🍁 Generate "We Buy Canadian" Badge</button>`
    );
    badgeBtn.addEventListener("click", () => genBadge(a.brand));
  }
}

// ================================================================
// BADGE GENERATION
// ================================================================

async function genBadge(brandName: string): Promise<void> {
  document.querySelectorAll(".gen-badge").forEach((b) => b.remove());
  addM("user", "Generate my badge!");
  addTyping();
  await sleep(1000);
  addM("agent", "Here's your badge — share it proudly! 🇨🇦");
  await sleep(200);
  addHTML(`
    <div class="badge-card">
      <div class="b-maple">🍁</div>
      <div class="b-title">We Buy Canadian</div>
      <div class="b-prod">${brandName}</div>
      <div class="b-line"></div>
    </div>
  `);
}

// ================================================================
// QA HANDLER
// ================================================================

async function handleQA(action: string, brandKey: string, data: BrandData): Promise<void> {
  document.querySelectorAll(".qa").forEach((q) => q.remove());
  if (!data.alt) return;

  if (action === "more") {
    addM("user", `What else does ${data.alt.brand} make?`);
    addTyping();
    await sleep(1200);
    addM(
      "agent",
      `${data.alt.brand} has a great lineup! They offer several roast profiles and blends — check their website for the full collection. Most are available on Amazon.ca too. All roasted in ${data.alt.origin}. 🇨🇦`
    );
  } else if (action === "similar") {
    addM("user", "Any similar Canadian brands?");
    addTyping();
    await sleep(1200);
    addM(
      "agent",
      `Here are more Canadian options:<br><br>☕ <strong>Kicking Horse</strong> — Invermere, BC<br>☕ <strong>Salt Spring Coffee</strong> — Salt Spring Island, BC<br>☕ <strong>Ethical Bean</strong> — Vancouver, BC<br>☕ <strong>Pilot Coffee</strong> — Toronto, ON<br>☕ <strong>Detour Coffee</strong> — Hamilton, ON<br><br>All roasted in Canada! 🍁`
    );
  } else {
    addM("user", "Where can I buy locally?");
    addTyping();
    await sleep(1200);
    addM(
      "agent",
      `In the Vancouver area, find Canadian coffee at <strong>Save-On-Foods</strong>, <strong>Whole Foods</strong>, <strong>Choices Markets</strong>, and <strong>London Drugs</strong>. Most roasters also ship free across Canada! 📦`
    );
  }
}

// ================================================================
// FREE TEXT INPUT
// ================================================================

async function handleInput(): Promise<void> {
  const text = sbInput.value.trim();
  if (!text) return;
  sbInput.value = "";
  addM("user", text);
  addTyping();
  await sleep(1200);
  const lower = text.toLowerCase();
  if (lower.includes("honey") || lower.includes("maple")) {
    addM(
      "agent",
      `For <strong>Canadian honey</strong>, try <strong>Billy Bee</strong> from Stoney Creek, Ontario — buzzing since 1956! 🐝 For <strong>maple syrup</strong>, <strong>Escuminac</strong> from Quebec is incredible. Want a comparison?`
    );
  } else {
    addM(
      "agent",
      `Great question! In the demo I cover coffee brands on this page. Try clicking any 🍁 tag or recommendation tag to see the full flow. More categories coming soon! 🍁`
    );
  }
}

sbSend.addEventListener("click", handleInput);
sbInput.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Enter") handleInput();
});

// ================================================================
// MESSAGE LISTENER — receive brand context from background
// ================================================================

chrome.runtime.onMessage.addListener(
  (
    message: { type: string; brandKey?: string; brandData?: BrandData },
    _sender: chrome.runtime.MessageSender,
    _sendResponse: (response?: any) => void
  ) => {
    if (message.type === "BRAND_CONTEXT" && message.brandKey && message.brandData) {
      openSidebarFor(message.brandKey, message.brandData);
    }
  }
);
