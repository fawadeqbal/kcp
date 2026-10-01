import { MENTOR_CODE_OF_CONDUCT_VERSION } from '@kcp/database';
import { BadRequestException } from '@nestjs/common';
import { filterProblem } from '../chat/chat-filter.js';
import type { PrismaService } from '../database/prisma.service.js';
import type { EventSubmissionDto, RubricItemDto } from './events.dto.js';

// Shared by the events services (kept apart so they don't import each other).

/** Students see events once staff open them. */
export const VISIBLE_STATUSES = ['OPEN', 'RUNNING', 'JUDGING', 'FINISHED'] as const;
export const DEFAULT_RUBRIC: RubricItemDto[] = [
  { key: 'idea', label: 'Idea', max: 5 },
  { key: 'code', label: 'Code', max: 5 },
  { key: 'design', label: 'Design', max: 5 },
  { key: 'teamwork', label: 'Teamwork', max: 5 },
];

export const DEFAULT_STARTER: Record<string, string> = {
  'index.html': [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="utf-8">',
    '    <title>Our project</title>',
    '    <link rel="stylesheet" href="style.css">',
    '  </head>',
    '  <body>',
    '    <h1>Our project</h1>',
    '    <p>What does it do? Write it here.</p>',
    '    <script src="script.js"></script>',
    '  </body>',
    '</html>',
    '',
  ].join('\n'),
  'style.css': 'body {\n  font-family: system-ui, sans-serif;\n  padding: 16px;\n}\n',
  'script.js': '// Make your page do something here.\n',
  'README.md': '# Our project\n\nWhat we are building, and how we split the work.\n',
};

export const submissionOf = (
  submission: {
    title: string;
    description: string;
    commit: string | null;
    submittedAt: Date;
  } | null,
): EventSubmissionDto | null =>
  submission
    ? {
        title: submission.title,
        description: submission.description,
        commit: submission.commit,
        submittedAt: submission.submittedAt,
      }
    : null;

/** Free text children write in events (team names, pull requests): the room filter. */
export function assertKind(text: string, error = 'TEXT_BLOCKED') {
  const problem = filterProblem(text);
  if (problem) {
    throw new BadRequestException({
      error,
      message: 'This can’t be used. Try saying it another way.',
      details: { reason: problem },
    });
  }
}

/** Mentors who may mentor teams or judge: background check passed, active, code of conduct signed. */
export const READY_MENTOR = {
  role: { key: 'mentor' },
  status: 'ACTIVE' as const,
  mentorProfile: {
    backgroundCheck: 'PASSED' as const,
    isActive: true,
    codeOfConductVersion: MENTOR_CODE_OF_CONDUCT_VERSION,
  },
};

/**
 * Checked on every use, not only when staff assign them: a mentor whose check failed or
 * who was paused loses access to teams and judging at once.
 */
export async function isReadyMentor(prisma: PrismaService, userId: string): Promise<boolean> {
  return (await prisma.user.count({ where: { id: userId, ...READY_MENTOR } })) > 0;
}
