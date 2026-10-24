/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

// Production-only CSP (the dev server needs inline scripts + websockets for HMR).
// The only network destination besides our own origin is the optional Claude API.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.anthropic.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const cspPlugin = (): Plugin => ({
  name: 'foothold-csp',
  apply: 'build',
  transformIndexHtml: (html) =>
    html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
});

// GitHub Pages serves the app from /foothold/; override with BASE_PATH for other hosts.
// Emits sw.js with the exact list of built files, so the whole app is cached for offline use.
const serviceWorkerPlugin = (): Plugin => ({
  name: 'foothold-sw',
  apply: 'build',
  generateBundle(_, bundle) {
    const files = Object.keys(bundle).filter((f) => !f.endsWith('.map') && f !== 'index.html');
    const extras = ['favicon.svg', 'manifest.webmanifest'];
    const precache = [...files, ...extras].sort();
    const version = createHash('sha256').update(precache.join('|')).digest('hex').slice(0, 10);
    const template = readFileSync(new URL('./src/sw/sw-template.js', import.meta.url), 'utf8');
    this.emitFile({
      type: 'asset',
      fileName: 'sw.js',
      source: template.replace('__PRECACHE__', JSON.stringify(precache)).replace('__VERSION__', version),
    });
  },
});

export default defineConfig({
  base: process.env.BASE_PATH ?? '/foothold/',
  plugins: [react(), cspPlugin(), serviceWorkerPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/state/**', 'src/hooks/**'],
      exclude: ['**/*.test.*', 'src/lib/chime.ts', 'src/hooks/useSpeak.ts', 'src/hooks/useSpeechInput.ts'],
    },
  },
});
