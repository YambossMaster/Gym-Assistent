import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const buildId = process.env.GITHUB_SHA || `local-${Date.now()}`

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    {
      name: 'deployment-public-config',
      transformIndexHtml() {
        return [{ tag: 'meta', attrs: { name: 'app-build', content: buildId }, injectTo: 'head' }]
      },
      generateBundle(_options, bundle) {
        const publicUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL ?? ''
        const internalAlpha = loadEnv(mode, process.cwd(), 'VITE_').VITE_INTERNAL_ALPHA === 'true'
        const billingLiveEnabled =
          mode === 'production' &&
          loadEnv(mode, process.cwd(), 'VITE_').VITE_BILLING_LIVE === 'true'
        this.emitFile({
          type: 'asset',
          fileName: 'deployment-config.json',
          source: JSON.stringify({ supabaseUrl: publicUrl, internalAlpha, billingLiveEnabled })
        })
        this.emitFile({
          type: 'asset',
          fileName: 'app-version.json',
          source: JSON.stringify({
            buildId,
            assets: Object.values(bundle)
              .filter(
                (item) =>
                  (item.type === 'chunk' && item.isEntry) ||
                  (item.type === 'asset' && item.fileName.endsWith('.css'))
              )
              .map((item) => `/${item.fileName}`)
          })
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
