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
  {
    name: 'endpoint-dark-tablet-navigation',
    id: 'renderer-speccy--endpoint-dark',
    viewport: { width: 768, height: 1024 },
    openNavigation: true,
  },
  {
    name: 'long-response-example',
    id: 'renderer-speccy--long-response-example',
    viewport: { width: 1440, height: 1000 },
  },
  {
    name: 'long-endpoint-path',
    id: 'renderer-speccy--long-endpoint-path',
    viewport: { width: 1440, height: 900 },
  },
  {
    name: 'long-endpoint-path-mobile',
    id: 'renderer-speccy--long-endpoint-path',
    viewport: { width: 390, height: 844 },
  },
] as const;

for (const story of stories) {
  test(`${story.name} matches its screenshot`, async ({ page }) => {
    await page.setViewportSize(story.viewport);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
    await expect(page.locator('.speccy.sp-with-sidebar')).toBeVisible();
    if (story.name.startsWith('long-endpoint-path')) {
      await expect(page.locator('.sp-endpoint-address')).toContainText(
        'transactionCategoryId',
      );
    }
    if ('openNavigation' in story && story.openNavigation) {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await expect(
        page.getByRole('navigation', { name: 'API reference' }),
      ).toHaveClass(/is-open/);
    }
    await expect(page).toHaveScreenshot(`${story.name}.png`, {
      fullPage: !('openNavigation' in story && story.openNavigation),
    });
  });
}

test('long response example expands on its initial render', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(
    '/iframe.html?id=renderer-speccy--long-response-example&viewMode=story',
  );
  await page.getByRole('button', { name: 'Show full response' }).click();

  const clip = page.locator('.sp-response-example .sp-code-clip');
  const code = clip.locator('pre');
  await expect(clip).not.toHaveClass(/is-truncated/);
  await expect(code).toHaveCSS('max-height', 'none');
  await expect
    .poll(async () => {
      const [clipBox, codeBox] = await Promise.all([
        clip.boundingBox(),
        code.boundingBox(),
      ]);
      if (!clipBox || !codeBox) return false;
      return clipBox.height >= codeBox.height;
    })
    .toBe(true);
});

test('long server details stay contained at every responsive size', async ({
  page,
}) => {
  for (const width of [320, 390, 600, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(
      '/iframe.html?id=renderer-speccy--long-server-details&viewMode=story',
    );

    const server = page.locator('.sp-server');
    const url = server.locator('code');
    const copy = server.getByRole('button', { name: 'Copy' });
    await expect(server).toBeVisible();
    await expect(url).toHaveCSS('white-space', 'nowrap');

    const [serverBox, urlBox, copyBox] = await Promise.all([
      server.boundingBox(),
      url.boundingBox(),
      copy.boundingBox(),
    ]);
    expect(serverBox).not.toBeNull();
    expect(urlBox).not.toBeNull();
    expect(copyBox).not.toBeNull();
    expect(urlBox!.x).toBeGreaterThanOrEqual(serverBox!.x);
    expect(copyBox!.x + copyBox!.width).toBeLessThanOrEqual(
      serverBox!.x + serverBox!.width,
    );
  }
});
