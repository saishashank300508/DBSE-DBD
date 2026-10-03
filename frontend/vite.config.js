import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // sockjs-client and some other packages expect Node.js's `global` to exist.
    // This polyfills it so they work in the browser environment.
    global: 'globalThis',
  },
})
