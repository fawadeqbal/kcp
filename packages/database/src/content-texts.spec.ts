import { canonicalJson, importDecision, textHash } from './content-texts.js';

describe('content texts', () => {
  it('gives the same hash whatever the key order', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
    expect(textHash({ title: 'Hi', hints: { b: 'x', a: 'y' } })).toBe(
      textHash({ hints: { a: 'y', b: 'x' }, title: 'Hi' }),
    );
    expect(textHash({ title: 'Hi' })).not.toBe(textHash({ title: 'Hello' }));
  });

  it('keeps studio work until the file itself changes', () => {
    const file = { title: 'From the file' };
    const studio = { title: 'Written in the studio' };
    expect(importDecision(null, file)).toBe('create');
    // Imported before, file unchanged: nothing to do, even if the studio published since.
    expect(
      importDecision({ source: 'STUDIO', importHash: textHash(file), data: studio }, file),
    ).toBe('keep');
    // Someone changed the file: it wins.
    expect(
      importDecision(
        { source: 'STUDIO', importHash: textHash({ title: 'older' }), data: studio },
        file,
      ),
    ).toBe('update');
    // The file now says what the studio published (content:export): only remember it.
    expect(importDecision({ source: 'STUDIO', importHash: null, data: studio }, studio)).toBe(
      'rehash',
    );
    expect(importDecision({ source: 'IMPORT', importHash: null, data: file }, file)).toBe('rehash');
  });
});
