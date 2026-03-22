# Cursor Hackathon Vancouver

This repository was created for the [Cursor Hackathon Vancouver](https://luma.com/fb1187s1?tk=EeXtWX) event held on March 22nd, 2026.

## Word Highlighter Extension

A Chrome extension that highlights the word "your" on every page and appends a 🍁 maple leaf.

### Build

Since the source is TypeScript, you need to compile it before loading into Chrome. Docker is the easiest way if you don't have Node.js installed locally:

```bash
docker run --rm -v "${PWD}:/app" -w /app node:20-alpine sh -c "npm install && npm run build"
```

Or if you have Node.js installed:

```bash
npm install
npm run build
```

The compiled extension will be in the `dist/` folder.

### Install in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `dist/` folder from this repository
5. The extension is now active — visit any webpage and words matching "your" will be highlighted in gold with a 🍁

### Reload after changes

After editing the TypeScript source and rebuilding, go back to `chrome://extensions` and click the reload button (↺) on the Word Highlighter card, then refresh any open tabs.

### Customise

Edit [`extention/config.ts`](extention/config.ts) to change the highlighted word or colour, then rebuild.

## Team

- Eric
- Dako
- Sylvia
