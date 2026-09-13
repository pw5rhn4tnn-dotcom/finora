import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/v1': 'http://127.0.0.1:3000',
      '/docs': 'http://127.0.0.1:3000',
      '/health': 'http://127.0.0.1:3000',
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.tsx'],
    clearMocks: true,
  },
});
