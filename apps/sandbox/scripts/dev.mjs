/** Builds the sandbox, serves it, and rebuilds when a source file changes. */
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSandbox } from './build.mjs';
import { serveSandbox } from './serve.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await buildSandbox({ minify: false });
serveSandbox();

let timer;
for (const dir of ['src', 'public', '../../packages/checks/dist']) {
  watch(path.join(root, dir), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      buildSandbox({ minify: false })
        .then(() => console.info('Sandbox rebuilt'))
        .catch((error) => console.error(error.message));
    }, 150);
  });
}
