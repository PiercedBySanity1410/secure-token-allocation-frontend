import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Declare process for IDE TypeScript environment
declare const process: { cwd: () => string; env: Record<string, string | undefined> };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, typeof process !== 'undefined' && process.cwd ? process.cwd() : '', '');
  const backendTarget = env.VITE_BACKEND_URL || env.BACKEND_URL || 'http://ec2-100-61-173-22.compute-1.amazonaws.com:8080';
  const wsTarget = backendTarget.replace(/^http/, 'ws');

  const proxyOptions = {
    '/api': {
      target: backendTarget,
      changeOrigin: true,
      secure: false,
    },
    '/ws': {
      target: wsTarget,
      ws: true,
      changeOrigin: true,
      secure: false,
    },
  };

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: proxyOptions,
    },
    preview: {
      port: 4173,
      host: true,
      proxy: proxyOptions,
    },
  };
});
