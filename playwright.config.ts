import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './apps/web/e2e',
  use: {
    baseURL: 'http://127.0.0.1:5178',
    browserName: 'chromium',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  reporter: process.env.CI ? 'github' : 'list',
  webServer: {
    command: 'npm run dev --workspace @gym-assistant/web -- --port 5178 --strictPort',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: false,
    env: {
      VITE_SUPABASE_URL: 'https://e2e.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'public-e2e-fixture',
    },
  },
})
