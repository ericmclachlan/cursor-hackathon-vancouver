// ================================================================
// CanadaFirst Background Service Worker
// Routes messages between content script and side panel
// ================================================================

function sendBrandContext(brandKey: string | undefined, brandData: any, retriesLeft: number): void {
  chrome.runtime.sendMessage({
    type: "BRAND_CONTEXT",
    brandKey: brandKey,
    brandData: brandData,
  }).catch(() => {
    // Side panel script may not have loaded its listener yet — retry
    if (retriesLeft > 0) {
      setTimeout(() => sendBrandContext(brandKey, brandData, retriesLeft - 1), 300);
    }
  });
}

chrome.runtime.onMessage.addListener(
  (
    message: { type: string; brandKey?: string; brandData?: any; count?: number },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ) => {
    if (message.type === "OPEN_SIDEBAR") {
      const tabId = sender.tab?.id;
      if (tabId !== undefined) {
        chrome.sidePanel.open({ tabId }).then(() => {
          // Retry up to 5 times with 300ms intervals to allow side panel to load
          setTimeout(() => sendBrandContext(message.brandKey, message.brandData, 5), 500);
        });
      }
      sendResponse({ ok: true });
    } else if (message.type === "UPDATE_BADGE") {
      const text = message.count !== undefined && message.count > 0
        ? String(message.count)
        : "";
      chrome.action.setBadgeText({ text });
      chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
      sendResponse({ ok: true });
    }
  }
);
