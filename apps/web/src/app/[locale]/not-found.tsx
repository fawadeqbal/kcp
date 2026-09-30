import { getTranslations } from 'next-intl/server';
import { buttonClass } from '@kcp/ui';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 py-10 text-center">
      <p
        className="grid size-36 place-items-center rounded-full bg-brand-100 font-display text-6xl text-brand-text"
        aria-hidden="true"
      >
        404
      </p>
      <h1 className="text-3xl">{t('meta.notFound')}</h1>
      <Link href="/" className={buttonClass('primary')}>
        {t('nav.home')}
      </Link>
    </div>
  );
}
