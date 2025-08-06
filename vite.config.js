import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // ✅ this is the missing piece

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
