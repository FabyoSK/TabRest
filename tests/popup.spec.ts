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

  test('Suspend buttons exist and display correctly', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/action/index.html`);

    const suspendAllBtn = page.locator('#btn-suspend-all');
    await expect(suspendAllBtn).toBeVisible();
    await expect(suspendAllBtn).toContainText('Suspend All Inactive');

    const suspendCurrentBtn = page.locator('#btn-suspend-current');
    await expect(suspendCurrentBtn).toBeVisible();
    await expect(suspendCurrentBtn).toContainText('Suspend Current Tab');
  });

});
