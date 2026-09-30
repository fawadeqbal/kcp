import { z } from 'zod';

/** Content IDs: lowercase letters, digits and dashes, e.g. "builder-m01-l03-c1". */
const contentId = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'use lowercase letters, digits and dashes');

/** Text per language code; English is required, other languages fall back to it. */
const texts = z
  .record(z.string().regex(/^[a-z]{2}$/, 'language codes look like "en"'), z.string().min(1))
  .refine((value) => typeof value['en'] === 'string', 'needs an English ("en") text');

export const trackSchema = z
  .object({
    id: contentId,
    order: z.number().int().min(0),
    titles: texts,
  })
  .strict();

export const moduleSchema = z
  .object({
    id: contentId,
    order: z.number().int().min(0),
    titles: texts,
    descriptions: texts,
  })
  .strict();

const video = z
  .object({
    provider: z.enum(['youtube', 'cloudflare']),
    id: z.string().regex(/^[\w-]{4,64}$/, 'a video ID from the provider'),
  })
  .strict();

export const lessonSchema = z
  .object({
    id: contentId,
    order: z.number().int().min(0),
    xp: z.number().int().min(0).max(1000),
    isPremium: z.boolean().default(false),
    /** Optional video per language code. */
    video: z.record(z.string().regex(/^[a-z]{2}$/), video).optional(),
  })
  .strict();

const code = z
  .object({
    html: z.string().optional(),
    css: z.string().optional(),
    js: z.string().optional(),
    /** A Python program: on its own, never with web page files. */
    py: z.string().optional(),
  })
  .strict()
  .refine(
    (files) => Object.values(files).some((file) => file !== undefined),
    'needs at least one file',
  )
  .refine(
    (files) =>
      files.py === undefined || [files.html, files.css, files.js].every((f) => f === undefined),
    'a Python program (py) comes on its own, without html, css or js',
  );

const checkBase = {
  id: contentId,
  hint: z
    .string()
    .regex(/^[a-z0-9_]+$/, 'hint keys use lowercase letters, digits and _')
    .optional(),
};

const check = z.discriminatedUnion('expect', [
  z
    .object({
      ...checkBase,
      expect: z.literal('exists'),
      selector: z.string().min(1),
      min: z.number().int().min(0).optional(),
      max: z.number().int().min(0).optional(),
    })
    .strict(),
  z
    .object({
      ...checkBase,
      expect: z.literal('text'),
      selector: z.string().min(1),
      notEmpty: z.boolean().optional(),
      includes: z.string().optional(),
      equals: z.string().optional(),
      all: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      ...checkBase,
      expect: z.literal('attribute'),
      selector: z.string().min(1),
      name: z.string().min(1),
      notEmpty: z.boolean().optional(),
      includes: z.string().optional(),
      all: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      ...checkBase,
      expect: z.literal('css'),
      selector: z.string().min(1),
      property: z.string().min(1),
      includes: z.string().optional(),
    })
    .strict(),
  z
    .object({
      ...checkBase,
      expect: z.literal('test'),
      code: z.string().min(1),
    })
    .strict(),
  z
    .object({
      ...checkBase,
      expect: z.literal('output'),
      stdin: z.string().optional(),
      notEmpty: z.boolean().optional(),
      includes: z.string().optional(),
      equals: z.string().optional(),
      minLines: z.number().int().min(1).optional(),
    })
    .strict(),
  z
    .object({
      ...checkBase,
      expect: z.literal('python'),
      stdin: z.string().optional(),
      code: z.string().min(1),
    })
    .strict(),
]);

const PYTHON_CHECKS = new Set(['output', 'python']);

/** Python programs get Python checks (output, python); web pages get the others. */
const checksFitCode = (value: { starter: { py?: string }; checks: { expect: string }[] }) =>
  value.checks.every((c) => PYTHON_CHECKS.has(c.expect) === (value.starter.py !== undefined));
const CHECKS_FIT = 'Python programs use "output" and "python" checks; web pages use the others';

export const challengeSchema = z
  .object({
    id: contentId,
    order: z.number().int().min(0),
    type: z.enum(['html', 'css', 'js', 'python']),
    xp: z.number().int().min(0).max(1000),
    starter: code,
    /** Never sent to students; `check` proves it passes every check. */
    solution: code,
    checks: z.array(check).min(1),
  })
  .strict()
  .refine(
    (value) => new Set(value.checks.map((c) => c.id)).size === value.checks.length,
    'check IDs must be unique within a challenge',
  )
  .refine(
    (value) => (value.type === 'python') === (value.starter.py !== undefined),
    'Python challenges (type: python) have a py file, and only they do',
  )
  .refine(checksFitCode, CHECKS_FIT);

/** Text per language code for a quiz; English is required, others fall back to it. */
const quizText = texts;

const quizOption = z
  .object({
    /** A short ID the answer refers to, e.g. "a". */
    id: z.string().regex(/^[a-z0-9]{1,8}$/, 'option IDs are short, e.g. "a"'),
    /** Shown as code, the same in every language… */
    code: z.string().min(1).max(200).optional(),
    /** …or as text, translated. */
    text: quizText.optional(),
  })
  .strict()
  .refine((o) => (o.code === undefined) !== (o.text === undefined), 'an option has code or text');

/**
 * quizzes/<name>.yaml: a short question that works on a phone. The server grades
 * it, so the answer never reaches the app.
 * - order:  put the lines of `code` (given in the right order here) back in order;
 * - bug:    which line of `code` has the mistake (`bugLine`, counting from 1);
 * - output: what `code` shows (`options`, one `answer`);
 * - choice: a question about the lesson (`options`, one `answer`; `code` optional).
 */
export const quizSchema = z
  .object({
    id: contentId,
    order: z.number().int().min(0),
    kind: z.enum(['order', 'bug', 'output', 'choice']),
    xp: z.number().int().min(0).max(50).default(5),
    /** How the code is shown (syntax colours). */
    language: z.enum(['html', 'css', 'js', 'python']).optional(),
    prompt: quizText,
    code: z.array(z.string().max(120)).max(14).optional(),
    bugLine: z.number().int().min(1).optional(),
    options: z.array(quizOption).max(6).optional(),
    answer: z.string().optional(),
    /** Shown after answering: why the answer is right. */
    explanation: quizText,
  })
  .strict()
  .superRefine((quiz, ctx) => {
    const problem = (message: string) => ctx.addIssue({ code: 'custom', message });
    const lines = quiz.code ?? [];
    if (lines.length > 0 && !quiz.language) problem('quizzes with code need a "language"');
    switch (quiz.kind) {
      case 'order':
        if (lines.length < 3) problem('an order quiz needs at least 3 lines of code');
        if (new Set(lines.map((line) => line.trim())).size < 2) {
          problem('the lines of an order quiz must not all be the same');
        }
        if (quiz.options || quiz.answer || quiz.bugLine) {
          problem(
            'an order quiz has only code (in the right order): no options, answer or bugLine',
          );
        }
        break;
      case 'bug':
        if (lines.length < 2) problem('a bug quiz needs at least 2 lines of code');
        if (!quiz.bugLine || quiz.bugLine > lines.length) {
          problem('"bugLine" must be the number of a line in the code (from 1)');
        }
        if (quiz.options || quiz.answer) problem('a bug quiz has no options or answer');
        break;
      case 'output':
      case 'choice': {
        if (quiz.kind === 'output' && lines.length === 0) problem('an output quiz needs code');
        const options = quiz.options ?? [];
        if (options.length < 2) problem('needs at least 2 options');
        if (new Set(options.map((o) => o.id)).size !== options.length) {
          problem('option IDs must be unique');
        }
        if (!options.some((o) => o.id === quiz.answer)) {
          problem('"answer" must be the ID of one of the options');
        }
        if (quiz.bugLine) problem('only bug quizzes have a "bugLine"');
        break;
      }
    }
  });

/** project.yaml: the project at the end of a module. */
export const projectSchema = z
  .object({
    id: contentId,
    xp: z.number().int().min(0).max(1000).default(100),
    /** Premium projects need a trial, a plan or premium given by our team. */
    isPremium: z.boolean().default(false),
    starter: code,
    /** Never sent to students; `check` proves it meets every requirement. */
    solution: code,
    checks: z.array(check).min(1),
  })
  .strict()
  .refine(
    (value) => new Set(value.checks.map((c) => c.id)).size === value.checks.length,
    'check IDs must be unique within a project',
  )
  .refine(checksFitCode, CHECKS_FIT);

/**
 * What each check looks at, in a few words ("The heading has a colour"), by check ID.
 * The lesson shows them as a checklist that ticks as the student's code passes.
 */
const checkLabels = z.record(z.string(), z.string().min(1).max(80)).default({});

/** Front matter of project.<lang>.md */
export const projectFrontMatter = z
  .object({
    title: z.string().min(1).max(120),
    summary: z.string().min(1).max(300),
    hints: z.record(z.string(), z.string().min(1)).default({}),
    checks: checkLabels,
  })
  .strict();

/** Front matter of explain.<lang>.md */
export const explainFrontMatter = z
  .object({
    title: z.string().min(1).max(120),
    summary: z.string().min(1).max(300),
  })
  .strict();

/** Front matter of challenges/<name>.<lang>.md */
export const challengeFrontMatter = z
  .object({
    title: z.string().min(1).max(120),
    hints: z.record(z.string(), z.string().min(1)).default({}),
    checks: checkLabels,
  })
  .strict();

export type TrackFile = z.infer<typeof trackSchema>;
export type ModuleFile = z.infer<typeof moduleSchema>;
export type LessonFile = z.infer<typeof lessonSchema>;
export type ChallengeFile = z.infer<typeof challengeSchema>;
export type QuizFile = z.infer<typeof quizSchema>;
export type ProjectFile = z.infer<typeof projectSchema>;
