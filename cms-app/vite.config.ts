import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../public/cms',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'https://agentsam-cms-editor.meauxbility.workers.dev',
        changeOrigin: true,
      },
    },
  },
})
