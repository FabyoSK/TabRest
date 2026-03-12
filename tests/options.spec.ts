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

  test('Preview toast button works', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);
    await page.locator('#btn-preview-toast').click();
    await expect(page.locator('#toast')).toHaveClass(/visible/);
    await expect(page.locator('#toast')).toContainText('preview of the toast');
  });
});
