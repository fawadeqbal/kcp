'use client';

import type { BlockMessages, CodeLabels, StageLabels } from '@kcp/checks';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';

/*
 * Texts for the block editor, the stage and "Show the code", in the student's
 * language. They hold placeholders that Blockly ("%1") and the stage ("{score}")
 * fill in themselves, so they are read raw, not formatted.
 */

const BLOCK_KEYS = [
  'whenRun',
  'whenKey',
  'whenStar',
  'move',
  'up',
  'down',
  'left',
  'right',
  'keyUp',
  'keyDown',
  'keyLeft',
  'keyRight',
  'collect',
  'say',
  'sayDefault',
  'repeat',
  'untilGoal',
  'if',
  'else',
  'gem',
  'pathUp',
  'pathDown',
  'pathLeft',
  'pathRight',
  'score',
  'star',
] as const satisfies readonly (keyof BlockMessages)[];

const STAGE_KEYS = [
  'stage',
  'score',
  'gems',
  'time',
  'says',
  'bumped',
  'collected',
  'nothingHere',
  'reachedGoal',
  'loop',
  'timeUp',
  'howToPlay',
  'up',
  'down',
  'left',
  'right',
] as const satisfies readonly (keyof StageLabels)[];

function collect<K extends string>(keys: readonly K[], read: (key: K) => unknown) {
  return Object.fromEntries(keys.map((key) => [key, String(read(key))])) as Record<K, string>;
}

export function useBlockMessages(): BlockMessages {
  const t = useTranslations('explorer.blocks');
  return useMemo(() => collect(BLOCK_KEYS, (key) => t.raw(key)), [t]);
}

export function useStageLabels(): StageLabels {
  const t = useTranslations('explorer.stage');
  return useMemo(() => collect(STAGE_KEYS, (key) => t.raw(key)), [t]);
}

export function useCodeLabels(): CodeLabels {
  const t = useTranslations('explorer.code');
  return useMemo(
    () => ({
      whenRun: String(t.raw('whenRun')),
      whenStar: String(t.raw('whenStar')),
      loose: String(t.raw('loose')),
    }),
    [t],
  );
}
