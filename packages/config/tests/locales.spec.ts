import { describe, expect, it } from 'vitest';
import { defaultLocale, direction, isLocale, locales } from '../src/locales.js';
describe('foundation locales', () => {
  it('defaults to Arabic and maps both supported directions', () => {
    expect(defaultLocale).toBe('ar');
    expect(locales.map(direction)).toEqual(['rtl', 'ltr']);
  });
  it.each(['fr', '', '../en', 'AR'])(
    'rejects unsupported locale %s',
    (value) => {
      expect(isLocale(value)).toBe(false);
    },
  );
});
