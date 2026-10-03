import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', timeout: 30000, workers: 1, retries: 0,
  use: { baseURL: 'http://127.0.0.1:4173/ecg-edu/', headless: true,
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, args: ['--no-sandbox'] }, trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { viewport: { width: 1365, height: 900 } } }, { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }],
  webServer: { command: 'node ../../scripts/serve-demo.cjs', url: 'http://127.0.0.1:4173/ecg-edu/', reuseExistingServer: false },
});
