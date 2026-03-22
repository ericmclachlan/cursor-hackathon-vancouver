# PRD: CanadaFirst — Buy Canadian Shopping Companion (v2)

> **A shopping companion that turns "buy Canadian" from a slogan into an action — by annotating the web with Canadian-awareness, surfacing local alternatives, and telling the stories behind them.**

---

## 1. Version/Phase

**Phase:** Hackathon MVP (1-day prototype)
**Version:** 2.0 — revised interaction model
**Date:** March 23, 2026
**Team:** Eric (backend/NLP/extension), Dako (agent logic/prompts/pitch), Sylvia (frontend/system)
**Event:** Cursor Hackathon Vancouver — Theme: "Build Canada"

---

## 2. Introduction/Overview

### Problem

Right now, "buy Canadian" is a slogan, not a solution. When Canadians shop online, they face three problems:

1. **They can't tell what's Canadian.** Most product listings on Amazon.ca or Google Shopping don't clearly indicate country of origin for the brand or manufacturer.
2. **They don't know the alternatives.** Even if a shopper learns their product is American, they have no easy way to find a Canadian equivalent.
3. **They have no reason to care.** A product listing is just a name and a price. There's no story, no context, no human connection to make someone _want_ to buy Canadian.

This is especially true for newcomers and immigrants who are still building their knowledge of Canadian brands and culture.

### Solution

CanadaFirst is a Chrome extension that proactively annotates web pages with Canadian-awareness. When a user browses a product page or search results (e.g., Amazon.ca), the extension scans the page for known brand names and injects two types of inline tags:

- **🍁 Maple leaf tags** next to Canadian brands — confirming the brand is Canadian.
- **🍁 Dynamic recommendation tags** next to non-Canadian brands — showing the name and province of a Canadian alternative (e.g., "🍁 Kicking Horse, BC").

Hovering over either tag reveals a popout card with scenic origin photos, producer photos, and a short story hook about the Canadian brand. Clicking through opens a sidebar panel with a conversational AI agent that provides full comparison data, detailed storytelling, and a "We Buy Canadian" badge generator.

This three-tier interaction model (tag → popout → sidebar) follows a progressive disclosure pattern: users get value at a glance, satisfy casual curiosity on hover, and go deep only when they choose to.

### Demo Scenario

A user searches "ground coffee" on Amazon.ca. The CanadaFirst extension scans the results page and injects tags next to six brand names. Next to **Kicking Horse**, a green 🍁 maple leaf appears. Next to **Folgers**, a recommendation tag reads "🍁 Kicking Horse, BC."

The user hovers over the Folgers recommendation tag and sees a popout card: a photo of the Canadian Rockies, a photo of the founders, and a one-liner — "Organic coffee roasted in the Rockies since '96." Intrigued, they click "Compare & learn more →" and the sidebar opens. The AI agent walks them through a side-by-side comparison (Folgers vs. Kicking Horse), tells the Kicking Horse origin story, and offers to generate a "We Buy Canadian" badge.

The user then hovers over the 🍁 next to **Tim Hortons** and sees a popout confirming it's Canadian, with a story hook about hockey legend Tim Horton founding the chain in 1964.

---

## 3. Goals

| #   | Goal                                                            | Measurable Criteria                                                                                                                              |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1  | Proactively identify Canadian and non-Canadian brands on a page | Extension correctly injects maple leaf tags on Canadian brands and recommendation tags on non-Canadian brands for all brands in the demo dataset |
| G2  | Surface Canadian alternatives inline — before the user asks     | Recommendation tags show the correct alternative brand name and province for every non-Canadian brand in scope                                   |
| G3  | Provide a rich preview on hover                                 | Popout cards display scenic photo, producer photo, story hook, and location for both tag types                                                   |
| G4  | Enable deep comparison in the sidebar                           | Sidebar agent shows price, shipping, origin, and at least one quality indicator in a structured comparison card                                  |
| G5  | Tell the story behind Canadian brands                           | Agent returns a 2–3 sentence origin story for each Canadian product in the dataset                                                               |
| G6  | Generate a "We Buy Canadian" badge                              | User can click a button and see a styled badge with the Canadian brand they're supporting                                                        |
| G7  | Deliver a compelling 3-minute demo to hackathon judges          | Demo covers the full three-tier flow: page scan → tags appear → hover popout → sidebar comparison → story → badge                                |

---

## 4. User Stories

### Discover at a Glance (Tier 1 — Tags)

- As a user, I want to see at a glance which brands on a search results page are Canadian, so I can identify them without opening anything or leaving the page.
- As a user, I want to see the name of a Canadian alternative right next to a non-Canadian brand, so I discover options passively while browsing.
- As a newcomer to Canada, I want the extension to teach me which brands are Canadian as I shop, so I build familiarity over time without extra effort.

### Preview on Hover (Tier 2 — Popout)

- As a user, I want to hover over a tag and see a popout card with photos and a short story about the Canadian brand, so I can satisfy my curiosity without committing to a full conversation.
- As a user, I want the popout to show me where the Canadian brand is based (with a scenic photo of the region), so the product feels connected to a real place.
- As a user, I want to see a producer or founder photo in the popout, so the brand feels human and personal.
- As a user, I want a clear call-to-action in the popout ("Chat with agent" or "Compare & learn more") so I know how to go deeper if I'm interested.

### Go Deep in the Sidebar (Tier 3 — Agent Chat)

- As a user, I want to click through from a popout and have the sidebar open with context about the brand I was looking at, so I don't have to re-explain what I need.
- As a user, I want to see a side-by-side comparison between my current product and the Canadian alternative — including price, shipping time, and quality indicators — so I can make a practical decision.
- As a user, I want to know if the Canadian option costs more, and if so, why — so I can decide whether the difference is worth it to me.
- As a budget-conscious shopper, I want the agent to flag when a Canadian alternative is actually cheaper or comparable, so I don't assume local always means expensive.

### Understand the Story

- As a user, I want a short story (2–3 sentences) about who makes the Canadian product — where they're based, how long they've been operating, what makes them different — so the product feels like more than a listing.
- As a newcomer, I want to learn something about Canada through what I buy — like that Kicking Horse Coffee is roasted in the Rocky Mountains of BC — so shopping becomes a way to understand this country.
- As a user, I want to ask follow-up questions like "what else does this company make?" or "are there similar producers near me?" so I can go deeper when I'm curious.

### Share and Support

- As a user, I want to generate a "We Buy Canadian" badge showing what I switched to, so I can display it on my store, website, or social media.

---

## 5. Functional Requirements

### 5.1 Inline Page Annotation (Content Script)

| #   | Requirement                                                                                                                                                                                                                                                                                                                                 | Priority     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| FR1 | When the user navigates to a supported page (e.g., Amazon.ca search results or product page), the extension's content script must scan the visible DOM for text matching known brand names in the dataset.                                                                                                                                  | Core         |
| FR2 | For each matched Canadian brand, the content script must inject a **maple leaf tag** (🍁) immediately after the brand name text. The tag must be visually styled as a small green-tinted icon.                                                                                                                                              | Core         |
| FR3 | For each matched non-Canadian brand, the content script must inject a **dynamic recommendation tag** immediately after the brand name text. The tag must display: a maple leaf emoji, the Canadian alternative's brand name, and its province (e.g., "🍁 Kicking Horse, BC"). The tag must be visually styled as a compact red-tinted pill. | Core         |
| FR4 | Tags must appear with a staggered animation after a brief page scan effect (scan line), so the user perceives the extension actively analyzing the page.                                                                                                                                                                                    | Core         |
| FR5 | The extension toolbar icon must display a badge count showing how many brands were detected on the current page.                                                                                                                                                                                                                            | Nice-to-have |

### 5.2 Hover Popout Cards

| #    | Requirement                                                                                                                                                                                                                                                                                                                               | Priority |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR6  | Hovering over **any tag** (maple leaf or recommendation) must display a popout card after a short delay.                                                                                                                                                                                                                                  | Core     |
| FR7  | For a **Canadian brand's maple leaf tag**, the popout must show: a scenic origin photo, a producer/founder photo, a "🇨🇦 Canadian" badge, the brand name, headquarters location, a 1–2 sentence story hook, and a "Chat with agent →" call-to-action button.                                                                               | Core     |
| FR8  | For a **non-Canadian brand's recommendation tag**, the popout must show: the Canadian _alternative's_ scenic origin photo, the alternative's producer/founder photo, a "🍁 Canadian Alternative" badge, the alternative brand name, its origin location, a 1–2 sentence story hook, and a "Compare & learn more →" call-to-action button. | Core     |
| FR9  | The popout must position itself contextually (above or below the tag, depending on available viewport space) and must not overflow the visible area.                                                                                                                                                                                      | Core     |
| FR10 | The popout must remain visible when the user moves their cursor from the tag into the popout card (with a ~200ms delay before hiding), so users can interact with the popout's CTA button.                                                                                                                                                | Core     |
| FR11 | Clicking the popout's CTA button must open the sidebar panel with the correct brand context pre-loaded.                                                                                                                                                                                                                                   | Core     |

### 5.3 Sidebar Panel

| #    | Requirement                                                                                                                                                             | Priority     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| FR12 | The extension must register a Chrome side panel. Clicking the toolbar icon or a popout CTA must open the panel on the right side of the browser.                        | Core         |
| FR13 | The sidebar must contain a chat interface where the user can type messages and receive responses from the agent.                                                        | Core         |
| FR14 | The sidebar must display a loading indicator (typing dots) while the agent is generating a response.                                                                    | Core         |
| FR15 | When opened via a popout CTA, the sidebar must automatically populate with the relevant brand context — the user should not have to re-state what they were looking at. | Core         |
| FR16 | The sidebar must remain open and functional as the user navigates between pages.                                                                                        | Nice-to-have |

### 5.4 AI Agent — Origin Classification

| #    | Requirement                                                                                                                                                                            | Priority |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR17 | When the sidebar opens for a **Canadian brand**, the agent must display an origin card with a "✓ Canadian" status badge, the brand name, owner, and headquarters location.             | Core     |
| FR18 | When the sidebar opens for a **non-Canadian brand**, the agent must display an origin card with the country flag, a "Not Canadian" status, the brand owner, and headquarters location. | Core     |
| FR19 | For non-Canadian brands, the agent must automatically suggest at least one Canadian alternative from the mock dataset.                                                                 | Core     |

### 5.5 AI Agent — Comparison

| #    | Requirement                                                                                                      | Priority |
| ---- | ---------------------------------------------------------------------------------------------------------------- | -------- |
| FR20 | The agent must display a side-by-side comparison card between the original product and the Canadian alternative. | Core     |
| FR21 | The comparison must include: product name, brand, price, shipping estimate, and origin (city/province).          | Core     |
| FR22 | The comparison must be displayed as a structured two-column card, not plain text.                                | Core     |

### 5.6 AI Agent — Storytelling

| #    | Requirement                                                                                                                                          | Priority |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR23 | For each Canadian brand (whether it's the original or the alternative), the agent must display a 2–3 sentence origin story about the producer/brand. | Core     |
| FR24 | The story must include at least: where the company is based, one human or cultural detail, and what makes them distinct.                             | Core     |
| FR25 | The user must be able to ask follow-up questions about the Canadian product and receive conversational responses.                                    | Core     |

### 5.7 Badge Generator

| #    | Requirement                                                                                                                                                   | Priority     |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| FR26 | The sidebar must include a "Generate Badge" button after the user views a Canadian brand (either confirmed Canadian or suggested alternative).                | Core         |
| FR27 | The badge must display: "We Buy Canadian" text, the Canadian brand name, the brand's origin (city/province), and a Canadian visual element (maple leaf icon). | Core         |
| FR28 | The user must be able to copy or download the badge as an image.                                                                                              | Nice-to-have |

### 5.8 Conversational Interface

| #    | Requirement                                                                                                                                                               | Priority |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR29 | The agent must support free-form text input, not just popout-triggered flows. Users can type questions like "find me Canadian coffee" or "tell me more about this brand." | Core     |
| FR30 | The agent must maintain conversation context within a session (i.e., if the user asks "tell me more," the agent knows what "more" refers to).                             | Core     |
| FR31 | The agent must respond in a friendly, conversational tone — not robotic or overly formal.                                                                                 | Core     |

---

## 6. Non-Goals (Out of Scope)

These are explicitly NOT part of the hackathon MVP:

- **Real-time data scraping.** We will not scrape Amazon or any website live. Brand detection is done via text pattern matching against a known dataset, and alternatives come from mock data.
- **User accounts or authentication.** No login, no saved preferences, no user profiles.
- **Mobile app or responsive design.** This is a desktop Chrome extension only. No hover interactions on mobile.
- **Payment or checkout integration.** We do not redirect users to purchase or handle any transactions.
- **Comprehensive product database.** The MVP covers two categories (coffee, honey/maple syrup) with approximately 20–50 brands total. We will not attempt to cover all Canadian products.
- **Social media sharing.** The badge is generated locally. Sharing to social media platforms is out of scope.
- **Personal dashboard or purchase tracking.** No history, no stats, no gamification.
- **Multi-language support.** English only for the hackathon demo.
- **Firefox, Safari, or other browser support.** Chrome only.
- **Real product images.** Popout photos will use placeholder gradients or stock imagery for the prototype.

---

## 7. Design Considerations

### Interaction Model — Three-Tier Progressive Disclosure

The extension follows a progressive disclosure pattern that respects the user's attention:

**Tier 1 — Inline Tags (zero interaction required):** The user sees tags appear next to brand names as they browse. Canadian brands get a green-tinted 🍁 maple leaf. Non-Canadian brands get a red-tinted recommendation pill showing the alternative's name and province. The user gains value at a glance without clicking anything.

**Tier 2 — Hover Popout (lightweight interaction):** Hovering over any tag reveals a popout card with scenic and producer photos, a story hook, and a CTA. This satisfies casual curiosity in 2–3 seconds without opening the sidebar. The popout has a ~200ms hide delay so the user can move their cursor into the card to click the CTA.

**Tier 3 — Sidebar Agent (deep interaction):** Clicking a popout CTA opens the sidebar with the full agent experience: origin classification, comparison cards, detailed storytelling, follow-up questions, and badge generation. The sidebar receives the brand context automatically.

### Tag Design

- **Maple leaf tag (Canadian):** 22×22px, green-tinted background (`#f0fdf4`), green border (`#dcfce7`), contains a 🍁 emoji. Subtle and unobtrusive — it confirms without demanding attention.
- **Recommendation tag (non-Canadian):** Compact pill, red-tinted background (`#fef2f2`), red border (`#fee2e2`), contains: 🍁 emoji + alternative brand name + province abbreviation. Example: "🍁 Kicking Horse, BC". Bold enough to suggest an action without being aggressive.
- Both tags appear with a staggered pop animation after a scan line effect.

### Popout Card Design

- **Size:** ~300px wide, auto-height.
- **Photos:** Two-column grid at the top (110px tall). Left: scenic origin photo (e.g., Canadian Rockies). Right: producer/founder photo. Both have small caption labels overlaid at the bottom.
- **Body:** Status badge ("🇨🇦 Canadian" or "🍁 Canadian Alternative"), brand name in display font, location with 📍 icon, 1–2 sentence story hook (clamped to 3 lines), and a CTA button.
- **Positioning:** Contextual — below the tag by default, above if near the bottom of the viewport.

### Sidebar Layout

- **Top bar:** CanadaFirst logo/name (🍁 icon + "CanadaFirst" in display font) + close button.
- **Main area:** Chat messages between the user and the agent, displayed as chat bubbles. Agent responses include structured cards (origin cards, comparison cards, story cards, badge cards) interspersed with conversational text.
- **Input bar:** Text input at the bottom with a send button.

### Visual Style

- **Typography:** Fraunces (display/headings) paired with DM Sans (body text). Warm, characterful, distinctly non-generic.
- **Color palette:** Warm neutrals (`#faf8f5`, `#f3efe8`, `#e8e0d4`) as the base. Canadian red (`#dc2626`) used sparingly as an accent. Green (`#15803d`) for Canadian-positive indicators. Amber (`#b45309`) for non-Canadian origin labels.
- **Cards:** White background, subtle warm border, soft shadow. Comparison cards use a two-column layout with the Canadian column having a green-tinted background.
- **Badge:** Polished enough to feel "real" — like something a business would actually display. Red border, maple leaf icon, display typography.

### Tone of Voice

- Friendly, warm, curious — like a knowledgeable local friend, not a corporate chatbot.
- Example popout hook: "Organic coffee roasted in the Rockies since '96 — from a garage to a Canadian icon."
- Example agent message: "This one's not Canadian — Folgers is owned by J.M. Smucker Company out of Ohio. But I've got a great Canadian alternative!"

---

## 8. Technical Considerations

### Architecture Overview

```
┌───────────────────────────────────────────────────────┐
│  Chrome Extension (Manifest V3)                        │
│                                                        │
│  ┌─────────────────────┐  ┌─────────────────────────┐ │
│  │  Content Script       │  │  Side Panel (Sidebar UI) │ │
│  │                       │  │                           │ │
│  │  - Scans DOM for      │  │  - Chat interface         │ │
│  │    brand name matches │  │  - Comparison cards        │ │
│  │  - Injects maple leaf │  │  - Story cards             │ │
│  │    and recommendation │  │  - Badge generator         │ │
│  │    tags into page     │  │  - Free-form text input    │ │
│  │  - Renders popout     │  │                           │ │
│  │    cards on hover     │  │  Receives brand context   │ │
│  │  - Sends brand key    │──▶  from content script via  │ │
│  │    to sidebar on CTA  │  │  chrome.runtime.message   │ │
│  │    click              │  │                           │ │
│  └─────────────────────┘  └────────────┬──────────────┘ │
│                                         │                │
└─────────────────────────────────────────┼────────────────┘
                                          │
                               ┌──────────▼───────────┐
                               │   Backend Service     │
                               │   (API Server)        │
                               │                       │
                               │  - Receives brand     │
                               │    queries from       │
                               │    sidebar            │
                               │  - Looks up mock data │
                               │  - Calls LLM via      │
                               │    OpenRouter          │
                               │  - Returns structured  │
                               │    responses           │
                               └──────────┬───────────┘
                                          │
                               ┌──────────▼───────────┐
                               │   Mock Data Layer     │
                               │                       │
                               │  - Brand registry     │
                               │    JSON (name, owner, │
                               │    hq, is_canadian,   │
                               │    story, story_hook,  │
                               │    scenic_img_url,     │
                               │    producer_img_url)   │
                               │  - Alternative map     │
                               │    (brand → alt brand) │
                               │  - Comparison data     │
                               │    (price, shipping,   │
                               │    origin)             │
                               └───────────────────────┘
```

### Key Technical Decisions

- **LLM Provider:** OpenRouter (allows flexibility to switch models during hackathon if needed).
- **Extension Type:** Chrome Manifest V3 with side panel API.
- **Brand Detection (Content Script):** The content script maintains a list of known brand names from the mock dataset. On page load, it performs text matching across the DOM (targeting product titles, brand labels, and listing text). For each match, it injects the appropriate tag element adjacent to the matched text node. No complex NLP is needed — exact string matching is sufficient for the demo dataset.
- **Popout Rendering:** Popout cards are rendered by the content script as absolutely-positioned DOM elements on the host page. They are shown/hidden via hover events with a 200ms debounce timer. Popout content (photos, story hooks) is bundled in the content script's brand data.
- **Content Script → Sidebar Communication:** When a user clicks a popout CTA, the content script sends a `chrome.runtime.sendMessage` with the brand key. The sidebar panel listens for this message and triggers the appropriate agent flow.
- **Mock Data:** A JSON file containing ~20–50 brand entries across two categories (coffee, honey/maple syrup). Each entry includes: brand name, owner, is_canadian (boolean), headquarters, country flag, price, origin_city, origin_province, story (2–3 sentences), story_hook (1 sentence), scenic_img_url, producer_img_url, and (for non-Canadian brands) an alternative_brand reference.
- **Backend:** A lightweight Python (Flask/FastAPI) or Node.js server. Receives the brand name from the sidebar, looks up the mock data, constructs a prompt with context, sends it to the LLM, and returns the structured response.
- **Badge Generation:** Rendered as a styled HTML card in the sidebar. "Download" functionality (nice-to-have) can use html2canvas to convert to PNG.

### Suggested Task Division

| Team Member | Responsibility                                                                                                                                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eric        | Chrome extension scaffold (Manifest V3 + side panel + content script), content script brand matching and tag injection, popout positioning logic, chrome.runtime messaging between content script and sidebar, backend API server, data pipeline      |
| Dako        | Agent prompt engineering, conversation flow design, mock data creation (brand entries, stories, story hooks, alternative mappings), popout copywriting, pitch preparation                                                                             |
| Sylvia      | Sidebar frontend UI (chat interface, comparison cards, story cards, badge component), popout card component (photo layout, animations, CTA styling), tag component styling (maple leaf + recommendation pill), scan line animation, demo flow testing |

---

## 9. Dependencies

| Dependency            | Description                                                                                                                                           | Risk                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| OpenRouter API access | Needed for LLM calls. Must have API key and credits ready before hackathon.                                                                           | Medium — bring backup key or use a free model tier |
| Chrome browser        | Extension only works in Chrome. Demo laptop must have Chrome installed.                                                                               | Low                                                |
| Mock dataset          | Must be prepared before or during the hackathon. Content script cannot inject tags without brand data, and agent cannot respond without product data. | Medium — Dako can pre-draft this the night before  |
| Popout image assets   | Scenic and producer photos for popout cards. Can use placeholder gradients for MVP, stock photos as stretch goal.                                     | Low — gradients work for demo                      |
| Cursor IDE            | Hackathon requires building with Cursor. All team members should have it installed.                                                                   | Low                                                |

---

## 10. Assumptions

These assumptions should be validated with the team before building:

1. **The hackathon allows browser extensions as a valid submission format.** (The rules say "no pre-built projects" but don't restrict project type.)
2. **OpenRouter will be accessible from the hackathon venue's network.** If not, we need a fallback plan (e.g., local model or cached responses).
3. **Mock data is acceptable for the demo.** Judges will evaluate the experience and potential, not whether we have a complete real database.
4. **Text pattern matching against known brand names is sufficient for the demo.** We do not need NLP or fuzzy matching — exact string matching works for a curated demo dataset.
5. **The team can scaffold a Chrome Manifest V3 extension with content script and side panel within the first 1–2 hours.** Eric has the experience to do this.
6. **A single backend server (no database) is sufficient.** All mock data is loaded from a JSON file into memory.
7. **Gradient placeholders are acceptable for popout photos in the demo.** Judges will understand these represent real images in production.
8. **Amazon.ca search results pages have consistent enough DOM structure** for the content script to find and annotate brand name text reliably in the demo.

---

## 11. Success Metrics

Since this is a hackathon prototype, success metrics are oriented around demo quality and judge evaluation:

| Metric                                        | Target                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Tags render correctly on Amazon.ca            | All brands in demo dataset are detected and tagged on a search results page                                              |
| Popout cards work on hover                    | Both tag types show the correct popout with photos, story hook, and CTA                                                  |
| Full three-tier flow completes without errors | Demo shows: page scan → tags appear → hover popout → click CTA → sidebar opens with context → comparison → story → badge |
| Judge score on "Impact"                       | Judges understand the problem and believe the three-tier interaction model would change shopping behavior                |
| Judge score on "Execution"                    | The prototype works live, without pre-recorded demos or manual workarounds                                               |
| Judge score on "Presentation"                 | The pitch tells a compelling story (newcomer perspective) within 3 minutes                                               |
| Judge score on "Design"                       | The inline tags, popout cards, and sidebar all look polished and intentional                                             |
| Agent response quality                        | Agent responses are conversational, accurate to mock data, and include storytelling                                      |

---

## 12. MVP Validation Criteria

The MVP is considered complete when all of the following are true:

- [ ] **Extension installs and activates** — Installing the extension adds the CanadaFirst icon to the Chrome toolbar.
- [ ] **Tags inject on Amazon.ca** — Navigating to an Amazon.ca search results page (coffee category) triggers the content script to scan the page and inject tags next to all recognized brand names.
- [ ] **Maple leaf tags appear on Canadian brands** — Kicking Horse and Tim Hortons (and any other Canadian brands in the dataset) show a green 🍁 tag.
- [ ] **Recommendation tags appear on non-Canadian brands** — Folgers, Starbucks, Lavazza, Nescafé (and any other non-Canadian brands in the dataset) show a dynamic recommendation tag with the alternative's name and province.
- [ ] **Popout works on maple leaf tags** — Hovering over a Canadian brand's 🍁 tag shows a popout with photos, story hook, and "Chat with agent →" CTA.
- [ ] **Popout works on recommendation tags** — Hovering over a recommendation tag shows a popout with the alternative brand's photos, story hook, and "Compare & learn more →" CTA.
- [ ] **Popout hover delay works** — User can move cursor from tag into popout without the popout disappearing.
- [ ] **Sidebar opens with context** — Clicking a popout CTA opens the sidebar and the agent immediately starts talking about the correct brand.
- [ ] **Agent identifies origin** — The agent correctly displays a Canadian or non-Canadian origin card.
- [ ] **Comparison displays** — For non-Canadian brands, a structured comparison card shows price, shipping, and origin for both products side by side.
- [ ] **Story displays** — The Canadian brand includes a 2–3 sentence origin story.
- [ ] **Follow-up works** — The user can ask a follow-up question and the agent responds in context.
- [ ] **Badge generates** — Clicking "Generate Badge" produces a styled "We Buy Canadian" badge card.
- [ ] **Full demo flow completes in under 2 minutes** — Leaves time for pitch context and Q&A.
