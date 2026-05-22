import { expect, test } from '@playwright/test';

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

const routes: Array<[string, string]> = [
  ['/', 'FORMAMOS A LOS QUE'],
  ['/cursos', 'CATALOGO DE CURSOS'],
  ['/cursos/tacticas-intervencion-policial', 'TACTICAS DE INTERVENCION POLICIAL'],
  ['/instructores', 'CUERPO DOCENTE'],
  ['/certificaciones', 'CERTIFICACIONES'],
  ['/blog', 'BLOG OPERACIONAL'],
  ['/blog/protocolo-entrada-estructuras-llamas', 'PROTOCOLO DE ENTRADA'],
  ['/contacto', 'INSCRIBETE'],
  ['/nosotros', 'QUIENES SOMOS'],
  ['/terminos', 'TERMINOS Y CONDICIONES'],
  ['/privacidad', 'POLITICA DE PRIVACIDAD'],
];

test.beforeEach(({ page }) => {
  page.on('console', (message) => {
    if (message.type() === 'error') {
      throw new Error(`Console error: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => {
    throw error;
  });
});

test('renders every public route', async ({ page }) => {
  for (const [route, expectedText] of routes) {
    await page.goto(route);
    await expect.poll(async () => normalize(await page.locator('body').innerText()))
      .toContain(expectedText);
  }
});

test('supports desktop course browsing and detail navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Cursos', exact: true }).click();
  await expect(page).toHaveURL(/\/cursos$/);

  await page.getByRole('button', { name: 'Rescate' }).click();
  await page.getByRole('link', { name: 'Ver Detalles' }).first().click();
  await expect(page).toHaveURL(/\/cursos\/.+/);
  await expect(page.getByRole('button', { name: 'INSCRIBIRSE AHORA' })).toBeVisible();
});

test('opens WhatsApp from the contact form', async ({ page }) => {
  await page.goto('/contacto');
  await page.locator('#nombre').fill('Prueba QA');
  await page.locator('#telefono').fill('0999999999');
  await page.locator('#email').fill('qa@example.com');

  const popupPromise = page.waitForEvent('popup');
  await page.locator('button[type="submit"]').click();
  const popup = await popupPromise;

  expect(popup.url()).toMatch(/(whatsapp\.com|wa\.me).+593900000000/);
  await popup.close();
});

test('supports mobile menu navigation and has no empty links on home', async ({ browser, page }) => {
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const mobile = await mobileContext.newPage();

  await mobile.goto('/');
  await mobile.getByRole('button').first().click();
  await mobile.getByRole('link', { name: 'Blog', exact: true }).click();
  await expect(mobile).toHaveURL(/\/blog$/);
  await expect.poll(async () => normalize(await mobile.locator('body').innerText()))
    .toContain('BLOG OPERACIONAL');
  await mobileContext.close();

  await page.goto('/');
  const badLinks = await page.$$eval('a', (anchors) =>
    anchors
      .map((anchor) => ({
        text: (anchor.textContent || anchor.ariaLabel || '').trim(),
        href: anchor.getAttribute('href') || '',
      }))
      .filter((anchor) => anchor.href === '#' || anchor.href.trim() === '')
  );
  expect(badLinks).toEqual([]);
});
