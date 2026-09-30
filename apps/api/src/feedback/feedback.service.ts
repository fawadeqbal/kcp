import { HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { safePagePath } from '../common/log-url.js';
import { RateLimiterService } from '../common/rate-limit/rate-limiter.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import { BadgesService } from '../progress/badges.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type {
  CreateFeedbackDto,
  FeedbackItemDto,
  FeedbackListDto,
  FeedbackQueryDto,
  FeedbackStatusValue,
} from './dto/feedback.dto.js';

const PER_HOUR = 10;
const PER_DAY = 30;

const include = {
  user: {
    select: {
      id: true,
      displayName: true,
      role: { select: { key: true } },
      studentProfile: { select: { nickname: true } },
    },
  },
} as const;

/** The in-app feedback button: families write, staff read. */
@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limiter: RateLimiterService,
    private readonly audit: AuditService,
    private readonly badges: BadgesService,
  ) {}

  async create(dto: CreateFeedbackDto, user: AuthUser): Promise<{ id: string }> {
    for (const [name, max, window] of [
      ['feedback-user-hour', PER_HOUR, 60 * 60],
      ['feedback-user-day', PER_DAY, 24 * 60 * 60],
    ] as const) {
      const result = await this.limiter.consume(name, user.id, max, window);
      if (!result.allowed) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            error: 'TOO_MANY_REQUESTS',
            message: 'Thanks! You have sent a lot of feedback today. Please try again later.',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
    const account = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { languageCode: true },
    });
    const created = await this.prisma.feedback.create({
      data: {
        userId: user.id,
        kind: dto.kind,
        message: dto.message,
        pagePath: dto.pagePath ? safePagePath(dto.pagePath) : null,
        languageCode: dto.languageCode ?? account.languageCode,
      },
      select: { id: true },
    });
    return created;
  }

  private toDto(row: Awaited<ReturnType<typeof this.find>>): FeedbackItemDto {
    return {
      id: row.id,
      kind: row.kind,
      message: row.message,
      pagePath: row.pagePath,
      languageCode: row.languageCode,
      status: row.status,
      createdAt: row.createdAt,
      sender: row.user
        ? {
            id: row.user.id,
            roleKey: row.user.role.key,
            name: row.user.studentProfile?.nickname ?? row.user.displayName,
          }
        : null,
    };
  }

  private find(id: string) {
    return this.prisma.feedback.findUniqueOrThrow({ where: { id }, include });
  }

  async list(query: FeedbackQueryDto): Promise<FeedbackListDto> {
    const where = query.status ? { status: query.status } : {};
    const [rows, total, unread] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.count({ where: { status: 'NEW' } }),
    ]);
    return {
      items: rows.map((row) => this.toDto(row)),
      total,
      page: query.page,
      pageSize: query.pageSize,
      unread,
    };
  }

  async setStatus(
    id: string,
    status: FeedbackStatusValue,
    staff: AuthUser,
    ctx: RequestContext,
  ): Promise<FeedbackItemDto> {
    const existing = await this.prisma.feedback.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Feedback not found.');
    await this.prisma.$transaction(async (tx) => {
      await tx.feedback.update({ where: { id }, data: { status } });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'feedback.status',
          entityType: 'Feedback',
          entityId: id,
          before: { status: existing.status },
          after: { status },
          context: ctx,
        },
        tx,
      );
    });
    // A student whose report was handled earns the "Bug hunter" badge.
    if (status === 'DONE' && existing.userId) await this.badges.check(existing.userId);
    return this.toDto(await this.find(id));
  }
}
