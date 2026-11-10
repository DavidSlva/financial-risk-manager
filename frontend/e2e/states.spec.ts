import { expect, test } from '@playwright/test';

const STATES = [
  'idle',
  'focus',
  'field-error',
  'form-error',
  'submitting',
  'password-visible',
  'long-text',
] as const;
const WIDTHS = [390, 1280];

for (const width of WIDTHS) {
  test.describe(`estados a ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test.beforeEach(async ({ page }) => {
      await page.goto('/dev/login-states');
      await expect(page.locator('section[data-state]')).toHaveCount(STATES.length);
    });

    for (const state of STATES) {
      test(`${state} es visible y coincide con la captura`, async ({ page }) => {
        const section = page.locator(`section[data-state="${state}"]`);
        await expect(section).toBeVisible();
        await expect(section).toHaveScreenshot(`${state}-${width}.png`, {
          animations: 'disabled',
          caret: 'hide',
        });
      });
    }

    test('form-error expone un role=alert', async ({ page }) => {
      const section = page.locator('section[data-state="form-error"]');
      await expect(section.getByRole('alert')).toBeVisible();
    });

    test('submitting tiene el botón deshabilitado', async ({ page }) => {
      const section = page.locator('section[data-state="submitting"]');
      await expect(section.locator('.login-button')).toBeDisabled();
    });

    test('password-visible muestra el texto y el botón Ocultar', async ({ page }) => {
      const section = page.locator('section[data-state="password-visible"]');
      await expect(section.locator('input[type="text"]').nth(1)).toBeVisible();
      await expect(section.getByRole('button', { name: 'Ocultar' })).toBeVisible();
    });
  });
}
