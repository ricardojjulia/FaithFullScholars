import { defineConfig } from 'vitest/config';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(import.meta.dirname, '.env.local') });
dotenv.config({ path: path.resolve(import.meta.dirname, '.env') });

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    exclude: ['tests/e2e/**', '**/node_modules/**', '**/dist/**', '**/.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './'),
    },
  },
});
