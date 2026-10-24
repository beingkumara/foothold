/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the app from /foothold/; override with BASE_PATH for other hosts.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/foothold/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/state/**', 'src/hooks/**'],
      exclude: ['**/*.test.*'],
    },
  },
});
