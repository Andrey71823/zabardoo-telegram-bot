module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json'
  ],
  setupFilesAfterEnv: [
    '<rootDir>/src/__tests__/setup/test-setup.ts'
  ],
  testTimeout: 30000,
  maxWorkers: 4,
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Module name mapping for absolute imports
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@repositories/(.*)$': '<rootDir>/src/repositories/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1'
  },

  // Global setup and teardown
  globalSetup: '<rootDir>/src/__tests__/setup/global-setup.ts',
  globalTeardown: '<rootDir>/src/__tests__/setup/global-teardown.ts',

  // Test environment options
  testEnvironmentOptions: {
    NODE_ENV: 'test'
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(some-esm-package)/)'
  ],

  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test-reports',
        filename: 'jest-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Zabardoo Test Report'
      }
    ],
    [
      'jest-junit',
      {
        outputDirectory: './test-reports',
        outputName: 'junit.xml',
        ancestorSeparator: ' › ',
        uniqueOutputName: 'false',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],

  // Custom test categories
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/__tests__/unit/**/*.test.ts',
        '<rootDir>/src/__tests__/**/*.unit.test.ts'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/__tests__/setup/test-setup.ts'
      ]
    },
    {
      displayName: 'integration',
      testMatch: [
        '<rootDir>/src/__tests__/integration/**/*.test.ts',
        '<rootDir>/src/__tests__/**/*.integration.test.ts'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/__tests__/setup/test-setup.ts'
      ],
      testTimeout: 60000
    },
    {
      displayName: 'e2e',
      testMatch: [
        '<rootDir>/src/__tests__/e2e/**/*.test.ts',
        '<rootDir>/src/__tests__/**/*.e2e.test.ts'
      ],
      setupFilesAfterEnv: [
        '<rootDir>/src/__tests__/setup/test-setup.ts'
      ],
      testTimeout: 120000
    }
  ]
};