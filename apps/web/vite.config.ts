import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'deployment-public-config',
      generateBundle() {
        const publicUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL ?? ''
        const internalAlpha = loadEnv(mode, process.cwd(), 'VITE_').VITE_INTERNAL_ALPHA === 'true'
        this.emitFile({
          type: 'asset',
          fileName: 'deployment-config.json',
          source: JSON.stringify({ supabaseUrl: publicUrl, internalAlpha })
        })
      }
    }
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
}))
