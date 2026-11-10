import { expect, test, type Page } from '@playwright/test';
import { styles } from '../src/config/styles.config';

const WIDTHS = [320, 360, 390, 768, 1280];
const ROUTES = ['/', '/dev/login-states'];
const LONG_TEXT = 'W'.repeat(500);

async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

for (const route of ROUTES) {
  for (const width of WIDTHS) {
    test(`sin scroll horizontal en ${route} a ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(route);
      await expect(page.locator('form').first()).toBeVisible();
      expect(await hasHorizontalScroll(page)).toBe(false);
    });
  }
}

for (const width of WIDTHS) {
  test(`500 caracteres en RUT y contraseña no desbordan a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await page.locator('#rut').fill(LONG_TEXT);
    await page.locator('#password').fill(LONG_TEXT);
    expect(await hasHorizontalScroll(page)).toBe(false);
  });
}

test('con 195px de ancho la tarjeta no se corta ni se solapa', async ({ page }) => {
  await page.setViewportSize({ width: 195, height: 800 });
  await page.goto('/');
  expect(await hasHorizontalScroll(page)).toBe(false);

  const card = await page.locator('.login-card').boundingBox();
  expect(card).not.toBeNull();
  expect(card!.x).toBeGreaterThanOrEqual(0);
  expect(card!.x + card!.width).toBeLessThanOrEqual(195);

  // Los controles quedan dentro de la tarjeta y sin solaparse entre sí.
  type Box = { x: number; y: number; width: number; height: number };
  const boxes: Box[] = [];
  for (const selector of ['#rut', '#password', '.login-button']) {
    const box = await page.locator(selector).boundingBox();
    expect(box, selector).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(card!.x);
    expect(box!.x + box!.width).toBeLessThanOrEqual(card!.x + card!.width);
    boxes.push(box!);
  }
  boxes.reduce((previous, current) => {
    expect(current.y).toBeGreaterThanOrEqual(previous.y + previous.height);
    return current;
  });
  const toggle = await page.locator('.login-password-toggle').boundingBox();
  const password = boxes[1]!;
  expect(toggle!.x).toBeGreaterThanOrEqual(password.x);
  expect(toggle!.x + toggle!.width).toBeLessThanOrEqual(password.x + password.width);
});

test('por debajo de 480px la tarjeta no tiene borde', async ({ page }) => {
  await page.setViewportSize({ width: styles.sizes.cardBreakpoint - 1, height: 800 });
  await page.goto('/');
  await expect(page.locator('.login-card')).toHaveCSS('border-top-width', '0px');
});

test('desde 480px la tarjeta tiene borde y max-width de 400px', async ({ page }) => {
  await page.setViewportSize({ width: styles.sizes.cardBreakpoint, height: 800 });
  await page.goto('/');
  const card = page.locator('.login-card');
  await expect(card).toHaveCSS('border-top-width', `${styles.sizes.borderWidth}px`);
  await expect(card).toHaveCSS('max-width', `${styles.sizes.cardMaxWidth}px`);
  const box = await card.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(styles.sizes.cardMaxWidth);
});
