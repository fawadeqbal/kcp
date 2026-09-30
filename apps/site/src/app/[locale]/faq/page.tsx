import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Container, PageIntro } from '@/components/layout';
import { WaitlistLink } from '@/components/links';
import { FaqList } from '@/features/faq/faq-list';
import { pageMetadata } from '@/lib/metadata';
import { type LocaleParams, metadataLocale, pageLocale } from '@/lib/page';
import { getPricing } from '@/lib/pricing';

// The price answer mentions the trial and family discount from the API.
export const revalidate = 3600;

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await metadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: 'faq' });
  return pageMetadata(locale, '/faq', { title: t('metaTitle'), description: t('metaDescription') });
}

export default async function FaqPage({ params }: LocaleParams) {
  await pageLocale(params);
  const t = await getTranslations('faq');
  const pricing = await getPricing();

  return (
    <>
      <PageIntro title={t('title')} subtitle={t('subtitle')} />
      <Container width="text" className="py-14 sm:py-20">
        <FaqList pricing={pricing} />
        <div className="mt-10">
          <WaitlistLink variant="primary" />
        </div>
      </Container>
    </>
  );
}
