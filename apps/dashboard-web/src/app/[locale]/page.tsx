import { getTranslations, setRequestLocale } from 'next-intl/server';
import { isLocale } from '@website-builder/config/locales';
import { notFound } from 'next/navigation';
type PageProps = { params: Promise<{ locale: string }> };
export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('Foundation');
  return (
    <main id="content" tabIndex={-1}>
      <h1>{t('title')}</h1>
      <p className="status">{t('status')}</p>
    </main>
  );
}
