const WORD_PATTERN = new RegExp(`\\b(${HIGHLIGHT_WORD})\\b`, "gi");

function highlightTextNode(textNode) {
  const text = textNode.nodeValue;
  if (!WORD_PATTERN.test(text)) return;

  // Reset lastIndex since test() advances it
  WORD_PATTERN.lastIndex = 0;

  const fragment = document.createDocumentFragment();
  let lastIndex = 0;
  let match;

  while ((match = WORD_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    const mark = document.createElement("mark");
    mark.style.backgroundColor = HIGHLIGHT_COLOR;
    mark.style.color = "inherit";
    mark.textContent = match[0];
    fragment.appendChild(mark);

    lastIndex = WORD_PATTERN.lastIndex;
  }

  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  textNode.parentNode.replaceChild(fragment, textNode);
}

function walkTextNodes(root) {
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const tag = node.parentElement?.tagName;
        if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "MARK"].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(highlightTextNode);
}

walkTextNodes(document.body);
