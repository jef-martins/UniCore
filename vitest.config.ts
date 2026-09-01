import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['apps/frontend/src/**/*.test.ts'],
  },
})
