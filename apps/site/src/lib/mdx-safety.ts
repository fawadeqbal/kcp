/*
 * Blog posts are MDX, but only the Markdown part of it: headings, paragraphs, lists,
 * emphasis, code, links, quotes, plus the few components the site offers (see
 * features/blog/mdx-components). Anything that could put raw HTML or JavaScript on the
 * page (<script>, <iframe>, {expressions}, import/export, javascript: links, images
 * from other sites) stops the build with a message saying where it is.
 */

/** Components a post may use, e.g. <Callout>…</Callout>. Attributes must be plain text. */
export const ALLOWED_COMPONENTS = ['Callout'] as const;

interface MdastNode {
  type: string;
  name?: string | null;
  url?: string;
  depth?: number;
  attributes?: { type: string; value?: unknown }[];
  children?: MdastNode[];
  position?: { start: { line: number; column: number } };
}

export class UnsafeContentError extends Error {}

const SAFE_LINK = /^(https:\/\/|http:\/\/|mailto:|\/(?!\/)|#)/i;

function where(node: MdastNode): string {
  const start = node.position?.start;
  return start ? ` (line ${start.line})` : '';
}

function check(node: MdastNode): void {
  const fail = (reason: string): never => {
    throw new UnsafeContentError(`${reason}${where(node)}`);
  };

  switch (node.type) {
    case 'mdxjsEsm':
      fail('import/export is not allowed in blog posts');
      break;
    case 'mdxFlowExpression':
    case 'mdxTextExpression':
      fail('{expressions} are not allowed in blog posts');
      break;
    case 'html':
      fail('raw HTML is not allowed in blog posts');
      break;
    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement': {
      const name = node.name ?? '';
      if (!(ALLOWED_COMPONENTS as readonly string[]).includes(name)) {
        const allowed = ALLOWED_COMPONENTS.map((component) => `<${component}>`).join(', ');
        fail(`<${name}> is not allowed in blog posts (only Markdown and ${allowed})`);
      }
      for (const attribute of node.attributes ?? []) {
        if (attribute.type !== 'mdxJsxAttribute' || typeof attribute.value !== 'string') {
          fail(`<${name}> attributes must be plain text`);
        }
      }
      break;
    }
    case 'heading':
      if (node.depth === 1) fail('use ## headings: the title comes from the front matter');
      break;
    case 'link':
    case 'definition':
      if (!SAFE_LINK.test(node.url ?? '')) fail(`link "${node.url}" is not allowed`);
      break;
    case 'image':
    case 'imageReference':
      // Images must be files of this site (public/), never from other sites.
      if (node.type === 'imageReference' || !/^\/(?!\/)/.test(node.url ?? '')) {
        fail(`image "${node.url ?? ''}" must be a file of this site, starting with /`);
      }
      break;
    default:
      break;
  }
  for (const child of node.children ?? []) check(child);
}

/** remark plugin: throws UnsafeContentError when a post uses more than Markdown. */
export function remarkSafeContent() {
  return (tree: unknown) => {
    check(tree as MdastNode);
  };
}
