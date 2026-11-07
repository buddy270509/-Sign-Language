import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const crossOriginIsolation = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    // The app is served through a proxy host (e.g. https://<port>-<sandbox>.e2b.app),
    // so the dev server must not restrict Host headers or frame embedding.
    allowedHosts: true,
    cors: true,
    // Cross-origin isolation is needed later for MediaPipe/WASM threads (Phase 4).
    headers: crossOriginIsolation,
  },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true, headers: crossOriginIsolation },
  build: { target: 'es2022', sourcemap: true },
});
