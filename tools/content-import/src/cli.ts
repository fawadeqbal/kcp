#!/usr/bin/env node
/**
 * Lessons live in content/ as files; this tool checks them and writes them into
 * PostgreSQL.
 *
 *   pnpm content:check     validate every file and prove each challenge can be solved
 *   pnpm content:import    validate, then write everything into the database
 *
 * With --hold-new (staging and production), new modules are imported unpublished:
 * staff preview and publish them in the admin panel.
 */
import path from 'node:path';
import { createPrismaClient } from '@kcp/database';
import { config as loadEnv } from 'dotenv';
import { importContent } from './import.js';
import { type Issue, loadContent } from './load.js';

loadEnv({ path: path.resolve(process.cwd(), '../../.env'), quiet: true });

function report(issues: Issue[]): number {
  const errors = issues.filter((issue) => issue.level === 'error');
  const warnings = issues.filter((issue) => issue.level === 'warning');
  for (const issue of [...errors, ...warnings]) {
    const mark = issue.level === 'error' ? 'error  ' : 'warning';
    console.log(`${mark}  ${issue.file}: ${issue.message}`);
  }
  if (warnings.length) console.log(`${warnings.length} warning(s)`);
  return errors.length;
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const holdNew = args.includes('--hold-new');
  const [command, dir = 'content'] = args.filter((arg) => !arg.startsWith('--'));
  if (command !== 'check' && command !== 'import') {
    console.error('Usage: content-import <check|import> [content folder] [--hold-new]');
    process.exit(2);
  }
  const root = path.resolve(dir);
  const { tracks, issues } = await loadContent(root);
  if (command === 'check') {
    const { verifyContent } = await import('./verify.js');
    issues.push(...(await verifyContent(tracks, root)));
  }
  const errors = report(issues);
  const counts = tracks.reduce(
    (sum, track) => {
      for (const mod of track.modules) {
        if (mod.project) sum.projects++;
        sum.lessons += mod.lessons.length;
        sum.challenges += mod.lessons.reduce((n, lesson) => n + lesson.challenges.length, 0);
        sum.quizzes += mod.lessons.reduce((n, lesson) => n + lesson.quizzes.length, 0);
      }
      return sum;
    },
    { lessons: 0, challenges: 0, quizzes: 0, projects: 0 },
  );
  if (errors) {
    console.error(`${errors} error(s) in ${path.relative(process.cwd(), root) || root}`);
    process.exit(1);
  }
  if (command === 'check') {
    console.log(
      `Content OK: ${counts.lessons} lessons, ${counts.challenges} challenges, ${counts.quizzes} quizzes, ${counts.projects} project(s).`,
    );
    return;
  }
  const prisma = createPrismaClient();
  try {
    const summary = await importContent(prisma, tracks, { holdNew });
    console.log(
      `Imported ${summary.tracks} track(s), ${summary.modules} module(s), ${summary.lessons} lessons, ` +
        `${summary.challenges} challenges, ${summary.quizzes} quizzes, ${summary.projects} project(s); ` +
        `switched off ${summary.deactivated} removed item(s).`,
    );
    if (summary.newModules.length) {
      console.log(
        holdNew
          ? `New module(s) waiting to be published in Admin → Content: ${summary.newModules.join(', ')}`
          : `New module(s) published: ${summary.newModules.join(', ')}`,
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

await main();
