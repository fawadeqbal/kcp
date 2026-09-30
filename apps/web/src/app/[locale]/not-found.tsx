import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <div className="mx-auto max-w-md text-center">
      <p className="text-6xl font-bold text-brand-600" aria-hidden="true">
        404
      </p>
      <h1 className="mt-4 text-2xl font-bold">{t('meta.notFound')}</h1>
      <p className="mt-4">
        <Link href="/" className="font-semibold text-brand-700 underline">
          {t('nav.home')}
        </Link>
      </p>
    </div>
  );
}
