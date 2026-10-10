/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Cloudflare Web Analytics beacon (D-93), only when VITE_CF_BEACON_TOKEN is set at build time. `spa:false` counts app opens
 * only: no screen changes, no data typed in the app. Offline the script simply fails to load; the app does not depend on it.
 */
function cfBeacon(token: string | undefined): Plugin {
  const ok = !!token && /^[A-Za-z0-9]{16,64}$/.test(token);
  return {
    name: 'untunglab-cf-beacon',
    transformIndexHtml: () =>
      ok
        ? [{ tag: 'script', attrs: { type: 'module', src: 'https://static.cloudflareinsights.com/beacon.min.js', 'data-cf-beacon': JSON.stringify({ token, spa: false }) }, injectTo: 'head' }]
        : [],
  };
}

export default defineConfig(({ mode }) => ({
  // Relative base + HashRouter: works from any static host or sub-path, and offline.
  base: './',
  plugins: [
    cfBeacon(process.env.VITE_CF_BEACON_TOKEN ?? loadEnv(mode, process.cwd(), 'VITE_').VITE_CF_BEACON_TOKEN),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'UntungLab',
        short_name: 'UntungLab',
        description: 'Tahu kos sebenar menu anda. Jejak apa yang berubah dan ambil tindakan.',
        lang: 'ms',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#011416',
        theme_color: '#011416',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        // The manual is 5-6 MB, so it is cached on first open rather than precached for everyone.
        runtimeCaching: [{ urlPattern: /\.pdf$/, handler: 'CacheFirst', options: { cacheName: 'manual', expiration: { maxEntries: 2 }, rangeRequests: true } }],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
  },
}));
