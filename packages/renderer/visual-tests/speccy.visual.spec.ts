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

test('request example headings match their code block backgrounds', async ({
  page,
}) => {
  await page.goto(
    '/iframe.html?id=renderer-speccy--long-endpoint-path&viewMode=story',
  );

  const section = page.locator('.sp-request-example-section').first();
  const backgrounds = await section.evaluate((element) => ({
    header: getComputedStyle(element.querySelector('header')!).backgroundColor,
    code: getComputedStyle(element.closest('.sp-request-example')!)
      .backgroundColor,
  }));

  expect(backgrounds.header).toBe(backgrounds.code);
});

test('request body heading aligns with its media type', async ({ page }) => {
  await page.goto(
    '/iframe.html?id=design-system-resource-details--request-body-example&viewMode=story',
  );

  const heading = page.locator('.sp-media-title');
  const mediaType = page.locator('.sp-media-type');
  await expect(heading).toBeVisible();
  await expect(mediaType).toBeVisible();

  const [headingBox, mediaTypeBox] = await Promise.all([
    heading.boundingBox(),
    mediaType.boundingBox(),
  ]);
  expect(headingBox).not.toBeNull();
  expect(mediaTypeBox).not.toBeNull();
  const headingCenter = headingBox!.y + headingBox!.height / 2;
  const mediaTypeCenter = mediaTypeBox!.y + mediaTypeBox!.height / 2;
  expect(Math.abs(headingCenter - mediaTypeCenter)).toBeLessThan(1);
});

test('webhook payload heading shares a row with its media type', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(
    '/iframe.html?id=renderer-speccy--webhook-payload&viewMode=story',
  );

  const heading = page.getByRole('heading', { level: 2, name: 'Payload' });
  const responsesHeading = page.getByRole('heading', {
    level: 2,
    name: 'Responses',
  });
  const mediaType = page.locator('.sp-media-type');
  await expect(heading).toBeVisible();
  await expect(mediaType).toBeVisible();

  const [headingBox, mediaTypeBox] = await Promise.all([
    heading.boundingBox(),
    mediaType.boundingBox(),
  ]);
  const headingCenter = headingBox!.y + headingBox!.height / 2;
  const mediaTypeCenter = mediaTypeBox!.y + mediaTypeBox!.height / 2;
  expect(Math.abs(headingCenter - mediaTypeCenter)).toBeLessThan(1);
  expect(mediaTypeBox!.x).toBeGreaterThan(headingBox!.x + headingBox!.width);

  await expect(heading).toHaveCSS(
    'font-size',
    await responsesHeading.evaluate(
      (element) => getComputedStyle(element).fontSize,
    ),
  );

  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 });
    const [rowBox, chipBox] = await Promise.all([
      page.locator('.sp-media-heading').first().boundingBox(),
      mediaType.boundingBox(),
    ]);
    expect(chipBox!.x).toBeGreaterThanOrEqual(rowBox!.x);
    expect(chipBox!.x + chipBox!.width).toBeLessThanOrEqual(
      rowBox!.x + rowBox!.width + 1,
    );
  }
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
