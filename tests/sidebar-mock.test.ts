import * as fs from 'fs';
import * as path from 'path';

interface MockResponse {
  type: 'text' | 'origin-card' | 'comparison-card' | 'story-card' | 'qa-buttons' | 'badge-prompt';
  content: string;
  delayMs: number;
}

interface MockFlow {
  brandKey: string;
  canadian: boolean;
  responses: MockResponse[];
}

interface MockChatData {
  flows: Record<string, MockFlow>;
  fallbackResponses: Record<string, string>;
  comingSoonMessage: string;
}

describe('Sidebar mock data', () => {
  let mockData: MockChatData;

  beforeAll(() => {
    const raw = fs.readFileSync(
      path.join(__dirname, '..', 'extention', 'sidepanel', 'mock-chat-data.json'),
      'utf-8'
    );
    mockData = JSON.parse(raw);
  });

  it('should have a comingSoonMessage field', () => {
    expect(mockData.comingSoonMessage).toBeDefined();
    expect(typeof mockData.comingSoonMessage).toBe('string');
    expect(mockData.comingSoonMessage.length).toBeGreaterThan(0);
  });

  it('should have flows for at least 2 brands', () => {
    const flowKeys = Object.keys(mockData.flows);
    expect(flowKeys.length).toBeGreaterThanOrEqual(2);
  });

  it('should have a Canadian brand flow', () => {
    const canadianFlow = Object.values(mockData.flows).find(f => f.canadian);
    expect(canadianFlow).toBeDefined();
    expect(canadianFlow!.responses.length).toBeGreaterThanOrEqual(3);
  });

  it('should have a non-Canadian brand flow', () => {
    const nonCanadianFlow = Object.values(mockData.flows).find(f => !f.canadian);
    expect(nonCanadianFlow).toBeDefined();
    expect(nonCanadianFlow!.responses.length).toBeGreaterThanOrEqual(4);
  });

  it('each response should have type, content, and delayMs', () => {
    for (const flow of Object.values(mockData.flows)) {
      for (const response of flow.responses) {
        expect(response).toHaveProperty('type');
        expect(response).toHaveProperty('content');
        expect(response).toHaveProperty('delayMs');
        expect(typeof response.delayMs).toBe('number');
        expect(response.delayMs).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('should have valid response types', () => {
    const validTypes = ['text', 'origin-card', 'comparison-card', 'story-card', 'qa-buttons', 'badge-prompt'];
    for (const flow of Object.values(mockData.flows)) {
      for (const response of flow.responses) {
        expect(validTypes).toContain(response.type);
      }
    }
  });

  it('should have fallback responses for common queries', () => {
    expect(mockData.fallbackResponses).toBeDefined();
    expect(Object.keys(mockData.fallbackResponses).length).toBeGreaterThanOrEqual(2);
  });

  it('non-Canadian flow should include a comparison-card response', () => {
    const nonCanadianFlow = Object.values(mockData.flows).find(f => !f.canadian);
    const hasComparison = nonCanadianFlow!.responses.some(r => r.type === 'comparison-card');
    expect(hasComparison).toBe(true);
  });

  it('both flows should end with a badge-prompt', () => {
    for (const flow of Object.values(mockData.flows)) {
      const lastResponse = flow.responses[flow.responses.length - 1];
      expect(lastResponse.type).toBe('badge-prompt');
    }
  });
});

describe('Sidebar coming-soon UI contract', () => {
  it('should render a coming-soon banner in the sidebar', () => {
    const banner = document.createElement('div');
    banner.className = 'cf-coming-soon';
    banner.innerHTML = `
      <span class="cf-coming-soon-icon">🚀</span>
      <span class="cf-coming-soon-text">AI-powered responses coming soon</span>
    `;

    expect(banner.querySelector('.cf-coming-soon-icon')).toBeTruthy();
    expect(banner.querySelector('.cf-coming-soon-text')?.textContent).toContain('coming soon');
  });

  it('should show mock label on scripted responses', () => {
    const bubble = document.createElement('div');
    bubble.className = 'm agent';
    bubble.innerHTML = `
      <div class="m-bubble">Hello! This is a scripted response.</div>
      <div class="m-mock-label">Demo response</div>
    `;

    expect(bubble.querySelector('.m-mock-label')).toBeTruthy();
    expect(bubble.querySelector('.m-mock-label')?.textContent).toBe('Demo response');
  });
});
