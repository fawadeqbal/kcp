/**
 * Creates demo families on a LOCAL database, to click through the app: three parents
 * (English, Arabic, Urdu), four children, and some lesson progress. Safe to run again:
 * existing demo accounts keep their usernames and get their passwords reset.
 *
 *   pnpm demo:accounts
 *
 * Children are created through the same code as the parent dashboard (nickname rules,
 * usernames, consent records), and progress through the same code as "Check my code".
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createPrismaClient, ROLE_KEYS } from '@kcp/database';
import type { AvatarKey } from '@kcp/shared';
import { NestFactory } from '@nestjs/core';
import { config as loadEnv } from 'dotenv';
import { AppModule } from '../app.module.js';
import { TERMS_VERSION } from '../auth/auth.constants.js';
import { ChildrenService } from '../children/children.service.js';
import { hashPassword } from '../common/crypto/passwords.js';
import { LearningService } from '../learning/learning.service.js';
import type { AuthUser } from '../permissions/auth-user.js';

loadEnv({ path: path.resolve(process.cwd(), '../../.env'), quiet: true });

const PARENT_PASSWORD = 'demo password 123';
const CHILD_PASSWORD = 'kid pass 42';
const CONTENT_DIR = path.resolve(process.cwd(), '../../content');
/** Only databases on this computer (or the Docker Compose service). */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'postgres']);

interface DemoChild {
  nickname: string;
  avatarKey: AvatarKey;
  /** Lessons to finish (by position in the learning order), then one to leave started. */
  finish: number;
  start?: boolean;
}

interface DemoFamily {
  email: string;
  name: string;
  languageCode: 'en' | 'ar' | 'ur';
  countryCode: string;
  children: DemoChild[];
}

const FAMILIES: DemoFamily[] = [
  {
    email: 'parent.en@demo.test',
    name: 'Demo Parent (English)',
    languageCode: 'en',
    countryCode: 'PK',
    children: [
      { nickname: 'CometCoder', avatarKey: 'rocket', finish: 2, start: true },
      { nickname: 'PixelPanda', avatarKey: 'robot', finish: 0 },
    ],
  },
  {
    email: 'parent.ar@demo.test',
    name: 'Demo Parent (Arabic)',
    languageCode: 'ar',
    countryCode: 'EG',
    children: [{ nickname: 'StarBuilder', avatarKey: 'star', finish: 1 }],
  },
  {
    email: 'parent.ur@demo.test',
    name: 'Demo Parent (Urdu)',
    languageCode: 'ur',
    countryCode: 'PK',
    children: [{ nickname: 'MoonMaker', avatarKey: 'moon', finish: 0 }],
  },
];

function assertLocalDatabase() {
  const url = process.env.DATABASE_URL;
  let host = '';
  try {
    host = url ? new URL(url).hostname : '';
  } catch {
    host = '';
  }
  if (process.env.NODE_ENV === 'production' || !LOCAL_HOSTS.has(host)) {
    console.error(
      `Demo accounts are only for a local database (DATABASE_URL host is "${host || 'missing'}"). Nothing was changed.`,
    );
    process.exit(1);
  }
}

/** Solutions from content/, by challenge ID (they aren't stored in the database). */
async function loadSolutions(): Promise<Map<string, Record<string, string>>> {
  const { parse } = await import('yaml');
  const solutions = new Map<string, Record<string, string>>();
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.yaml') && path.basename(dir) === 'challenges') {
        const data = parse(await readFile(full, 'utf8')) as {
          id: string;
          solution: Record<string, string>;
        };
        solutions.set(data.id, data.solution);
      }
    }
  }
  try {
    await walk(CONTENT_DIR);
  } catch {
    // No content folder: families are still created, without progress.
  }
  return solutions;
}

assertLocalDatabase();

const prisma = createPrismaClient();
const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
const children = app.get(ChildrenService);
const learning = app.get(LearningService);
const ctx = { ip: undefined, userAgent: 'demo-accounts', requestId: undefined };

try {
  const [parentRole, studentRole, solutions] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { key: ROLE_KEYS.PARENT } }),
    prisma.role.findUniqueOrThrow({ where: { key: ROLE_KEYS.STUDENT } }),
    loadSolutions(),
  ]);
  const lessonOrder = await prisma.lesson.findMany({
    where: { isActive: true, module: { isActive: true, track: { isActive: true } } },
    orderBy: [
      { module: { track: { sortOrder: 'asc' } } },
      { module: { sortOrder: 'asc' } },
      { sortOrder: 'asc' },
    ],
    include: { challenges: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
  });
  const [parentHash, childHash] = await Promise.all([
    hashPassword(PARENT_PASSWORD),
    hashPassword(CHILD_PASSWORD),
  ]);
  const rows: string[][] = [];

  for (const family of FAMILIES) {
    // Parents: confirmed and active, as if they had clicked the email link.
    const parent = await prisma.user.upsert({
      where: { email: family.email },
      create: {
        kind: 'ADULT',
        status: 'ACTIVE',
        roleId: parentRole.id,
        email: family.email,
        emailVerifiedAt: new Date(),
        passwordHash: parentHash,
        displayName: family.name,
        languageCode: family.languageCode,
        countryCode: family.countryCode,
        termsVersion: TERMS_VERSION,
        termsAcceptedAt: new Date(),
      },
      update: {
        status: 'ACTIVE',
        passwordHash: parentHash,
        emailVerifiedAt: new Date(),
        displayName: family.name,
        languageCode: family.languageCode,
        countryCode: family.countryCode,
      },
    });
    rows.push([family.name, family.email, PARENT_PASSWORD, '']);
    const parentUser: AuthUser = {
      id: parent.id,
      sessionId: 'demo-accounts',
      roleId: parentRole.id,
      roleKey: ROLE_KEYS.PARENT,
      kind: 'ADULT',
      isStaff: false,
    };

    for (const demo of family.children) {
      const existing = await prisma.user.findFirst({
        where: {
          kind: 'STUDENT',
          status: { not: 'DELETED' },
          parentLinks: { some: { parentId: parent.id } },
          studentProfile: { nickname: demo.nickname },
        },
      });
      let child: { id: string; username: string };
      if (existing?.username) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', passwordHash: childHash },
        });
        child = { id: existing.id, username: existing.username };
      } else {
        const created = await children.create(
          {
            nickname: demo.nickname,
            avatarKey: demo.avatarKey,
            // The oldest year allowed today is always open (13+ for now).
            birthYear: new Date().getUTCFullYear() - 14,
            countryCode: family.countryCode,
            languageCode: family.languageCode,
            password: CHILD_PASSWORD,
            consents: { publicLeaderboards: false, publicPortfolio: false },
          },
          parentUser,
          ctx,
        );
        child = { id: created.id, username: created.username };
      }

      // Progress, the same way "Check my code" records it.
      const student: AuthUser = {
        id: child.id,
        sessionId: 'demo-accounts',
        roleId: studentRole.id,
        roleKey: ROLE_KEYS.STUDENT,
        kind: 'STUDENT',
        isStaff: false,
      };
      let done = 0;
      for (const lesson of lessonOrder.slice(0, demo.finish)) {
        const progress = await prisma.lessonProgress.findUnique({
          where: { userId_lessonId: { userId: child.id, lessonId: lesson.id } },
        });
        if (progress?.status !== 'COMPLETED') {
          for (const challenge of lesson.challenges) {
            const solution = solutions.get(challenge.id);
            if (!solution) continue;
            const checks = challenge.checks as { id: string }[];
            await learning.submit(
              challenge.id,
              solution,
              checks.map((check) => ({ id: check.id, passed: true })),
              student,
            );
          }
        }
        done++;
      }
      const next = lessonOrder[demo.finish];
      if (demo.start && next) await learning.start(next.id, student);
      const xp =
        (await prisma.studentProfile.findUnique({ where: { userId: child.id } }))?.xpTotal ?? 0;
      const note = done
        ? `${done} lesson(s) done${demo.start && next ? ', next one started' : ''}, ${xp} XP`
        : 'new';
      rows.push([
        `  ${demo.nickname} (child, ${family.languageCode})`,
        child.username,
        CHILD_PASSWORD,
        note,
      ]);
    }
  }

  const widths = [0, 1, 2].map((i) => Math.max(...rows.map((row) => row[i]?.length ?? 0)));
  console.info('\nDemo accounts (local database only):\n');
  for (const row of rows) {
    console.info(row.map((cell, i) => (i < 3 ? cell.padEnd(widths[i] ?? 0) : cell)).join('  '));
  }
  console.info(
    '\nParents log in at http://localhost:3001/en/login, children at http://localhost:3001/en/login/student.',
  );
  if (lessonOrder.length === 0) {
    console.info('No lessons in the database yet: run `pnpm content:import`, then this again.');
  }
} finally {
  await app.close();
  await prisma.$disconnect();
}
