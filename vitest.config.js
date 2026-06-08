import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: [
      'tests/api/**/*.test.{js,jsx}',
      'tests/lib/**/*.test.{js,jsx}',
      'tests/security/**/*.test.{js,jsx}',
      'tests/components/**/*.test.{js,jsx}',
      'tests/utils/**/*.test.{js,jsx}',
      'tests/billing/**/*.test.{js,jsx}',
      'tests/*.test.{js,jsx}',
      'src/**/*.test.{js,jsx}'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/drizzle/**',
      'tests/setup.js',
      'tests/e2e/**',
      '**/*.d.ts',
      'src/app/**/layout.jsx',
      'src/app/**/page.jsx',
    ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
