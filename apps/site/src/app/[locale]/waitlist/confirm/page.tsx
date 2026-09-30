import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { Container } from '@/components/layout';
import { ConfirmChecking, ConfirmStatus } from '@/features/waitlist/confirm-status';
import { pageMetadata } from '@/lib/metadata';
import { type LocaleParams, metadataLocale, pageLocale } from '@/lib/page';

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await metadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: 'confirm' });
  const waitlist = await getTranslations({ locale, namespace: 'waitlist' });
  return pageMetadata(locale, '/waitlist/confirm', {
    title: t('metaTitle'),
    description: waitlist('metaDescription'),
    // A one-time link from an email: not for search engines.
    index: false,
  });
}

export default async function ConfirmPage({ params }: LocaleParams) {
  await pageLocale(params);
  const t = await getTranslations('confirm');

  return (
    <Container width="narrow" className="py-14 sm:py-20">
      <div className="rounded-card bg-surface p-6 elev-sm sm:p-10">
        <h1 className="text-4xl">{t('title')}</h1>
        <div className="mt-6">
          {/* The token is in the address (?token=…), which a static page reads in the browser. */}
          <Suspense fallback={<ConfirmChecking />}>
            <ConfirmStatus />
          </Suspense>
        </div>
      </div>
    </Container>
  );
}
