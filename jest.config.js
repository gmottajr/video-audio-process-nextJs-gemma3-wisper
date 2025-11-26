module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).js',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'scripts/**/*.js',
    'lib/**/*.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

