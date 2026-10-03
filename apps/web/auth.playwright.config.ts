import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'auth.spec.ts', timeout: 30000, workers: 1,
  use: { baseURL: 'http://localhost:4180', headless: true, viewport: { width: 1365, height: 900 },
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] }, trace: 'retain-on-failure' },
  webServer: [
    { command: 'node ../api/dist/main.js', url: 'http://localhost:4000/api/platform/capabilities', env: { NODE_ENV: 'test', DATABASE_URL: '', HOST: '127.0.0.1', PORT: '4000', CORS_ORIGINS: 'http://localhost:4180' }, reuseExistingServer: false },
    { command: 'npx next start -H 127.0.0.1 -p 4180', url: 'http://localhost:4180', reuseExistingServer: false },
  ],
});
