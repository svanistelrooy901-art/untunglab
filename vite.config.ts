/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base + HashRouter: works from any static host or sub-path, and offline.
  base: './',
  plugins: [
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
});
