// ================================================================
// CanadaFirst Content Script
// Scans Amazon.ca pages, injects brand tags, renders popout cards
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

type BrandRegistry = Record<string, BrandData>;

// ================================================================
// STATE
// ================================================================
let brands: BrandRegistry = {};
let tagCount = 0;
let popoutEl: HTMLDivElement | null = null;

// ================================================================
// TAG CREATION
// ================================================================

function createMapleTag(brandKey: string): HTMLSpanElement {
  const tag = document.createElement("span");
  tag.className = "cf-tag-maple cf-tag-animate";
  tag.textContent = "\u{1F341}";
  tag.dataset.brand = brandKey;
  tag.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showPopout(e, brandKey);
  });
  return tag;
}

function createRecTag(brandKey: string, alt: BrandAlt): HTMLSpanElement {
  const tag = document.createElement("span");
  tag.className = "cf-tag-rec cf-tag-animate";
  tag.innerHTML = `<span class="cf-tag-leaf">\u{1F341}</span>${alt.shortName}, ${alt.province}`;
  tag.dataset.brand = brandKey;
  tag.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showPopout(e, brandKey);
  });
  return tag;
}

// ================================================================
// POPOUT
// ================================================================

function ensurePopoutEl(): HTMLDivElement {
  if (popoutEl) return popoutEl;
  popoutEl = document.createElement("div");
  popoutEl.className = "cf-popout";
  popoutEl.addEventListener("click", (e) => e.stopPropagation());
  document.body.appendChild(popoutEl);

  // Dismiss popout when clicking outside
  document.addEventListener("click", () => hidePopout());
  return popoutEl;
}

function showPopout(e: MouseEvent, brandKey: string): void {
  const data = brands[brandKey];
  if (!data) return;

  const el = ensurePopoutEl();
  const rect = (e.target as HTMLElement).getBoundingClientRect();
  const popoutH = 290;
  const spaceBelow = window.innerHeight - rect.bottom;

  let top: number;
  if (spaceBelow > popoutH + 20) {
    top = rect.bottom + 8 + window.scrollY;
  } else {
    top = rect.top - popoutH - 8 + window.scrollY;
    if (top < window.scrollY) top = window.scrollY + 10;
  }

  let left = rect.left - 140 + window.scrollX;
  left = Math.max(10, Math.min(left, window.innerWidth - 320 + window.scrollX));

  el.style.left = left + "px";
  el.style.top = top + "px";

  if (data.canadian) {
    el.innerHTML = buildCanadianPopout(brandKey, data);
  } else {
    el.innerHTML = buildNonCanadianPopout(brandKey, data);
  }

  // Wire close button
  const closeBtn = el.querySelector(".cf-popout-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      hidePopout();
    });
  }

  // Wire CTA button → open sidebar
  const ctaBtn = el.querySelector(".cf-popout-cta");
  if (ctaBtn) {
    ctaBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      hidePopout();
      onCtaClick(brandKey);
    });
  }

  el.classList.add("cf-visible");
}

function buildCanadianPopout(brandKey: string, data: BrandData): string {
  return `
    <button class="cf-popout-close">\u2715</button>
    <div class="cf-popout-photos">
      <div class="cf-popout-photo cf-scenic" style="background:${data.scenicImg};display:flex;align-items:flex-end;padding:6px 8px;">
        <span style="font-size:9px;color:white;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.5);">${data.scenicLabel}</span>
      </div>
      <div class="cf-popout-photo" style="background:${data.producerImg};display:flex;align-items:flex-end;padding:6px 8px;">
        <span style="font-size:9px;color:white;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.5);">${data.producerLabel}</span>
      </div>
    </div>
    <div class="cf-popout-body">
      <div class="cf-popout-flag" style="background:var(--cf-green-50);color:var(--cf-green-700);">\u{1F1E8}\u{1F1E6} Canadian</div>
      <div class="cf-popout-name">${brandKey}</div>
      <div class="cf-popout-loc">\u{1F4CD} ${data.hq}</div>
      <div class="cf-popout-story">${data.storyHook || ""}</div>
      <button class="cf-popout-cta" data-brand="${brandKey}">
        Chat with agent <span class="cf-arrow">\u2192</span>
      </button>
    </div>
  `;
}

function buildNonCanadianPopout(brandKey: string, data: BrandData): string {
  const a = data.alt!;
  return `
    <button class="cf-popout-close">\u2715</button>
    <div class="cf-popout-photos">
      <div class="cf-popout-photo cf-scenic" style="background:${a.scenicImg};display:flex;align-items:flex-end;padding:6px 8px;">
        <span style="font-size:9px;color:white;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.5);">${a.scenicLabel}</span>
      </div>
      <div class="cf-popout-photo" style="background:${a.producerImg};display:flex;align-items:flex-end;padding:6px 8px;">
        <span style="font-size:9px;color:white;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,0.5);">${a.producerLabel}</span>
      </div>
    </div>
    <div class="cf-popout-body">
      <div class="cf-popout-flag" style="background:var(--cf-red-50);color:var(--cf-red-700);">\u{1F341} Canadian Alternative</div>
      <div class="cf-popout-name">${a.brand}</div>
      <div class="cf-popout-loc">\u{1F4CD} ${a.origin}</div>
      <div class="cf-popout-replaces" style="font-size:11px;color:var(--cf-warm-400);margin-bottom:6px;">Replaces: ${brandKey} \u00B7 ${a.price}</div>
      <div class="cf-popout-story">${a.storyHook}</div>
      <button class="cf-popout-cta" data-brand="${brandKey}">
        Compare & learn more <span class="cf-arrow">\u2192</span>
      </button>
    </div>
  `;
}

function hidePopout(): void {
  if (popoutEl) popoutEl.classList.remove("cf-visible");
}

// ================================================================
// CTA → OPEN SIDEBAR
// ================================================================

function onCtaClick(brandKey: string): void {
  const data = brands[brandKey];
  if (!data) return;
  chrome.runtime.sendMessage({
    type: "OPEN_SIDEBAR",
    brandKey: brandKey,
    brandData: data,
  });
}

// ================================================================
// DOM WALKER — find text nodes containing brand names
// ================================================================

function highlightBrandNode(textNode: Text, trie: Trie): void {
  const text = textNode.nodeValue;
  if (!text) return;

  const matches = trie.findMatches(text);
  if (matches.length === 0) return;

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;

  for (const { index, length } of matches) {
    const brandName = text.slice(index, index + length);
    const brandKey = findBrandKey(brandName);
    if (!brandKey) continue;

    const data = brands[brandKey];
    if (!data) continue;

    if (index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, index)));
    }

    fragment.appendChild(document.createTextNode(brandName));

    if (data.canadian) {
      const tag = createMapleTag(brandKey);
      fragment.appendChild(tag);
    } else if (data.alt) {
      const tag = createRecTag(brandKey, data.alt);
      fragment.appendChild(tag);
    }

    tagCount++;
    lastIndex = index + length;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  textNode.parentNode!.replaceChild(fragment, textNode);
}

function findBrandKey(matchedText: string): string | null {
  const lower = matchedText.toLowerCase();
  for (const key of Object.keys(brands)) {
    if (key.toLowerCase() === lower) return key;
  }
  return null;
}

function walkTextNodes(root: Node, trie: Trie): void {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node: Node): number {
        const tag = (node as Text).parentElement?.tagName;
        if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "MARK", "CF-TAG"].includes(tag ?? "")) {
          return NodeFilter.FILTER_REJECT;
        }
        // Skip already-tagged elements
        const parent = (node as Text).parentElement;
        if (parent?.classList.contains("cf-tag-maple") || parent?.classList.contains("cf-tag-rec")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((node) => highlightBrandNode(node, trie));
}

// ================================================================
// SCAN LINE ANIMATION
// ================================================================

function showScanLine(): void {
  const scanLine = document.createElement("div");
  scanLine.className = "cf-scan-line";
  document.body.appendChild(scanLine);
  scanLine.addEventListener("animationend", () => scanLine.remove());
}

// ================================================================
// BADGE UPDATE
// ================================================================

function updateBadge(): void {
  chrome.runtime.sendMessage({
    type: "UPDATE_BADGE",
    count: tagCount,
  });
}

// ================================================================
// INIT
// ================================================================

const BACKEND_URL = "http://localhost:8787";

async function tryBackendDetection(backendUrl: string): Promise<BrandRegistry | null> {
  try {
    const pageText = (document.body.innerText || "").slice(0, 50000);
    const res = await fetch(`${backendUrl}/api/detect-brands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: pageText }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.brands && Object.keys(data.brands).length > 0) {
      return data.brands as BrandRegistry;
    }
    return null;
  } catch {
    return null;
  }
}

async function loadLocalBrands(): Promise<BrandRegistry> {
  const url = chrome.runtime.getURL("brands.json");
  const response = await fetch(url);
  return await response.json();
}

async function init(): Promise<void> {
  try {
    // Try backend first, fall back to local brands.json
    const backendBrands = await tryBackendDetection(BACKEND_URL);
    if (backendBrands) {
      brands = backendBrands;
      console.log(`[CanadaFirst] Loaded ${Object.keys(brands).length} brands from backend`);
    } else {
      brands = await loadLocalBrands();
      console.log(`[CanadaFirst] Using local brands.json (${Object.keys(brands).length} brands)`);
    }

    const trie = new Trie();
    for (const name of Object.keys(brands)) {
      trie.insert(name);
    }

    // Show scan line animation
    showScanLine();

    // Inject tags after scan line starts
    setTimeout(() => {
      walkTextNodes(document.body, trie);
      updateBadge();
    }, 500);
  } catch (e) {
    console.error("[CanadaFirst] Init failed:", e);
  }
}

init();
