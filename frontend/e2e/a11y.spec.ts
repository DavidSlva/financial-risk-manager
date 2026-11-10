import { expect, test } from '@playwright/test';
import { styles } from '../src/config/styles.config';

/** Convierte #rrggbb en la forma que devuelve getComputedStyle. */
function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

test.use({ viewport: { width: 1280, height: 800 } });

test('la tabulación recorre RUT, contraseña, Mostrar y Continuar', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('#rut')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#password')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Mostrar' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeFocused();
});

test('el campo enfocado tiene borde con el color borderFocus', async ({ page }) => {
  await page.goto('/');
  for (const selector of ['#rut', '#password']) {
    const field = page.locator(selector);
    await field.focus();
    await expect(field).toHaveCSS('border-top-color', rgb(styles.colors.borderFocus));
  }
});

test('campos, botón y Mostrar miden al menos touchTarget de alto', async ({ page }) => {
  await page.goto('/');
  for (const selector of ['#rut', '#password', '.login-button', '.login-password-toggle']) {
    const box = await page.locator(selector).boundingBox();
    expect(box, selector).not.toBeNull();
    expect(box!.height, selector).toBeGreaterThanOrEqual(styles.sizes.touchTarget);
  }
});

test('el fondo de la página y el de la tarjeta usan los colores de la configuración', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('body')).toHaveCSS('background-color', rgb(styles.colors.background));
  await expect(page.locator('.login-card')).toHaveCSS(
    'background-color',
    rgb(styles.colors.surface),
  );
});

test('con reduced motion la transición de los campos dura 0s', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('#rut')).toHaveCSS('transition-duration', '0s');
  await expect(page.locator('#password')).toHaveCSS('transition-duration', '0s');
});
