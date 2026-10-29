import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.ESP32_DEV_TARGET;
  let esp32Proxy;

  if (target) {
    let targetUrl: URL;
    try {
      targetUrl = new URL(target);
    } catch {
      throw new Error('ESP32_DEV_TARGET must be an absolute http(s) origin, such as http://192.168.1.50.');
    }
    if (
      !['http:', 'https:'].includes(targetUrl.protocol) ||
      targetUrl.username ||
      targetUrl.password ||
      targetUrl.pathname !== '/' ||
      targetUrl.search ||
      targetUrl.hash
    ) {
      throw new Error('ESP32_DEV_TARGET must be an http(s) origin without credentials, path, query, or fragment.');
    }
    esp32Proxy = {
      '/api': {
        target: targetUrl.origin,
        changeOrigin: true,
        secure: targetUrl.protocol === 'https:'
      }
    };
  }

  return {
    plugins: [react()],
    base: './',
    server: {
      port: 3000,
      host: true,
      proxy: esp32Proxy
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 500,
      assetsInlineLimit: 4096
    }
  };
});
