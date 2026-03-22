# CanadaFirst Chrome Extension — Implementation Plan

## Context

CanadaFirst is a Chrome extension for the Cursor Hackathon Vancouver (March 23, 2026). The team has a comprehensive PRD and a working HTML prototype (`docs/frontend_reference.html`) with all UI components, brand data, and interaction logic. The existing codebase has a basic "Word Highlighter" Chrome extension scaffold with a Trie-based pattern matcher. The goal is to transform this into the full CanadaFirst extension with a three-tier interaction model: inline tags → hover popout → sidebar agent chat.

**Reference docs**:
- PRD: `docs/PRD: CanadaFirst — Buy Canadian Shopping Companion.md`
- UI Prototype: `docs/frontend_reference.html` (open in browser to see the full working prototype)

---

## Architecture

```
Content Script (on Amazon.ca)          Background SW           Side Panel
─────────────────────────────          ─────────────           ──────────
  Scan DOM with Trie matcher           Route messages          Chat UI
  Inject tags (maple/rec)              Update badge count      Origin cards
  Render popout on hover               Open side panel         Comparison cards
  Send brandKey on CTA click  ──────>  Forward context  ────>  Story + Badge
                                                               Call Backend API
                                                                     │
                                                          ┌──────────▼──────────┐
                                                          │  Backend (FastAPI)   │
                                                          │  Brand lookup + LLM  │
                                                          │  via OpenRouter      │
                                                          └─────────────────────┘
```

### Message Flow

1. **Content Script → Background**: `chrome.runtime.sendMessage({ type: 'OPEN_SIDEBAR', brandKey, brandData })`
2. **Background → Side Panel**: `chrome.runtime.sendMessage({ type: 'BRAND_CONTEXT', brandKey, brandData })`
3. **Background**: Also handles `UPDATE_BADGE` → `chrome.action.setBadgeText()`
4. **Side Panel → Backend**: `POST /api/chat` with `{ brandKey, message, history, sessionId }`

---

## Target File Structure

```
extention/
  manifest.json          # UPDATE: add side_panel, background, permissions, css
  trie.ts                # KEEP: as-is (add CF-TAG to skip list)
  content.ts             # REWRITE: tag injection + popout + scan animation
  brands.json            # NEW: full brand registry (replace config.json)
  styles.css             # NEW: extracted from prototype (tags, popout, scan line)
  background.ts          # NEW: service worker, message routing, badge
  sidepanel/
    sidepanel.html       # NEW: side panel shell
    sidepanel.css        # NEW: sidebar CSS from prototype
    sidepanel.ts         # NEW: chat UI, cards, flows, API calls
backend/
  main.py                # NEW: FastAPI server
  prompts.py             # NEW: LLM prompt templates
  requirements.txt       # NEW: fastapi, uvicorn, httpx
```

---

## Phase 1: Frontend MVP with Mock Data

Delivers the complete frontend — content script tags, popouts, side panel UI — all working end-to-end with hardcoded/mock brand data. No backend required.

### Extension Scaffold

1. **Update `extention/manifest.json`**
   - Add `"side_panel": { "default_path": "sidepanel/sidepanel.html" }`
   - Add `"background": { "service_worker": "background.js" }`
   - Add `"permissions": ["sidePanel", "activeTab"]`
   - Add `"action": {}` for toolbar icon + badge
   - Add `styles.css` to content_scripts css array
   - Update js array: `["trie.js", "content.js"]`
   - Add `sidepanel/` to `web_accessible_resources`

2. **Update `package.json` build script** to copy `styles.css`, `brands.json`, `sidepanel/`

### Brand Data (Mock)

1. **Create `extention/brands.json`**
   - Start with 6 brands from prototype `BRANDS` object (`frontend_reference.html` lines 1059-1202)
   - Schema per brand:
     ```json
     {
       "name": "string",
       "canadian": true/false,
       "flag": "emoji",
       "owner": "string",
       "hq": "string",
       "story": "2-3 sentences",
       "storyHook": "1 sentence",
       "storyLoc": "string",
       "scenicImg": "CSS gradient string",
       "scenicLabel": "string",
       "producerImg": "CSS gradient string",
       "producerLabel": "string",
       "alt": {
         "name": "product name",
         "brand": "brand name",
         "shortName": "display name",
         "province": "XX",
         "price": "$X.XX / Xg",
         "pricePerG": "$X.XX/100g",
         "shipping": "string",
         "origin": "City, Province",
         "story": "2-3 sentences",
         "storyLoc": "string",
         "storyHook": "1 sentence",
         "scenicImg": "CSS gradient",
         "scenicLabel": "string",
         "producerImg": "CSS gradient",
         "producerLabel": "string"
       }
     }
     ```
   - `alt` field only present on non-Canadian brands

### Content Script

1. **Rewrite `extention/content.ts`**
   - Load `brands.json` via `chrome.runtime.getURL`
   - Build Trie from brand name keys
   - Replace `<mark>` wrapping with tag injection (maple leaf or recommendation pill)
   - Add scan line animation before tag injection
   - Add popout rendering on hover (position logic from prototype `frontend_reference.html` lines 1356-1373)
   - Popout templates: Canadian (lines 1378-1398) and non-Canadian (lines 1400-1422)
   - CTA click sends `chrome.runtime.sendMessage({ type: 'OPEN_SIDEBAR', brandKey })`
   - Add 220ms hide delay for popout (lines 1429-1434)

### Styles

1. **Create `extention/styles.css`** — extract from `frontend_reference.html`:
   - CSS variables (`:root` block, lines 15-49)
   - Tag styles: `.tag-maple`, `.tag-rec` (lines 324-391)
   - Popout styles: `.popout`, `.popout-*` (lines 396-493)
   - Scan line: `.scan-line` (lines 957-986)
   - Animations: `@keyframes tagPop`, `@keyframes scanDown`
   - **Prefix all classes** with `cf-` to avoid CSS conflicts with host page

### Background Service Worker

1. **Create `extention/background.ts`**
   - Route messages: `OPEN_SIDEBAR` → `chrome.sidePanel.open()` + forward brand context
   - `UPDATE_BADGE` → `chrome.action.setBadgeText()`

### Side Panel UI + Logic (Scripted Flow)

1. **Create `extention/sidepanel/sidepanel.html`**
   - Google Fonts (Fraunces + DM Sans)
   - Header: logo + "CanadaFirst" + close button
   - Messages container
   - Input bar with text input + send button

2. **Create `extention/sidepanel/sidepanel.css`** — extract from `frontend_reference.html`:
   - Sidebar layout: `.sb-header`, `.sb-messages`, `.sb-input-bar` (lines 516-621)
   - Messages: `.m`, `.m-bubble` (lines 623-662)
   - Origin card: `.origin-card`, `.oc-*` (lines 682-725)
   - Comparison card: `.cmp-card`, `.cmp-*` (lines 727-806)
   - Story card: `.story-sb`, `.st-*` (lines 808-837)
   - Badge card: `.badge-card`, `.b-*` (lines 863-905)
   - QA buttons (`.qa`, `.qa-btn`), generate badge button (`.gen-badge`)
   - Typing indicator (`.typing`, `.td`)
   - Status badges (`.status-badge`)

3. **Create `extention/sidepanel/sidepanel.ts`** — port from `frontend_reference.html`:
   - Listen for `BRAND_CONTEXT` messages from background via `chrome.runtime.onMessage`
   - `openSidebarFor(brandKey)` flow (prototype lines 1504-1640)
   - Helper functions: `addM()`, `addHTML()`, `addTyping()`, `scrollSB()`
   - `genBadge()` (lines 1642-1657)
   - `handleQA()` (lines 1659-1689)
   - Free-text `handleInput()` (lines 1692-1711)
   - Use scripted flow (hardcoded responses with sleeps) — same as prototype

---

## Phase 2: Backend & LLM Integration

### Backend Server

1. **Scaffold FastAPI backend** (`backend/main.py`)
   - `POST /api/chat` — receives `{ brandKey, message, history }`, returns agent response
   - `GET /api/brand/{name}` — returns brand data
   - `POST /api/compare` — returns structured comparison
   - Load brands from JSON at startup
   - Add CORS middleware for extension access

2. **Write prompt templates** (`backend/prompts.py`)
   - System prompt: CanadaFirst agent persona (friendly, warm, knowledgeable)
   - Origin classification, comparison, storytelling, follow-up prompts

### LLM Integration

1. Implement OpenRouter API call (`POST https://openrouter.ai/api/v1/chat/completions`)
2. Use fast model (e.g., `anthropic/claude-3.5-haiku`)
3. In-memory conversation session store

### Side Panel → Backend Wiring

1. Replace scripted flow in `sidepanel.ts` with real API calls to backend
2. Add fallback mode (scripted responses) if backend is unreachable

### Brand Data Expansion

1. Expand `brands.json` to 15-20 brands (coffee + honey/maple syrup)

### End-to-End Wiring

1. Wire content script → background → side panel message flow
2. Test on `amazon.ca/s?k=coffee+ground`
3. Handle Amazon DOM quirks (text nodes in product cards)

---

## Phase 3: Demo Polish

1. End-to-end demo flow rehearsal on Amazon.ca
2. CSS conflict fixes with Amazon's styles
3. Popout positioning edge cases
4. Animation smoothness
5. Agent response quality tuning
6. Fallback reliability (if backend down, scripted flow works)

---

## Key Reuse Points from Prototype

The `docs/frontend_reference.html` file contains ALL the UI code. Here's what to extract:

| Source (prototype) | Target | Prototype Lines |
|-|-|-|
| `BRANDS` object | `extention/brands.json` | 1059-1202 |
| `PRODUCTS` array | `extention/brands.json` (product entries) | 1204-1271 |
| Tag CSS (`.tag-maple`, `.tag-rec`) | `extention/styles.css` | 324-391 |
| Popout CSS + positioning logic | `extention/styles.css` + `content.ts` | 396-493, 1349-1427 |
| Tag injection JS | `extention/content.ts` | 1296-1334 |
| Popout show/hide JS | `extention/content.ts` | 1345-1434 |
| Sidebar CSS | `extention/sidepanel/sidepanel.css` | 498-955 |
| Sidebar flow logic | `extention/sidepanel/sidepanel.ts` | 1443-1722 |
| Scan line animation | `extention/styles.css` | 957-986 |

---

## Critical Files to Modify

- `extention/manifest.json` — Add side_panel, background, permissions
- `extention/content.ts` — Full rewrite: tag injection + popout
- `extention/trie.ts` — Minor: add tagged elements to skip list
- `package.json` — Update build script for new files
- `tsconfig.json` — May need to add sidepanel dir to includes

## New Files to Create

- `extention/styles.css` — All content script CSS
- `extention/brands.json` — Brand registry
- `extention/background.ts` — Service worker
- `extention/sidepanel/sidepanel.html` — Side panel shell
- `extention/sidepanel/sidepanel.css` — Side panel styles
- `extention/sidepanel/sidepanel.ts` — Side panel logic
- `backend/main.py` — FastAPI server
- `backend/prompts.py` — LLM prompts
- `backend/requirements.txt` — Python dependencies

---

## Risk Mitigation

1. **LLM unreachable**: Build scripted fallback FIRST (port prototype's hardcoded flow), layer LLM on top
2. **Amazon DOM**: Trie text-walker is DOM-structure agnostic. Test early on actual page.
3. **CSS conflicts**: Prefix all classes with `cf-`. Use `!important` sparingly for critical properties.
4. **Side panel API**: `chrome.sidePanel.open()` needs user gesture — popout CTA click and toolbar icon click both qualify

---

## Verification Checklist

- [ ] Load unpacked extension from `dist/` in Chrome
- [ ] Navigate to `amazon.ca/s?k=coffee+ground`
- [ ] Scan line plays → tags appear staggered next to brand names
- [ ] Hover maple leaf tag → Canadian popout with photos + story hook
- [ ] Hover recommendation tag → alternative brand popout with "Compare & learn more"
- [ ] Click CTA → side panel opens with correct brand context
- [ ] Non-Canadian flow: origin card → comparison card → story → badge
- [ ] Canadian flow: origin card → story → badge
- [ ] Free-text input works in sidebar
- [ ] Badge generates correctly with brand name and location
- [ ] Full demo completes in under 2 minutes
