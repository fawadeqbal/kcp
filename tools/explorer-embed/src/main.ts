/*
 * The Explorer block editor and Bit's world inside the mobile app (a WebView). The
 * app talks to this page through `window.KcpExplorer` (calls) and the `KcpBridge`
 * JavaScript channel (messages back, as JSON). The page never touches the network:
 * the app saves drafts and sends results to the API itself. Programs are data; the
 * stage plays them and the checks are the same ones the web app and the API run.
 */
import * as Blockly from 'blockly/core';
import * as Ar from 'blockly/msg/ar';
import * as En from 'blockly/msg/en';
import * as Ur from 'blockly/msg/ur';
import {
  blockDefinitions,
  type BlockMessages,
  type Check,
  type CodeLabels,
  evaluateStageChecks,
  mountStage,
  parseProgram,
  programProblem,
  programText,
  programToJs,
  programToState,
  type StageLabels,
  type StageLevel,
  type StagePlayer,
  stateToProgram,
  toolbox,
} from '@kcp/checks';

type Language = 'en' | 'ar' | 'ur';

interface Messages {
  blocks: BlockMessages;
  stage: StageLabels;
  code: CodeLabels;
  ui: {
    blocks: string;
    stage: string;
    code: string;
    run: string;
    stop: string;
    startOver: string;
    codeHelp: string;
    tooMany: string;
  };
}

/** Set at build time from packages/i18n (build.mjs). */
declare const EXPLORER_MESSAGES: Record<Language, Messages>;

interface StartConfig {
  locale: string;
  level: StageLevel;
  /** The program (the `blocks` file, JSON). */
  program: string;
  dark?: boolean;
  readOnly?: boolean;
}

type Outgoing =
  | { type: 'ready' }
  | { type: 'started' }
  | { type: 'change'; program: string }
  | {
      type: 'results';
      requestId: string;
      results: { id: string; passed: boolean; hint?: string }[];
    }
  | { type: 'error'; message: string };

declare global {
  interface Window {
    KcpBridge?: { postMessage: (message: string) => void };
    KcpExplorer: {
      start: (config: StartConfig) => void;
      setProgram: (program: string) => void;
      run: () => void;
      check: (requestId: string, checks: Check[]) => void;
      show: (view: 'blocks' | 'stage' | 'code') => void;
    };
  }
}

const post = (message: Outgoing) => window.KcpBridge?.postMessage(JSON.stringify(message));

const CORE: Record<Language, Record<string, string>> = {
  en: En as unknown as Record<string, string>,
  ar: Ar as unknown as Record<string, string>,
  ur: Ur as unknown as Record<string, string>,
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let workspace: Blockly.WorkspaceSvg | null = null;
let player: StagePlayer | null = null;
let level: StageLevel | null = null;
let current = '[]';
let messages: Messages = EXPLORER_MESSAGES.en;

function setView(view: 'blocks' | 'stage' | 'code') {
  document.body.dataset['view'] = view;
  for (const tab of document.querySelectorAll<HTMLButtonElement>('[role="tab"]')) {
    const selected = tab.dataset['view'] === view;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  }
  if (view === 'code') {
    const program = parseProgram(current) ?? [];
    $('code-text').textContent = programToJs(program, messages.code);
  }
  if (workspace) Blockly.svgResize(workspace);
}

function theme(dark: boolean) {
  return Blockly.Theme.defineTheme(`kcp-${dark ? 'dark' : 'light'}`, {
    name: `kcp-${dark ? 'dark' : 'light'}`,
    base: Blockly.Themes.Classic,
    startHats: true,
    fontStyle: { family: 'system-ui, sans-serif', weight: '700', size: 13 },
    componentStyles: dark
      ? {
          workspaceBackgroundColour: '#14120f',
          toolboxBackgroundColour: '#25221e',
          flyoutBackgroundColour: '#25221e',
          flyoutForegroundColour: '#f2e8d8',
          flyoutOpacity: 1,
          scrollbarColour: '#82796a',
        }
      : {
          workspaceBackgroundColour: '#fbf6ee',
          toolboxBackgroundColour: '#ebddc5',
          flyoutBackgroundColour: '#ebddc5',
          flyoutForegroundColour: '#201e1d',
          flyoutOpacity: 1,
          scrollbarColour: '#a19786',
        },
  });
}

function onChange(event: Blockly.Events.Abstract) {
  if (event.isUiEvent || !workspace) return;
  const next = stateToProgram(Blockly.serialization.workspaces.save(workspace));
  const tooMany = programProblem(next) !== null;
  $('too-many').hidden = !tooMany;
  if (tooMany) return;
  const text = programText(next);
  if (text === current) return;
  current = text;
  player?.reset();
  post({ type: 'change', program: text });
}

function start(config: StartConfig) {
  try {
    const language: Language =
      config.locale === 'ar' || config.locale === 'ur' ? config.locale : 'en';
    messages = EXPLORER_MESSAGES[language];
    level = config.level;
    const rtl = language !== 'en';
    document.documentElement.lang = language;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    document.body.classList.toggle('dark', !!config.dark);
    $('tab-blocks').textContent = messages.ui.blocks;
    $('tab-stage').textContent = messages.ui.stage;
    $('tab-code').textContent = messages.ui.code;
    $('run').textContent = `▶ ${messages.ui.run}`;
    $('stop').textContent = messages.ui.stop;
    $('reset').textContent = messages.ui.startOver;
    $('code-help').textContent = messages.ui.codeHelp;
    $('too-many').textContent = messages.ui.tooMany;

    Blockly.setLocale(CORE[language]);
    const definitions = blockDefinitions(messages.blocks);
    for (const definition of definitions) delete Blockly.Blocks[String(definition['type'])];
    Blockly.common.defineBlocksWithJsonArray(definitions);
    workspace?.dispose();
    workspace = Blockly.inject($('blocks'), {
      toolbox: toolbox(level.toolbox) as unknown as Blockly.utils.toolbox.ToolboxDefinition,
      rtl,
      renderer: 'zelos',
      theme: theme(!!config.dark),
      media: './media/',
      sounds: false,
      readOnly: !!config.readOnly,
      trashcan: !config.readOnly,
      zoom: {
        controls: true,
        wheel: false,
        startScale: window.innerWidth < 600 ? 0.7 : 0.85,
        maxScale: 2,
        minScale: 0.4,
      },
      move: { scrollbars: true, drag: true, wheel: true },
    });
    current = config.program;
    Blockly.serialization.workspaces.load(programToState(parseProgram(current) ?? []), workspace, {
      recordUndo: false,
    });
    current = programText(stateToProgram(Blockly.serialization.workspaces.save(workspace)));
    workspace.addChangeListener(onChange);
    new ResizeObserver(() => workspace && Blockly.svgResize(workspace)).observe($('blocks'));

    player?.destroy();
    player = mountStage($('stage'), level, {
      labels: messages.stage,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
    setView('blocks');
    post({ type: 'started' });
  } catch (error) {
    post({ type: 'error', message: String(error) });
  }
}

async function run() {
  if (!player) return;
  // On phones the stage is its own tab: show it while Bit plays.
  if (document.body.dataset['view'] !== 'stage' && window.innerWidth < 820) setView('stage');
  $('stop').hidden = false;
  $('reset').hidden = true;
  await player.play(parseProgram(current) ?? []);
  $('stop').hidden = true;
  $('reset').hidden = false;
}

window.KcpExplorer = {
  start,
  setProgram(program: string) {
    if (!workspace) return;
    Blockly.Events.disable();
    try {
      workspace.clear();
      Blockly.serialization.workspaces.load(
        programToState(parseProgram(program) ?? []),
        workspace,
        { recordUndo: false },
      );
    } finally {
      Blockly.Events.enable();
    }
    current = program;
    player?.reset();
  },
  run: () => void run(),
  check(requestId: string, checks: Check[]) {
    if (!level) return;
    post({ type: 'results', requestId, results: evaluateStageChecks(level, current, checks) });
    if (level.mode === 'maze') void run();
  },
  show: setView,
};

for (const tab of document.querySelectorAll<HTMLButtonElement>('[role="tab"]')) {
  tab.addEventListener('click', () => setView(tab.dataset['view'] as 'blocks' | 'stage' | 'code'));
}
$('run').addEventListener('click', () => void run());
$('stop').addEventListener('click', () => {
  player?.stop();
  $('stop').hidden = true;
  $('reset').hidden = false;
});
$('reset').addEventListener('click', () => player?.reset());

post({ type: 'ready' });
