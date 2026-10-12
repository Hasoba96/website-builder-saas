'use client';
import { useLocale, useTranslations } from 'next-intl';
type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};
export default function ErrorBoundary({ reset }: ErrorBoundaryProps) {
  const t = useTranslations('Foundation');
  const locale = useLocale();
  return (
    <main id="content" tabIndex={-1}>
      <h1>{t('error')}</h1>
      <button type="button" onClick={reset}>
        {t('retry')}
      </button>
      <a className="home" href={`/${locale}`}>
        {t('home')}
      </a>
    </main>
  );
}
