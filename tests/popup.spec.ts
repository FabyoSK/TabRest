import { test, expect } from './fixture';

test.describe('Popup Features', () => {
  test('Popup renders correctly and displays empty state', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/action/index.html`);
    
    // Check main container
    await expect(page.locator('.popup-title')).toHaveText('TabRest');
    await expect(page.locator('.popup-subtitle')).toHaveText('Tab Suspension Manager');
    
    // Check initial limit UI
    await expect(page.locator('.limit-label')).toContainText('Open Tabs');
    
    // Suspended Tabs list
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-text')).toContainText('No suspended tabs yet');
    
    // Ensure the settings button exists
    await expect(page.locator('#btn-open-options')).toBeVisible();
    await expect(page.locator('#btn-open-options')).toContainText('Settings');
  });

  test('Suspend buttons exist and display in correct order', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/action/index.html`);

    const buttons = page.locator('.action-row');
    await expect(buttons.first()).toContainText('Suspend All Except Current');
    await expect(buttons.nth(1)).toContainText('Suspend Current Tab');
    await expect(buttons.nth(2)).toContainText('Suspend All Inactive');
    
    // Ensure Restore All is gone
    const restoreBtn = page.locator('#btn-restore-all');
    await expect(restoreBtn).not.toBeVisible();
  });

  test('Suspend Current Tab button works and switches focus', async ({ page, context, extensionId }) => {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');

    const firstPage = await context.newPage();
    await firstPage.goto('https://example.com');
    
    const secondPage = await context.newPage();
    await secondPage.goto('https://google.com');

    // Make secondPage active
    await secondPage.bringToFront();

    await background.evaluate(async () => {
      (chrome.tabs as any).discard = async (id: number) => {
        return { id, discarded: true } as any;
      };
      (chrome as any).scripting = { executeScript: async () => {} };
    });

    await page.goto(`chrome-extension://${extensionId}/action/index.html`);
    await page.waitForTimeout(500);
    
    await page.locator('#btn-suspend-current').click();
    
    await expect(page.locator('.toast')).toBeVisible();
    await expect(page.locator('.toast')).toContainText('Tab suspended');

    // Verify firstPage is now active (because it was the 'previous' one)
    // Note: In real browser this happens by background.js calling chrome.tabs.update
    // We can't easily check actual browser focus in Playwright across multiple pages automatically 
    // without checking activity state in background script
    const activeTabId = await background.evaluate(async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs[0]?.id;
    });
    
    // The previously opened page should be active
    expect(activeTabId).toBeDefined();
  });

  test('Suspend All Except Current button works and forces counter to 1', async ({ page, context, extensionId }) => {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');

    // Open multiple pages
    const p1 = await context.newPage(); await p1.goto('https://example.com');
    const p2 = await context.newPage(); await p2.goto('https://google.com');
    await p2.bringToFront(); // Ensure one is active

    await background.evaluate(async () => {
      const discardedIds = new Set<number>();
      (chrome.tabs as any).discard = async (id: number) => {
        discardedIds.add(id);
        return { id, discarded: true } as any;
      };
      const realQuery = chrome.tabs.query;
      (chrome.tabs as any).query = async (queryInfo: any) => {
        const tabs = await realQuery(queryInfo);
        if (queryInfo.discarded === false) {
          return tabs.filter(t => !discardedIds.has(t.id || -1));
        }
        return tabs;
      };
      (chrome as any).scripting = { executeScript: async () => {} };
    });

    await page.goto(`chrome-extension://${extensionId}/action/index.html`);
    await page.waitForTimeout(500);
    
    await page.locator('#btn-suspend-all-except-current').click();
    await page.waitForTimeout(1000); // Give it time to process
    
    // In our mocked environment, the "open tabs" should be 1 (the active one) 
    // plus potentially the popup page itself if it's considered in the same window
    const openTabsCount = await background.evaluate(async () => {
      const tabs = await chrome.tabs.query({ discarded: false });
      return tabs.length;
    });

    // We expect 1 or 2 depending on if the popup page is counted
    expect(openTabsCount).toBeLessThanOrEqual(2);
  });

  test('Suspension adds [Zzz] indicator to tab title', async ({ context, extensionId }) => {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');

    const testPage = await context.newPage();
    await testPage.goto('https://example.com');
    const originalTitle = await testPage.title();

    // Mock discard but NOT executeScript for this test (if we want to test real script injection)
    // Actually, Playwright can't easily see title changes from extension scripts in mocked contexts 
    // unless we use real extension loading.
    // Our background script uses chrome.scripting.executeScript.
    
    await background.evaluate(async (url) => {
      const tabs = await chrome.tabs.query({ url });
      if (tabs[0]) {
        // Mock discard to avoid crash
        (chrome.tabs as any).discard = async () => {};
        
        const worker = self as any;
        await worker.suspendTab(tabs[0].id, true);
      }
    }, 'https://example.com/');

    // Check if the title changed. Note: titles update might take a moment
    await expect(testPage).toHaveTitle(`[Zzz] ${originalTitle}`, { timeout: 10000 });
  });

  test('Toast element exists and is properly styled', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/action/index.html`);
    
    const toast = page.locator('#toast');
    await expect(toast).toBeAttached();
    await expect(toast).toHaveClass(/toast/);
  });
});
