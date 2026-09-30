import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { FinalCallToAction } from '@/components/final-cta';
import { CheckList, Container, PageIntro } from '@/components/layout';
import { FOUNDERS_STORY_IS_PLACEHOLDER, FOUNDERS_STORY_NOTE } from '@/content/founders';
import { BRAND_NAME } from '@/lib/brand';
import { pageMetadata } from '@/lib/metadata';
import { type LocaleParams, metadataLocale, pageLocale } from '@/lib/page';

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await metadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: 'about' });
  return pageMetadata(locale, '/about', {
    title: t('metaTitle'),
    description: t('metaDescription'),
  });
}

/** An HTML comment in the page source (React has no JSX for comments). */
function HtmlComment({ text }: { text: string }) {
  // The text is a constant from this repository, never user content.
  return <span hidden dangerouslySetInnerHTML={{ __html: `<!-- ${text} -->` }} />;
}

export default async function AboutPage({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const t = await getTranslations('about');
  const home = await getTranslations('home');

  return (
    <>
      <PageIntro title={t('title', { brand: BRAND_NAME })} />
      <Container className="grid gap-12 py-14 sm:py-20 lg:grid-cols-[2fr_1fr]">
        <article className="flex max-w-3xl flex-col gap-5 text-lg">
          {FOUNDERS_STORY_IS_PLACEHOLDER ? <HtmlComment text={FOUNDERS_STORY_NOTE} /> : null}
          <p>{t('story1')}</p>
          <p>{t('story2')}</p>
          <p>{t('story3')}</p>
          <p>{t('story4')}</p>
          <p className="font-semibold text-brand-text">— {t('signature')}</p>
        </article>
        <aside aria-labelledby="values-title" className="h-fit rounded-card bg-surface p-6">
          <h2 id="values-title" className="text-2xl">
            {t('valuesTitle')}
          </h2>
          <CheckList
            className="mt-5"
            items={[t('valueLanguage'), t('valueReal'), t('valueSafe'), t('valueFair')]}
          />
        </aside>
      </Container>
      <FinalCallToAction title={home('finalTitle')} body={home('finalBody')} locale={locale} />
    </>
  );
}
