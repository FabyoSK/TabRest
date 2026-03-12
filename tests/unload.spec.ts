import { test, expect } from './fixture';

test.describe('Tab Unload / Auto-suspend Feature', () => {
  test('Auto-suspends tabs after the idle timeout', async ({ page, context }) => {
    // We will use the service worker to modify settings directly to use a small timeout
    // Wait a brief moment for the extension to fully initialize
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');

    await page.waitForTimeout(1000);

    // Create a new tab that will be suspended
    const testPage = await context.newPage();
    await testPage.goto('https://example.com');
    await expect(testPage.locator('h1')).toHaveText('Example Domain');
    
    // We need the tab's ID to check if it gets discarded
    const targetTabId = await background.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: 'https://example.com/' });
      return tabs[0]?.id;
    });

    expect(targetTabId).toBeDefined();

    // Make the original page active so the testPage becomes inactive
    await page.bringToFront();

    // Wait a brief moment to let tab register
    await page.waitForTimeout(500);

    // Instead of waiting real time, mock the last active time into the past and call runCheck
    const tabsState = await background.evaluate(async (tid) => {
       const workerGlobal = self as any;
       // Push the last active time to 16 minutes ago, over the 15m default limit
       if (workerGlobal.lastActiveTimes) {
          workerGlobal.lastActiveTimes[tid] = Date.now() - (16 * 60000);
       }
       
       const beforeTabs = await chrome.tabs.query({});
       let targetTabBefore = beforeTabs.find(t => t.id === tid);
       
       // Mock discard to avoid Playwright crash
       const realDiscard = chrome.tabs.discard;
       let discardCalled = false;
       workerGlobal.chrome.tabs.discard = async (id: number) => {
          discardCalled = true;
          return { id, discarded: true } as any;
       };

       if (workerGlobal.runCheck) {
          await workerGlobal.runCheck();
       }
       
       return { discardCalled };
    }, targetTabId);
    
    expect(tabsState.discardCalled).toBe(true);

    const storageKeys = await background.evaluate(async () => {
      const res = await chrome.storage.local.get('suspendedTabs');
      return Object.keys(res.suspendedTabs || {});
    });

    expect(storageKeys).toContain(String(targetTabId));
  });

  test('Does not suspend the active tab', async ({ page, context }) => {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');
    await page.waitForTimeout(1000);

    const testPage = await context.newPage();
    await testPage.goto('https://example.com');
    await expect(testPage.locator('h1')).toHaveText('Example Domain');
    
    const targetTabId = await background.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: 'https://example.com/' });
      return tabs[0]?.id;
    });

    expect(targetTabId).toBeDefined();

    // Remain on the active page
    await testPage.bringToFront();

    await page.waitForTimeout(500);

    const tabsState = await background.evaluate(async (tid) => {
       const workerGlobal = self as any;
       if (workerGlobal.lastActiveTimes) {
          workerGlobal.lastActiveTimes[tid] = Date.now() - (16 * 60000);
       }
       
       const realDiscard = chrome.tabs.discard;
       let discardCalled = false;
       workerGlobal.chrome.tabs.discard = async (id: number) => {
          discardCalled = true;
          return { id, discarded: true } as any;
       };

       if (workerGlobal.runCheck) {
          await workerGlobal.runCheck();
       }
       
       workerGlobal.chrome.tabs.discard = realDiscard;
       return { discardCalled };
    }, targetTabId);
    
    // Active tab should not be discarded
    expect(tabsState.discardCalled).toBe(false);
  });

  test('Does not suspend whitelisted tabs', async ({ page, context }) => {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');
    await page.waitForTimeout(1000);

    await background.evaluate(async () => {
      await chrome.storage.local.set({ whitelist: ['example.com'] });
    });

    const testPage = await context.newPage();
    await testPage.goto('https://example.com');
    await expect(testPage.locator('h1')).toHaveText('Example Domain');
    
    const targetTabId = await background.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: 'https://example.com/' });
      return tabs[0]?.id;
    });

    expect(targetTabId).toBeDefined();

    await page.bringToFront(); // leave testPage

    await page.waitForTimeout(500);

    const tabsState = await background.evaluate(async (tid) => {
       const workerGlobal = self as any;
       if (workerGlobal.lastActiveTimes) {
          workerGlobal.lastActiveTimes[tid] = Date.now() - (16 * 60000);
       }
       
       const realDiscard = chrome.tabs.discard;
       let discardCalled = false;
       workerGlobal.chrome.tabs.discard = async (id: number) => {
          discardCalled = true;
          return { id, discarded: true } as any;
       };

       if (workerGlobal.runCheck) {
          await workerGlobal.runCheck();
       }
       
       workerGlobal.chrome.tabs.discard = realDiscard;
       return { discardCalled };
    }, targetTabId);
    
    // Whitelisted tab should not be discarded
    expect(tabsState.discardCalled).toBe(false);

    // cleanup
    await background.evaluate(async () => {
      await chrome.storage.local.set({ whitelist: [] });
    });
  });

  test('Does not suspend pinned tabs by default', async ({ page, context }) => {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');
    await page.waitForTimeout(1000);

    const testPage = await context.newPage();
    await testPage.goto('https://example.com');
    await expect(testPage.locator('h1')).toHaveText('Example Domain');
    
    const targetTabId = await background.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: 'https://example.com/' });
      const tid = tabs[0]?.id;
      if (tid) await chrome.tabs.update(tid, { pinned: true });
      return tid;
    });

    expect(targetTabId).toBeDefined();

    await page.bringToFront();

    await page.waitForTimeout(500);

    const tabsState = await background.evaluate(async (tid) => {
       const workerGlobal = self as any;
       if (workerGlobal.lastActiveTimes) {
          workerGlobal.lastActiveTimes[tid] = Date.now() - (16 * 60000);
       }
       
       const realDiscard = chrome.tabs.discard;
       let discardCalled = false;
       workerGlobal.chrome.tabs.discard = async (id: number) => {
          discardCalled = true;
          return { id, discarded: true } as any;
       };

       if (workerGlobal.runCheck) {
          await workerGlobal.runCheck();
       }
       
       workerGlobal.chrome.tabs.discard = realDiscard;
       return { discardCalled };
    }, targetTabId);
    
    // Pinned tab should not be discarded
    expect(tabsState.discardCalled).toBe(false);
  });
});

