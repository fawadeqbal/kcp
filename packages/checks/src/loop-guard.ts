import { type Node as AcornNode, parse } from 'acorn';
import { simple } from 'acorn-walk';
import { LOOP_GUARD } from './runtime.js';
import type { CodeError } from './types.js';

/**
 * Loop guards: a loop that never ends would freeze the student's tab. Before the
 * code runs, every loop gets a call to a guard function at the start of its body;
 * the guard throws once one loop has been spinning for too long.
 */

type LoopNode = AcornNode & { body: AcornNode & { type: string } };

export type GuardResult = { ok: true; code: string } | { ok: false; error: CodeError };

/** Adds loop guards to a script. Syntax errors are returned, not thrown. */
export function guardLoops(code: string, sourceType: 'script' | 'module' = 'script'): GuardResult {
  let ast: AcornNode;
  try {
    ast = parse(code, { ecmaVersion: 'latest', sourceType, locations: true });
  } catch (error) {
    const syntax = error as SyntaxError & { loc?: { line: number } };
    return {
      ok: false,
      error: {
        kind: 'syntax',
        // Acorn appends "(line:column)"; the line is reported separately.
        message: syntax.message.replace(/\s*\(\d+:\d+\)$/, ''),
        line: syntax.loc?.line,
      },
    };
  }

  const edits: { at: number; text: string }[] = [];
  const call = `${LOOP_GUARD}();`;
  const guard = (node: AcornNode) => {
    const loop = node as LoopNode;
    if (loop.body.type === 'BlockStatement') {
      edits.push({ at: loop.body.start + 1, text: call });
    } else {
      // `while (x) y();` → `while (x) {guard; y();}`
      edits.push({ at: loop.body.start, text: `{${call}` }, { at: loop.body.end, text: '}' });
    }
  };
  simple(ast, {
    ForStatement: guard,
    ForInStatement: guard,
    ForOfStatement: guard,
    WhileStatement: guard,
    DoWhileStatement: guard,
  });

  let guarded = code;
  for (const edit of edits.toSorted((a, b) => b.at - a.at)) {
    guarded = guarded.slice(0, edit.at) + edit.text + guarded.slice(edit.at);
  }
  return { ok: true, code: guarded };
}

const INLINE_SCRIPT = /(<script\b([^>]*)>)([\s\S]*?)(<\/script\s*>)/gi;
const JS_TYPES = new Set(['', 'text/javascript', 'application/javascript', 'module']);

/**
 * Adds loop guards to the scripts a student writes straight into their HTML
 * (`<script>…</script>`), which would otherwise freeze the preview on every load.
 * Scripts with a syntax error are left as they are: the browser reports the error.
 * (Code in event attributes such as onclick only runs when clicked, so it isn't guarded.)
 */
export function guardHtmlScripts(html: string): string {
  return html.replace(
    INLINE_SCRIPT,
    (whole, open: string, attributes: string, code: string, close: string) => {
      if (/\bsrc\s*=/i.test(attributes) || !code.trim()) return whole;
      const type = /\btype\s*=\s*["']?([^"'\s>]*)/i.exec(attributes)?.[1]?.toLowerCase() ?? '';
      if (!JS_TYPES.has(type)) return whole;
      const guarded = guardLoops(code, type === 'module' ? 'module' : 'script');
      return guarded.ok ? `${open}${guarded.code}${close}` : whole;
    },
  );
}
