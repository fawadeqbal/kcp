/**
 * Builds the sandbox into dist/: the runner (with the agent and the Python worker
 * inlined), the static files, Pyodide (dist/pyodide/<version>/ and a manifest the
 * web app reads), and a _headers file with the security headers for static hosts
 * (Cloudflare Pages, Netlify). Set SANDBOX_FRAME_ANCESTORS to the web app's origin.
 */
import { copyFile, cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import {
  frameAncestorsFromEnv,
  originFromEnv,
  portfolioHeaders,
  pyodideHeaders,
  sandboxHeaders,
} from './headers.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const require = createRequire(import.meta.url);

/** One rule of a _headers file: a path pattern and its headers. */
const block = (pattern, headers) => [
  pattern,
  ...Object.entries(headers).map(([name, value]) => `  ${name}: ${value}`),
];

/** Pyodide's files the web app downloads for the runner (see PythonRuntimeFiles). */
const PYODIDE_FILES = {
  asm: 'pyodide.asm.js',
  wasm: 'pyodide.asm.wasm',
  stdlib: 'python_stdlib.zip',
  lock: 'pyodide-lock.json',
};
/** The global the classic-script build of pyodide.asm.mjs sets (see python-worker.ts). */
const PYODIDE_ASM_GLOBAL = '__kcpPyodideAsm';

/**
 * Copies Pyodide into dist/pyodide/<version>/ and writes dist/pyodide/manifest.json.
 * Its runtime ships as an ES module, but a sandboxed page (opaque origin) can only
 * start classic workers from blob: URLs, so it is rebuilt as a classic script.
 */
async function copyPyodide() {
  const packageDir = path.dirname(require.resolve('pyodide/package.json'));
  const { version } = JSON.parse(await readFile(path.join(packageDir, 'package.json'), 'utf8'));
  const target = path.join(dist, 'pyodide', version);
  await mkdir(target, { recursive: true });
  await build({
    entryPoints: [path.join(packageDir, 'pyodide.asm.mjs')],
    outfile: path.join(target, PYODIDE_FILES.asm),
    format: 'iife',
    globalName: PYODIDE_ASM_GLOBAL,
    minify: true,
    target: 'es2022',
    platform: 'browser',
    // Only used to name files, which the worker hands over itself.
    define: { 'import.meta.url': '"https://pyodide.invalid/pyodide.asm.js"' },
    logLevel: 'error',
  });
  for (const [key, name] of Object.entries(PYODIDE_FILES)) {
    if (key !== 'asm') await copyFile(path.join(packageDir, name), path.join(target, name));
  }
  const files = {};
  for (const [key, name] of Object.entries(PYODIDE_FILES)) {
    const { size } = await stat(path.join(target, name));
    files[key] = { path: `pyodide/${version}/${name}`, size };
  }
  await writeFile(
    path.join(dist, 'pyodide', 'manifest.json'),
    `${JSON.stringify({ version, files }, null, 2)}\n`,
  );
  return version;
}

/** The public portfolio page's texts, from the app's translations (en, ar, ur). */
async function portfolioMessages() {
  const dir = path.resolve(root, '../../packages/i18n/messages');
  const result = {};
  for (const language of ['en', 'ar', 'ur']) {
    const all = JSON.parse(await readFile(path.join(dir, `${language}.json`), 'utf8'));
    result[language] = {
      ...all.shared,
      shippedOn: all.portfolio.shippedOn,
      previewTitle: all.portfolio.previewTitle,
      run: all.lesson.runProgram,
      pythonInput: all.lesson.pythonInput,
      fullScreen: all.lesson.fullScreen,
      exitFullScreen: all.lesson.exitFullScreen,
      play: all.explorer.play,
      stop: all.explorer.stop,
      // The stage's texts keep their {placeholders}: the stage fills them in.
      ...Object.fromEntries(
        Object.entries(all.explorer.stage).map(([key, value]) => [`stage.${key}`, value]),
      ),
    };
  }
  return result;
}

export async function buildSandbox({ minify = true } = {}) {
  const common = { bundle: true, format: 'iife', target: 'es2020', minify, legalComments: 'none' };
  const agent = await build({
    ...common,
    entryPoints: [path.join(root, 'src/agent.ts')],
    write: false,
  });
  const agentSource = agent.outputFiles[0].text;

  const worker = await build({
    ...common,
    target: 'es2022',
    entryPoints: [path.join(root, 'src/python-worker.ts')],
    define: {
      PYODIDE_ASM_GLOBAL: JSON.stringify(PYODIDE_ASM_GLOBAL),
      'import.meta.url': '"https://pyodide.invalid/pyodide.mjs"',
    },
    // Pyodide's loader imports these only when it runs in Node.
    external: ['node:*', 'ws'],
    logLevel: 'error',
    write: false,
  });
  const workerSource = worker.outputFiles[0].text;

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  await build({
    ...common,
    entryPoints: [path.join(root, 'src/runner.ts')],
    outfile: path.join(dist, 'runner.js'),
    define: {
      AGENT_SOURCE: JSON.stringify(agentSource),
      PYTHON_WORKER_SOURCE: JSON.stringify(workerSource),
    },
  });
  const apiOrigin = originFromEnv('SANDBOX_API_URL', 'http://localhost:3000');
  await build({
    ...common,
    entryPoints: [path.join(root, 'src/portfolio.ts')],
    outfile: path.join(dist, 'portfolio.js'),
    define: {
      PORTFOLIO_API_URL: JSON.stringify(apiOrigin),
      PORTFOLIO_WEB_URL: JSON.stringify(originFromEnv('SANDBOX_WEB_URL', 'http://localhost:3001')),
      PORTFOLIO_MESSAGES: JSON.stringify(await portfolioMessages()),
    },
  });
  await cp(path.join(root, 'public'), dist, { recursive: true });
  const pyodideVersion = await copyPyodide();

  // Each path gets one set of headers (static hosts would combine overlapping rules).
  const sandbox = sandboxHeaders(frameAncestorsFromEnv());
  const portfolio = portfolioHeaders(apiOrigin);
  const lines = [
    ...['/', '/index.html', '/runner.js', '/robots.txt', '/images/*'].flatMap((p) =>
      block(p, sandbox),
    ),
    ...['/portfolio', '/portfolio/*', '/portfolio.js'].flatMap((p) => block(p, portfolio)),
    ...block('/pyodide/manifest.json', { ...sandbox, ...pyodideHeaders(false) }),
    ...block(`/pyodide/${pyodideVersion}/*`, { ...sandbox, ...pyodideHeaders(true) }),
  ];
  await writeFile(path.join(dist, '_headers'), `${lines.join('\n')}\n`);
  return { agentBytes: agentSource.length, workerBytes: workerSource.length, pyodideVersion };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { agentBytes, workerBytes, pyodideVersion } = await buildSandbox();
  console.info(
    `Sandbox built in dist/ (agent ${Math.round(agentBytes / 1024)} KB, Python worker ${Math.round(workerBytes / 1024)} KB, Pyodide ${pyodideVersion})`,
  );
}
