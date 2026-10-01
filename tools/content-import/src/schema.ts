import {
  BLOCK_KINDS,
  DIRECTIONS,
  programProblem,
  readGrid,
  STAGE_MODES,
  STAGE_THEMES,
  type StageLevel,
} from '@kcp/checks';
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
    /** Ages the track is made for, e.g. [9, 12]: students of those ages see it first. */
    ages: z
      .tuple([z.number().int().min(5).max(18), z.number().int().min(5).max(18)])
      .refine(([from, to]) => from <= to, 'ages go from youngest to oldest')
      .optional(),
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

/** Skill keys (content/skills.yaml), e.g. "loops". */
const skillKey = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'use lowercase letters, digits and dashes');

/** Skill map groups (packages/shared SKILL_CATEGORIES). */
export const SKILL_CATEGORIES = ['logic', 'web', 'python', 'teamwork'] as const;

/** content/skills.yaml: every skill lessons can teach, for the skill map. */
export const skillsSchema = z
  .object({
    skills: z
      .array(
        z
          .object({
            key: skillKey,
            category: z.enum(SKILL_CATEGORIES),
            names: texts,
          })
          .strict(),
      )
      .min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    const keys = value.skills.map((skill) => skill.key);
    for (const key of new Set(keys.filter((k, i) => keys.indexOf(k) !== i))) {
      ctx.addIssue({ code: 'custom', message: `skill "${key}" is listed twice` });
    }
  });

export const lessonSchema = z
  .object({
    id: contentId,
    order: z.number().int().min(0),
    xp: z.number().int().min(0).max(1000),
    isPremium: z.boolean().default(false),
    /** What the lesson teaches (keys from content/skills.yaml). */
    skills: z.array(skillKey).max(5).default([]),
    /** Optional video per language code. */
    video: z.record(z.string().regex(/^[a-z]{2}$/), video).optional(),
  })
  .strict();

/**
 * A block program (Explorer), written as scripts: `- when: run` then `do:` a list of
 * blocks (`move: right`, `collect`, `repeat: 3` with `do:` …). Stored as JSON.
 */
const blocks = z
  .array(z.unknown())
  .superRefine((value, ctx) => {
    const problem = programProblem(value);
    if (problem) ctx.addIssue({ code: 'custom', message: `not a block program: ${problem}` });
  })
  .transform((value) => JSON.stringify(value));

/** A git action: a command line, a file written, or a file removed. */
const gitAction = z.union([
  z.object({ run: z.string().min(1).max(300) }).strict(),
  z.object({ write: z.string().min(1), content: z.string() }).strict(),
  z.object({ remove: z.string().min(1) }).strict(),
]);

/**
 * Git steps (Pro): what the student does, as a list of actions (`- run: git add .`,
 * `- write: index.html` with `content:`). Stored as JSON. The starter is usually `[]`.
 */
const gitSteps = z
  .array(gitAction)
  .max(400)
  .transform((value) => JSON.stringify(value));

const code = z
  .object({
    html: z.string().optional(),
    css: z.string().optional(),
    js: z.string().optional(),
    /** A Python program: on its own, never with web page files. */
    py: z.string().optional(),
    /** A block program: on its own too. */
    blocks: blocks.optional(),
    /** Git steps: on their own too. */
    git: gitSteps.optional(),
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
  )
  .refine(
    (files) => files.blocks === undefined || Object.keys(files).length === 1,
    'a block program (blocks) comes on its own',
  )
  .refine(
    (files) => files.git === undefined || Object.keys(files).length === 1,
    'git steps (git) come on their own',
  );

/** The practice repository a git challenge starts with (see GitSetup in packages/checks). */
const repo = z
  .object({
    /** The folder's files at the start. */
    files: z.record(z.string().regex(/^[\w.-]+(?:\/[\w.-]+){0,3}$/), z.string().max(20_000)),
    /** Steps already taken before the student starts (e.g. an existing history). */
    setup: z.array(gitAction).max(100).optional(),
  })
  .strict();

/** The level of a block challenge or project (see StageLevel in packages/checks). */
const stage = z
  .object({
    mode: z.enum(STAGE_MODES),
    map: z.array(z.string()).min(2).max(12),
    toolbox: z.array(z.enum(BLOCK_KINDS)).min(1),
    theme: z.enum(STAGE_THEMES).optional(),
    seconds: z.number().int().min(10).max(120).optional(),
  })
  .strict()
  .superRefine((level, ctx) => {
    try {
      readGrid(level as StageLevel);
    } catch (error) {
      ctx.addIssue({ code: 'custom', message: (error as Error).message });
    }
  });

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
  z
    .object({
      ...checkBase,
      expect: z.literal('stage'),
      keys: z.array(z.enum(DIRECTIONS)).max(100).optional(),
      seed: z.number().int().min(0).optional(),
      atGoal: z.boolean().optional(),
      endsAt: z.tuple([z.number().int().min(0), z.number().int().min(0)]).optional(),
      gemsLeft: z.number().int().min(0).optional(),
      minScore: z.number().int().optional(),
      said: z.string().min(1).optional(),
      noBump: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      ...checkBase,
      expect: z.literal('git'),
      initialized: z.boolean().optional(),
      commits: z.number().int().min(1).optional(),
      branches: z.array(z.string().min(1)).min(1).optional(),
      onBranch: z.string().min(1).optional(),
      committed: z.array(z.string().min(1)).min(1).optional(),
      contains: z
        .object({ path: z.string().min(1), text: z.string().min(1) })
        .strict()
        .optional(),
      clean: z.boolean().optional(),
      staged: z.array(z.string().min(1)).min(1).optional(),
      merged: z.string().min(1).optional(),
      mergeCommit: z.boolean().optional(),
      resolved: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      ...checkBase,
      expect: z.literal('blocks'),
      uses: z.array(z.enum(BLOCK_KINDS)).min(1).optional(),
      maxBlocks: z.number().int().min(1).optional(),
      minBlocks: z.number().int().min(1).optional(),
    })
    .strict(),
]);

const PYTHON_CHECKS = new Set(['output', 'python']);
const STAGE_CHECKS = new Set(['stage', 'blocks']);
const GIT_CHECKS = new Set(['git']);

/**
 * Python programs get Python checks (output, python), block programs stage checks
 * (stage, blocks), and web pages the others.
 */
const checksFitCode = (value: {
  starter: { py?: string; blocks?: string; git?: string };
  checks: { expect: string }[];
}) =>
  value.checks.every(
    (c) =>
      PYTHON_CHECKS.has(c.expect) === (value.starter.py !== undefined) &&
      STAGE_CHECKS.has(c.expect) === (value.starter.blocks !== undefined) &&
      GIT_CHECKS.has(c.expect) === (value.starter.git !== undefined),
  );
const CHECKS_FIT =
  'Python programs use "output" and "python" checks, block programs "stage" and "blocks", git steps "git"; web pages use the others';

/** Git steps need a practice repository (repo), and only they have one. */
const repoFitsCode = (value: { starter: { git?: string }; repo?: unknown }) =>
  (value.starter.git !== undefined) === (value.repo !== undefined);
const REPO_FITS = 'git steps (git) need a "repo", and only they have one';

/** Block programs need a stage (level), and only they have one. */
const stageFitsCode = (value: { starter: { blocks?: string }; stage?: unknown }) =>
  (value.starter.blocks !== undefined) === (value.stage !== undefined);
const STAGE_FITS = 'block programs (blocks) need a "stage", and only they have one';

export const challengeSchema = z
  .object({
    id: contentId,
    order: z.number().int().min(0),
    type: z.enum(['html', 'css', 'js', 'python', 'blocks', 'git']),
    xp: z.number().int().min(0).max(1000),
    starter: code,
    /** Never sent to students; `check` proves it passes every check. */
    solution: code,
    checks: z.array(check).min(1),
    /** Block challenges: the level. */
    stage: stage.optional(),
    /** Git challenges: the practice repository. */
    repo: repo.optional(),
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
  .refine(
    (value) => (value.type === 'blocks') === (value.starter.blocks !== undefined),
    'block challenges (type: blocks) have a blocks program, and only they do',
  )
  .refine(
    (value) => (value.type === 'git') === (value.starter.git !== undefined),
    'git challenges (type: git) have git steps, and only they do',
  )
  .refine(checksFitCode, CHECKS_FIT)
  .refine(stageFitsCode, STAGE_FITS)
  .refine(repoFitsCode, REPO_FITS);

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
    /** Block projects (Explorer): the level. */
    stage: stage.optional(),
  })
  .strict()
  .refine(
    (value) => new Set(value.checks.map((c) => c.id)).size === value.checks.length,
    'check IDs must be unique within a project',
  )
  .refine(checksFitCode, CHECKS_FIT)
  .refine(stageFitsCode, STAGE_FITS);

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
export type SkillsFile = z.infer<typeof skillsSchema>;
export type ChallengeFile = z.infer<typeof challengeSchema>;
export type QuizFile = z.infer<typeof quizSchema>;
export type ProjectFile = z.infer<typeof projectSchema>;
