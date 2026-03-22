// Mock Chrome Extension APIs
const chromeMock = {
  runtime: {
    getURL: jest.fn((path: string) => `chrome-extension://fake-id/${path}`),
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  sidePanel: {
    open: jest.fn(),
    setOptions: jest.fn(),
  },
  action: {
    setBadgeText: jest.fn(),
    setBadgeBackgroundColor: jest.fn(),
  },
};

(globalThis as any).chrome = chromeMock;
