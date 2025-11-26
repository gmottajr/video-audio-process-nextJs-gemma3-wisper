module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.integration.setup.js'],
  testMatch: ['**/__tests__/integration/**/*.test.ts(x)?'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      }
    }]
  },
  collectCoverageFrom: [
    'hooks/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
};

