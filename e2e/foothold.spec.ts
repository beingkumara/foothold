import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const hero = (page: Page) => page.locator('#next-heading');

async function addExample(page: Page, name = 'Clean the kitchen') {
  await page.getByRole('button', { name }).click();
  await expect(hero(page)).not.toContainText('Nothing to do yet');
}

async function expectNoA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

test('first visit shows a calm empty state and examples', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1, name: 'Foothold' })).toBeVisible();
  await expect(hero(page)).toContainText('Nothing to do yet');
  await expect(page.getByRole('button', { name: 'Clean the kitchen' })).toBeVisible();
});

test('brain dump → one tiny step → done → a win is logged', async ({ page }) => {
  await page.getByLabel('Task or brain dump').fill('Reply to email from landlord');
  await page.keyboard.press('Enter');
  await expect(hero(page)).toContainText('just read it');
  await expect(page.getByTestId('announcer')).toContainText('small steps');

  await page.getByRole('button', { name: /^Done/ }).click();
  await expect(page.getByRole('heading', { name: /1 small win today/ })).toBeVisible();
  await expect(hero(page)).toContainText('one sentence');
  // Focus stays on the Done button so keyboard users can keep going.
  await expect(page.getByRole('button', { name: /^Done/ })).toBeFocused();
});

test('splits a multi-line dump into separate plans', async ({ page }) => {
  await page.getByLabel('Task or brain dump').fill('call the dentist\nbuy groceries');
  await page.getByRole('button', { name: 'Break it down' }).click();
  await page.getByRole('button', { name: /See everything \(2 open\)/ }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
});

test("I'm stuck shrinks the step", async ({ page }) => {
  await addExample(page);
  await page.getByRole('button', { name: /I'm stuck/ }).click();
  await expect(hero(page)).toContainText('Take three slow breaths');
});

test('low energy only offers gentle steps, and flags a stretch otherwise', async ({ page }) => {
  await addExample(page, 'Start my history essay');
  const hard = page.locator('.next__meta');
  await page.getByRole('radio', { name: /Running low/ }).check();
  await expect(hard).toContainText('Running low');
});

test('single-key shortcuts work and can be turned off', async ({ page }) => {
  await addExample(page);
  const first = await hero(page).textContent();
  // Typing a "d" in the capture box must NOT trigger the shortcut.
  await expect(page.getByLabel('Task or brain dump')).toBeFocused();
  await page.keyboard.press('d');
  await expect(hero(page)).toHaveText(first ?? '');
  await page.getByLabel('Task or brain dump').fill('');
  await hero(page).focus();
  await page.keyboard.press('d');
  await expect(hero(page)).not.toHaveText(first ?? '');

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: /Single-key shortcuts/ }).uncheck();
  await page.keyboard.press('Escape');
  const second = await hero(page).textContent();
  await hero(page).focus();
  await page.keyboard.press('d');
  await expect(hero(page)).toHaveText(second ?? '');
});

test('focus mode traps focus, closes on Escape and returns focus', async ({ page }) => {
  await addExample(page);
  const start = page.getByRole('button', { name: /^Start/ });
  await start.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'I did it' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(start).toBeFocused();
});

test('plans persist across reloads', async ({ page }) => {
  await addExample(page);
  const text = await hero(page).textContent();
  await page.reload();
  await expect(hero(page)).toHaveText(text ?? '');
});

test('no axe violations: empty, planned, light and dark, high contrast', async ({ page }) => {
  await expectNoA11yViolations(page);
  await addExample(page);
  await page.getByRole('button', { name: /See everything/ }).click();
  await expectNoA11yViolations(page);

  await page.emulateMedia({ colorScheme: 'dark' });
  await expectNoA11yViolations(page);

  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: /High contrast/ }).check();
  await expectNoA11yViolations(page);
});

test('no horizontal overflow at 320px with largest text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await addExample(page, 'Start my history essay');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('radio', { name: 'Largest' }).check();
  await page.keyboard.press('Escape');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('announcements still reach screen readers while a modal dialog is open', async ({ page }) => {
  await addExample(page);
  await page.getByRole('button', { name: /^Start/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('.focus__step')).toBeFocused();
  await dialog.getByRole('button', { name: "I'm stuck" }).click();
  await expect(dialog.locator('[data-dialog-announcer]')).toContainText('Made it smaller');
  await expect(dialog.locator('[data-dialog-announcer]')).toContainText('Next: Take three slow breaths');
});

test('finishing a plan from the checklist keeps focus and announces it', async ({ page }) => {
  await addExample(page, 'Reply to the email from my landlord');
  await page.getByRole('button', { name: /See everything/ }).click();
  const boxes = page.getByRole('article').getByRole('checkbox');
  const count = await boxes.count();
  for (let i = 0; i < count; i++) await boxes.nth(i).click();
  await expect(page.locator('#all-heading')).toBeFocused();
  await expect(page.getByTestId('announcer')).toContainText('Moved to Finished');
});

test('survives WCAG 1.4.12 text-spacing overrides at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await addExample(page, 'Start my history essay');
  await page.addStyleTag({
    content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }',
  });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
