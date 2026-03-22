interface HighlightConfig {
  label: string;
  color: string;
  annotation: string;
  words: string[];
}

function highlightTextNode(textNode: Text, trie: Trie, config: HighlightConfig): void {
  const text = textNode.nodeValue;
  if (!text) return;

  const matches = trie.findMatches(text);
  if (matches.length === 0) return;

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;

  for (const { index, length } of matches) {
    if (index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, index)));
    }

    const mark = document.createElement("mark");
    mark.style.background = "none";
    mark.style.color = "inherit";
    mark.textContent = text.slice(index, index + length);

    const icon = document.createElement("span");
    icon.innerHTML = config.annotation;
    mark.appendChild(icon);

    fragment.appendChild(mark);
    lastIndex = index + length;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  textNode.parentNode!.replaceChild(fragment, textNode);
}

function walkTextNodes(root: Node, trie: Trie, config: HighlightConfig): void {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node: Node): number {
        const tag = (node as Text).parentElement?.tagName;
        if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "MARK"].includes(tag ?? "")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((node) => highlightTextNode(node, trie, config));
}

async function init(): Promise<void> {
  const url = chrome.runtime.getURL("config.json");
  const response = await fetch(url);
  const configs: HighlightConfig[] = await response.json();

  const tries = configs.map((config) => {
    const trie = new Trie();
    for (const word of config.words) {
      trie.insert(word);
    }
    return { trie, config };
  });

  function annotate(root: Node): void {
    for (const { trie, config } of tries) {
      walkTextNodes(root, trie, config);
    }
  }

  // Initial pass over the fully-loaded document.
  annotate(document.body);

  // Watch for nodes added dynamically (infinite scroll, SPA navigation, lazy
  // renders, etc.) and annotate each new subtree as it arrives.
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        // Only process element nodes; skip text/comment nodes added directly
        // since their parent element will be processed when it was added, or
        // they are already covered by the initial pass.
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Skip nodes we already annotated (e.g. our own <mark> insertions).
          if ((node as Element).tagName === "MARK") continue;
          annotate(node);
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

init();
