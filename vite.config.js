import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    allowedHosts: ['localhost', '127.0.0.1', '.vercel.run']
  },
  build: {
    outDir: 'dist'
  }
})
