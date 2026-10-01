'use client';

import type { components } from '@kcp/api-client-ts';
import { freshAccessToken } from '@/lib/api';

type Workspace = components['schemas']['WorkspaceDto'];

/** Files a team edits: text only, a few levels deep, nothing inside .git. */
const SKIP = new Set(['.git']);
const MAX_DEPTH = 3;

export interface ChangedFile {
  path: string;
  change: 'added' | 'modified' | 'deleted';
}

export interface TeamRepo {
  /** The files in the working folder, sorted. */
  files(): Promise<string[]>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  remove(path: string): Promise<void>;
  /** Files that differ from the branch's latest commit. */
  changes(): Promise<ChangedFile[]>;
  /** Stages every change and commits it. */
  commit(message: string): Promise<string>;
  /** Sends the branch to the team's repository. */
  push(): Promise<void>;
  /** Brings the team's latest main into the branch. */
  update(): Promise<'up-to-date' | 'updated' | 'conflict'>;
  /** The branch's latest commits. */
  log(): Promise<{ oid: string; message: string; author: string; at: Date }[]>;
  /** Commits on the branch that aren't on the team's repository yet. */
  unpushed(): Promise<number>;
  branch: string;
}

async function headers(): Promise<Record<string, string>> {
  const token = await freshAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * The team's repository in the browser: isomorphic-git over the API's git proxy, with
 * the files kept in IndexedDB (lightning-fs), one store per team. Loaded only on the
 * workspace page.
 */
export async function openTeamRepo(workspace: Workspace): Promise<TeamRepo> {
  const [{ Buffer }, gitModule, httpModule, fsModule] = await Promise.all([
    import('buffer'),
    import('isomorphic-git'),
    import('isomorphic-git/http/web'),
    import('@isomorphic-git/lightning-fs'),
  ]);
  // isomorphic-git expects Node's Buffer.
  (globalThis as { Buffer?: unknown }).Buffer ??= Buffer;
  const git = gitModule;
  const http = httpModule.default;
  const FS = fsModule.default;
  const fs = new FS(`kcp-team-${workspace.teamId}`);
  const pfs = fs.promises;
  const dir = '/repo';
  const url = workspace.gitUrl;
  const author = { name: workspace.author.name, email: workspace.author.email };
  const branch = workspace.branch;

  const exists = async (path: string) => {
    try {
      await pfs.stat(path);
      return true;
    } catch {
      return false;
    }
  };

  if (!(await exists(`${dir}/.git`))) {
    await git.clone({ fs, http, dir, url, ref: 'main', headers: await headers() });
  } else {
    await git
      .fetch({ fs, http, dir, remote: 'origin', headers: await headers() })
      .catch(() => undefined);
  }
  const current = await git.currentBranch({ fs, dir });
  if (current !== branch) {
    const local = await git.listBranches({ fs, dir });
    const remote = await git.listBranches({ fs, dir, remote: 'origin' });
    if (local.includes(branch)) await git.checkout({ fs, dir, ref: branch });
    else if (remote.includes(branch))
      await git.checkout({ fs, dir, ref: branch, remote: 'origin' });
    else await git.branch({ fs, dir, ref: branch, checkout: true });
  }

  async function walk(path: string, depth: number): Promise<string[]> {
    const found: string[] = [];
    for (const name of await pfs.readdir(path)) {
      if (SKIP.has(name)) continue;
      const full = `${path}/${name}`;
      const stat = await pfs.stat(full);
      if (stat.isDirectory()) {
        if (depth < MAX_DEPTH) found.push(...(await walk(full, depth + 1)));
      } else {
        found.push(full.slice(dir.length + 1));
      }
    }
    return found;
  }

  async function ensureDirs(path: string) {
    const parts = path.split('/').slice(0, -1);
    let at = dir;
    for (const part of parts) {
      at += `/${part}`;
      if (!(await exists(at))) await pfs.mkdir(at);
    }
  }

  return {
    branch,
    files: async () => (await walk(dir, 0)).toSorted(),
    read: async (path) => (await pfs.readFile(`${dir}/${path}`, { encoding: 'utf8' })) as string,
    write: async (path, content) => {
      await ensureDirs(path);
      await pfs.writeFile(`${dir}/${path}`, content, 'utf8');
    },
    remove: async (path) => {
      await pfs.unlink(`${dir}/${path}`);
    },
    changes: async () => {
      const matrix = await git.statusMatrix({ fs, dir });
      return matrix.flatMap(([path, head, work]) => {
        if (head === work) return [];
        const change: ChangedFile['change'] =
          head === 0 ? 'added' : work === 0 ? 'deleted' : 'modified';
        return [{ path: String(path), change }];
      });
    },
    commit: async (message) => {
      const matrix = await git.statusMatrix({ fs, dir });
      for (const [path, head, work, stage] of matrix) {
        if (head === work && work === stage) continue;
        if (work === 0) await git.remove({ fs, dir, filepath: String(path) });
        else await git.add({ fs, dir, filepath: String(path) });
      }
      return git.commit({ fs, dir, message, author });
    },
    push: async () => {
      const result = await git.push({
        fs,
        http,
        dir,
        remote: 'origin',
        ref: branch,
        remoteRef: branch,
        headers: await headers(),
        force: false,
      });
      if (!result.ok) throw new Error(result.error ?? 'push failed');
    },
    update: async () => {
      await git.fetch({
        fs,
        http,
        dir,
        remote: 'origin',
        ref: 'main',
        singleBranch: true,
        headers: await headers(),
      });
      try {
        const result = await git.merge({
          fs,
          dir,
          ours: branch,
          theirs: 'remotes/origin/main',
          author,
          message: 'Get the latest from main',
        });
        if (result.alreadyMerged) return 'up-to-date';
        await git.checkout({ fs, dir, ref: branch, force: true });
        return 'updated';
      } catch (error) {
        if ((error as { code?: string }).code === 'MergeConflictError') return 'conflict';
        throw error;
      }
    },
    log: async () => {
      const commits = await git.log({ fs, dir, ref: branch, depth: 20 });
      return commits.map((c) => ({
        oid: c.oid,
        message: c.commit.message.trim(),
        author: c.commit.author.name,
        at: new Date(c.commit.author.timestamp * 1000),
      }));
    },
    unpushed: async () => {
      const local = await git.resolveRef({ fs, dir, ref: branch });
      let remote: string | null = null;
      try {
        remote = await git.resolveRef({ fs, dir, ref: `refs/remotes/origin/${branch}` });
      } catch {
        remote = null;
      }
      if (remote === local) return 0;
      const commits = await git.log({ fs, dir, ref: branch, depth: 50 });
      const index = remote ? commits.findIndex((c) => c.oid === remote) : -1;
      if (index >= 0) return index;
      const main = await git
        .resolveRef({ fs, dir, ref: 'refs/remotes/origin/main' })
        .catch(() => null);
      const mainIndex = main ? commits.findIndex((c) => c.oid === main) : -1;
      return mainIndex >= 0 ? mainIndex : commits.length;
    },
  };
}

/** The files a team page is made of, for the preview. */
export function pageFiles(files: Record<string, string>) {
  return {
    html: files['index.html'] ?? '',
    css: files['style.css'] ?? '',
    js: files['script.js'] ?? '',
  };
}
