import { expect, test } from '@playwright/test';

test.use({ launchOptions: { args: ['--disable-extensions'] } });

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
    test(`${app.name} /${locale} hydrates without diagnostics`, async ({
      page,
    }, testInfo) => {
      const consoleErrors: string[] = [];
      const consoleWarnings: string[] = [];
      const pageErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
        if (message.type() === 'warning') consoleWarnings.push(message.text());
      });
      page.on('pageerror', (error) => pageErrors.push(error.message));

      try {
        const response = await page.goto(
          `http://127.0.0.1:${app.port}/${locale}`,
        );
        expect(response?.status()).toBe(200);
        await page.waitForLoadState('networkidle');
        // Observe late hydration diagnostics after client chunks have loaded.
        await page.waitForTimeout(2_000);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('html')).toHaveAttribute(
          'dir',
          locale === 'ar' ? 'rtl' : 'ltr',
        );
        await expect(page.locator('html')).not.toHaveClass(/rtl-enabled/);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(
          app[locale],
        );
        expect(consoleErrors, 'Browser console errors').toEqual([]);
        expect(
          consoleWarnings.filter((message) =>
            /hydrat|server.rendered|did(?:n't| not) match|minified react error/i.test(
              message,
            ),
          ),
          'Hydration warnings',
        ).toEqual([]);
        expect(pageErrors, 'Unexpected page errors').toEqual([]);
      } finally {
        await testInfo.attach('hydration-diagnostics', {
          body: JSON.stringify({ consoleErrors, consoleWarnings, pageErrors }),
          contentType: 'application/json',
        });
      }
    });
  }
}
