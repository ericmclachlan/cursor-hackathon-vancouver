/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
    }],
  },
  setupFiles: ['<rootDir>/tests/setup.ts'],
  projects: [
    {
      displayName: 'frontend',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/tests'],
      testPathIgnorePatterns: ['backend-api\\.test\\.ts$', 'cache\\.test\\.ts$', 'llm-chat\\.test\\.ts$'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
      },
      setupFiles: ['<rootDir>/tests/setup.ts'],
    },
    {
      displayName: 'backend',
      preset: 'ts-jest',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests'],
      testMatch: ['**/backend-api.test.ts', '**/cache.test.ts', '**/llm-chat.test.ts'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
        '^.+\\.js$': ['ts-jest', {
          tsconfig: 'tsconfig.test.json',
          useESM: false,
        }],
      },
      transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
    },
  ],
};
