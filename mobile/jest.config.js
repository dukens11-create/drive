/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testMatch: ['<rootDir>/test/**/*.test.ts', '<rootDir>/test/**/*.test.tsx'],
  collectCoverageFrom: [
    'src/services/realtime/mockDriveFeed.ts',
    'src/utils/*.ts',
    'src/components/drive/RideRequestCard.tsx',
    'app/onboarding.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
