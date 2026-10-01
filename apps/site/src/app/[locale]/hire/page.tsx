import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CheckList, Container, PageIntro, Section } from '@/components/layout';
import { HireForm } from '@/features/hire/hire-form';
import { HubProof } from '@/features/hire/hub-proof';
import { pageMetadata } from '@/lib/metadata';
import { type LocaleParams, metadataLocale, pageLocale } from '@/lib/page';

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await metadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: 'hire' });
  return pageMetadata(locale, '/hire', {
    title: t('metaTitle'),
    description: t('metaDescription'),
  });
}

export default async function HirePage({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const t = await getTranslations('hire');
  return (
    <>
      <PageIntro title={t('title')} subtitle={t('subtitle')} />
      <Section id="how" title={t('howTitle')}>
        <ol className="grid gap-4 md:grid-cols-3">
          {(['one', 'two', 'three'] as const).map((step, index) => (
            <li key={step} className="rounded-card bg-surface p-6">
              <p className="font-display text-3xl text-brand-text">{index + 1}</p>
              <p className="mt-2 text-xl font-bold">{t(`steps.${step}.title`)}</p>
              <p className="mt-1 text-muted">{t(`steps.${step}.body`)}</p>
            </li>
          ))}
        </ol>
      </Section>
      <Section id="promises" title={t('promisesTitle')} tone="sage">
        <CheckList
          items={[
            t('promises.lead'),
            t('promises.anonymous'),
            t('promises.hours'),
            t('promises.parents'),
            t('promises.code'),
          ]}
        />
      </Section>
      <HubProof locale={locale} title={t('proofTitle')} />
      <Container className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl rounded-hero bg-surface p-6 sm:p-8">
          <h2 className="text-3xl">{t('formTitle')}</h2>
          <p className="mt-2 text-muted">{t('formIntro')}</p>
          <div className="mt-6">
            <HireForm />
          </div>
        </div>
      </Container>
    </>
  );
}
