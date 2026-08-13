import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Declare process for IDE TypeScript environment
declare const process: { cwd: () => string; env: Record<string, string | undefined> };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, typeof process !== 'undefined' && process.cwd ? process.cwd() : '', '');
  const backendTarget = env.VITE_BACKEND_URL || env.BACKEND_URL || 'http://localhost:8080';
  const wsTarget = backendTarget.replace(/^http/, 'ws');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/ws': {
          target: wsTarget,
          ws: true,
        },
      },
    },
  };
});
