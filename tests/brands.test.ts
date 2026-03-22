import * as fs from 'fs';
import * as path from 'path';

describe('brands.json', () => {
  let brands: Record<string, any>;

  beforeAll(() => {
    const raw = fs.readFileSync(
      path.join(__dirname, '..', 'extention', 'brands.json'),
      'utf-8'
    );
    brands = JSON.parse(raw);
  });

  it('should contain at least 6 brands', () => {
    expect(Object.keys(brands).length).toBeGreaterThanOrEqual(6);
  });

  it('should have required fields for every brand', () => {
    for (const [key, brand] of Object.entries(brands) as [string, any][]) {
      expect(brand).toHaveProperty('canadian');
      expect(brand).toHaveProperty('flag');
      expect(brand).toHaveProperty('owner');
      expect(brand).toHaveProperty('hq');
      expect(typeof brand.canadian).toBe('boolean');
    }
  });

  it('should have story fields on Canadian brands', () => {
    for (const [key, brand] of Object.entries(brands) as [string, any][]) {
      if (brand.canadian) {
        expect(brand).toHaveProperty('story');
        expect(brand).toHaveProperty('storyHook');
        expect(brand).toHaveProperty('storyLoc');
        expect(brand).toHaveProperty('scenicImg');
        expect(brand).toHaveProperty('producerImg');
      }
    }
  });

  it('should have alt recommendation on non-Canadian brands', () => {
    for (const [key, brand] of Object.entries(brands) as [string, any][]) {
      if (!brand.canadian) {
        expect(brand).toHaveProperty('alt');
        const alt = brand.alt;
        expect(alt).toHaveProperty('name');
        expect(alt).toHaveProperty('brand');
        expect(alt).toHaveProperty('shortName');
        expect(alt).toHaveProperty('province');
        expect(alt).toHaveProperty('price');
        expect(alt).toHaveProperty('origin');
        expect(alt).toHaveProperty('story');
        expect(alt).toHaveProperty('storyHook');
        expect(alt).toHaveProperty('scenicImg');
        expect(alt).toHaveProperty('producerImg');
      }
    }
  });

  it('should include known Canadian brands', () => {
    expect(brands['Kicking Horse']?.canadian).toBe(true);
    expect(brands['Tim Hortons']?.canadian).toBe(true);
  });

  it('should include known non-Canadian brands with alternatives', () => {
    expect(brands['Folgers']?.canadian).toBe(false);
    expect(brands['Starbucks']?.canadian).toBe(false);
    expect(brands['Folgers']?.alt?.brand).toBe('Kicking Horse Coffee');
  });
});
