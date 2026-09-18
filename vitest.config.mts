import { defineConfig } from 'vitest/config';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(import.meta.dirname, '.env.local') });
dotenv.config({ path: path.resolve(import.meta.dirname, '.env') });

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './'),
    },
  },
});
