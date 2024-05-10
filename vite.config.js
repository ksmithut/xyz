import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TOKEN } from './src/configstore.js'

const API_BASE_URL = 'http://localhost:2345'

const OPEN_URL = new URL('/auth', API_BASE_URL)
OPEN_URL.searchParams.set('token', TOKEN)

export default defineConfig({
  root: './client',
  publicDir: new URL('./static/', import.meta.url).pathname,
  build: {
    outDir: new URL('./public/', import.meta.url).pathname,
    emptyOutDir: true,
    manifest: true
  },
  plugins: [react()],
  server: {
    open: OPEN_URL.toString(),
    proxy: {
      '/api': 'http://localhost:2345'
    }
  }
})
