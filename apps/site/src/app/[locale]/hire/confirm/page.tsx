import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Container } from '@/components/layout';
import { HireConfirmChecking, HireConfirmStatus } from '@/features/hire/confirm-status';
import { pageMetadata } from '@/lib/metadata';
import { type LocaleParams, metadataLocale, pageLocale } from '@/lib/page';

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await metadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: 'hire' });
  return pageMetadata(locale, '/hire/confirm', {
    title: t('confirm.metaTitle'),
    description: t('metaDescription'),
    index: false,
  });
}

export default async function HireConfirmPage({ params }: LocaleParams) {
  await pageLocale(params);
  const t = await getTranslations('hire.confirm');
  return (
    <Container width="narrow" className="py-14 sm:py-20">
      <div className="rounded-card bg-surface p-6 elev-sm sm:p-10">
        <h1 className="text-4xl">{t('title')}</h1>
        <div className="mt-6">
          <Suspense fallback={<HireConfirmChecking />}>
            <HireConfirmStatus />
          </Suspense>
        </div>
      </div>
    </Container>
  );
}
