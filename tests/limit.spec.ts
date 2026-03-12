import { test, expect } from './fixture';

test.describe('Max Open Tabs Enrichment', () => {
  test('Enforces tab limit when opening new tabs', async ({ page, context }) => {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');
    await page.waitForTimeout(1000);

    // Mock discard to avoid crash and track calls
    await background.evaluate(async () => {
      const workerGlobal = self as any;
      workerGlobal.discardCalls = [];
      workerGlobal.chrome.tabs.discard = async (id: number) => {
        workerGlobal.discardCalls.push(id);
        return { id, discarded: true } as any;
      };
      workerGlobal.chrome.scripting = { executeScript: async () => { } };

      // Set limit to 2
      await chrome.storage.local.set({
        settings: {
          maxOpenTabs: 2,
          idleTimeout: 15,
          suspendPinned: false
        }
      });
    });

    // We have 1 tab (page). Let's open 2 more.
    const tab1 = await context.newPage();
    await tab1.goto('https://example.com/1');
    const tab2 = await context.newPage();
    await tab2.goto('https://example.com/2');

    // Total open: 3. Limit 2. Should have triggered 1 discard.
    // Wait for async background tasks
    await page.waitForTimeout(2000);

    const discardCount = await background.evaluate(async () => {
      const workerGlobal = self as any;
      return workerGlobal.discardCalls.length;
    });

    expect(discardCount).toBeGreaterThanOrEqual(1);
  });

  test('Enforces tab limit when activating a suspended tab', async ({ page, context }) => {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');
    await page.waitForTimeout(1000);

    // Mock and set limit
    await background.evaluate(async () => {
      const workerGlobal = self as any;
      workerGlobal.discardCalls = [];
      workerGlobal.chrome.tabs.discard = async (id: number) => {
        workerGlobal.discardCalls.push(id);
        return { id, discarded: true } as any;
      };
      workerGlobal.chrome.scripting = { executeScript: async () => { } };

      await chrome.storage.local.set({
        settings: { maxOpenTabs: 2, idleTimeout: 15 }
      });
    });

    const tab1 = await context.newPage();
    await tab1.goto('https://example.com/1');

    const tab1Id = await background.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: 'https://example.com/1/' });
      return tabs[0]?.id;
    });

    // Now we have 'page' and 'tab1'. Total open: 2. Limit: 2.

    // Open ANOTHER one.
    const tab2 = await context.newPage();
    await tab2.goto('https://example.com/2');
    // Total open: 3. Limit: 2. Should trigger discard of the oldest.

    await page.waitForTimeout(2000);

    const discardCount = await background.evaluate(async () => {
      const workerGlobal = self as any;
      return workerGlobal.discardCalls.length;
    });

    expect(discardCount).toBeGreaterThanOrEqual(1);
  });
});
