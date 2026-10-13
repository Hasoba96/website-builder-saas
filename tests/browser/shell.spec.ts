import { expect, test } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

for (const app of [
  { name: 'dashboard-web', port: 3100, ar: 'لوحة التحكم', en: 'Dashboard' },
  {
    name: 'public-renderer',
    port: 3102,
    ar: 'العارض العام',
    en: 'Public Renderer',
  },
]) {
  for (const locale of ['ar', 'en'] as const) {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      test(`${app.name} ${locale} ${viewport.width}`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize(viewport);
        const response = await page.goto(
          `http://127.0.0.1:${app.port}/${locale}`,
        );
        expect(response?.status()).toBe(200);
        expect(response?.headers()['x-powered-by']).toBeUndefined();
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('html')).toHaveAttribute(
          'dir',
          locale === 'ar' ? 'rtl' : 'ltr',
        );
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(
          app[locale],
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual(
          [],
        );
        await expect(page).toHaveScreenshot(
          `${app.name}-${locale}-${viewport.width}.png`,
          { fullPage: true, animations: 'disabled' },
        );
        // Stress the real shell layout without adding synthetic product strings.
        await page.locator('h1, .status').evaluateAll((elements) => {
          for (const element of elements) {
            const original = element.textContent ?? '';
            element.textContent = `${original} ${original} ABC 2026 العربية`;
          }
        });
        const layout = await page.evaluate(() => {
          const heading = document.querySelector('h1')?.getBoundingClientRect();
          const status = document
            .querySelector('.status')
            ?.getBoundingClientRect();
          const header = document
            .querySelector('header')
            ?.getBoundingClientRect();
          if (!heading || !status || !header) throw new Error('Missing shell');
          return {
            overflow: document.documentElement.scrollWidth > window.innerWidth,
            overlap: header.bottom > heading.top || heading.bottom > status.top,
            fits: [heading, status].every(
              (box) =>
                box.left >= 0 &&
                box.right <= window.innerWidth &&
                box.height > 0,
            ),
          };
        });
        expect(layout).toEqual({ overflow: false, overlap: false, fits: true });
        const stressImage = testInfo.outputPath('long-mixed-text.png');
        await page.screenshot({ path: stressImage, fullPage: true });
        await testInfo.attach('long-mixed-text', {
          path: stressImage,
          contentType: 'image/png',
        });
        await page.keyboard.press('Tab');
        await expect(page.locator('.skip')).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.locator('#content')).toBeFocused();
        const nextLocale = locale === 'ar' ? 'en' : 'ar';
        const link = page.locator(`nav a[hreflang="${nextLocale}"]`);
        await link.focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('html')).toHaveAttribute('lang', nextLocale);
        await expect(page.locator('html')).toHaveAttribute(
          'dir',
          nextLocale === 'ar' ? 'rtl' : 'ltr',
        );
      });
    }
  }
  test(`${app.name} defaults to Arabic`, async ({ page }) => {
    await page.goto(`http://127.0.0.1:${app.port}/`);
    await expect(page).toHaveURL(/\/ar$/);
    const missingAsset = await page.request.get(
      `http://127.0.0.1:${app.port}/favicon.ico`,
      { maxRedirects: 0 },
    );
    expect(missingAsset.status()).toBe(404);
    expect(missingAsset.headers()['location']).toBeUndefined();
  });
}

test('application locale selections remain independent', async ({
  context,
}) => {
  const dashboard = await context.newPage();
  const renderer = await context.newPage();
  await dashboard.goto('http://127.0.0.1:3100/en');
  await renderer.goto('http://127.0.0.1:3102/ar');
  await expect(dashboard.locator('html')).toHaveAttribute('lang', 'en');
  await expect(renderer.locator('html')).toHaveAttribute('lang', 'ar');
  await dashboard.locator('nav a[hreflang="ar"]').click();
  await renderer.locator('nav a[hreflang="en"]').click();
  await dashboard.reload();
  await expect(dashboard.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(renderer.locator('html')).toHaveAttribute('lang', 'en');
});
