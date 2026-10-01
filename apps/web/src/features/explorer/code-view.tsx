'use client';

import { parseProgram, programToJs } from '@kcp/checks';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { Button, Dialog } from '@/components/ui';
import { useCodeLabels } from './messages';

/** The JavaScript a block program stands for, as numbered lines. */
export function useProgramCode(program: string | undefined): string {
  const labels = useCodeLabels();
  return useMemo(() => {
    const parsed = parseProgram(program);
    return parsed ? programToJs(parsed, labels) : '';
  }, [program, labels]);
}

/** "Show the code": the student's blocks, written as JavaScript. */
export function CodeDialog({
  open,
  onClose,
  program,
}: {
  open: boolean;
  onClose: () => void;
  program: string;
}) {
  const t = useTranslations('explorer');
  const code = useProgramCode(program);
  const lines = code.split('\n');
  return (
    <Dialog open={open} onClose={onClose} title={t('codeTitle')}>
      <p className="text-muted">{t('codeHelp')}</p>
      <pre
        dir="ltr"
        tabIndex={0}
        className="font-latin max-h-[60dvh] overflow-auto rounded-well bg-code-bg p-4 text-sm leading-6"
      >
        <code>
          {lines.map((line, index) => (
            <span key={index} className="flex gap-4">
              <span
                aria-hidden="true"
                className="w-6 shrink-0 text-end text-code-gutter select-none"
              >
                {index + 1}
              </span>
              <span className={line.trimStart().startsWith('//') ? 'text-code-com' : undefined}>
                {line || ' '}
              </span>
            </span>
          ))}
        </code>
      </pre>
      <div className="flex justify-end">
        <Button onClick={onClose}>{t('hideCode')}</Button>
      </div>
    </Dialog>
  );
}
