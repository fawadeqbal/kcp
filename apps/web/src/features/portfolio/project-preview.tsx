'use client';

import type { CodeFiles } from '@kcp/checks';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import { usePythonRuntime } from '../learn/python-runtime';
import { SANDBOX_URL, useSandbox } from '../learn/use-sandbox';
import { PythonControls, usePreviewLabels } from '../learn/workspace';

/** A shipped project, running in its own sandbox (like the editor's preview). */
export function ProjectPreview({
  files,
  title,
  className = 'h-80',
}: {
  files: CodeFiles;
  title: string;
  className?: string;
}) {
  if (files.py !== undefined) return <PythonProjectPreview files={files} title={title} />;
  return <PagePreview files={files} title={title} className={className} />;
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
 * runs it, with answers for input().
 */
function PythonProjectPreview({ files, title }: { files: CodeFiles; title: string }) {
  const t = useTranslations('lesson');
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <pre
        dir="ltr"
        aria-label={title}
        className="max-h-80 overflow-auto rounded-well bg-code-bg p-4 text-start font-mono text-sm"
      >
        {files.py}
      </pre>
      {open ? (
        <PythonRunner files={files} title={title} />
      ) : (
        <div>
          <Button variant="secondary" onClick={() => setOpen(true)}>
            {t('runProgram')}
          </Button>
        </div>
      )}
    </div>
  );
}

function PythonRunner({ files, title }: { files: CodeFiles; title: string }) {
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
        className="h-60 w-full rounded-well bg-white"
      />
    </>
  );
}
