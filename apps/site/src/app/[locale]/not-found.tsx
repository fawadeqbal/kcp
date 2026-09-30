import { getTranslations } from 'next-intl/server';
import { Container } from '@/components/layout';
import { ctaClass } from '@/components/links';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <Container className="flex flex-col items-center py-20 text-center sm:py-28">
      <p
        className="grid size-36 place-items-center rounded-full bg-brand-100 font-display text-6xl text-brand-text"
        aria-hidden="true"
      >
        404
      </p>
      <h1 className="mt-6 text-4xl">{t('title')}</h1>
      <p className="mt-3 max-w-md text-lg text-muted">{t('body')}</p>
      <Link href="/" className={`${ctaClass('primary')} mt-8`}>
        {t('home')}
      </Link>
    </Container>
  );
}
