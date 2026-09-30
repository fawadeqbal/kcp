import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Container, PageIntro } from '@/components/layout';
import { WaitlistForm } from '@/features/waitlist/waitlist-form';
import { SafetyPromises } from '@/features/safety/promises';
import { pageMetadata } from '@/lib/metadata';
import { type LocaleParams, metadataLocale, pageLocale } from '@/lib/page';

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await metadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: 'waitlist' });
  return pageMetadata(locale, '/waitlist', {
    title: t('metaTitle'),
    description: t('metaDescription'),
  });
}

export default async function WaitlistPage({ params }: LocaleParams) {
  await pageLocale(params);
  const t = await getTranslations('waitlist');
  const home = await getTranslations('home');

  return (
    <>
      <PageIntro title={t('title')} subtitle={t('subtitle')} />
      <Container className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[1fr_1fr]">
        <div className="self-start rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-sm sm:p-8">
          <WaitlistForm />
        </div>
        <section aria-labelledby="promises-title">
          <h2 id="promises-title" className="text-xl font-bold">
            {home('safetyTitle')}
          </h2>
          <div className="mt-5">
            <SafetyPromises narrow only={['parents', 'anonymous', 'noChat', 'noAds']} />
          </div>
        </section>
      </Container>
    </>
  );
}
