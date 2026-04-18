import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

/** Alerta se Supabase não estiver configurado no build. */
function envCheck() {
  return {
    name: 'env-check',
    buildStart() {
      const url = process.env.VITE_SUPABASE_URL || '';
      const key = process.env.VITE_SUPABASE_ANON_KEY || '';
      const ok = url && key && !url.includes('placeholder') && key !== 'placeholder-key';
      if (!ok) {
        console.warn('\n⚠️  Supabase não configurado: faltam VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY.');
        console.warn('   Local: configure .env.local e reinicie npm run dev.');
        console.warn('   Vercel: Settings > Environment Variables.\n');
      }
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    envCheck(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'logo-app.png', 'logo-192.png', 'logo-512.png', 'placeholder.svg'],
      manifest: {
        name: 'Gestão Igreja',
        short_name: 'Gestão Igreja',
        description: 'Sistema de Gestão Eclesiástica Premium',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        display_override: ['fullscreen', 'standalone', 'minimal-ui', 'browser'],
        start_url: '/',
        scope: '/',
        orientation: 'any',
        icons: [
          { src: '/logo-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/logo-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/logo-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/[^/]*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/[^/]*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      buffer: 'buffer',
    },
    // Evita "Cannot read properties of null (reading 'useState')" com react-leaflet
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['buffer'],
  },
});
