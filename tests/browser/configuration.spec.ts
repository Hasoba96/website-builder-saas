import { expect, test } from '@playwright/test';

for (const port of [3100, 3102]) {
  test(`server environment does not reach browser HTML or scripts on ${port}`, async ({
    page,
  }) => {
    const canary = '00c-server-only-canary-not-a-credential';
    const redisCanary = '00e-server-only-canary-not-a-credential';
    for (const locale of ['ar', 'en']) {
      await page.goto(`http://127.0.0.1:${port}/${locale}`);
      expect(await page.content()).not.toContain(canary);
      expect(await page.content()).not.toContain(redisCanary);
      const scripts = await page
        .locator('script[src]')
        .evaluateAll((nodes) =>
          nodes
            .map((node) => node.getAttribute('src'))
            .filter((src): src is string => src !== null),
        );
      expect(scripts.length).toBeGreaterThan(0);
      for (const src of scripts) {
        const url = new URL(src, page.url());
        expect(url.origin).toBe(new URL(page.url()).origin);
        const response = await page.request.get(url.href, { timeout: 5000 });
        expect(response.ok()).toBe(true);
        expect(await response.text()).not.toContain(canary);
        expect(await response.text()).not.toContain(redisCanary);
      }
    }
  });
}
