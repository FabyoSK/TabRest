import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  retries: 0,
  workers: 1, // Only 1 worker because extensions write to the same background state
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
});
