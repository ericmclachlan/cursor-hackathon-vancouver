describe('Test setup', () => {
  it('should have chrome mock available', () => {
    expect(chrome).toBeDefined();
    expect(chrome.runtime.getURL('test.json')).toBe('chrome-extension://fake-id/test.json');
  });

  it('should have jsdom environment', () => {
    expect(document).toBeDefined();
    expect(document.createElement('div')).toBeTruthy();
  });
});
