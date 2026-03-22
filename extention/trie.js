function makeNode() {
  return { children: new Map(), isEnd: false, wordLength: 0 };
}

function isWordChar(ch) {
  return /\w/.test(ch);
}

class Trie {
  constructor() {
    this.root = makeNode();
  }

  insert(word) {
    let node = this.root;
    for (const ch of word.toLowerCase()) {
      if (!node.children.has(ch)) {
        node.children.set(ch, makeNode());
      }
      node = node.children.get(ch);
    }
    node.isEnd = true;
    node.wordLength = word.length;
  }

  // Longest-match scan: at each position we walk the trie as deep as possible,
  // recording the end index of every valid word-boundary match we pass through.
  // After the walk, we commit the *longest* such match (lastValidMatch), not the
  // first one encountered.
  findMatches(text) {
    const lower = text.toLowerCase();
    const results = [];
    let i = 0;

    while (i < lower.length) {
      // Only start a match attempt at a word boundary (previous char is not \w)
      const prevChar = i > 0 ? lower[i - 1] : "";
      if (prevChar !== "" && isWordChar(prevChar)) {
        i++;
        continue;
      }

      let node = this.root;
      let j = i;
      let lastValidMatch = -1;

      while (j < lower.length && node.children.has(lower[j])) {
        node = node.children.get(lower[j]);
        j++;

        if (node.isEnd) {
          const afterChar = j < lower.length ? lower[j] : "";
          // Only a valid match if it ends at a word boundary
          if (afterChar === "" || !isWordChar(afterChar)) {
            lastValidMatch = j;
          }
        }
      }

      if (lastValidMatch !== -1) {
        results.push({ index: i, length: lastValidMatch - i });
        i = lastValidMatch; // skip past the longest match
      } else {
        i++;
      }
    }

    return results;
  }
}
