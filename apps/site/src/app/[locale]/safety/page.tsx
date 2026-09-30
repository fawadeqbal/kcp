import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ArrowIcon, HeartIcon, ShieldIcon } from '@/components/icons';
import { Container, IconBadge, PageIntro } from '@/components/layout';
import { SafetyPromises } from '@/features/safety/promises';
import { webAppUrl } from '@/lib/config';
import { pageMetadata } from '@/lib/metadata';
import { type LocaleParams, metadataLocale, pageLocale } from '@/lib/page';

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await metadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: 'safety' });
  return pageMetadata(locale, '/safety', {
    title: t('metaTitle'),
    description: t('metaDescription'),
  });
}

export default async function SafetyPage({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const t = await getTranslations('safety');
  const appLink =
    'inline-flex items-center gap-2 font-semibold text-brand-text underline-offset-4 hover:underline';

  return (
    <>
      <PageIntro title={t('title')} subtitle={t('subtitle')} />
      <Container className="flex flex-col gap-10 py-14 sm:py-20">
        <SafetyPromises headingLevel={2} />

        <div className="grid gap-5 md:grid-cols-2">
          <section
            aria-labelledby="details-title"
            className="flex gap-4 rounded-card bg-surface p-6"
          >
            <IconBadge>
              <ShieldIcon />
            </IconBadge>
            <div>
              <h2 id="details-title" className="text-lg font-bold">
                {t('detailsTitle')}
              </h2>
              <p className="mt-1 text-muted">{t('details')}</p>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                <li>
                  <a href={webAppUrl(locale, '/safety')} className={appLink}>
                    {t('detailsSafety')}
                    <ArrowIcon className="size-4" />
                  </a>
                </li>
                <li>
                  <a href={webAppUrl(locale, '/privacy')} className={appLink}>
                    {t('detailsPrivacy')}
                    <ArrowIcon className="size-4" />
                  </a>
                </li>
              </ul>
            </div>
          </section>
          <section
            aria-labelledby="report-title"
            className="flex gap-4 rounded-card bg-surface p-6"
          >
            <IconBadge tone="accent">
              <HeartIcon />
            </IconBadge>
            <div>
              <h2 id="report-title" className="text-lg font-bold">
                {t('reportTitle')}
              </h2>
              <p className="mt-1 text-muted">{t('report')}</p>
            </div>
          </section>
        </div>
      </Container>
    </>
  );
}
