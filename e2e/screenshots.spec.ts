import { test, type Page } from '@playwright/test';

// Not a regression test: generates gallery images. Run with `npx playwright test screenshots --project=desktop`.
test.skip(!process.env.SCREENSHOTS, 'Set SCREENSHOTS=1 to generate gallery images');

const seed = async (page: Page) => {
  await page.goto('./');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByLabel('Task or brain dump').fill('Start my history essay\nReply to the email from my landlord\nClean the kitchen');
  await page.getByRole('button', { name: 'Break it down' }).click();
  await page.getByRole('button', { name: /^Done/ }).click();
  await page.waitForTimeout(1600);
};

for (const [name, width, height] of [
  ['desktop', 1440, 1000],
  ['tablet', 768, 1100],
  ['mobile', 375, 900],
] as const) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`${name}-${scheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ colorScheme: scheme });
      await seed(page);
      await page.screenshot({ path: `docs/screenshots/${name}-${scheme}.png`, fullPage: name !== 'desktop' });
    });
  }
}

test('empty-state', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.screenshot({ path: 'docs/screenshots/empty-state.png' });
});

test('focus-mode', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seed(page);
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.waitForTimeout(3200);
  await page.screenshot({ path: 'docs/screenshots/focus-mode.png' });
});

test('all-plans-high-contrast', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await seed(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: /High contrast/ }).check();
  await page.getByRole('radio', { name: 'Large', exact: true }).check();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /See everything/ }).click();
  await page.screenshot({ path: 'docs/screenshots/high-contrast.png', fullPage: true });
});

test('settings', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await seed(page);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/screenshots/settings.png' });
});
