import { test, expect } from '@playwright/test';

test('App should render the welcome page', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByText('SeatGeek Backstage Plugins Demo Site'),
  ).toBeVisible();
});
