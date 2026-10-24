import { test, type Page } from '@playwright/test';

// Records a captioned walkthrough for the Devpost video. Run:
//   DEMO=1 npx playwright test demo-video --project=desktop
// Output lands in test-results/**/video.webm. Waits here are deliberate pacing for viewers.
test.skip(!process.env.DEMO, 'Set DEMO=1 to record the demo video');
test.use({ viewport: { width: 1280, height: 800 }, video: { mode: 'on', size: { width: 1280, height: 800 } } });
test.setTimeout(180_000);

async function caption(page: Page, text: string, holdMs = 2600) {
  await page.evaluate((t) => {
    let el = document.getElementById('demo-caption');
    if (!el) {
      el = document.createElement('div');
      el.id = 'demo-caption';
      el.setAttribute('aria-hidden', 'true');
      Object.assign(el.style, {
        position: 'fixed',
        left: '50%',
        bottom: '28px',
        transform: 'translateX(-50%)',
        zIndex: '2147483647',
        maxWidth: '86%',
        padding: '14px 26px',
        borderRadius: '14px',
        background: 'rgba(25,18,12,.92)',
        color: '#fff8ee',
        font: '600 24px/1.35 "Atkinson Hyperlegible", system-ui, sans-serif',
        textAlign: 'center',
        boxShadow: '0 12px 40px rgba(0,0,0,.35)',
        pointerEvents: 'none',
      });
      document.documentElement.appendChild(el);
    }
    el.textContent = t;
  }, text);
  await page.waitForTimeout(holdMs);
}

async function typeSlowly(page: Page, selector: string, text: string) {
  await page.locator(selector).pressSequentially(text, { delay: 45 });
}

test('demo walkthrough', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();

  await caption(page, 'For many of us, the hardest part of a task is starting it.', 3200);
  await caption(page, 'Foothold: start anything, one small step at a time.', 3000);

  await caption(page, 'Dump whatever is on your mind. Type it, or say it.', 1200);
  await page.getByLabel('Task or brain dump').click();
  await typeSlowly(page, '#capture-input', 'Start my history essay');
  await page.keyboard.press('Shift+Enter');
  await typeSlowly(page, '#capture-input', 'Reply to the email from my landlord');
  await page.keyboard.press('Shift+Enter');
  await typeSlowly(page, '#capture-input', 'Clean the kitchen');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Break it down' }).click();

  await caption(page, 'Each line becomes a plan of tiny steps. You only see ONE.', 3400);
  await caption(page, 'Every plan opens with a foothold: a step you can do in 2 minutes.', 3200);

  await page.getByRole('button', { name: /^Done/ }).click();
  await caption(page, 'Done. It goes into your wins log, because every step counts.', 3200);

  await caption(page, 'Low on energy? Say so. Foothold only offers steps that fit.', 1400);
  await page.getByRole('radio', { name: /Running low/ }).check();
  await page.waitForTimeout(2400);

  await caption(page, 'Still too big? Press "I\'m stuck" and it gets smaller.', 1400);
  await page.getByRole('button', { name: /I'm stuck/ }).click();
  await page.waitForTimeout(2600);

  await page.getByRole('radio', { name: /Some energy/ }).check();
  await caption(page, 'Focus mode: one step, a gentle timer that counts up, no alarms.', 1200);
  await page.getByRole('button', { name: /^Start/ }).click();
  await page.waitForTimeout(4200);
  await page.getByRole('button', { name: 'I did it' }).click();
  await page.waitForTimeout(1200);

  await caption(page, 'Keyboard-first: D for done, S for stuck, F for focus. You can turn shortcuts off.', 1200);
  await page.locator('body').press('d');
  await page.waitForTimeout(1600);

  await caption(page, 'Built for accessibility from day one.', 1000);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.waitForTimeout(800);
  await caption(page, 'Hyperlegible font, reading-comfort spacing, text up to 150%.', 600);
  await page.getByRole('switch', { name: /Reading comfort/ }).check();
  await page.getByRole('radio', { name: 'Larger' }).check();
  await page.waitForTimeout(1600);
  await caption(page, 'High contrast, dark mode, reduced motion, screen reader announcements.', 600);
  await page.getByRole('switch', { name: /High contrast/ }).check();
  await page.getByRole('radio', { name: 'Dark' }).check();
  await page.waitForTimeout(1800);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1800);

  await page.getByRole('switch', { name: /High contrast/ }).count();
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('switch', { name: /High contrast/ }).uncheck();
  await page.getByRole('switch', { name: /Reading comfort/ }).uncheck();
  await page.getByRole('radio', { name: 'Standard' }).check();
  await page.keyboard.press('Escape');

  await caption(page, 'Zero axe violations. Works offline. No account. Your plans stay on your device.', 3600);
  await caption(page, 'Optional: add a free Groq key for AI-written steps.', 3000);
  await caption(page, 'Foothold. Get a foothold on anything.', 3200);
});
