import { expect, test } from '@playwright/test';

const stories = [
  {
    name: 'overview-light',
    id: 'renderer-speccy--overview-light',
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: 'endpoint-light',
    id: 'renderer-speccy--endpoint-light',
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: 'endpoint-dark-mobile',
    id: 'renderer-speccy--endpoint-dark',
    viewport: { width: 390, height: 844 },
  },
] as const;

for (const story of stories) {
  test(`${story.name} matches its screenshot`, async ({ page }) => {
    await page.setViewportSize(story.viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
    await expect(page.locator('.speccy.sp-with-sidebar')).toBeVisible();
    await expect(page).toHaveScreenshot(`${story.name}.png`, {
      fullPage: true,
    });
  });
}
