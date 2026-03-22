# CanadaFirst API Reference

Team contract for Eric (extension), Dako (backend/data), Sylvia (frontend/sidebar).

---

## Table of Contents

1. [Data Models](#1-data-models)
2. [Chrome Extension Messaging API](#2-chrome-extension-messaging-api)
3. [Backend REST API](#3-backend-rest-api)
4. [brands.json Schema](#4-brandsjson-schema)

---

## 1. Data Models

### Brand (Canadian)

```typescript
interface CanadianBrand {
  canadian: true;
  flag: string;           // "🇨🇦"
  owner: string;          // "Kicking Horse Coffee Co."
  hq: string;             // "Invermere, British Columbia"
  story: string;          // 2-3 sentence origin story
  storyHook: string;      // 1 sentence hook for popout
  storyLoc: string;       // "Invermere, BC — Canadian Rockies"
  scenicImg: string;      // CSS gradient for scenic photo placeholder
  scenicLabel: string;    // "🏔️ Canadian Rockies, BC"
  producerImg: string;    // CSS gradient for producer photo placeholder
  producerLabel: string;  // "☕ Elana & Leo, Founders"
}
```

### Brand (Non-Canadian)

```typescript
interface NonCanadianBrand {
  canadian: false;
  flag: string;           // "🇺🇸", "🇮🇹", "🇨🇭"
  owner: string;          // "J.M. Smucker Co."
  hq: string;             // "Orrville, Ohio, USA"
  alt: CanadianAlternative;
}
```

### CanadianAlternative

The `alt` object on non-Canadian brands — the Canadian product recommended as a replacement.

```typescript
interface CanadianAlternative {
  name: string;           // "Kicking Horse — Kick Ass Dark Roast"
  brand: string;          // "Kicking Horse Coffee"
  shortName: string;      // "Kicking Horse" (for compact display)
  province: string;       // "BC"
  price: string;          // "$11.49 / 454g"
  pricePerG: string;      // "$2.53/100g"
  shipping: string;       // "Free (Prime)"
  origin: string;         // "Invermere, BC"
  story: string;          // 2-3 sentence origin story
  storyLoc: string;       // "Invermere, BC — heart of the Canadian Rockies"
  storyHook: string;      // 1 sentence hook
  scenicImg: string;      // CSS gradient
  scenicLabel: string;    // "🏔️ Canadian Rockies, BC"
  producerImg: string;    // CSS gradient
  producerLabel: string;  // "☕ Elana & Leo, Founders"
}
```

### Brand (Union type)

```typescript
type Brand = CanadianBrand | NonCanadianBrand;

// brands.json is a Record<string, Brand> keyed by brand name
type BrandRegistry = Record<string, Brand>;
```

### ChatMessage

```typescript
interface ChatRequest {
  brandKey: string;       // "Folgers"
  message: string;        // user's message text
  history: ChatTurn[];    // conversation history
  sessionId: string;      // UUID, generated client-side
}

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  content: string;                    // text message to display
  cardType?: "origin" | "comparison" | "story" | "badge";
  cardData?: OriginCard | ComparisonCard | StoryCard | BadgeCard;
  suggestedQuestions?: string[];      // follow-up buttons
}
```

### Card Types (sidebar)

```typescript
interface OriginCard {
  brandName: string;
  canadian: boolean;
  flag: string;
  owner: string;
  hq: string;
}

interface ComparisonCard {
  original: {
    name: string;
    price: string;
    pricePerG: string;
    shipping: string;
    origin: string;       // e.g. "Orrville, Ohio, USA"
  };
  alternative: {
    name: string;
    shortName: string;
    province: string;
    price: string;
    pricePerG: string;
    shipping: string;
    origin: string;       // e.g. "Invermere, BC"
  };
}

interface StoryCard {
  story: string;
  storyLoc: string;
  scenicImg: string;
  scenicLabel: string;
  producerImg: string;
  producerLabel: string;
}

interface BadgeCard {
  brandName: string;
  origin: string;         // "Invermere, BC"
}
```

---

## 2. Chrome Extension Messaging API

All messages use `chrome.runtime.sendMessage()` and are received via `chrome.runtime.onMessage.addListener()`.

### Message Types

```typescript
type ExtensionMessage =
  | OpenSidebarMessage
  | UpdateBadgeMessage
  | BrandContextMessage;
```

### 2.1 `OPEN_SIDEBAR` — Content Script → Background

Sent when user clicks CTA in a popout card.

```typescript
interface OpenSidebarMessage {
  type: "OPEN_SIDEBAR";
  brandKey: string;       // "Folgers"
  brandData: Brand;       // full brand object from brands.json
}
```

**Background handler**:
1. Call `chrome.sidePanel.open({ tabId: sender.tab.id })`
2. Forward brand context to side panel via `BRAND_CONTEXT`

### 2.2 `UPDATE_BADGE` — Content Script → Background

Sent after content script finishes scanning the page.

```typescript
interface UpdateBadgeMessage {
  type: "UPDATE_BADGE";
  count: number;          // total brand matches found on page
}
```

**Background handler**:
```typescript
chrome.action.setBadgeText({ text: String(msg.count), tabId: sender.tab.id });
chrome.action.setBadgeBackgroundColor({ color: "#991b1b" });
```

### 2.3 `BRAND_CONTEXT` — Background → Side Panel

Forwarded from background after receiving `OPEN_SIDEBAR`.

```typescript
interface BrandContextMessage {
  type: "BRAND_CONTEXT";
  brandKey: string;
  brandData: Brand;
}
```

**Side panel handler**: Calls `openSidebarFor(brandKey)` to begin the conversation flow.

### Message Flow Diagram

```
User clicks CTA on popout
        │
        ▼
Content Script ──OPEN_SIDEBAR──▶ Background Service Worker
                                        │
                                        ├── chrome.sidePanel.open()
                                        │
                                        └── BRAND_CONTEXT ──▶ Side Panel
                                                                │
                                                                ▼
                                                        openSidebarFor(brandKey)
                                                                │
                                                        (scripted or API flow)

Page scan complete
        │
        ▼
Content Script ──UPDATE_BADGE──▶ Background Service Worker
                                        │
                                        └── chrome.action.setBadgeText()
```

---

## 3. Backend REST API

**Base URL**: `http://localhost:3000` (development)

**Framework**: Hono (Node.js / Bun)

**Auth**: None (hackathon MVP)

**CORS**: Allow `chrome-extension://*` origins

---

### 3.1 `POST /api/chat`

LLM-powered brand conversation. The primary endpoint for the sidebar agent.

**Request**:
```json
{
  "brandKey": "Folgers",
  "message": "Tell me about Canadian alternatives",
  "history": [
    { "role": "assistant", "content": "I see you're looking at Folgers..." },
    { "role": "user", "content": "Is there a Canadian option?" }
  ],
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response** (200):
```json
{
  "content": "Great question! Kicking Horse Coffee from Invermere, BC is an excellent Canadian alternative.",
  "cardType": "comparison",
  "cardData": {
    "original": {
      "name": "Folgers Classic Roast",
      "price": "$9.99 / 320g",
      "pricePerG": "$3.12/100g",
      "shipping": "Free (Prime)",
      "origin": "Orrville, Ohio, USA"
    },
    "alternative": {
      "name": "Kicking Horse — Kick Ass Dark Roast",
      "shortName": "Kicking Horse",
      "province": "BC",
      "price": "$11.49 / 454g",
      "pricePerG": "$2.53/100g",
      "shipping": "Free (Prime)",
      "origin": "Invermere, BC"
    }
  },
  "suggestedQuestions": [
    "Tell me the Kicking Horse story",
    "What else do they make?",
    "Where can I buy it?"
  ]
}
```

**Response** (500):
```json
{
  "error": "LLM service unavailable",
  "fallback": true
}
```

When `fallback: true`, the side panel should use its scripted flow instead.

---

### 3.2 `GET /api/brand/{name}`

Look up a single brand by name.

**Path parameter**: `name` — brand name (URL-encoded if needed, e.g. `Kicking%20Horse`)

**Response** (200):
```json
{
  "name": "Kicking Horse",
  "canadian": true,
  "flag": "🇨🇦",
  "owner": "Kicking Horse Coffee Co.",
  "hq": "Invermere, British Columbia",
  "story": "One of Canada's most iconic coffee brands...",
  "storyHook": "Organic coffee roasted in the Rockies since 1996...",
  "storyLoc": "Invermere, BC — Canadian Rockies",
  "scenicImg": "linear-gradient(135deg, #2d6a4f 0%, #74c69d 40%, #95d5b2 60%, #d8f3dc 100%)",
  "scenicLabel": "🏔️ Canadian Rockies, BC",
  "producerImg": "linear-gradient(135deg, #5c3a22 0%, #8b6f47 50%, #c9a96e 100%)",
  "producerLabel": "☕ Elana & Leo, Founders"
}
```

**Response** (404):
```json
{
  "error": "Brand not found: Kirkland"
}
```

---

### 3.3 `POST /api/compare`

Generate a structured comparison between a non-Canadian brand and its Canadian alternative.

**Request**:
```json
{
  "brandKey": "Folgers"
}
```

**Response** (200):
```json
{
  "original": {
    "name": "Folgers",
    "flag": "🇺🇸",
    "owner": "J.M. Smucker Co.",
    "hq": "Orrville, Ohio, USA"
  },
  "alternative": {
    "name": "Kicking Horse — Kick Ass Dark Roast",
    "brand": "Kicking Horse Coffee",
    "shortName": "Kicking Horse",
    "province": "BC",
    "price": "$11.49 / 454g",
    "pricePerG": "$2.53/100g",
    "shipping": "Free (Prime)",
    "origin": "Invermere, BC",
    "story": "Founded in 1996 by Elana Rosenfeld and Leo Johnson...",
    "storyHook": "Organic coffee roasted in the Rockies since '96...",
    "storyLoc": "Invermere, BC — heart of the Canadian Rockies"
  }
}
```

**Response** (400):
```json
{
  "error": "Brand is already Canadian: Kicking Horse"
}
```

---

## 4. brands.json Schema

File location: `extention/brands.json`

Top-level structure is `Record<string, Brand>` — keys are brand display names used for Trie matching.

### Full Example

```json
{
  "Folgers": {
    "canadian": false,
    "flag": "🇺🇸",
    "owner": "J.M. Smucker Co.",
    "hq": "Orrville, Ohio, USA",
    "alt": {
      "name": "Kicking Horse — Kick Ass Dark Roast",
      "brand": "Kicking Horse Coffee",
      "shortName": "Kicking Horse",
      "province": "BC",
      "price": "$11.49 / 454g",
      "pricePerG": "$2.53/100g",
      "shipping": "Free (Prime)",
      "origin": "Invermere, BC",
      "story": "Founded in 1996 by Elana Rosenfeld and Leo Johnson in Invermere, BC...",
      "storyLoc": "Invermere, BC — heart of the Canadian Rockies",
      "storyHook": "Organic coffee roasted in the Rockies since '96 — from a garage to a Canadian icon.",
      "scenicImg": "linear-gradient(135deg, #2d6a4f 0%, #74c69d 40%, #95d5b2 60%, #d8f3dc 100%)",
      "scenicLabel": "🏔️ Canadian Rockies, BC",
      "producerImg": "linear-gradient(135deg, #5c3a22 0%, #8b6f47 50%, #c9a96e 100%)",
      "producerLabel": "☕ Elana & Leo, Founders"
    }
  },
  "Kicking Horse": {
    "canadian": true,
    "flag": "🇨🇦",
    "owner": "Kicking Horse Coffee Co.",
    "hq": "Invermere, British Columbia",
    "story": "One of Canada's most iconic coffee brands! Founded in 1996...",
    "storyHook": "Organic coffee roasted in the Rockies since 1996...",
    "storyLoc": "Invermere, BC — Canadian Rockies",
    "scenicImg": "linear-gradient(135deg, #2d6a4f 0%, #74c69d 40%, #95d5b2 60%, #d8f3dc 100%)",
    "scenicLabel": "🏔️ Canadian Rockies, BC",
    "producerImg": "linear-gradient(135deg, #5c3a22 0%, #8b6f47 50%, #c9a96e 100%)",
    "producerLabel": "☕ Elana & Leo, Founders"
  }
}
```

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `canadian` | `boolean` | Yes | `true` = Canadian brand, `false` = non-Canadian |
| `flag` | `string` | Yes | Country flag emoji |
| `owner` | `string` | Yes | Parent company name |
| `hq` | `string` | Yes | Headquarters location |
| `story` | `string` | Canadian only | 2-3 sentence origin story |
| `storyHook` | `string` | Canadian only | 1 sentence hook for popout card |
| `storyLoc` | `string` | Canadian only | Location label for story card |
| `scenicImg` | `string` | Canadian only | CSS gradient for scenic photo placeholder |
| `scenicLabel` | `string` | Canadian only | Caption for scenic photo |
| `producerImg` | `string` | Canadian only | CSS gradient for producer photo placeholder |
| `producerLabel` | `string` | Canadian only | Caption for producer photo |
| `alt` | `object` | Non-Canadian only | Canadian alternative (see CanadianAlternative) |

### Naming Convention

Brand keys must match how the brand appears on product pages (case-sensitive for display, but Trie matching is case-insensitive). Examples:
- `"Folgers"` (not `"folgers"` or `"FOLGERS"`)
- `"Kicking Horse"` (not `"KickingHorse"`)
- `"Tim Hortons"` (not `"Tim Horton's"`)

---

## Quick Reference: Who Builds What

| Component | Owner | Consumes | Produces |
|-----------|-------|----------|----------|
| `brands.json` | Dako | — | Brand data for all components |
| `content.ts` | Eric | `brands.json` | `OPEN_SIDEBAR`, `UPDATE_BADGE` messages |
| `background.ts` | Eric | `OPEN_SIDEBAR`, `UPDATE_BADGE` | `BRAND_CONTEXT`, badge updates |
| `sidepanel.ts` | Sylvia | `BRAND_CONTEXT`, `/api/chat` response | `/api/chat` requests, UI cards |
| `backend/server.ts` | Dako | `/api/chat` request, `brands.json` | `/api/chat` response |
