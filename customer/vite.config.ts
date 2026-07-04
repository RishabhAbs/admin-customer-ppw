import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      // Single backend (:3002 in local dev, per admin/backend/.env PORT) serves
      // product data, item-details, thumbnails, and media/uploads (/public).
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/public': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
})
