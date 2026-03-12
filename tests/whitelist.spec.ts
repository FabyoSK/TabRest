import { test, expect } from './fixture';

test.describe('Whitelist Features', () => {
  test('Options page allows adding and removing domains from whitelist', async ({ page, extensionId }) => {
    await page.goto(`chrome-extension://${extensionId}/options/index.html`);
    
    // Add domain
    const input = page.locator('#whitelist-input');
    await input.fill('github.com');
    await page.locator('#btn-add').click();
    
    // Toast should show up
    await expect(page.locator('#toast')).toHaveClass(/visible/);
    await expect(page.locator('#toast')).toHaveText('github.com added');
    
    // Wait for toast to hide
    await expect(page.locator('#toast')).not.toHaveClass(/visible/);
    
    // Check if domain is listed
    await expect(page.locator('.whitelist-tag', { hasText: 'github.com' })).toBeVisible();
    
    // Reload page to verify it was saved in storage
    await page.reload();
    await expect(page.locator('.whitelist-tag', { hasText: 'github.com' })).toBeVisible();
    
    // Remove domain
    const removeBtn = page.locator('.whitelist-tag', { hasText: 'github.com' }).locator('button.tag-remove');
    await removeBtn.click();
    
    // Toast should show up
    await expect(page.locator('#toast')).toHaveClass(/visible/);
    await expect(page.locator('#toast')).toHaveText('github.com removed');
    
    // Check if domain is removed
    await expect(page.locator('.whitelist-tag', { hasText: 'github.com' })).not.toBeVisible();
  });
});
