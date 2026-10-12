import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from '@website-builder/config/locales';
export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: false,
});
