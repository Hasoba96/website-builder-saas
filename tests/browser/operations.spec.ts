import { expect, test } from '@playwright/test';
for (const port of [3100, 3102]) {
  for (const path of ['/health', '/ready']) {
    test(`operational probe ${port}${path} is unversioned, private and correlated`, async ({
      request,
    }) => {
      const response = await request.get(`http://127.0.0.1:${port}${path}`, {
        headers: {
          'x-request-id': '00f-untrusted-canary',
          authorization: '00f-auth-canary',
          cookie: '00f-cookie-canary',
        },
      });
      expect(response.status()).toBe(200);
      const body: unknown = await response.json();
      expect(body).toEqual({
        data: {},
        requestId: response.headers()['x-request-id'],
      });
      expect(response.headers()['x-request-id']).toMatch(/^req_[0-9a-f-]{36}$/);
      expect(response.headers()['cache-control']).toContain('no-store');
      expect(JSON.stringify(body)).not.toMatch(
        /canary|postgres|redis|host|port|version|stack/i,
      );
    });
  }
}
