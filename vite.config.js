import { defineConfig } from 'vite'

export default defineConfig({
  base: '/Adult-fighting-game/',
  server: {
    port: 3000,
    allowedHosts: ['sb-5uahjl5o7m5b.vercel.run', 'localhost', '127.0.0.1']
  },
  build: {
    outDir: 'dist'
  }
})
