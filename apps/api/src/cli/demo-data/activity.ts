import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Prisma } from '@kcp/database';
import { CODE_FILE_KEYS } from '@kcp/shared';
import { activeContent, openLesson } from '../../learning/content.js';
import { PRACTICE_SIZE, PRACTICE_XP } from '../../learning/quiz.service.js';
import { pickPractice, REVEAL_AFTER_WRONG } from '../../learning/quiz-rules.js';
import type { BadgesService } from '../../progress/badges.service.js';
import type { ProgressService } from '../../progress/progress.service.js';
import { localDay } from '../../progress/xp-rules.js';
import { PROJECT_FILE_NAMES } from '../../projects/projects.service.js';
import type { StorageService } from '../../storage/storage.service.js';
import type { Pattern } from './cast.js';
import type { DemoChild, DemoContext, DemoFamily, PremiumCalendar } from './context.js';
import { asDate, DAY_MS, plusMinutes, type Rng } from './timeline.js';

type Files = Record<string, string>;
type Tx = Prisma.TransactionClient;

interface ChallengeInfo {
  id: string;
  xp: number;
  starter: Files;
  checks: { id: string }[];
  solution: Files;
}

interface LessonInfo {
  id: string;
  moduleId: string;
  isPremium: boolean;
  xp: number;
  challenges: ChallengeInfo[];
  quizzes: { id: string; xp: number }[];
}

interface BriefInfo {
  id: string;
  moduleId: string;
  xp: number;
  isPremium: boolean;
  starter: Files;
  solution: Files;
  titles: Record<string, string>;
}

interface ModuleInfo {
  id: string;
  titles: Prisma.JsonValue;
  trackTitles: Prisma.JsonValue;
  lessons: LessonInfo[];
  brief: BriefInfo | null;
}

export interface Catalog {
  lessons: LessonInfo[];
  modules: ModuleInfo[];
}

/** Solutions from content/ (the database never has them), by challenge or project ID. */
async function loadSolutions(contentDir: string): Promise<Map<string, Files>> {
  const { parse } = await import('yaml');
  const solutions = new Map<string, Files>();
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      const challenge = entry.name.endsWith('.yaml') && path.basename(dir) === 'challenges';
      if (!challenge && entry.name !== 'project.yaml') continue;
      const data = parse(await readFile(full, 'utf8')) as { id?: string; solution?: Files };
      if (data.id && data.solution) solutions.set(data.id, data.solution);
    }
  }
  await walk(contentDir);
  return solutions;
}

/** The lessons, quizzes and projects students can open, in learning order. */
export async function loadCatalog(ctx: DemoContext, contentDir: string): Promise<Catalog> {
  const solutions = await loadSolutions(contentDir).catch((error: Error) => {
    throw new Error(`Could not read the lesson files in ${contentDir}: ${error.message}`);
  });
  const rows = await ctx.prisma.lesson.findMany({
    where: openLesson,
    orderBy: [
      { module: { track: { sortOrder: 'asc' } } },
      { module: { sortOrder: 'asc' } },
      { sortOrder: 'asc' },
    ],
    include: {
      challenges: { where: activeContent, orderBy: { sortOrder: 'asc' } },
      quizzes: { where: activeContent, orderBy: { sortOrder: 'asc' } },
      module: {
        select: {
          id: true,
          titles: true,
          track: { select: { titles: true } },
          projectBrief: { include: { translations: true } },
        },
      },
    },
  });
  const lessons: LessonInfo[] = rows.map((row) => ({
    id: row.id,
    moduleId: row.moduleId,
    isPremium: row.isPremium,
    xp: row.xp,
    challenges: row.challenges.map((c) => {
      const solution = solutions.get(c.id);
      if (!solution) throw new Error(`No solution for ${c.id} in content/.`);
      return {
        id: c.id,
        xp: c.xp,
        starter: c.starter as Files,
        checks: c.checks as { id: string }[],
        solution,
      };
    }),
    quizzes: row.quizzes.map((q) => ({ id: q.id, xp: q.xp })),
  }));
  const modules: ModuleInfo[] = [];
  for (const row of rows) {
    if (modules.some((m) => m.id === row.moduleId)) continue;
    const brief = row.module.projectBrief;
    const solution = brief ? solutions.get(brief.id) : undefined;
    modules.push({
      id: row.moduleId,
      titles: row.module.titles,
      trackTitles: row.module.track.titles,
      lessons: lessons.filter((l) => l.moduleId === row.moduleId),
      brief:
        brief?.isActive && solution
          ? {
              id: brief.id,
              moduleId: brief.moduleId,
              xp: brief.xp,
              isPremium: brief.isPremium,
              starter: brief.starter as Files,
              solution,
              titles: Object.fromEntries(brief.translations.map((t) => [t.languageCode, t.title])),
            }
          : null,
    });
  }
  return { lessons, modules };
}

// ── How often, and how much ─────────────────────────────────────────────────

/** Whether a child learns on a day, `n` days after joining. */
function learnsOn(pattern: Pattern, n: number, weekday: number, country: string, rng: Rng) {
  // Friday and Saturday are the weekend in Egypt; Saturday and Sunday in Pakistan.
  const weekend =
    country === 'EG' ? weekday === 5 || weekday === 6 : weekday === 6 || weekday === 0;
  switch (pattern) {
    case 'star':
      return n === 0 || rng.chance(0.94);
    case 'steady':
      return n === 0 || rng.chance(0.72);
    case 'weekend':
      return n === 0 || rng.chance(weekend ? 0.85 : 0.1);
    case 'faded':
      return n === 0 || (n < 16 ? rng.chance(0.75) : rng.chance(0.02));
    case 'returning':
      return n === 0 || (n < 12 ? rng.chance(0.75) : n < 27 ? false : rng.chance(0.8));
    case 'new':
      return n === 0 || rng.chance(0.85);
    case 'idle':
      return n === 0;
  }
}

/** Steps (a challenge, a lesson's quizzes, a project step) in one sitting. */
const EFFORT: Record<Pattern, [number, number]> = {
  star: [1, 3],
  steady: [1, 2],
  weekend: [1, 4],
  faded: [1, 2],
  returning: [1, 2],
  new: [1, 3],
  idle: [1, 1],
};

/** Some days are practice only (a few minutes on the phone), with no new lesson work. */
const LESSON_CHANCE: Record<Pattern, number> = {
  star: 0.75,
  steady: 0.5,
  weekend: 0.75,
  faded: 0.6,
  returning: 0.55,
  new: 0.85,
  idle: 1,
};

const PRACTICE_CHANCE: Record<Pattern, number> = {
  star: 0.92,
  steady: 0.7,
  weekend: 0.6,
  faded: 0.5,
  returning: 0.65,
  new: 0.8,
  idle: 0,
};

// ── One student ─────────────────────────────────────────────────────────────

export interface Services {
  progress: ProgressService;
  badges: BadgesService;
  storage: StorageService;
}

export interface SimulationResult {
  certificates: { id: string; childId: string }[];
  storageWarning: string | null;
}

type Step =
  | { kind: 'challenge'; lesson: LessonInfo; challenge: ChallengeInfo }
  | { kind: 'quizzes'; lesson: LessonInfo }
  | { kind: 'project'; module: ModuleInfo; brief: BriefInfo };

/** A student's learning so far, kept in memory while their days are played out. */
class Learner {
  readonly started = new Set<string>();
  readonly completed = new Set<string>();
  readonly passed = new Set<string>();
  readonly solved = new Set<string>();
  readonly wrong = new Map<string, number>();
  readonly quizzesDone = new Set<string>();
  readonly projects = new Map<string, { id: string; shipped: boolean; version: number }>();
  readonly certificates = new Set<string>();
  /** The moment the current sitting has reached. */
  t = new Date(0);

  constructor(
    readonly child: DemoChild,
    readonly catalog: Catalog,
    readonly calendar: PremiumCalendar,
  ) {}

  premium(at = this.t) {
    return this.calendar.activeAt(this.child, at);
  }

  /** What to do next, or null when everything open to them is done. */
  nextStep(): Step | null {
    for (const module of this.catalog.modules) {
      for (const lesson of module.lessons) {
        if (lesson.isPremium && !this.premium()) return null;
        if (!this.completed.has(lesson.id)) {
          const challenge = lesson.challenges.find((c) => !this.passed.has(c.id));
          if (challenge) return { kind: 'challenge', lesson, challenge };
        }
        if (lesson.quizzes.length && !this.quizzesDone.has(lesson.id)) {
          return { kind: 'quizzes', lesson };
        }
      }
      const brief = module.brief;
      if (brief && !this.projects.get(brief.id)?.shipped) {
        if (brief.isPremium && !this.premium()) return null;
        return { kind: 'project', module, brief };
      }
    }
    return null;
  }

  tick(rng: Rng, min = 1, max = 4) {
    this.t = plusMinutes(this.t, rng.int(min, max + 1));
  }
}

/**
 * Plays out every child's days since they joined: lessons, "Check my code" attempts,
 * quizzes, daily practice and projects, each dated when it happened. XP goes through
 * the platform's own ProgressService (daily cap, streaks, freezes), and badges through
 * BadgesService after every day, then dated to that day.
 */
export async function simulateLearning(
  ctx: DemoContext,
  services: Services,
  catalog: Catalog,
  families: DemoFamily[],
  calendar: PremiumCalendar,
): Promise<SimulationResult> {
  const result: SimulationResult = { certificates: [], storageWarning: null };
  const children = families.flatMap((family) => family.children);
  for (const [index, child] of children.entries()) {
    const learner = new Learner(child, catalog, calendar);
    await playDays(ctx, services, learner, result);
    if ((index + 1) % 10 === 0) ctx.log(`  … ${index + 1} of ${children.length} students`);
  }
  return result;
}

async function playDays(
  ctx: DemoContext,
  services: Services,
  learner: Learner,
  result: SimulationResult,
) {
  const { child } = learner;
  const rng = ctx.rng;
  const firstDay = localDay(child.createdAt, child.timezone);
  const lastDay = localDay(ctx.clock.now, child.timezone);
  let n = 0;
  for (let day = firstDay; day <= lastDay; day = nextDay(day), n++) {
    const weekday = asDate(day).getUTCDay();
    if (!learnsOn(child.pattern, n, weekday, child.countryCode, rng)) continue;
    let start = ctx.clock.sessionStart(day, child.timezone, rng);
    if (!start) continue;
    if (start.getTime() <= child.createdAt.getTime()) start = plusMinutes(child.createdAt, 20);
    if (localDay(start, child.timezone) !== day) continue;
    if (start.getTime() > ctx.clock.cap(start).getTime()) continue;
    learner.t = start;
    const dayStart = Date.now();
    const certificates = await ctx.prisma.$transaction(
      (tx) => sitting(ctx, services, learner, tx, day, result),
      { timeout: 120_000, maxWait: 30_000 },
    );
    child.lastActive = learner.t;
    // Badges as the platform gives them, dated to this sitting.
    const earned = await services.badges.check(child.id);
    if (earned.length) await backdateBadges(ctx, child.id, earned, dayStart, learner.t);
    result.certificates.push(...certificates);
  }
  await leaveDraft(ctx, learner);
}

const nextDay = (day: string) =>
  new Date(asDate(day).getTime() + DAY_MS).toISOString().slice(0, 10);

/** Badges (and their notifications) given just now, dated to when they were earned. */
export async function backdateBadges(
  ctx: DemoContext,
  userId: string,
  keys: string[],
  since: number,
  at: Date,
) {
  await ctx.prisma.userBadge.updateMany({
    where: { userId, badgeKey: { in: keys } },
    data: { awardedAt: at },
  });
  await ctx.prisma.notification.updateMany({
    where: { userId, type: 'badge_earned', createdAt: { gte: new Date(since - 1000) } },
    data: { createdAt: at },
  });
}

/** One sitting: a few steps, then maybe today's practice. */
async function sitting(
  ctx: DemoContext,
  services: Services,
  learner: Learner,
  tx: Tx,
  day: string,
  result: SimulationResult,
): Promise<{ id: string; childId: string }[]> {
  const rng = ctx.rng;
  const { child } = learner;
  const certificates: { id: string; childId: string }[] = [];
  const latest = ctx.clock.cap(ctx.clock.now).getTime();
  const [min, max] = EFFORT[child.pattern];
  // The first sitting always opens a lesson.
  const lessonWork = learner.started.size === 0 || rng.chance(LESSON_CHANCE[child.pattern]);
  let steps = lessonWork ? rng.int(min, max + 1) : 0;
  // Practice first on some days (the app opens on it).
  const practiceFirst = rng.chance(0.4);
  if (practiceFirst && rng.chance(PRACTICE_CHANCE[child.pattern])) {
    await practice(ctx, services, learner, tx, day);
  }
  while (steps-- > 0 && learner.t.getTime() < latest) {
    const step = learner.nextStep();
    if (!step) {
      // Nothing new: a star sometimes improves a shipped project.
      await reship(ctx, services, learner, tx, result);
      break;
    }
    if (child.pattern === 'idle') {
      await tryOnce(ctx, learner, tx, step);
      break;
    }
    if (step.kind === 'challenge') await solveChallenge(ctx, services, learner, tx, step);
    else if (step.kind === 'quizzes') await lessonQuizzes(ctx, services, learner, tx, step.lesson);
    else {
      const certificate = await project(ctx, services, learner, tx, step, result);
      if (certificate) certificates.push(certificate);
    }
  }
  if (!practiceFirst && child.pattern !== 'idle' && rng.chance(PRACTICE_CHANCE[child.pattern])) {
    await practice(ctx, services, learner, tx, day);
  }
  return certificates;
}

async function startLesson(learner: Learner, tx: Tx, lessonId: string) {
  if (learner.started.has(lessonId)) return;
  learner.started.add(lessonId);
  await tx.lessonProgress.upsert({
    where: { userId_lessonId: { userId: learner.child.id, lessonId } },
    create: {
      userId: learner.child.id,
      lessonId,
      startedAt: learner.t,
      updatedAt: learner.t,
    },
    update: {},
  });
}

/** Code that isn't right yet: the starter with a first try added. */
function firstTry(starter: Files): Files {
  const files: Files = { ...starter };
  if (typeof files['html'] === 'string') files['html'] += '\n<p>trying things</p>\n';
  else if (typeof files['py'] === 'string') files['py'] += '\n# trying things\n';
  else if (typeof files['css'] === 'string') files['css'] += '\n/* trying things */\n';
  return files;
}

const failing = (checks: { id: string }[], rng: Rng) => {
  const right = rng.int(0, Math.max(1, checks.length));
  return checks.map((check, i) => ({ id: check.id, passed: i < right }));
};

async function solveChallenge(
  ctx: DemoContext,
  services: Services,
  learner: Learner,
  tx: Tx,
  step: { lesson: LessonInfo; challenge: ChallengeInfo },
) {
  const rng = ctx.rng;
  const userId = learner.child.id;
  const { lesson, challenge: c } = step;
  await startLesson(learner, tx, lesson.id);
  learner.tick(rng, 2, 6);
  const tries = rng.chance(0.55) ? 0 : rng.chance(0.75) ? 1 : 2;
  for (let i = 0; i < tries; i++) {
    await tx.submission.create({
      data: {
        userId,
        challengeId: c.id,
        code: firstTry(c.starter),
        passed: false,
        results: failing(c.checks, rng),
        createdAt: learner.t,
      },
    });
    learner.tick(rng, 1, 4);
  }
  await tx.submission.create({
    data: {
      userId,
      challengeId: c.id,
      code: c.solution,
      passed: true,
      results: c.checks.map((check) => ({ id: check.id, passed: true })),
      createdAt: learner.t,
    },
  });
  await tx.challengeDraft.upsert({
    where: { userId_challengeId: { userId, challengeId: c.id } },
    create: { userId, challengeId: c.id, code: c.solution, updatedAt: learner.t },
    update: { code: c.solution, updatedAt: learner.t },
  });
  await services.progress.award(tx, userId, 'CHALLENGE', c.id, c.xp, learner.t);
  learner.passed.add(c.id);
  if (lesson.challenges.every((x) => learner.passed.has(x.id))) {
    await tx.lessonProgress.update({
      where: { userId_lessonId: { userId, lessonId: lesson.id } },
      data: { status: 'COMPLETED', completedAt: learner.t, updatedAt: learner.t },
    });
    await services.progress.award(tx, userId, 'LESSON', lesson.id, lesson.xp, learner.t);
    learner.completed.add(lesson.id);
  }
}

/** Answers a quiz (wrong a few times, perhaps), as QuizService records it. */
async function answer(
  ctx: DemoContext,
  services: Services,
  learner: Learner,
  tx: Tx,
  quiz: { id: string; xp: number },
  lessonId: string,
) {
  const rng = ctx.rng;
  const userId = learner.child.id;
  const known = learner.solved.has(quiz.id);
  const wrong = known ? (rng.chance(0.9) ? 0 : 1) : rng.chance(0.65) ? 0 : rng.chance(0.7) ? 1 : 2;
  for (let i = 0; i < wrong; i++) {
    await tx.quizAttempt.create({
      data: { userId, quizId: quiz.id, correct: false, createdAt: learner.t },
    });
    learner.wrong.set(quiz.id, (learner.wrong.get(quiz.id) ?? 0) + 1);
    learner.tick(rng, 0, 1);
  }
  const shownBefore = (learner.wrong.get(quiz.id) ?? 0) >= REVEAL_AFTER_WRONG;
  await tx.quizAttempt.create({
    data: { userId, quizId: quiz.id, correct: true, createdAt: learner.t },
  });
  await startLesson(learner, tx, lessonId);
  if (!known && !shownBefore) {
    await services.progress.award(tx, userId, 'QUIZ', quiz.id, quiz.xp, learner.t);
  }
  learner.solved.add(quiz.id);
  learner.tick(rng, 0, 1);
}

async function lessonQuizzes(
  ctx: DemoContext,
  services: Services,
  learner: Learner,
  tx: Tx,
  lesson: LessonInfo,
) {
  learner.tick(ctx.rng, 1, 2);
  for (const quiz of lesson.quizzes) {
    await answer(ctx, services, learner, tx, quiz, lesson.id);
  }
  learner.quizzesDone.add(lesson.id);
}

/** Today's practice, picked like QuizService does, finished most days. */
async function practice(
  ctx: DemoContext,
  services: Services,
  learner: Learner,
  tx: Tx,
  day: string,
) {
  const rng = ctx.rng;
  const userId = learner.child.id;
  const premium = learner.premium();
  const open = learner.catalog.lessons.filter((lesson) => premium || !lesson.isPremium);
  const ids = open
    .filter((lesson) => learner.started.has(lesson.id))
    .flatMap((lesson) => lesson.quizzes.map((q) => q.id));
  for (const lesson of open) {
    if (ids.length >= PRACTICE_SIZE) break;
    if (!learner.started.has(lesson.id)) ids.push(...lesson.quizzes.map((q) => q.id));
  }
  const quizIds = pickPractice(
    ids.map((id) => ({ id, solved: learner.solved.has(id) })),
    PRACTICE_SIZE,
    `${userId}:${day}`,
  );
  if (quizIds.length === 0) return;
  const exists = await tx.practiceSession.findUnique({
    where: { userId_day: { userId, day: asDate(day) } },
  });
  if (exists) return;
  learner.tick(rng, 1, 3);
  await tx.practiceSession.create({
    data: { userId, day: asDate(day), quizIds, createdAt: learner.t },
  });
  const finish = rng.chance(0.9);
  const count = finish ? quizIds.length : rng.int(1, quizIds.length);
  for (const id of quizIds.slice(0, count)) {
    const lesson = learner.catalog.lessons.find((l) => l.quizzes.some((q) => q.id === id))!;
    await answer(
      ctx,
      services,
      learner,
      tx,
      lesson.quizzes.find((q) => q.id === id)!,
      lesson.id,
    );
  }
  if (finish) {
    await tx.practiceSession.update({
      where: { userId_day: { userId, day: asDate(day) } },
      data: { completedAt: learner.t },
    });
    await services.progress.award(tx, userId, 'PRACTICE', day, PRACTICE_XP, learner.t);
  }
}

/** Opened a lesson, tried once, left (an idle account). */
async function tryOnce(ctx: DemoContext, learner: Learner, tx: Tx, step: Step) {
  if (step.kind !== 'challenge') return;
  const userId = learner.child.id;
  await startLesson(learner, tx, step.lesson.id);
  learner.tick(ctx.rng, 3, 8);
  const code = firstTry(step.challenge.starter);
  await tx.submission.create({
    data: {
      userId,
      challengeId: step.challenge.id,
      code,
      passed: false,
      results: failing(step.challenge.checks, ctx.rng),
      createdAt: learner.t,
    },
  });
  await tx.challengeDraft.upsert({
    where: { userId_challengeId: { userId, challengeId: step.challenge.id } },
    create: { userId, challengeId: step.challenge.id, code, updatedAt: learner.t },
    update: { code, updatedAt: learner.t },
  });
}

/** Stores a shipped project's files like ProjectsService, in file storage. */
async function upload(
  services: Services,
  result: SimulationResult,
  folder: string,
  files: Files,
): Promise<Record<string, string>> {
  const keys: Record<string, string> = {};
  for (const key of CODE_FILE_KEYS) {
    const text = files[key];
    if (typeof text !== 'string') continue;
    keys[key] = `${folder}${PROJECT_FILE_NAMES[key]}`;
    if (result.storageWarning) continue;
    try {
      await services.storage.putText(keys[key], text, contentType(key));
    } catch (error) {
      result.storageWarning = (error as Error).message;
    }
  }
  return keys;
}

const contentType = (key: string) =>
  ({
    html: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8',
    js: 'text/javascript; charset=utf-8',
    py: 'text/x-python; charset=utf-8',
  })[key] ?? 'text/plain; charset=utf-8';

/** A project: a draft on one day, shipped on a later one (and a certificate, with premium). */
async function project(
  ctx: DemoContext,
  services: Services,
  learner: Learner,
  tx: Tx,
  step: { module: ModuleInfo; brief: BriefInfo },
  result: SimulationResult,
): Promise<{ id: string; childId: string } | null> {
  const { child } = learner;
  const { brief, module } = step;
  const existing = learner.projects.get(brief.id);
  learner.tick(ctx.rng, 5, 15);
  if (!existing) {
    const draft = await tx.project.create({
      data: {
        userId: child.id,
        briefId: brief.id,
        files: firstTry(brief.starter),
        createdAt: learner.t,
        updatedAt: learner.t,
      },
    });
    learner.projects.set(brief.id, { id: draft.id, shipped: false, version: 0 });
    return null;
  }

  const version = 1;
  const keys = await upload(
    services,
    result,
    `projects/${child.id}/${existing.id}/v${version}/`,
    brief.solution,
  );
  await tx.project.update({
    where: { id: existing.id },
    data: { files: brief.solution, status: 'SHIPPED', shippedAt: learner.t, updatedAt: learner.t },
  });
  await tx.portfolioItem.create({
    data: {
      userId: child.id,
      projectId: existing.id,
      moduleId: brief.moduleId,
      version,
      files: keys,
      publishedAt: learner.t,
      createdAt: learner.t,
    },
  });
  await services.progress.award(tx, child.id, 'PROJECT', brief.id, brief.xp, learner.t);
  learner.projects.set(brief.id, { id: existing.id, shipped: true, version });
  const parents = await tx.parentChildLink.findMany({
    where: { childId: child.id },
    select: { parentId: true },
  });
  await tx.notification.createMany({
    data: parents.map(({ parentId }) => ({
      userId: parentId,
      type: 'child_shipped',
      data: { childId: child.id, nickname: child.nickname, titles: brief.titles },
      createdAt: plusMinutes(learner.t, 1),
    })),
  });

  // Everything in the module done: the certificate (part of premium).
  const finished = module.lessons.every((lesson) => learner.completed.has(lesson.id));
  if (!finished || learner.certificates.has(module.id) || !learner.premium()) return null;
  learner.tick(ctx.rng, 2, 6);
  const certificate = await tx.certificate.create({
    data: {
      code: certificateCode(ctx.rng),
      userId: child.id,
      moduleId: module.id,
      nickname: child.nickname,
      moduleTitles: module.titles as Prisma.InputJsonValue,
      trackTitles: module.trackTitles as Prisma.InputJsonValue,
      issuedAt: learner.t,
    },
  });
  learner.certificates.add(module.id);
  const data = {
    certificateId: certificate.id,
    moduleTitles: module.titles as Prisma.InputJsonValue,
  };
  await tx.notification.createMany({
    data: [
      { userId: child.id, type: 'certificate_issued', data, createdAt: learner.t },
      ...parents.map(({ parentId }) => ({
        userId: parentId,
        type: 'child_certificate',
        data: { ...data, childId: child.id, nickname: child.nickname },
        createdAt: learner.t,
      })),
    ],
  });
  return { id: certificate.id, childId: child.id };
}

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const certificateCode = (rng: Rng) => {
  const part = () => Array.from({ length: 4 }, () => rng.pick([...CODE_ALPHABET])).join('');
  return `KCP-${part()}-${part()}`;
};

/** A star ships a better version of a project now and then (version 2). */
async function reship(
  ctx: DemoContext,
  services: Services,
  learner: Learner,
  tx: Tx,
  result: SimulationResult,
) {
  if (learner.child.pattern !== 'star' || !ctx.rng.chance(0.15)) return;
  const entry = [...learner.projects.entries()].find(([, p]) => p.shipped && p.version === 1);
  if (!entry) return;
  const [briefId, shipped] = entry;
  const brief = learner.catalog.modules.find((m) => m.brief?.id === briefId)?.brief;
  if (!brief) return;
  learner.tick(ctx.rng, 10, 25);
  const folder = `projects/${learner.child.id}/${shipped.id}/`;
  const keys = await upload(services, result, `${folder}v2/`, brief.solution);
  if (!result.storageWarning) {
    await services.storage.deletePrefix(folder, { keep: `${folder}v2/` }).catch(() => undefined);
  }
  await tx.project.update({
    where: { id: shipped.id },
    data: { shippedAt: learner.t, updatedAt: learner.t },
  });
  await tx.portfolioItem.update({
    where: { projectId: shipped.id },
    data: { version: 2, files: keys, publishedAt: learner.t },
  });
  learner.projects.set(briefId, { ...shipped, version: 2 });
}

/** Where the student stopped: an unfinished challenge keeps their last try as a draft. */
async function leaveDraft(ctx: DemoContext, learner: Learner) {
  const { child } = learner;
  if (!child.lastActive || child.pattern === 'idle' || !ctx.rng.chance(0.6)) return;
  learner.t = child.lastActive;
  const step = learner.nextStep();
  if (step?.kind !== 'challenge') return;
  const at = plusMinutes(child.lastActive, 3);
  await ctx.prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: child.id, lessonId: step.lesson.id } },
    create: { userId: child.id, lessonId: step.lesson.id, startedAt: at, updatedAt: at },
    update: {},
  });
  const code = firstTry(step.challenge.starter);
  await ctx.prisma.challengeDraft.upsert({
    where: { userId_challengeId: { userId: child.id, challengeId: step.challenge.id } },
    create: { userId: child.id, challengeId: step.challenge.id, code, updatedAt: at },
    update: { code, updatedAt: at },
  });
}
