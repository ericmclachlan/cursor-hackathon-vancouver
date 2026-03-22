interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  wordLength: number;
}

function makeNode(): TrieNode {
  return { children: new Map(), isEnd: false, wordLength: 0 };
}

function isWordChar(ch: string): boolean {
  return /\w/.test(ch);
}

class Trie {
  private root: TrieNode = makeNode();

  insert(word: string): void {
    let node = this.root;
    for (const ch of word.toLowerCase()) {
      if (!node.children.has(ch)) {
        node.children.set(ch, makeNode());
      }
      node = node.children.get(ch)!;
    }
    node.isEnd = true;
    node.wordLength = word.length;
  }

  findMatches(text: string): Array<{ index: number; length: number }> {
    const lower = text.toLowerCase();
    const results: Array<{ index: number; length: number }> = [];
    let i = 0;

    while (i < lower.length) {
      // Only start a match attempt at a word boundary start
      const prevChar = i > 0 ? lower[i - 1] : "";
      if (prevChar !== "" && isWordChar(prevChar)) {
        i++;
        continue;
      }

      let node = this.root;
      let j = i;
      let lastValidMatch = -1; // end index of the longest valid match so far

      // Walk the trie as far as possible, tracking the longest word-boundary match
      while (j < lower.length && node.children.has(lower[j])) {
        node = node.children.get(lower[j])!;
        j++;

        if (node.isEnd) {
          const afterChar = j < lower.length ? lower[j] : "";
          if (afterChar === "" || !isWordChar(afterChar)) {
            lastValidMatch = j; // record end of this valid match
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
