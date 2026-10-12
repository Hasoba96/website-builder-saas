import en from '../messages/en.json';
import type { Locale as FoundationLocale } from '@website-builder/config/locales';
declare module 'next-intl' {
  interface AppConfig {
    Locale: FoundationLocale;
    Messages: typeof en;
  }
}
