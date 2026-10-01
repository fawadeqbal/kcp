'use client';

import {
  mountStage,
  parseProgram,
  type StageLevel,
  type StageOutcome,
  type StagePlayer,
} from '@kcp/checks';
import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';
import {
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { FULL_SCREEN_CLASS, FullScreenButton, useFullScreen } from '@/components/full-screen';
import { Button, Icon } from '@/components/ui';
import { useStageLabels } from './messages';

export interface StageHandle {
  /** Plays the program from the start. */
  run: () => Promise<StageOutcome | null>;
}

/**
 * The stage's height beside the editor: as tall as the picture needs on small screens
 * (it scales with the width), sharing the one-screen workspace on wide ones.
 */
export const STAGE_PANE_CLASS = 'min-h-80 xl:h-auto xl:min-h-0';

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Bit's world: the level, and the program playing on it (▶ Run). Games stay live
 * until their time is up; Stop ends them early. Nothing here runs student code: the
 * program is data, played by the stage in packages/checks.
 */
export function StagePane({
  level,
  program,
  title,
  className,
  footer,
  bare = false,
  ref,
}: {
  level: StageLevel;
  /** The program (the `blocks` file, JSON). */
  program: string;
  title: string;
  className?: string;
  /** Shown under the stage. */
  footer?: ReactNode;
  /** Just the stage and its buttons (inside something that has its own title and frame). */
  bare?: boolean;
  ref?: Ref<StageHandle>;
}) {
  const t = useTranslations('explorer');
  const labels = useStageLabels();
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<StagePlayer | null>(null);
  const programRef = useRef(program);
  programRef.current = program;
  const [running, setRunning] = useState(false);
  const fullScreen = useFullScreen<HTMLDivElement>();

  useEffect(() => {
    if (!host.current) return;
    const mounted = mountStage(host.current, level, { labels, reducedMotion: reducedMotion() });
    player.current = mounted;
    return () => {
      mounted.destroy();
      player.current = null;
    };
  }, [level, labels]);

  // A changed program starts from the beginning again.
  useEffect(() => {
    player.current?.reset();
    setRunning(false);
  }, [program]);

  const run = useCallback(async () => {
    const stage = player.current;
    if (!stage) return null;
    setRunning(true);
    try {
      return await stage.play(parseProgram(programRef.current) ?? []);
    } finally {
      if (player.current === stage) setRunning(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({ run }), [run]);

  const stop = () => {
    player.current?.stop();
    setRunning(false);
  };

  return (
    <div
      ref={fullScreen.ref}
      {...(bare ? { role: 'group', 'aria-label': title } : {})}
      className={clsx(
        '@container flex min-w-0 flex-col gap-3',
        bare
          ? className
          : fullScreen.active
            ? [FULL_SCREEN_CLASS, 'overflow-y-auto bg-surface p-3']
            : ['relative overflow-y-auto rounded-panel bg-surface p-3', className],
      )}
    >
      {bare ? null : (
        <div className="flex items-center gap-2">
          <h2 className="flex items-center gap-2 px-2 text-sm font-bold">
            <Icon name="rocket" />
            {title}
          </h2>
          <FullScreenButton
            compact
            active={fullScreen.active}
            onToggle={fullScreen.toggle}
            className="ms-auto"
          />
        </div>
      )}
      <div ref={host} className="relative min-h-56 flex-1" />
      <div className="flex flex-wrap items-center gap-2.5">
        <Button onClick={() => !running && void run()} aria-disabled={running || undefined}>
          <Icon name="play" />
          {t('run')}
        </Button>
        {running ? (
          <Button variant="secondary" onClick={stop}>
            <Icon name="x" />
            {t('stop')}
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => player.current?.reset()} className="text-muted">
            <Icon name="refresh" />
            {t('startOver')}
          </Button>
        )}
      </div>
      {footer}
    </div>
  );
}
