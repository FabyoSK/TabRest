import { test, expect } from './fixture';

test.describe('Options Page Features', () => {
  test('Options page renders dashboard and settings sections', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);
    await expect(page.locator('.options-title')).toHaveText('TabRest');
    await expect(page.locator('.section-title', { hasText: 'Dashboard' })).toBeVisible();
    await expect(page.locator('.section-title', { hasText: 'General Settings' })).toBeVisible();
    await expect(page.locator('.section-title', { hasText: 'Performance' })).toBeVisible();
  });

  test('Can toggle all boolean settings', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);
    
    const toggles = [
      '#toggle-pinned',
      '#toggle-scroll',
      '#toggle-metrics',
      '#toggle-background',
      '#toggle-toasts'
    ];

    for (const toggleId of toggles) {
      const toggleLabel = page.locator('label.toggle').filter({ has: page.locator(toggleId) });
      await toggleLabel.click();
      await expect(page.locator('#toast')).toHaveClass(/visible/);
      await expect(page.locator('#toast')).toHaveText('Settings saved');
      await expect(page.locator('#toast')).not.toHaveClass(/visible/);
    }
  });

  test('Can change timeout settings', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);
    
    // Change to preset
    const selectTimeout = page.locator('#select-timeout');
    await selectTimeout.selectOption('30');
    await expect(page.locator('#toast')).toHaveClass(/visible/);
    await expect(page.locator('#toast')).not.toHaveClass(/visible/);

    // Change to custom
    await selectTimeout.selectOption('custom');
    
    const customInput = page.locator('#input-custom-timeout');
    await expect(customInput).toBeVisible();
    await customInput.fill('45');
    await customInput.dispatchEvent('change');
    
    await expect(page.locator('#toast')).toHaveClass(/visible/);
    await expect(page.locator('#toast')).toHaveText('Settings saved');
  });

  test('Can change performance numeric settings', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);

    const maxOpen = page.locator('#input-max-open');
    await maxOpen.fill('25');
    await maxOpen.dispatchEvent('change');
    await expect(page.locator('#toast')).toHaveClass(/visible/);
    await expect(page.locator('#toast')).not.toHaveClass(/visible/);

    const maxSuspended = page.locator('#input-max-suspended');
    await maxSuspended.fill('150');
    await maxSuspended.dispatchEvent('change');
    await expect(page.locator('#toast')).toHaveClass(/visible/);
    await expect(page.locator('#toast')).toHaveText('Settings saved');
  });

  test('Can change visual indicator setting', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);

    const indicatorInput = page.locator('#input-visual-indicator');
    await expect(indicatorInput).toBeVisible();
    await indicatorInput.fill('[Sleeping] ');
    await indicatorInput.dispatchEvent('change');

    await expect(page.locator('#toast')).toHaveClass(/visible/);
    await expect(page.locator('#toast')).toHaveText('Settings saved');
    
    // Refresh and check if it persisted
    await page.reload();
    await expect(page.locator('#input-visual-indicator')).toHaveValue('[Sleeping] ');
  });

  test('Changing visual indicator updates labels on existing suspended tabs', async ({ page, context, extensionId }) => {
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent('serviceworker');

    const testPage = await context.newPage();
    await testPage.goto('https://example.com');
    const originalTitle = await testPage.title();

    // 1. Suspend the tab (mocking discard to keep it alive so we can check title)
    await background.evaluate(async (url) => {
      (chrome.tabs as any).discard = async () => {};
      (chrome as any).scripting = { 
        executeScript: async (args: any) => {
          // Re-implement the script logic for the mock
          const tab = await chrome.tabs.get(args.target.tabId);
          await (chrome.scripting as any).realExecuteScript(args);
        },
        realExecuteScript: (chrome as any).scripting.executeScript
      };
      
      const tabs = await chrome.tabs.query({ url });
      if (tabs[0]) {
        const worker = self as any;
        await worker.suspendTab(tabs[0].id, true);
      }
    }, 'https://example.com/');

    await expect(testPage).toHaveTitle(`[Zzz] ${originalTitle}`);

    // 2. Change the indicator in settings
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);
    const indicatorInput = page.locator('#input-visual-indicator');
    await indicatorInput.fill('[Resting] ');
    await indicatorInput.dispatchEvent('change');
    
    // Wait for message processing
    await page.waitForTimeout(1000);

    // 3. Verify the tab title updated
    await expect(testPage).toHaveTitle(`[Resting] ${originalTitle}`);
  });

  test('Preview toast button works', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);
    await page.locator('#btn-preview-toast').click();
    await expect(page.locator('#toast')).toHaveClass(/visible/);
    await expect(page.locator('#toast')).toContainText('preview of the toast');
  });
});
