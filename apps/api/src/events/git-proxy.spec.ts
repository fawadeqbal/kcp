import { gzipSync } from 'node:zlib';
import { refusedUpdate, refUpdates } from './git-proxy.js';

const pkt = (text: string) => `${(text.length + 4).toString(16).padStart(4, '0')}${text}`;
const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const Z = '0'.repeat(40);

describe('the git push checks', () => {
  it('reads the ref updates at the start of a push', () => {
    const body = Buffer.from(
      `${pkt(`${A} ${B} refs/heads/sara-1a2b\0report-status side-band-64k\n`)}${pkt(`${Z} ${B} refs/heads/idea\n`)}0000PACK…`,
    );
    const updates = refUpdates(body);
    expect(updates).toEqual([
      { old: A, new: B, ref: 'refs/heads/sara-1a2b' },
      { old: Z, new: B, ref: 'refs/heads/idea' },
    ]);
    expect(refusedUpdate(updates!)).toBeNull();
    expect(refUpdates(gzipSync(body), 'gzip')).toEqual(updates);
  });

  it('refuses main, deleting branches, tags and unreadable requests', () => {
    expect(refusedUpdate([{ old: A, new: B, ref: 'refs/heads/main' }])).toBe('refs/heads/main');
    expect(refusedUpdate([{ old: A, new: Z, ref: 'refs/heads/idea' }])).toBe('refs/heads/idea');
    expect(refusedUpdate([{ old: Z, new: B, ref: 'refs/tags/v1' }])).toBe('refs/tags/v1');
    expect(refUpdates(Buffer.from('zzzz'))).toBeNull();
    expect(refUpdates(Buffer.from(pkt(`${A} ${B} refs/heads/x\n`)))).toBeNull();
  });

  it('lets a student push their own branch only', () => {
    const own = [{ old: A, new: B, ref: 'refs/heads/sara-1a2b' }];
    const theirs = [{ old: A, new: B, ref: 'refs/heads/omar-9f9f' }];
    expect(refusedUpdate(own, 'sara-1a2b')).toBeNull();
    expect(refusedUpdate(theirs, 'sara-1a2b')).toBe('refs/heads/omar-9f9f');
    // The mentor (no own branch) may push any branch but main.
    expect(refusedUpdate(theirs, null)).toBeNull();
  });
});
