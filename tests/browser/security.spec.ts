import { expect, test } from '@playwright/test';

for (const port of [3100, 3102]) {
  test(`strict CSP executes the shell, blocks injected script, and covers assets on ${port}`, async ({
    page,
  }) => {
    for (const locale of ['ar', 'en']) {
      const response = await page.goto(`http://127.0.0.1:${port}/${locale}`);
      const headers = response?.headers() ?? {};
      expect(headers['content-security-policy']).toContain(
        "default-src 'none'",
      );
      expect(headers['content-security-policy']).not.toMatch(
        /unsafe-inline|unsafe-eval|report-uri|report-to/,
      );
      expect(headers['referrer-policy']).toBe(
        'strict-origin-when-cross-origin',
      );
      expect(headers['strict-transport-security']).toBe(
        'max-age=31536000; includeSubDomains',
      );
      expect(headers['permissions-policy']).toContain('camera=()');
      expect(headers['x-frame-options']).toBe(
        port === 3100 ? 'DENY' : 'SAMEORIGIN',
      );
      await page.waitForLoadState('networkidle');
      const nonces = await page
        .locator('script:not([src])')
        .evaluateAll((scripts) =>
          scripts.map((script) => (script as HTMLScriptElement).nonce),
        );
      expect(nonces.length).toBeGreaterThan(0);
      expect(
        nonces.every(
          (nonce) =>
            nonce.length > 20 &&
            headers['content-security-policy']?.includes(`'nonce-${nonce}'`),
        ),
      ).toBe(true);
      await page.evaluate(() => {
        const script = document.createElement('script');
        script.textContent =
          'document.documentElement.dataset.injected = "yes"';
        document.body.append(script);
      });
      expect(
        await page.locator('html').getAttribute('data-injected'),
      ).toBeNull();
      const src = await page.locator('script[src]').first().getAttribute('src');
      expect(src).not.toBeNull();
      const asset = await page.request.get(new URL(src ?? '', page.url()).href);
      expect(asset.status()).toBe(200);
      expect(asset.headers()['x-content-type-options']).toBe('nosniff');
      expect(asset.headers()['content-security-policy']).toBeTruthy();
    }
  });
  test(`untrusted authorities, redirects, origins and bodies fail safely on ${port}`, async ({
    request,
  }) => {
    const base = `http://127.0.0.1:${port}`;
    const hostile = await request.get(base + '/ar', {
      headers: { host: '00g-host-canary.example' },
    });
    expect(hostile.status()).toBe(400);
    expect(await hostile.text()).not.toContain('canary');
    const redirect = await request.get(base + '/', {
      maxRedirects: 0,
      headers: {
        'x-forwarded-host': '00g-host-canary.example',
        'x-forwarded-proto': 'https',
        forwarded: 'host=00g-forwarded-canary.example',
      },
    });
    expect(redirect.status()).toBe(307);
    expect(new URL(redirect.headers()['location'] ?? '', base).href).toBe(
      base + '/ar',
    );
    expect(
      JSON.stringify(redirect.headers()) + (await redirect.text()),
    ).not.toContain('canary');
    for (const origin of [
      'null',
      '%%%00g-origin-canary',
      'https://00g-origin-canary.example',
    ]) {
      const denied = await request.get(base + '/health', {
        headers: { origin },
      });
      expect(denied.status()).toBe(403);
      expect(denied.headers()['access-control-allow-origin']).toBeUndefined();
      expect(await denied.text()).not.toContain('canary');
    }
    const body = await request.post(base + '/ar', {
      data: '{"__proto__":{"value":"00g-body-canary"}}',
      headers: { 'content-type': 'application/json' },
    });
    expect(body.status()).toBe(400);
    expect(await body.text()).not.toContain('canary');
    const query = await request.get(base + '/ar?value=00g-query-canary');
    expect(query.status()).toBe(400);
    expect(await query.text()).not.toContain('canary');
    const image = await request.get(
      base + '/_next/image?url=http://127.0.0.1/private&w=640&q=75',
    );
    expect(image.status()).toBe(400);
  });
}
