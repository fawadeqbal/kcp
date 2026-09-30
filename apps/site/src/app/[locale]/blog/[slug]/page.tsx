import { isLocale } from '@kcp/i18n';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { BackIcon } from '@/components/icons';
import { Container } from '@/components/layout';
import { Link } from '@/i18n/navigation';
import { PostContent } from '@/features/blog/post-content';
import { getPost, listPosts } from '@/lib/blog';
import { formatDate } from '@/lib/format';
import { pageMetadata } from '@/lib/metadata';
import { metadataLocale, pageLocale } from '@/lib/page';

type Props = { params: Promise<{ locale: string; slug: string }> };

// Posts are files: every one is built ahead, anything else is a 404.
export const dynamicParams = false;

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) return [];
  return (await listPosts(params.locale)).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = await metadataLocale(params);
  const post = locale ? await getPost((await params).slug, locale) : null;
  if (!locale || !post) return {};
  const metadata = pageMetadata(locale, `/blog/${post.slug}`, {
    title: post.title,
    description: post.summary,
  });
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, type: 'article', publishedTime: post.date },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const locale = await pageLocale(params);
  const post = await getPost((await params).slug, locale);
  if (!post) notFound();
  const t = await getTranslations('blog');
  const backLink =
    'inline-flex items-center gap-2 font-semibold text-brand-700 underline-offset-4 hover:underline';

  return (
    <Container width="article" className="py-12 sm:py-16">
      <p>
        <Link href="/blog" className={backLink}>
          <BackIcon className="size-4" />
          {t('allPosts')}
        </Link>
      </p>
      <article className="mt-8">
        <header className="border-b border-line pb-8">
          <h1 className="text-3xl font-bold text-balance sm:text-4xl">{post.title}</h1>
          <p className="mt-4 text-sm text-muted">
            {t('published', { date: formatDate(post.date, locale) })}
          </p>
          <p className="mt-4 text-xl text-muted">{post.summary}</p>
        </header>
        <PostContent source={post.body} locale={locale} />
      </article>
    </Container>
  );
}
