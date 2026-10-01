import type { Prisma } from '@kcp/database';
import type { PrismaService } from '../database/prisma.service.js';

export interface ReviewRequest {
  studentId: string;
  projectId: string;
  version: number;
  /** The code as shipped. */
  files: Prisma.InputJsonObject;
  languageCode: string;
}

/**
 * Asks a mentor to review a premium student's shipped project. A project has one open
 * review at a time: a newer version replaces the one still waiting, and a review a
 * mentor is already doing is left alone (the next ship after it asks again).
 */
export async function requestProjectReview(
  prisma: PrismaService,
  request: ReviewRequest,
): Promise<'created' | 'updated' | 'in-review'> {
  const open = await prisma.review.findFirst({
    where: { projectId: request.projectId, status: { in: ['WAITING', 'IN_REVIEW'] } },
    select: { id: true, status: true },
  });
  if (open?.status === 'IN_REVIEW') return 'in-review';
  if (open) {
    await prisma.review.update({
      where: { id: open.id },
      data: { version: request.version, files: request.files, languageCode: request.languageCode },
    });
    return 'updated';
  }
  try {
    await prisma.review.create({
      data: {
        kind: 'PROJECT',
        studentId: request.studentId,
        projectId: request.projectId,
        version: request.version,
        files: request.files,
        languageCode: request.languageCode,
      },
    });
    return 'created';
  } catch (error) {
    // Asked at the same moment by another request: one open review is enough.
    if ((error as { code?: string }).code === 'P2002') return 'updated';
    throw error;
  }
}
