export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { 
      tsconfig: './tsconfig.json',
      useESM: true
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(execa|fs-extra|strip-final-newline|npm-run-path|path-key|onetime|mimic-fn|human-signals|is-stream)/)'
  ]
} 