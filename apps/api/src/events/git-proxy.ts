import { gunzipSync } from 'node:zlib';

export interface RefUpdate {
  old: string;
  new: string;
  ref: string;
}

const ZERO = /^0{40}$/;

/**
 * The ref updates at the start of a `git-receive-pack` request (pkt-lines up to the
 * first flush): "<old> <new> <ref>", the first with capabilities after a NUL. Null
 * when the request can't be read.
 */
export function refUpdates(body: Buffer, encoding?: string): RefUpdate[] | null {
  let data = body;
  try {
    if (encoding === 'gzip') data = gunzipSync(body);
  } catch {
    return null;
  }
  const updates: RefUpdate[] = [];
  let pos = 0;
  while (pos + 4 <= data.length) {
    const length = Number.parseInt(data.subarray(pos, pos + 4).toString('ascii'), 16);
    if (Number.isNaN(length)) return null;
    if (length === 0) return updates;
    if (length < 4 || pos + length > data.length) return null;
    const line = data
      .subarray(pos + 4, pos + length)
      .toString('utf8')
      .split('\0')[0]!
      .replace(/\n$/, '');
    pos += length;
    const [oldId, newId, ref] = line.split(' ');
    if (!oldId || !newId || !ref) continue;
    updates.push({ old: oldId, new: newId, ref });
  }
  return null;
}

/**
 * Which updates may be pushed: branches only (refs/heads/…), never `main` (it changes
 * through pull requests), and nothing deleted. With `ownBranch` (a student), only that
 * branch. Returns the first refused ref.
 */
export function refusedUpdate(
  updates: RefUpdate[],
  ownBranch: string | null = null,
): string | null {
  for (const update of updates) {
    if (!update.ref.startsWith('refs/heads/')) return update.ref;
    if (update.ref === 'refs/heads/main') return update.ref;
    if (ZERO.test(update.new)) return update.ref;
    if (ownBranch !== null && update.ref !== `refs/heads/${ownBranch}`) return update.ref;
  }
  return null;
}
