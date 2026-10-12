import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { direction, isLocale, locales } from '@website-builder/config/locales';
import './styles.css';

type LayoutProps = { children: ReactNode; params: Promise<{ locale: string }> };
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
export async function generateMetadata({
  params,
}: Omit<LayoutProps, 'children'>) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = await getTranslations({ locale, namespace: 'Foundation' });
  return { title: t('title') };
}
export default async function Layout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('Foundation');
  return (
    <html lang={locale} dir={direction(locale)}>
      <body>
        <a className="skip" href="#content">
          {t('skip')}
        </a>
        <header>
          <nav aria-label={t('language')}>
            <a
              href="/ar"
              lang="ar"
              hrefLang="ar"
              aria-current={locale === 'ar' ? 'page' : undefined}
            >
              {t('arabic')}
            </a>
            <a
              href="/en"
              lang="en"
              hrefLang="en"
              aria-current={locale === 'en' ? 'page' : undefined}
            >
              {t('english')}
            </a>
          </nav>
        </header>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
