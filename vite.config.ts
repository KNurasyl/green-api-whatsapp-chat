import { fileURLToPath, URL } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

import { greenApi } from './server/vite.ts'

export default defineConfig(({ mode }) => ({
  plugins: [react(), greenApi(mode)],
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    projects: [
      { test: { name: 'unit', environment: 'node', include: ['tests/**/*.test.ts'] } },
      { test: { name: 'ui', environment: 'jsdom', include: ['tests/**/*.test.tsx'] } },
    ],
  },
}))
