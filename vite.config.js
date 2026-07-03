import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Relative base so the built site works when served from a subpath like
  // https://<user>.github.io/mind-lab/ as well as from the root in local dev.
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
})
