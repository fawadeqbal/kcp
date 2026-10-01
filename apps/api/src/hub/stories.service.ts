import type { HubStory, Prisma } from '@kcp/database';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type {
  CreateStoryDto,
  HubStoryDto,
  PublicHubStatsDto,
  PublicStoryDto,
  UpdateStoryDto,
} from './dto/stories.dto.js';
import { PayoutsService } from './payouts.service.js';

const STORY_INCLUDE = {
  student: { select: { studentProfile: { select: { nickname: true } } } },
} satisfies Prisma.HubStoryInclude;
type LoadedStory = Prisma.HubStoryGetPayload<{ include: typeof STORY_INCLUDE }>;

const storyNotFound = () =>
  new NotFoundException({ error: 'STORY_NOT_FOUND', message: 'No such story.' });

/**
 * Hub stories for the marketing site, and the hub in numbers. Staff write a story; a
 * parent says yes (or no); only then can staff publish it, and the parent can take it
 * back at any time. First names only.
 */
@Injectable()
export class HubStoriesService {
  private readonly logger = new Logger(HubStoriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payouts: PayoutsService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
  ) {}

  private dto(story: LoadedStory): HubStoryDto {
    return {
      id: story.id,
      studentId: story.studentId,
      childNickname: story.student.studentProfile?.nickname ?? '',
      projectId: story.projectId,
      languageCode: story.languageCode,
      firstName: story.firstName,
      headline: story.headline,
      body: story.body,
      status: story.status,
      parentAnsweredAt: story.parentAnsweredAt,
      publishedAt: story.publishedAt,
      createdAt: story.createdAt,
    };
  }

  // ── Staff ────────────────────────────────────────────────────────────────

  async list(): Promise<HubStoryDto[]> {
    const rows = await this.prisma.hubStory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: STORY_INCLUDE,
    });
    return rows.map((row) => this.dto(row));
  }

  async create(staff: AuthUser, dto: CreateStoryDto, ctx: RequestContext): Promise<HubStoryDto> {
    const earned = await this.prisma.hubEarning.count({ where: { studentId: dto.studentId } });
    if (!earned) {
      throw new BadRequestException({
        error: 'NO_HUB_WORK',
        message: 'Stories are about students who finished paid hub work.',
      });
    }
    if (dto.projectId) {
      const worked = await this.prisma.hubTask.count({
        where: { projectId: dto.projectId, assigneeId: dto.studentId, status: 'DONE' },
      });
      if (!worked)
        throw new BadRequestException({
          error: 'NOT_THEIR_PROJECT',
          message: 'The student didn’t work on that project.',
        });
    }
    const parentId = await this.payouts.payee(dto.studentId);
    if (!parentId) {
      throw new ConflictException({ error: 'NO_PARENT', message: 'No parent to ask.' });
    }
    const story = await this.prisma.hubStory.create({
      data: {
        studentId: dto.studentId,
        parentId,
        projectId: dto.projectId ?? null,
        languageCode: dto.languageCode,
        firstName: dto.firstName.trim(),
        headline: dto.headline.trim(),
        body: dto.body.trim(),
        createdById: staff.id,
      },
      include: STORY_INCLUDE,
    });
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: 'hub.story_create',
      entityType: 'HubStory',
      entityId: story.id,
      context: ctx,
    });
    await this.askParent(story);
    return this.dto(story);
  }

  /** A change means asking the parent again (a published story comes off until then). */
  async update(staff: AuthUser, id: string, dto: UpdateStoryDto, ctx: RequestContext) {
    const story = await this.prisma.hubStory.findUnique({ where: { id } });
    if (!story) throw storyNotFound();
    if (story.status === 'WITHDRAWN') {
      throw new ConflictException({
        error: 'STORY_WITHDRAWN',
        message: 'The parent said no to this story.',
      });
    }
    const updated = await this.prisma.hubStory.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
        ...(dto.headline !== undefined ? { headline: dto.headline.trim() } : {}),
        ...(dto.body !== undefined ? { body: dto.body.trim() } : {}),
        status: 'AWAITING_PARENT',
        parentAnsweredAt: null,
        publishedAt: null,
      },
      include: STORY_INCLUDE,
    });
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: 'hub.story_update',
      entityType: 'HubStory',
      entityId: id,
      context: ctx,
    });
    await this.askParent(updated);
    return this.dto(updated);
  }

  async publish(staff: AuthUser, id: string, publish: boolean, ctx: RequestContext) {
    const done = await this.prisma.hubStory.updateMany({
      where: { id, status: publish ? 'APPROVED' : 'PUBLISHED' },
      data: publish
        ? { status: 'PUBLISHED', publishedAt: new Date() }
        : { status: 'APPROVED', publishedAt: null },
    });
    if (!done.count) {
      if (!(await this.prisma.hubStory.count({ where: { id } }))) throw storyNotFound();
      throw new ConflictException({
        error: publish ? 'NOT_APPROVED' : 'NOT_PUBLISHED',
        message: publish
          ? 'The parent hasn’t said yes to this story.'
          : 'This story isn’t on the site.',
      });
    }
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: publish ? 'hub.story_publish' : 'hub.story_unpublish',
      entityType: 'HubStory',
      entityId: id,
      context: ctx,
    });
    return this.dto(
      await this.prisma.hubStory.findUniqueOrThrow({ where: { id }, include: STORY_INCLUDE }),
    );
  }

  private async askParent(story: HubStory) {
    const parent = await this.prisma.user.findUnique({
      where: { id: story.parentId },
      select: { email: true, displayName: true, languageCode: true },
    });
    if (!parent?.email) return;
    const language = toMailLanguage(parent.languageCode);
    const child = await this.prisma.studentProfile.findUnique({
      where: { userId: story.studentId },
      select: { nickname: true },
    });
    await this.mail
      .send({
        to: parent.email,
        template: 'hubStoryConsent',
        language,
        params: {
          name: parent.displayName ?? '',
          actionUrl: `${this.config.get('WEB_APP_URL').replace(/\/+$/, '')}/${language}/children/${story.studentId}/hub`,
          vars: { child: child?.nickname ?? '' },
        },
      })
      .catch((error: Error) => this.logger.warn(`Story email not sent: ${error.message}`));
  }

  // ── Parents ──────────────────────────────────────────────────────────────

  async forParent(user: AuthUser): Promise<HubStoryDto[]> {
    const rows = await this.prisma.hubStory.findMany({
      where: { parentId: user.id },
      orderBy: { createdAt: 'desc' },
      include: STORY_INCLUDE,
    });
    return rows.map((row) => this.dto(row));
  }

  /** The parent says yes or no. */
  async answer(user: AuthUser, id: string, approve: boolean, ctx: RequestContext) {
    const done = await this.prisma.hubStory.updateMany({
      where: { id, parentId: user.id, status: 'AWAITING_PARENT' },
      data: approve
        ? { status: 'APPROVED', parentAnsweredAt: new Date() }
        : { status: 'WITHDRAWN', parentAnsweredAt: new Date(), withdrawnAt: new Date() },
    });
    if (!done.count) {
      const story = await this.prisma.hubStory.findUnique({ where: { id } });
      if (!story || story.parentId !== user.id) throw storyNotFound();
      throw new ConflictException({ error: 'STORY_ANSWERED', message: 'You answered already.' });
    }
    await this.audit.record({
      actor: { id: user.id, roleKey: user.roleKey },
      action: approve ? 'hub.story_consent' : 'hub.story_decline',
      entityType: 'HubStory',
      entityId: id,
      context: ctx,
    });
    return this.forParent(user);
  }

  /** The parent takes it back: off the site at once, for good. */
  async withdraw(user: AuthUser, id: string, ctx: RequestContext) {
    const story = await this.prisma.hubStory.findUnique({ where: { id } });
    if (!story || story.parentId !== user.id) throw storyNotFound();
    if (story.status !== 'WITHDRAWN') {
      await this.prisma.hubStory.update({
        where: { id },
        data: { status: 'WITHDRAWN', withdrawnAt: new Date(), publishedAt: null },
      });
      await this.audit.record({
        actor: { id: user.id, roleKey: user.roleKey },
        action: 'hub.story_withdraw',
        entityType: 'HubStory',
        entityId: id,
        context: ctx,
      });
    }
    return this.forParent(user);
  }

  // ── The marketing site ───────────────────────────────────────────────────

  async published(language: string): Promise<PublicStoryDto[]> {
    const rows = await this.prisma.hubStory.findMany({
      where: { status: 'PUBLISHED', languageCode: language },
      orderBy: { publishedAt: 'desc' },
      take: 12,
      include: { student: { select: { countryCode: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      firstName: row.firstName,
      countryCode: row.student.countryCode,
      headline: row.headline,
      body: row.body,
      publishedAt: row.publishedAt!,
    }));
  }

  async stats(): Promise<PublicHubStatsDto> {
    const [projectsCompleted, students, earned] = await Promise.all([
      this.prisma.hubProject.count({ where: { status: 'COMPLETED' } }),
      this.prisma.hubEarning.groupBy({ by: ['studentId'] }),
      this.prisma.hubEarning.groupBy({ by: ['currency'], _sum: { amountMinor: true } }),
    ]);
    return {
      projectsCompleted,
      studentsEarning: students.length,
      earned: earned
        .map((row) => ({ currency: row.currency, amountMinor: row._sum.amountMinor ?? 0 }))
        .toSorted((a, b) => b.amountMinor - a.amountMinor),
    };
  }
}
