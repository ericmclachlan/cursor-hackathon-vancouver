// Run with:  npm test

// ---------------------------------------------------------------------------
// Inline the Trie source so this file is fully self-contained
// ---------------------------------------------------------------------------
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

  findMatches(text) {
    const lower = text.toLowerCase();
    const results = [];
    let i = 0;

    while (i < lower.length) {
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
          if (afterChar === "" || !isWordChar(afterChar)) {
            lastValidMatch = j;
          }
        }
      }

      if (lastValidMatch !== -1) {
        results.push({ index: i, length: lastValidMatch - i });
        i = lastValidMatch;
      } else {
        i++;
      }
    }

    return results;
  }
}

// ---------------------------------------------------------------------------
// Helper: build a trie from a list of words and return matched substrings
// ---------------------------------------------------------------------------
function matchedStrings(words, text) {
  const trie = new Trie();
  for (const w of words) trie.insert(w);
  return trie.findMatches(text).map(({ index, length }) => text.slice(index, index + length));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Basic matching", () => {
  test("matches a single word in isolation", () => {
    expect(matchedStrings(["Canada"], "Canada")).toEqual(["Canada"]);
  });

  test("matches a word inside a sentence", () => {
    expect(matchedStrings(["Canada"], "Buy from Canada today")).toEqual(["Canada"]);
  });

  test("matches multiple distinct words", () => {
    expect(matchedStrings(["Canada", "local"], "Support local Canada businesses")).toEqual(["local", "Canada"]);
  });

  test("returns empty array when no words match", () => {
    expect(matchedStrings(["Canada"], "Buy American products")).toEqual([]);
  });

  test("is case-insensitive", () => {
    expect(matchedStrings(["canada"], "Made in CANADA")).toEqual(["CANADA"]);
  });
});

describe("Word boundary enforcement", () => {
  test("does not match a word that is a prefix of a longer word", () => {
    // 'can' should NOT match inside 'Canada'
    expect(matchedStrings(["can"], "Canada")).toEqual([]);
  });

  test("does not match a word that is a suffix of a longer word", () => {
    // 'ada' should NOT match inside 'Canada'
    expect(matchedStrings(["ada"], "Canada")).toEqual([]);
  });

  test("matches a word that appears at the start of text", () => {
    expect(matchedStrings(["Canada"], "Canada is great")).toEqual(["Canada"]);
  });

  test("matches a word that appears at the end of text", () => {
    expect(matchedStrings(["Canada"], "I love Canada")).toEqual(["Canada"]);
  });

  test("matches a word surrounded by punctuation", () => {
    expect(matchedStrings(["Canada"], "...Canada!")).toEqual(["Canada"]);
  });

  test("does not match partial word embedded in another word", () => {
    expect(matchedStrings(["local"], "relocalize")).toEqual([]);
  });
});

describe("Longest-match over greedy/first-match", () => {
  test("prefers longer match over shorter prefix match", () => {
    // Both 'Tim' and 'Tim Hortons' are in the trie; longest should win
    const matches = matchedStrings(["Tim", "Tim Hortons"], "I love Tim Hortons coffee");
    expect(matches).toEqual(["Tim Hortons"]);
  });

  test("prefers 'Canadian' over 'Canada' when both are inserted", () => {
    const matches = matchedStrings(["Canada", "Canadian"], "Buy Canadian products");
    expect(matches).toEqual(["Canadian"]);
  });

  test("falls back to shorter match when longer prefix has no valid end", () => {
    // 'can' is a valid word; 'cand' is not inserted — so 'can' should match in 'can do'
    const matches = matchedStrings(["can", "candy"], "can do");
    expect(matches).toEqual(["can"]);
  });

  test("matches the longer of two overlapping brand names", () => {
    const matches = matchedStrings(["Lob", "Loblaws"], "Shop at Loblaws today");
    expect(matches).toEqual(["Loblaws"]);
  });
});

describe("Multiple matches in one string", () => {
  test("finds two non-overlapping matches", () => {
    expect(matchedStrings(["Canada", "local"], "local products from Canada")).toEqual(["local", "Canada"]);
  });

  test("does not double-count after a longest match", () => {
    // After matching 'Tim Hortons', the cursor should be past it — not re-match 'Hortons'
    const matches = matchedStrings(["Tim", "Tim Hortons", "Hortons"], "Tim Hortons");
    expect(matches).toEqual(["Tim Hortons"]);
  });

  test("handles adjacent words separated by spaces", () => {
    expect(matchedStrings(["buy", "local"], "buy local")).toEqual(["buy", "local"]);
  });
});

describe("Edge cases", () => {
  test("empty text returns no matches", () => {
    expect(matchedStrings(["Canada"], "")).toEqual([]);
  });

  test("empty trie returns no matches", () => {
    expect(matchedStrings([], "Canada")).toEqual([]);
  });

  test("word longer than text returns no match", () => {
    expect(matchedStrings(["Canadians"], "Canada")).toEqual([]);
  });

  test("exact single-character word match", () => {
    expect(matchedStrings(["a"], "a")).toEqual(["a"]);
  });

  test("single-character word does not match mid-word", () => {
    expect(matchedStrings(["a"], "Canada")).toEqual([]);
  });

  test("multi-word brand name with hyphen boundary", () => {
    // Hyphen is not a \w char, so 'made' should match after it
    expect(matchedStrings(["made"], "Canadian-made goods")).toEqual(["made"]);
  });
});

