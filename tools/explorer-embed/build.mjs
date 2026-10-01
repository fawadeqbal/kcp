// Builds the Explorer page for the mobile app into apps/mobile/assets/explorer:
// index.html, explorer.js (Blockly and the stage, with the Explorer texts in every
// language), its licences, and the Blockly images it shows. Run after changing the
// blocks, the stage or their texts, and commit the result (the app ships it).
//
//   node tools/explorer-embed/build.mjs           # write
//   node tools/explorer-embed/build.mjs --check   # fail if the app's copy is out of date (CI)
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const target = path.resolve(here, '../../apps/mobile/assets/explorer');
const check = process.argv.includes('--check');
const out = check ? await mkdtemp(path.join(tmpdir(), 'explorer-')) : target;
const messagesDir = path.resolve(here, '../../packages/i18n/messages');
// The package folder (Blockly's exports don't include package.json or its media).
const blocklyDir = path.resolve(here, 'node_modules/blockly');
/** packages/checks PROGRAM_LIMITS.blocks, for the "too many blocks" text. */
const MAX_BLOCKS = 300;

async function messages() {
  const result = {};
  for (const language of ['en', 'ar', 'ur']) {
    const all = JSON.parse(await readFile(path.join(messagesDir, `${language}.json`), 'utf8'));
    const e = all.explorer;
    result[language] = {
      blocks: e.blocks,
      stage: e.stage,
      code: e.code,
      ui: {
        blocks: e.workspaceLabel,
        stage: e.stageTitle,
        code: e.codeTab,
        run: e.run,
        stop: e.stop,
        startOver: e.startOver,
        codeHelp: e.codeHelp,
        tooMany: e.tooManyBlocks.replace('{max}', String(MAX_BLOCKS)),
      },
    };
  }
  return result;
}

const HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:">
<title>Explorer</title>
<style>
:root{--bg:#f5ead8;--surface:#ebddc5;--ink:#201e1d;--muted:#645c50;--primary:#1c6b62;--on-primary:#fffaf3;--line:rgba(32,30,29,.14)}
body.dark{--bg:#1a1815;--surface:#25221e;--ink:#f2e8d8;--muted:#b9ae9c;--primary:#5cc4b5;--on-primary:#1a1815;--line:rgba(242,232,216,.13)}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);font-family:system-ui,sans-serif;overflow:hidden;-webkit-tap-highlight-color:transparent}
#app{display:flex;flex-direction:column;height:100%}
.tabs{display:flex;gap:4px;padding:8px;background:var(--surface)}
.tabs button{flex:1;min-height:44px;border:0;border-radius:999px;background:transparent;color:var(--muted);font:inherit;font-weight:700;font-size:15px}
.tabs button[aria-selected="true"]{background:var(--bg);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.15)}
main{position:relative;flex:1;min-height:0;display:flex}
#blocks-pane,#stage-pane,#code-pane{position:relative;flex:1;min-width:0;min-height:0;display:none;flex-direction:column}
#blocks{position:absolute;inset:0}
body[data-view="blocks"] #blocks-pane,body[data-view="stage"] #stage-pane,body[data-view="code"] #code-pane{display:flex}
#stage-pane{padding:12px;gap:12px;background:var(--surface)}
#stage{flex:1;min-height:0}
.buttons{display:flex;flex-wrap:wrap;gap:10px}
.buttons button{min-height:48px;padding:0 22px;border-radius:999px;font:inherit;font-weight:800;font-size:16px;border:2px solid var(--primary);background:transparent;color:var(--primary)}
.buttons #run{background:var(--primary);color:var(--on-primary)}
#code-pane{padding:12px;gap:10px;overflow:auto}
#code-pane p{margin:0;color:var(--muted)}
#code-text{margin:0;padding:12px;border-radius:16px;background:var(--surface);direction:ltr;text-align:left;font:14px/1.6 ui-monospace,Menlo,monospace;white-space:pre-wrap}
#too-many{position:absolute;inset-inline:8px;bottom:8px;margin:0;padding:8px 12px;border-radius:12px;background:#fbe8c4;color:#6b4508;font-weight:700}
/* Tablets on their side: blocks and Bit's world next to each other. */
@media (min-width:820px){
  .tabs button[data-view="stage"]{display:none}
  body[data-view="blocks"] #stage-pane,body[data-view="stage"] #blocks-pane,body[data-view="stage"] #stage-pane{display:flex}
  #stage-pane{flex:0 0 42%}
}
</style>
</head>
<body data-view="blocks">
<div id="app">
  <div class="tabs" role="tablist">
    <button id="tab-blocks" role="tab" data-view="blocks" aria-selected="true" aria-controls="blocks-pane">Blocks</button>
    <button id="tab-stage" role="tab" data-view="stage" aria-selected="false" aria-controls="stage-pane" tabindex="-1">Stage</button>
    <button id="tab-code" role="tab" data-view="code" aria-selected="false" aria-controls="code-pane" tabindex="-1">Code</button>
  </div>
  <main>
    <section id="blocks-pane" role="tabpanel" aria-labelledby="tab-blocks"><div id="blocks"></div><p id="too-many" role="alert" hidden></p></section>
    <section id="stage-pane" role="tabpanel" aria-labelledby="tab-stage">
      <div id="stage"></div>
      <div class="buttons"><button id="run" type="button">Run</button><button id="stop" type="button" hidden>Stop</button><button id="reset" type="button">Start over</button></div>
    </section>
    <section id="code-pane" role="tabpanel" aria-labelledby="tab-code"><p id="code-help"></p><pre id="code-text"></pre></section>
  </main>
</div>
<script src="explorer.js"></script>
</body>
</html>
`;

const MEDIA = [
  '1x1.gif',
  'delete-icon.svg',
  'dropdown-arrow.svg',
  'foldout-icon.svg',
  'handclosed.cur',
  'handdelete.cur',
  'handopen.cur',
  'resize-handle.svg',
  'sprites.svg',
];

await rm(out, { recursive: true, force: true });
await mkdir(path.join(out, 'media'), { recursive: true });
await build({
  entryPoints: [path.join(here, 'src/main.ts')],
  outfile: path.join(out, 'explorer.js'),
  bundle: true,
  format: 'iife',
  target: ['chrome100', 'safari15'],
  minify: true,
  legalComments: 'linked',
  define: { EXPLORER_MESSAGES: JSON.stringify(await messages()) },
});
await writeFile(path.join(out, 'index.html'), HTML);
await writeFile(
  path.join(out, 'LICENSES.md'),
  "# Licences\n\nexplorer.js includes Blockly (https://github.com/google/blockly), © Google LLC, under the Apache License 2.0. The files in media/ are Blockly's, under the same licence.\n",
);
for (const file of MEDIA) {
  await copyFile(path.join(blocklyDir, 'media', file), path.join(out, 'media', file));
}
/** Every file under a folder, as relative paths. */
async function files(dir, prefix = '') {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = path.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...(await files(path.join(dir, entry.name), name)));
    else result.push(name);
  }
  return result.toSorted();
}

if (check) {
  const built = await files(out);
  const committed = await files(target).catch(() => []);
  const stale = built.filter((file) => !committed.includes(file));
  for (const file of built) {
    if (stale.includes(file)) continue;
    const [a, b] = await Promise.all([
      readFile(path.join(out, file)),
      readFile(path.join(target, file)),
    ]);
    if (!a.equals(b)) stale.push(file);
  }
  stale.push(...committed.filter((file) => !built.includes(file)));
  await rm(out, { recursive: true, force: true });
  if (stale.length > 0) {
    console.error(
      `The Explorer page in apps/mobile/assets/explorer is out of date (${stale.join(', ')}).\n` +
        'Run: pnpm --filter @kcp/explorer-embed build',
    );
    process.exit(1);
  }
  console.log('The Explorer page in apps/mobile/assets/explorer is up to date.');
} else {
  console.log(`Explorer page built in ${path.relative(process.cwd(), out)}`);
}
