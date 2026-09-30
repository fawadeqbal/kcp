import {
  grade,
  lineIds,
  pickPractice,
  rightAnswer,
  seededRandom,
  shuffledLines,
  type StoredQuiz,
} from './quiz-rules.js';

const key = Buffer.from('test-key');

const order: StoredQuiz = {
  id: 'builder-m01-l01-q1',
  kind: 'ORDER',
  code: ['<body>', '  <h1>Hello</h1>', '</body>'],
  optionIds: [],
  answer: {},
};

describe('ORDER quizzes', () => {
  const ids = lineIds(key, order);

  it('gives every line an ID that only the server can work out', () => {
    expect(new Set(ids).size).toBe(3);
    expect(ids.every((id) => /^[a-f0-9]{12}$/.test(id))).toBe(true);
    expect(lineIds(Buffer.from('another key'), order)).not.toEqual(ids);
  });

  it('never hands out the lines already in order', () => {
    for (let i = 0; i < 50; i++) {
      const lines = shuffledLines(order.code, ids);
      expect(lines.map((l) => l.text)).not.toEqual(order.code);
      expect(lines.map((l) => l.id).toSorted()).toEqual([...ids].toSorted());
    }
    // Even when the random numbers would leave them in order.
    const noShuffle = shuffledLines(order.code, ids, (max) => max - 1);
    expect(noShuffle.map((l) => l.text)).not.toEqual(order.code);
  });

  it('grades the order the student sends back', () => {
    expect(grade(order, { order: ids }, ids)).toBe('correct');
    expect(grade(order, { order: [ids[1]!, ids[0]!, ids[2]!] }, ids)).toBe('wrong');
    expect(grade(order, { order: [ids[0]!, ids[1]!] }, ids)).toBe('invalid');
    expect(grade(order, { order: [ids[0]!, ids[0]!, ids[1]!] }, ids)).toBe('invalid');
    expect(grade(order, { order: [ids[0]!, ids[1]!, 'abcdefabcdef'] }, ids)).toBe('invalid');
    expect(grade(order, {}, ids)).toBe('invalid');
  });

  it('counts indentation (Python), but not spaces at the end of a line', () => {
    const python: StoredQuiz = {
      ...order,
      code: ['for i in range(3):', '    print(i)', 'print(i)'],
    };
    const pyIds = lineIds(key, python);
    expect(grade(python, { order: [pyIds[0]!, pyIds[2]!, pyIds[1]!] }, pyIds)).toBe('wrong');
    const trailing: StoredQuiz = { ...order, code: ['<p>', 'Hi ', '</p>'] };
    const trailingIds = lineIds(key, trailing);
    expect(grade(trailing, { order: trailingIds }, trailingIds)).toBe('correct');
  });

  it('treats lines with the same text as the same line', () => {
    const twin: StoredQuiz = { ...order, code: ['<ul>', '<li>x</li>', '<li>x</li>', '</ul>'] };
    const twinIds = lineIds(key, twin);
    const swapped = [twinIds[0]!, twinIds[2]!, twinIds[1]!, twinIds[3]!];
    expect(grade(twin, { order: swapped }, twinIds)).toBe('correct');
    expect(rightAnswer(twin, twinIds)).toEqual({ order: twinIds });
  });
});

describe('BUG, OUTPUT and CHOICE quizzes', () => {
  const bug: StoredQuiz = {
    id: 'q-bug',
    kind: 'BUG',
    code: ['<h1>Hi</h1>', '<p>Hi<p>'],
    optionIds: [],
    answer: { line: 2 },
  };
  const choice: StoredQuiz = {
    id: 'q-choice',
    kind: 'CHOICE',
    code: [],
    optionIds: ['a', 'b', 'c'],
    answer: { option: 'b' },
  };

  it('grades the line with the mistake', () => {
    expect(grade(bug, { line: 2 }, [])).toBe('correct');
    expect(grade(bug, { line: 1 }, [])).toBe('wrong');
    expect(grade(bug, { line: 3 }, [])).toBe('invalid');
    expect(grade(bug, { option: 'a' }, [])).toBe('invalid');
    expect(rightAnswer(bug, [])).toEqual({ line: 2 });
  });

  it('grades the chosen option', () => {
    expect(grade(choice, { option: 'b' }, [])).toBe('correct');
    expect(grade(choice, { option: 'a' }, [])).toBe('wrong');
    expect(grade(choice, { option: 'z' }, [])).toBe('invalid');
    expect(grade({ ...choice, kind: 'OUTPUT' }, { option: 'b' }, [])).toBe('correct');
    expect(rightAnswer(choice, [])).toEqual({ option: 'b' });
  });
});

describe('daily practice', () => {
  const candidates = [
    { id: 'q1', solved: true },
    { id: 'q2', solved: false },
    { id: 'q3', solved: true },
    { id: 'q4', solved: false },
    { id: 'q5', solved: false },
    { id: 'q6', solved: true },
  ];

  it('picks unsolved quizzes first, the same way all day', () => {
    const picked = pickPractice(candidates, 5, 'student:2026-10-01');
    expect(picked).toHaveLength(5);
    expect(picked.slice(0, 3).toSorted()).toEqual(['q2', 'q4', 'q5']);
    expect(pickPractice(candidates, 5, 'student:2026-10-01')).toEqual(picked);
    expect(pickPractice(candidates.slice(0, 2), 5, 'x')).toHaveLength(2);
  });

  it('uses a repeatable random source', () => {
    const a = seededRandom('seed');
    const b = seededRandom('seed');
    const values = Array.from({ length: 10 }, () => a(100));
    expect(Array.from({ length: 10 }, () => b(100))).toEqual(values);
    expect(values.every((v) => v >= 0 && v < 100)).toBe(true);
  });
});
