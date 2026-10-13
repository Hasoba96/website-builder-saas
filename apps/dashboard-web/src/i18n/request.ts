import { getRequestConfig } from 'next-intl/server';
import { defaultLocale, isLocale } from '@website-builder/config/locales';
import ar from '../messages/ar.json';
import en from '../messages/en.json';
const messages = { ar: ar satisfies typeof en, en: en satisfies typeof ar };
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : defaultLocale;
  return { locale, messages: messages[locale], timeZone: 'UTC' };
});
