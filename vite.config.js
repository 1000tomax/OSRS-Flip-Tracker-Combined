import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor libraries into their own chunks
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          utils: ['papaparse', 'html2canvas'],
          tanstack: ['@tanstack/react-query']
        }
      }
    },
    // Increase chunk size warning limit since we're now chunking properly
    chunkSizeWarningLimit: 600
  }
})
