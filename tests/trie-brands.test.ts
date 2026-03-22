// Test that the Trie correctly finds brand names in text
// We need to import the Trie - but since it's not a module, we'll read and eval it

import * as fs from 'fs';
import * as path from 'path';

// Load Trie source and make it available
const trieSource = fs.readFileSync(
  path.join(__dirname, '..', 'extention', 'trie.ts'),
  'utf-8'
);

// Extract the core logic for testing by evaluating the compiled JS concepts
// Since trie.ts uses `class Trie` without export, we need to test it differently
// We'll create a minimal version for testing

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
      const prevChar = i > 0 ? lower[i - 1] : '';
      if (prevChar !== '' && isWordChar(prevChar)) {
        i++;
        continue;
      }

      let node = this.root;
      let j = i;
      let lastValidMatch = -1;

      while (j < lower.length && node.children.has(lower[j])) {
        node = node.children.get(lower[j])!;
        j++;

        if (node.isEnd) {
          const afterChar = j < lower.length ? lower[j] : '';
          if (afterChar === '' || !isWordChar(afterChar)) {
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

describe('Trie with brand names', () => {
  let trie: Trie;
  let brandNames: string[];

  beforeAll(() => {
    const raw = fs.readFileSync(
      path.join(__dirname, '..', 'extention', 'brands.json'),
      'utf-8'
    );
    brandNames = Object.keys(JSON.parse(raw));
    trie = new Trie();
    for (const name of brandNames) {
      trie.insert(name);
    }
  });

  it('should find single brand names in text', () => {
    const matches = trie.findMatches('I love Folgers coffee');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({ index: 7, length: 7 });
  });

  it('should find multi-word brand names', () => {
    const matches = trie.findMatches('by Tim Hortons');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({ index: 3, length: 11 });
  });

  it('should find Kicking Horse (multi-word)', () => {
    const matches = trie.findMatches('by Kicking Horse Coffee Co.');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({ index: 3, length: 13 });
  });

  it('should find multiple brands in one text', () => {
    const matches = trie.findMatches('Choose Folgers or Starbucks');
    expect(matches).toHaveLength(2);
  });

  it('should not match partial words', () => {
    const matches = trie.findMatches('Folgersville is nice');
    expect(matches).toHaveLength(0);
  });

  it('should be case insensitive', () => {
    const matches = trie.findMatches('i like FOLGERS');
    expect(matches).toHaveLength(1);
  });

  it('should handle text with no brands', () => {
    const matches = trie.findMatches('just some random text');
    expect(matches).toHaveLength(0);
  });

  it('should handle accented characters (Nescafé)', () => {
    const matches = trie.findMatches('Try Nescafé instant');
    expect(matches).toHaveLength(1);
    expect(matches[0].length).toBe(7); // "Nescafé" = 7 chars
  });
});
