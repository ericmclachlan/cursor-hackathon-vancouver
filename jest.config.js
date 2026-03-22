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
      testPathIgnorePatterns: ['backend-api\\.test\\.ts$'],
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
      testMatch: ['**/backend-api.test.ts'],
      moduleFileExtensions: ['ts', 'js', 'json'],
      transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
      },
    },
  ],
};
