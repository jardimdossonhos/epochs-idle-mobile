/** @type {import('jest').Config} */
module.exports = {
  // jest-expo@56 é o preset oficial para Expo SDK 56.
  preset: 'jest-expo',

  // Usar tsconfig.test.json para resolver @types/jest nos arquivos de teste
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },

  // Testar apenas arquivos TypeScript/TSX puros que não dependem de APIs nativas.
  // Testes que dependem de módulos RN nativos requerem configuração adicional de mocks.
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/*.test.ts',
    '**/*.test.tsx',
  ],

  // Excluir diretórios que não devem ser varridos
  testPathIgnorePatterns: [
    '/node_modules/',
    '/android/',
    '/ios/',
    '/.expo/',
    '/scripts/',
  ],

  // Coletar cobertura apenas dos arquivos relevantes para a lógica de domínio.
  // Não coletar de UI, stores, ou arquivos de infraestrutura.
  collectCoverageFrom: [
    'src/core/utils/**/*.ts',
    'src/application/boot/**/*.ts',
    'src/core/models/**/*.ts',
    'src/core/simulation/systems/**/*.ts',
    '!**/*.d.ts',
    '!**/index.ts',
  ],

  // Timeout por teste: 10s para testes pesados (ex: createInitialState com 9MB de JSON)
  testTimeout: 10000,

  // Transformar módulos JSON nativamente (world_map_data.json é 9.4MB)
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@shopify/.*|react-native-reanimated|react-native-worklets)',
  ],

  // Setup global: silenciar console.warn de módulos nativos não disponíveis em Node
  setupFiles: [],

  // Relatório de cobertura
  coverageReporters: ['text-summary', 'lcov'],
};
