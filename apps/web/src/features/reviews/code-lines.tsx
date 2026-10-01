'use client';

import type { components } from '@kcp/api-client-ts';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { type ReactNode, useState } from 'react';
import { useProgramCode } from '../explorer/code-view';
import { onTabKeyDown } from '../learn/tabs';

type Comment = components['schemas']['ReviewCommentDto'] & { mine?: boolean };
export type FileKey = 'html' | 'css' | 'js' | 'py' | 'blocks';

const FILE_NAMES: Record<FileKey, string> = {
  html: 'index.html',
  css: 'style.css',
  js: 'script.js',
  py: 'main.py',
  blocks: 'program.js',
};

/**
 * Reviewed code, file by file, with numbered lines and the mentor's comments under the
 * lines they're about. With `onLine`, each line number is a button (for mentors).
 */
export function CodeLines({
  files,
  comments,
  onLine,
  renderComment,
  lineAction,
}: {
  files: Partial<Record<FileKey, string>>;
  comments: Comment[];
  /** Mentors: a line number was chosen. */
  onLine?: (file: FileKey, line: number) => void;
  /** Extra controls for a comment (mentors: delete their own). */
  renderComment?: (comment: Comment) => ReactNode;
  /** Something shown under a line (mentors: the comment form). */
  lineAction?: (file: FileKey, line: number) => ReactNode;
}) {
  const t = useTranslations();
  const keys = (Object.keys(FILE_NAMES) as FileKey[]).filter((key) => files[key] !== undefined);
  const [active, setActive] = useState<FileKey>(keys[0] ?? 'html');
  // A block program is read (and commented on) as the JavaScript it stands for.
  const program = useProgramCode(files.blocks);
  const lines = (active === 'blocks' ? program : (files[active] ?? '')).split('\n');
  const onThisFile = comments.filter((c) => c.file === active);
  const count = (key: FileKey) => comments.filter((c) => c.file === key).length;
  return (
    <div className="flex flex-col gap-2">
      {active === 'blocks' ? (
        <p className="text-sm text-muted">{t('explorer.blocksFile')}</p>
      ) : null}
      {keys.length > 1 ? (
        <div role="tablist" aria-label={t('mentor.code')} className="flex flex-wrap gap-1">
          {keys.map((key, index) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`code-tab-${key}`}
              aria-selected={active === key}
              aria-controls="code-lines"
              tabIndex={active === key ? 0 : -1}
              onClick={() => setActive(key)}
              onKeyDown={(event) =>
                onTabKeyDown(event, keys.length, index, (i) => setActive(keys[i]!))
              }
              className={clsx(
                'font-latin min-h-9 rounded-full px-3.5 text-sm transition-colors',
                active === key
                  ? 'bg-brand-100 font-bold text-brand-800'
                  : 'font-semibold text-muted hover:bg-ink/7 hover:text-ink',
              )}
            >
              {FILE_NAMES[key]}
              {count(key) ? ` (${count(key)})` : ''}
            </button>
          ))}
        </div>
      ) : null}
      <div
        id="code-lines"
        role={keys.length > 1 ? 'tabpanel' : undefined}
        aria-labelledby={keys.length > 1 ? `code-tab-${active}` : undefined}
        dir="ltr"
        className="relative max-h-[70dvh] overflow-auto rounded-well bg-code-bg py-2 text-start font-mono text-sm leading-relaxed text-ink"
      >
        <ol>
          {lines.map((text, index) => {
            const line = index + 1;
            const here = onThisFile.filter((c) => c.line === line);
            return (
              <li key={line} className="group">
                <div className="flex">
                  {onLine ? (
                    <button
                      type="button"
                      onClick={() => onLine(active, line)}
                      aria-label={t('mentor.commentOn', { line: String(line) })}
                      className="w-12 shrink-0 pe-3 text-end text-code-gutter select-none hover:bg-brand/10 hover:text-brand-text focus-visible:text-brand-text"
                    >
                      {line}
                    </button>
                  ) : (
                    <span
                      className="w-12 shrink-0 pe-3 text-end text-code-gutter select-none"
                      aria-hidden="true"
                    >
                      {line}
                    </span>
                  )}
                  <code className="min-w-0 flex-1 pe-4 whitespace-pre-wrap break-all">
                    {text || ' '}
                  </code>
                </div>
                {here.map((comment) => (
                  <div
                    key={comment.id}
                    dir="auto"
                    className="ms-12 me-3 my-1.5 rounded-row bg-brand-100 px-3.5 py-2.5 font-sans text-[0.95rem] text-brand-800"
                  >
                    <span className="sr-only">{t('review.line', { line: String(line) })}: </span>
                    <p className="whitespace-pre-wrap">{comment.body}</p>
                    {renderComment?.(comment)}
                  </div>
                ))}
                {lineAction?.(active, line)}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
