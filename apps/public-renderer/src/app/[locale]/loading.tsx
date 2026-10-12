import { useTranslations } from 'next-intl';
export default function Loading() {
  const t = useTranslations('Foundation');
  return (
    <main id="content" aria-busy="true" tabIndex={-1}>
      <p role="status">{t('loading')}</p>
    </main>
  );
}
