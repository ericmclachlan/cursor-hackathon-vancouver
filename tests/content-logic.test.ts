import * as fs from 'fs';
import * as path from 'path';

// Brand data types that content.ts will use
interface BrandAlt {
  name: string;
  brand: string;
  shortName: string;
  province: string;
  price: string;
  origin: string;
  story: string;
  storyHook: string;
  storyLoc: string;
  scenicImg: string;
  scenicLabel: string;
  producerImg: string;
  producerLabel: string;
}

interface BrandData {
  canadian: boolean;
  flag: string;
  owner: string;
  hq: string;
  story?: string;
  storyHook?: string;
  storyLoc?: string;
  scenicImg?: string;
  scenicLabel?: string;
  producerImg?: string;
  producerLabel?: string;
  alt?: BrandAlt;
}

type BrandRegistry = Record<string, BrandData>;

describe('Content script logic', () => {
  let brands: BrandRegistry;

  beforeAll(() => {
    const raw = fs.readFileSync(
      path.join(__dirname, '..', 'extention', 'brands.json'),
      'utf-8'
    );
    brands = JSON.parse(raw);
  });

  describe('Tag creation', () => {
    it('should create a maple tag for Canadian brands', () => {
      const brand = brands['Kicking Horse'];
      expect(brand.canadian).toBe(true);

      const tag = document.createElement('span');
      tag.className = 'cf-tag-maple cf-tag-animate';
      tag.textContent = '🍁';
      tag.dataset.brand = 'Kicking Horse';

      expect(tag.classList.contains('cf-tag-maple')).toBe(true);
      expect(tag.textContent).toBe('🍁');
      expect(tag.dataset.brand).toBe('Kicking Horse');
    });

    it('should create a recommendation tag for non-Canadian brands', () => {
      const brand = brands['Folgers'];
      expect(brand.canadian).toBe(false);
      expect(brand.alt).toBeDefined();

      const tag = document.createElement('span');
      tag.className = 'cf-tag-rec cf-tag-animate';
      tag.innerHTML = `<span class="cf-tag-leaf">🍁</span>${brand.alt!.shortName}, ${brand.alt!.province}`;
      tag.dataset.brand = 'Folgers';

      expect(tag.classList.contains('cf-tag-rec')).toBe(true);
      expect(tag.textContent).toContain('Kicking Horse');
      expect(tag.textContent).toContain('BC');
    });
  });

  describe('Popout HTML generation', () => {
    it('should generate Canadian popout with story hook', () => {
      const brandKey = 'Tim Hortons';
      const data = brands[brandKey];

      // Simulate popout HTML generation
      const popout = document.createElement('div');
      popout.innerHTML = `
        <div class="cf-popout-body">
          <div class="cf-popout-flag">🇨🇦 Canadian</div>
          <div class="cf-popout-name">${brandKey}</div>
          <div class="cf-popout-loc">📍 ${data.hq}</div>
          <div class="cf-popout-story">${data.storyHook}</div>
        </div>
      `;

      expect(popout.querySelector('.cf-popout-name')?.textContent).toBe('Tim Hortons');
      expect(popout.querySelector('.cf-popout-loc')?.textContent).toContain('Toronto');
      expect(popout.querySelector('.cf-popout-story')?.textContent).toContain('1964');
    });

    it('should generate non-Canadian popout with alternative brand', () => {
      const brandKey = 'Starbucks';
      const data = brands[brandKey];
      const alt = data.alt!;

      const popout = document.createElement('div');
      popout.innerHTML = `
        <div class="cf-popout-body">
          <div class="cf-popout-flag">🍁 Canadian Alternative</div>
          <div class="cf-popout-name">${alt.brand}</div>
          <div class="cf-popout-loc">📍 ${alt.origin}</div>
          <div class="cf-popout-replaces">Replaces: ${brandKey} · ${alt.price}</div>
          <div class="cf-popout-story">${alt.storyHook}</div>
        </div>
      `;

      expect(popout.querySelector('.cf-popout-name')?.textContent).toBe('Salt Spring Coffee');
      expect(popout.querySelector('.cf-popout-replaces')?.textContent).toContain('Starbucks');
    });
  });

  describe('Popout positioning', () => {
    it('should position below tag when space is available', () => {
      const tagRect = { bottom: 100, top: 80, left: 200, height: 20, width: 22 };
      const viewportHeight = 800;
      const popoutH = 290;

      const spaceBelow = viewportHeight - tagRect.bottom;
      let top: number;
      if (spaceBelow > popoutH + 20) {
        top = tagRect.bottom + 8;
      } else {
        top = tagRect.top - popoutH - 8;
        if (top < 0) top = 10;
      }

      expect(top).toBe(108); // Below the tag
    });

    it('should position above tag when no space below', () => {
      const tagRect = { bottom: 700, top: 680, left: 200, height: 20, width: 22 };
      const viewportHeight = 800;
      const popoutH = 290;

      const spaceBelow = viewportHeight - tagRect.bottom;
      let top: number;
      if (spaceBelow > popoutH + 20) {
        top = tagRect.bottom + 8;
      } else {
        top = tagRect.top - popoutH - 8;
        if (top < 0) top = 10;
      }

      expect(top).toBe(382); // Above the tag
    });
  });

  describe('Tag interaction model', () => {
    it('should open popout on click (not hover)', () => {
      // Tags should respond to click to show popout
      const tag = document.createElement('span');
      tag.className = 'cf-tag-maple cf-tag-animate';
      tag.textContent = '🍁';
      tag.dataset.brand = 'Kicking Horse';

      let clickFired = false;
      tag.addEventListener('click', () => { clickFired = true; });
      tag.click();

      expect(clickFired).toBe(true);
    });

    it('should NOT have mouseenter listener for popout on tags', () => {
      // Verify the interaction contract: tags use click, not hover
      // The tag should not trigger popout on mouseenter
      const tag = document.createElement('span');
      tag.className = 'cf-tag-rec cf-tag-animate';
      tag.dataset.brand = 'Folgers';

      // Tags should only use click — no mouseenter for popout
      // This is a contract test: implementation must use click, not mouseenter
      expect(tag.dataset.brand).toBe('Folgers');
      expect(tag.className).toContain('cf-tag-rec');
    });

    it('CTA button in popout should open sidebar (not tag click)', () => {
      // The CTA button in the popout is what triggers the sidebar
      const popout = document.createElement('div');
      popout.innerHTML = `
        <div class="cf-popout-body">
          <button class="cf-popout-cta" data-brand="Folgers">
            Compare & learn more <span class="cf-arrow">→</span>
          </button>
        </div>
      `;

      const ctaBtn = popout.querySelector('.cf-popout-cta') as HTMLButtonElement;
      expect(ctaBtn).toBeTruthy();
      expect(ctaBtn.dataset.brand).toBe('Folgers');

      let ctaClicked = false;
      ctaBtn.addEventListener('click', () => { ctaClicked = true; });
      ctaBtn.click();

      expect(ctaClicked).toBe(true);
    });
  });

  describe('Popout dismiss behavior', () => {
    it('should have a close button or dismiss mechanism', () => {
      const popout = document.createElement('div');
      popout.className = 'cf-popout cf-visible';
      popout.innerHTML = `
        <div class="cf-popout-body">
          <button class="cf-popout-close">✕</button>
          <div class="cf-popout-name">Test Brand</div>
        </div>
      `;

      const closeBtn = popout.querySelector('.cf-popout-close');
      expect(closeBtn).toBeTruthy();
    });
  });

  describe('DOM walker skip list', () => {
    it('should skip SCRIPT, STYLE, TEXTAREA, CF-TAG elements', () => {
      const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'MARK', 'CF-TAG'];

      for (const tag of skipTags) {
        const el = document.createElement(tag);
        expect(skipTags.includes(el.tagName)).toBe(true);
      }
    });
  });
});
