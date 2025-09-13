import { test, expect } from '@playwright/test';

test('go to login', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page.getByPlaceholder('m@example.com')).toBeVisible();
});
