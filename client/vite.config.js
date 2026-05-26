import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/docs': 'http://localhost:3001',
      '/login': 'http://localhost:3001',
      '/register': 'http://localhost:3001',
    }
  }
})