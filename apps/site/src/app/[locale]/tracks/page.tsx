import { Badge } from '@kcp/ui';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { CodeIcon } from '@/components/icons';
import { CheckList, Container, IconBadge, PageIntro } from '@/components/layout';
import { SignUpLink, WaitlistLink } from '@/components/links';
import { TRACKS } from '@/features/tracks/track-cards';
import { pageMetadata } from '@/lib/metadata';
import { type LocaleParams, metadataLocale, pageLocale } from '@/lib/page';

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await metadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: 'tracks' });
  return pageMetadata(locale, '/tracks', {
    title: t('metaTitle'),
    description: t('metaDescription'),
  });
}

export default async function TracksPage({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const t = await getTranslations('tracks');
  const common = await getTranslations('common');
  const later = TRACKS.filter((track) => track !== 'builder');

  return (
    <>
      <PageIntro title={t('title')} subtitle={t('subtitle')} />

      <Container className="flex flex-col gap-10 py-14 sm:py-20">
        <section
          aria-labelledby="builder-title"
          className="rounded-[var(--radius-card)] border border-brand-500 bg-surface p-6 shadow-xl shadow-brand-600/10 sm:p-10"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <IconBadge>
                <CodeIcon />
              </IconBadge>
              <div>
                <h2 id="builder-title" className="text-3xl font-bold">
                  {t('builder.name')}
                </h2>
                <p className="font-semibold text-brand-700">{t('builder.ages')}</p>
              </div>
            </div>
            <Badge tone="success">{common('availableNow')}</Badge>
          </div>
          <p className="mt-6 max-w-3xl text-lg">{t('builder.summary')}</p>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-bold">{t('builder.learnTitle')}</h3>
              <CheckList
                className="mt-4"
                items={[
                  t('builder.learnHtml'),
                  t('builder.learnCss'),
                  t('builder.learnJs'),
                  t('builder.learnPython'),
                ]}
              />
            </div>
            <div>
              <h3 className="text-lg font-bold">{t('builder.buildTitle')}</h3>
              <CheckList
                className="mt-4"
                items={[
                  t('builder.buildSite'),
                  t('builder.buildInteractive'),
                  t('builder.buildGame'),
                ]}
              />
            </div>
          </div>
          <div className="mt-8">
            <SignUpLink locale={locale} />
          </div>
        </section>

        <section aria-labelledby="later-title">
          <h2 id="later-title" className="text-2xl font-bold">
            {t('laterTitle')}
          </h2>
          <ul className="mt-6 grid gap-5 md:grid-cols-2">
            {later.map((track) => (
              <li
                key={track}
                className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-bold">{t(`${track}.name`)}</h3>
                  <Badge tone="neutral">{common('comingLater')}</Badge>
                </div>
                <p className="font-semibold text-brand-700">{t(`${track}.ages`)}</p>
                <p className="text-muted">{t(`${track}.summary`)}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col items-start gap-4 rounded-[var(--radius-card)] bg-brand-50 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium">{t('laterBody')}</p>
            <WaitlistLink variant="primary" />
          </div>
        </section>
      </Container>
    </>
  );
}
