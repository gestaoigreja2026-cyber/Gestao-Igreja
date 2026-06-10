import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

/** Alerta se Supabase não estiver configurado no build. */
function envCheck(mode: string) {
  return {
    name: 'env-check',
    buildStart() {
      const env = loadEnv(mode, process.cwd(), '');
      const url = env.VITE_SUPABASE_URL || '';
      const key = env.VITE_SUPABASE_ANON_KEY || '';
      const ok = url && key && !url.includes('placeholder') && key !== 'placeholder-key';
      if (!ok) {
        console.warn('\n⚠️  Supabase não configurado: faltam VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY.');
        console.warn('   Local: configure .env.local e reinicie npm run dev.');
        console.warn('   Vercel: Settings > Environment Variables.\n');
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  server: {
    port: 3000,
    strictPort: true,
  },
  base: '/',
  plugins: [
    envCheck(mode),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false,
      includeAssets: ['novo-icone-app.png', 'logo-app.png', 'logo-app-v2.png', 'logo-app-v3.png', 'favicon.ico', 'robots.txt'],
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /\/api\/manifest/,
            handler: 'NetworkOnly'
          }
        ]
      }
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      buffer: 'buffer',
      stream: 'stream-browserify',
    },
    // Evita "Cannot read properties of null (reading 'useState')" com react-leaflet
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['buffer'],
    exclude: ['xlsx-js-style'],
  },
}));
