import ReactMarkdown, { type Components } from 'react-markdown';

/*
 * Lesson texts are Markdown from content/. Raw HTML in them is not rendered (it
 * shows as text), and code is always left-to-right, even in Arabic and Urdu.
 */
const components: Components = {
  h2: ({ children }) => <h3 className="mt-6 text-2xl">{children}</h3>,
  h3: ({ children }) => <h3 className="mt-6 text-xl">{children}</h3>,
  p: ({ children }) => <p className="mt-3">{children}</p>,
  ul: ({ children }) => <ul className="mt-3 list-disc space-y-1 ps-6">{children}</ul>,
  ol: ({ children }) => <ol className="mt-3 list-decimal space-y-1 ps-6">{children}</ol>,
  pre: ({ children }) => (
    <pre
      dir="ltr"
      className="elev-sm mt-3 overflow-x-auto rounded-well bg-code-bg p-4 text-start font-mono text-sm leading-relaxed text-ink [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit"
    >
      {children}
    </pre>
  ),
  code: ({ children }) => (
    <code
      dir="ltr"
      className="rounded-full bg-raised px-2 py-0.5 font-mono text-[0.85em] text-code-tag"
    >
      {children}
    </code>
  ),
  // Links to other sites open in a new tab; links within the site (e.g. "privacy") don't.
  a: ({ children, href }) => (
    <a
      href={href}
      {...(/^[a-z][a-z\d+.-]*:/i.test(href ?? '')
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
      className="font-semibold text-brand-text underline underline-offset-4"
    >
      {children}
    </a>
  ),
};

/** For pages where the text's "##" sections sit right under the page's h1. */
const pageComponents: Components = {
  ...components,
  h2: ({ children }) => <h2 className="mt-8 text-3xl">{children}</h2>,
};

export function Markdown({
  children,
  sections = 'h3',
}: {
  children: string;
  /** The element for "##" headings: h3 inside a lesson, h2 on a page of its own. */
  sections?: 'h2' | 'h3';
}) {
  return (
    // Nastaliq (Urdu) is tall: it needs more space between lines, headings included.
    <div className="leading-relaxed [&:lang(ur)]:leading-[2.2] [&:lang(ur)_:is(h2,h3)]:leading-[2] [&>*:first-child]:mt-0">
      <ReactMarkdown components={sections === 'h2' ? pageComponents : components} skipHtml>
        {children}
      </ReactMarkdown>
    </div>
  );
}
