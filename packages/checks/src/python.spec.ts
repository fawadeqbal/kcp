import { outputPasses, parsePythonError } from './python.js';

describe('outputPasses', () => {
  const check = { id: 'x', expect: 'output' as const };

  it('compares text ignoring case and extra spaces', () => {
    expect(outputPasses({ ...check, includes: 'hello ali' }, 'Hello   Ali!\n')).toBe(true);
    expect(outputPasses({ ...check, includes: 'hello sara' }, 'Hello Ali!\n')).toBe(false);
    expect(outputPasses({ ...check, equals: 'Hi\nthere' }, '  hi\n there \n')).toBe(true);
    expect(outputPasses({ ...check, equals: 'Hi' }, 'Hi there')).toBe(false);
  });

  it('needs output, and enough lines', () => {
    expect(outputPasses({ ...check, notEmpty: true }, '  \n')).toBe(false);
    expect(outputPasses({ ...check, notEmpty: true }, 'a')).toBe(true);
    expect(outputPasses({ ...check, minLines: 3 }, 'a\n\nb\n')).toBe(false);
    expect(outputPasses({ ...check, minLines: 3 }, 'a\nb\nc\n')).toBe(true);
  });
});

describe('parsePythonError', () => {
  it('finds the error and the line in the student’s file', () => {
    const traceback = [
      'Traceback (most recent call last):',
      '  File "/lib/python314.zip/_pyodide/_base.py", line 539, in eval_code',
      '  File "main.py", line 2, in <module>',
      '    print(y)',
      "NameError: name 'y' is not defined",
      '',
    ].join('\n');
    expect(parsePythonError(traceback, 'NameError')).toEqual({
      kind: 'runtime',
      name: 'NameError',
      message: "NameError: name 'y' is not defined",
      line: 2,
    });
  });

  it('tells syntax mistakes and missing input apart', () => {
    const syntax = parsePythonError(
      '  File "main.py", line 1\n    print("hi"\n         ^\nSyntaxError: \'(\' was never closed\n',
    );
    expect(syntax).toMatchObject({ kind: 'syntax', name: 'SyntaxError', line: 1 });
    expect(
      parsePythonError('File "main.py", line 4\nEOFError: EOF when reading a line'),
    ).toMatchObject({ kind: 'input', name: 'EOFError', line: 4 });
  });
});
