import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      // Media FILES live on the PPW staff backend (:3000) — that's where the
      // admin app uploads them. This rule must come before the generic '/api'
      // rule so image/video requests resolve against the backend that has them.
      '/api/media': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Everything else (product data, item-details, thumbnails) is served by
      // the local backend (:3002), whose customer-facing routes are public.
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/public': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
