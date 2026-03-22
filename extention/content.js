function highlightTextNode(textNode, trie, config) {
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
    mark.style.backgroundColor = config.color;
    mark.style.color = "inherit";
    mark.textContent = text.slice(index, index + length) + config.annotation;
    fragment.appendChild(mark);

    lastIndex = index + length;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  textNode.parentNode.replaceChild(fragment, textNode);
}

function walkTextNodes(root, trie, config) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const tag = node.parentElement?.tagName;
        if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "MARK"].includes(tag ?? "")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => highlightTextNode(node, trie, config));
}

async function init() {
  const url = chrome.runtime.getURL("config.json");
  const response = await fetch(url);
  const config = await response.json();

  const trie = new Trie();
  for (const word of config.words) {
    trie.insert(word);
  }

  walkTextNodes(document.body, trie, config);
}

init();
