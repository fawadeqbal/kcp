'use client';

import {
  blockDefinitions,
  parseProgram,
  PROGRAM_LIMITS,
  programProblem,
  programText,
  programToState,
  type StageLevel,
  stateToProgram,
  toolbox,
} from '@kcp/checks';
import { directionOf, isLocale } from '@kcp/i18n';
import { clsx } from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Alert, Spinner } from '@/components/ui';
import { useBlockMessages } from './messages';

type BlocklyModule = typeof import('blockly/core');
type Workspace = import('blockly/core').WorkspaceSvg;
type ToolboxDefinition = import('blockly/core').utils.toolbox.ToolboxDefinition;

/** Blockly's own texts (menus, "Delete block") in the student's language. */
async function blocklyMessages(locale: string): Promise<Record<string, string>> {
  const module =
    locale === 'ar'
      ? await import('blockly/msg/ar')
      : locale === 'ur'
        ? await import('blockly/msg/ur')
        : await import('blockly/msg/en');
  return module as unknown as Record<string, string>;
}

let themeCount = 0;

/** A Blockly theme from the design tokens (read from the page, so dark mode works). */
function makeTheme(Blockly: BlocklyModule, host: HTMLElement) {
  const css = getComputedStyle(host);
  const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  themeCount += 1;
  return Blockly.Theme.defineTheme(`kcp-explorer-${themeCount}`, {
    name: `kcp-explorer-${themeCount}`,
    base: Blockly.Themes.Classic,
    startHats: true,
    fontStyle: { family: css.fontFamily, weight: '700', size: 13 },
    componentStyles: {
      workspaceBackgroundColour: token('--color-code-bg', '#fbf6ee'),
      toolboxBackgroundColour: token('--color-surface', '#ebddc5'),
      toolboxForegroundColour: token('--color-ink', '#201e1d'),
      flyoutBackgroundColour: token('--color-surface', '#ebddc5'),
      flyoutForegroundColour: token('--color-ink', '#201e1d'),
      flyoutOpacity: 1,
      scrollbarColour: token('--color-sand-500', '#a19786'),
      scrollbarOpacity: 0.6,
      insertionMarkerColour: token('--color-ink', '#201e1d'),
      insertionMarkerOpacity: 0.25,
      cursorColour: token('--color-brand', '#c67139'),
    },
  });
}

/**
 * The block editor (Blockly): the level's blocks in a toolbox beside the workspace.
 * `value` is the program as JSON (the `blocks` file); edits come back through
 * `onChange` in the same form. Blockly loads on demand, only on block lessons.
 */
export function BlocksEditor({
  level,
  value,
  onChange,
  readOnly = false,
  actions,
  className,
}: {
  level: StageLevel;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  /** Buttons under the workspace ("Start again", "Check my blocks"). */
  actions?: ReactNode;
  className?: string;
}) {
  const t = useTranslations('explorer');
  const locale = useLocale();
  const messages = useBlockMessages();
  const helpId = useId();
  const host = useRef<HTMLDivElement>(null);
  const blockly = useRef<BlocklyModule | null>(null);
  const workspace = useRef<Workspace | null>(null);
  /** The program the workspace shows, as JSON. */
  const shown = useRef(value);
  /** The latest program from outside, for when Blockly has finished loading. */
  const latest = useRef(value);
  latest.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [tooMany, setTooMany] = useState(false);
  const toolboxKey = level.toolbox.join(',');
  const rtl = isLocale(locale) && directionOf(locale) === 'rtl';

  useEffect(() => {
    let disposed = false;
    let ws: Workspace | null = null;
    let observer: ResizeObserver | null = null;
    setStatus('loading');
    void (async () => {
      try {
        const [Blockly, core] = await Promise.all([
          import('blockly/core'),
          blocklyMessages(locale),
        ]);
        const node = host.current;
        if (disposed || !node) return;
        Blockly.setLocale(core);
        const definitions = blockDefinitions(messages);
        // Defined again for each language: drop the old definitions first.
        for (const definition of definitions) delete Blockly.Blocks[String(definition['type'])];
        Blockly.common.defineBlocksWithJsonArray(definitions);
        ws = Blockly.inject(node, {
          toolbox: toolbox(
            toolboxKey.split(',') as StageLevel['toolbox'],
          ) as unknown as ToolboxDefinition,
          rtl,
          renderer: 'zelos',
          theme: makeTheme(Blockly, node),
          media: '/blockly/',
          sounds: false,
          readOnly,
          trashcan: !readOnly,
          maxBlocks: PROGRAM_LIMITS.blocks,
          zoom: {
            controls: true,
            wheel: false,
            // Smaller blocks on phones, so the toolbox leaves room to build.
            startScale: node.clientWidth < 520 ? 0.65 : 0.8,
            maxScale: 2,
            minScale: 0.4,
          },
          move: { scrollbars: true, drag: true, wheel: true },
        });
        const program = parseProgram(latest.current) ?? [];
        Blockly.serialization.workspaces.load(programToState(program), ws, { recordUndo: false });
        const current = ws;
        // What the workspace holds now (with its blocks' positions): only real edits save.
        shown.current = programText(stateToProgram(Blockly.serialization.workspaces.save(current)));
        current.addChangeListener((event) => {
          if (event.isUiEvent) return;
          const next = stateToProgram(Blockly.serialization.workspaces.save(current));
          const tooBig = programProblem(next) !== null;
          setTooMany(tooBig);
          if (tooBig) return;
          const text = programText(next);
          if (text === shown.current) return;
          shown.current = text;
          onChangeRef.current(text);
        });
        observer = new ResizeObserver(() => Blockly.svgResize(current));
        observer.observe(node);
        blockly.current = Blockly;
        workspace.current = current;
        setStatus('ready');
      } catch {
        if (!disposed) setStatus('failed');
      }
    })();
    return () => {
      disposed = true;
      observer?.disconnect();
      ws?.dispose();
      workspace.current = null;
    };
  }, [locale, messages, toolboxKey, readOnly, rtl]);

  // A program from outside (the starter, after "Start again"): show it.
  useEffect(() => {
    const Blockly = blockly.current;
    const ws = workspace.current;
    if (!Blockly || !ws || value === shown.current) return;
    shown.current = value;
    Blockly.Events.disable();
    try {
      ws.clear();
      Blockly.serialization.workspaces.load(programToState(parseProgram(value) ?? []), ws, {
        recordUndo: false,
      });
    } finally {
      Blockly.Events.enable();
    }
    setTooMany(false);
  }, [value]);

  return (
    <section
      aria-label={t('workspaceLabel')}
      className={clsx(
        'elev-sm flex min-w-0 flex-col overflow-hidden rounded-panel bg-code-bg',
        className,
      )}
    >
      <div className="relative min-h-72 flex-1" aria-describedby={helpId}>
        <div ref={host} className="absolute inset-0" />
        {status === 'loading' ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-muted">
            <Spinner />
            {t('loading')}
          </div>
        ) : null}
        {status === 'failed' ? (
          <div className="absolute inset-0 flex items-center p-6">
            <Alert tone="error">{t('loadFailed')}</Alert>
          </div>
        ) : null}
      </div>
      {tooMany ? (
        <p role="alert" className="bg-warn-soft px-4 py-2 text-sm font-semibold text-warn-text">
          {t('tooManyBlocks', { max: String(PROGRAM_LIMITS.blocks) })}
        </p>
      ) : null}
      {actions ? <div className="flex flex-wrap items-center gap-2.5 p-3.5">{actions}</div> : null}
      <p id={helpId} className="sr-only">
        {t('workspaceHelp')}
      </p>
    </section>
  );
}
