'use client';

import type { CodeFiles, StageLevel } from '@kcp/checks';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useState } from 'react';
import { FULL_SCREEN_CLASS, FullScreenButton, useFullScreen } from '@/components/full-screen';
import { Button } from '@/components/ui';
import { StagePane } from '../explorer/stage-pane';
import { usePythonRuntime } from '../learn/python-runtime';
import { SANDBOX_URL, useSandbox } from '../learn/use-sandbox';
import { PythonControls, usePreviewLabels } from '../learn/workspace';

/**
 * A shipped project, running in its own sandbox (like the editor's preview), under its
 * `header` (the name and when it shipped) and a button that shows it all on the whole
 * screen.
 */
export function ProjectPreview({
  files,
  stage = null,
  title,
  header,
  className = 'h-80',
}: {
  files: CodeFiles;
  /** Block projects: the level their program plays on. */
  stage?: StageLevel | null;
  /** The frame's accessible name ("Preview of …"). */
  title: string;
  /** The project's name and details, beside the "Full screen" button. */
  header?: ReactNode;
  /** The page's height when not on the whole screen. */
  className?: string;
}) {
  const fullScreen = useFullScreen<HTMLDivElement>();
  const full = fullScreen.active;
  return (
    <div
      ref={fullScreen.ref}
      className={clsx(
        'flex flex-col gap-3.5',
        full && [FULL_SCREEN_CLASS, 'overflow-y-auto bg-canvas p-3 sm:p-5'],
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">{header}</div>
        <FullScreenButton active={full} onToggle={fullScreen.toggle} />
      </div>
      {files.blocks !== undefined && stage ? (
        <StagePane
          bare
          level={stage}
          program={files.blocks}
          title={title}
          className={full ? 'min-h-0 flex-1' : 'h-96'}
        />
      ) : files.py === undefined ? (
        <PagePreview files={files} title={title} className={full ? 'min-h-0 flex-1' : className} />
      ) : (
        <PythonProjectPreview files={files} title={title} full={full} />
      )}
    </div>
  );
}

function PagePreview({
  files,
  title,
  className,
}: {
  files: CodeFiles;
  title: string;
  className: string;
}) {
  const labels = usePreviewLabels();
  const sandbox = useSandbox(labels);
  const { preview, ready } = sandbox;

  useEffect(() => {
    if (ready) preview(files);
  }, [ready, preview, files]);

  return (
    <iframe
      key={sandbox.frameKey}
      ref={sandbox.frame}
      src={`${SANDBOX_URL}/`}
      sandbox="allow-scripts"
      title={title}
      loading="lazy"
      className={`w-full rounded-well bg-white ${className}`}
    />
  );
}

/**
 * A Python program: its code, and a button that downloads Python (only then) and
 * runs it, with answers for input(). On the whole screen, the code and the program
 * sit side by side on wide screens, each scrolling on its own.
 */
function PythonProjectPreview({
  files,
  title,
  full,
}: {
  files: CodeFiles;
  title: string;
  full: boolean;
}) {
  const t = useTranslations('lesson');
  const [open, setOpen] = useState(false);
  return (
    <div className={clsx('flex flex-col gap-3', full && 'min-h-0 flex-1 lg:grid lg:grid-cols-2')}>
      <pre
        dir="ltr"
        aria-label={title}
        className={clsx(
          'overflow-auto rounded-well bg-code-bg p-4 text-start font-mono text-sm',
          full ? 'min-h-0 flex-1' : 'max-h-80',
        )}
      >
        {files.py}
      </pre>
      <div
        className={clsx('flex flex-col gap-3', full && 'relative min-h-0 flex-1 overflow-y-auto')}
      >
        {open ? (
          <PythonRunner files={files} title={title} full={full} />
        ) : (
          <div>
            <Button variant="secondary" onClick={() => setOpen(true)}>
              {t('runProgram')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PythonRunner({ files, title, full }: { files: CodeFiles; title: string; full: boolean }) {
  const labels = usePreviewLabels();
  const load = usePythonRuntime(true);
  const sandbox = useSandbox(labels, load.status === 'ready' ? load.runtime : null);
  const canRun = sandbox.ready && load.status === 'ready';
  return (
    <>
      <PythonControls
        load={load}
        canRun={canRun}
        onRun={(stdin) => sandbox.preview(files, stdin)}
      />
      <iframe
        key={sandbox.frameKey}
        ref={sandbox.frame}
        src={`${SANDBOX_URL}/`}
        sandbox="allow-scripts"
        title={title}
        className={clsx('w-full rounded-well bg-white', full ? 'min-h-60 flex-1' : 'h-60')}
      />
    </>
  );
}
