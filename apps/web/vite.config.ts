/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxyConfig = {
  '/api': {
    target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:3000',
    changeOrigin: true,
    headers: {
      origin: 'http://localhost:5173',
    },
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: ['.trycloudflare.com'],
    proxy: apiProxyConfig,
  },
  preview: {
    port: 5173,
    allowedHosts: ['.trycloudflare.com'],
    proxy: apiProxyConfig,
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('antd') || id.includes('@ant-design') || id.includes('rc-')) {
              return 'vendor-antd';
            }
            if (
              id.includes('/react/') ||
              id.includes('\\react\\') ||
              id.includes('react-dom') ||
              id.includes('react-router')
            ) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    testTimeout: 15000,
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
  },
});
