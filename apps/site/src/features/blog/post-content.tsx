import type { Locale } from '@kcp/i18n';
import { compileMDX, type MDXRemoteProps } from 'next-mdx-remote/rsc';
import type { ComponentProps, ReactNode } from 'react';
import { localizeHref, MDX_OPTIONS } from '@/lib/mdx';

/** <Callout> in a post: a highlighted note. */
function Callout({ children }: { children?: ReactNode }) {
  return (
    <aside className="my-8 rounded-[var(--radius-card)] border border-brand-100 bg-brand-50 px-5 py-4 [&>p]:mt-0">
      {children}
    </aside>
  );
}

/** How each Markdown element looks in a post (no typography plugin needed). */
function components(locale: Locale): NonNullable<MDXRemoteProps['components']> {
  return {
    h2: (props: ComponentProps<'h2'>) => <h2 className="mt-10 text-2xl font-bold" {...props} />,
    h3: (props: ComponentProps<'h3'>) => <h3 className="mt-8 text-xl font-bold" {...props} />,
    p: (props: ComponentProps<'p'>) => <p className="mt-4" {...props} />,
    ul: (props: ComponentProps<'ul'>) => (
      <ul className="mt-4 flex list-disc flex-col gap-2 ps-6 marker:text-brand-600" {...props} />
    ),
    ol: (props: ComponentProps<'ol'>) => (
      <ol className="mt-4 flex list-decimal flex-col gap-2 ps-6 marker:text-brand-600" {...props} />
    ),
    blockquote: (props: ComponentProps<'blockquote'>) => (
      <blockquote className="mt-6 border-s-4 border-brand-100 ps-4 text-muted" {...props} />
    ),
    hr: () => <hr className="my-10 border-line" />,
    a: ({ href = '', children }: ComponentProps<'a'>) => {
      const external = /^https?:\/\//i.test(href);
      return (
        <a
          href={localizeHref(href, locale)}
          rel={external ? 'noopener noreferrer' : undefined}
          className="font-semibold text-brand-700 underline underline-offset-4 hover:text-brand-600"
        >
          {children}
        </a>
      );
    },
    // Code reads left to right, also inside Arabic and Urdu posts.
    pre: (props: ComponentProps<'pre'>) => (
      <pre
        dir="ltr"
        className="mt-6 overflow-x-auto rounded-xl bg-ink p-4 text-start font-mono text-sm leading-7 text-white [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-inherit"
        {...props}
      />
    ),
    code: (props: ComponentProps<'code'>) => (
      <code
        dir="ltr"
        className="rounded-md bg-line/60 px-1.5 py-0.5 font-mono text-[0.9em] text-ink"
        {...props}
      />
    ),
    Callout,
  };
}

/** A post's body, compiled from MDX while the site is built. */
export async function PostContent({ source, locale }: { source: string; locale: Locale }) {
  const { content } = await compileMDX({
    source,
    options: MDX_OPTIONS,
    components: components(locale),
  });
  return <div className="text-lg">{content}</div>;
}
