import { fileURLToPath, URL } from 'node:url';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

// Source maps are uploaded to Sentry only when SENTRY_AUTH_TOKEN is set (e.g. in Vercel's
// build environment), then deleted so they are never served publicly.
const sentryAuthToken = process.env['SENTRY_AUTH_TOKEN'];

// Local API for the /api proxy: API_PROXY_TARGET (end-to-end tests use their own port).
const apiProxy = {
  target: process.env['API_PROXY_TARGET'] ?? 'http://localhost:3000',
  changeOrigin: true,
  rewrite: (path: string) => path.replace(/^\/api/, ''),
};

export default defineConfig({
  plugins: [
    // Must come before react(): generates src/routeTree.gen.ts from src/routes.
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    sentryAuthToken
      ? sentryVitePlugin({
          authToken: sentryAuthToken,
          org: process.env['SENTRY_ORG'],
          project: process.env['SENTRY_PROJECT'],
          sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
          telemetry: false,
        })
      : null,
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  // The browser calls the API at /api on the web app's own origin, so the session cookie is
  // first-party (production does the same with a Vercel rewrite; see vercel.json).
  server: { proxy: { '/api': apiProxy } },
  preview: { proxy: { '/api': apiProxy } },
  build: {
    sourcemap: sentryAuthToken ? 'hidden' : false,
    rolldownOptions: {
      output: {
        // Long-lived vendor chunks: they stay cached across app deploys.
        codeSplitting: {
          groups: [
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'sentry', test: /node_modules[\\/]@sentry(-internal)?[\\/]/ },
            { name: 'tanstack', test: /node_modules[\\/]@tanstack[\\/](?!charts)/ },
          ],
        },
      },
    },
  },
  test: {
    projects: [
      {
        // Unit and component tests (*.test.ts[x]) in a simulated DOM.
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: ['src/**/*.test.{ts,tsx}'],
        },
      },
      {
        // Every Storybook story rendered in real Chromium: it must render, its `play`
        // interaction test must pass, and it must have no accessibility violations.
        extends: true,
        plugins: [
          storybookTest({ configDir: fileURLToPath(new URL('./.storybook', import.meta.url)) }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
