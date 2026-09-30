import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ArrowIcon } from '@/components/icons';
import { Container, PageIntro } from '@/components/layout';
import { Link } from '@/i18n/navigation';
import { listPosts } from '@/lib/blog';
import { formatDate } from '@/lib/format';
import { pageMetadata } from '@/lib/metadata';
import { type LocaleParams, metadataLocale, pageLocale } from '@/lib/page';

export async function generateMetadata({ params }: LocaleParams): Promise<Metadata> {
  const locale = await metadataLocale(params);
  if (!locale) return {};
  const t = await getTranslations({ locale, namespace: 'blog' });
  return pageMetadata(locale, '/blog', {
    title: t('metaTitle'),
    description: t('metaDescription'),
  });
}

export default async function BlogPage({ params }: LocaleParams) {
  const locale = await pageLocale(params);
  const t = await getTranslations('blog');
  const posts = await listPosts(locale);

  return (
    <>
      <PageIntro title={t('title')} subtitle={t('subtitle')} />
      <Container width="text" className="py-14 sm:py-20">
        {posts.length === 0 ? (
          <p className="text-lg text-muted">{t('empty')}</p>
        ) : (
          <ul className="flex flex-col gap-6">
            {posts.map((post) => (
              <li key={post.slug}>
                <article className="group relative flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-6 transition-colors hover:border-brand-500 sm:p-8">
                  <p className="text-sm text-muted">
                    <time dateTime={post.date}>{formatDate(post.date, locale)}</time>
                  </p>
                  <h2 className="text-2xl font-bold">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="after:absolute after:inset-0 after:rounded-[var(--radius-card)] group-hover:text-brand-700"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <p className="text-muted">{post.summary}</p>
                  <ArrowIcon className="text-brand-600" />
                </article>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}
