import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import Loading from '../src/app/[locale]/loading';
import ErrorBoundary from '../src/app/[locale]/error';
import ar from '../src/messages/ar.json';
import en from '../src/messages/en.json';
describe('translated route states', () => {
  it.each(['ar', 'en'] as const)(
    '%s loading and safe error state',
    (locale) => {
      const messages = locale === 'ar' ? ar : en;
      const loading = renderToStaticMarkup(
        createElement(NextIntlClientProvider, {
          locale,
          messages,
          timeZone: 'UTC',
          children: createElement(Loading),
        }),
      );
      expect(loading).toContain(messages.Foundation.loading);
      expect(loading).toContain('aria-busy="true"');
      expect(loading).toContain('tabindex="-1"');
      const failure = renderToStaticMarkup(
        createElement(NextIntlClientProvider, {
          locale,
          messages,
          timeZone: 'UTC',
          children: createElement(ErrorBoundary, {
            error: new Error('PRIVATE_FAILURE_DETAILS'),
            reset: () => {},
          }),
        }),
      );
      expect(failure).toContain(messages.Foundation.error);
      expect(failure).toContain(messages.Foundation.retry);
      expect(failure).toContain('tabindex="-1"');
      expect(failure).not.toContain('PRIVATE_FAILURE_DETAILS');
    },
  );
});
