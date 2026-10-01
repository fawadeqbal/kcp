import type { HubProjectStatus } from '@kcp/database';
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { ChatService } from '../chat/chat.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type {
  AdminProjectDto,
  AdminUpdateProjectDto,
  ProjectSummaryDto,
} from './dto/projects.dto.js';
import { READY_LEAD } from './intake-admin.service.js';
import { PROJECT_INCLUDE, ProjectsService } from './projects.service.js';
import { HubTeamService } from './team.service.js';

/** Projects as staff run them: any project, its lead and split, cancelling. */
@Injectable()
export class ProjectsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly audit: AuditService,
    private readonly team: HubTeamService,
    private readonly chat: ChatService,
  ) {}

  async list(status?: HubProjectStatus): Promise<ProjectSummaryDto[]> {
    const rows = await this.prisma.hubProject.findMany({
      where: status ? { status } : {},
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: PROJECT_INCLUDE,
    });
    return rows.map((row) => this.projects.summary(row));
  }

  /** The lead developer's projects (newest first). */
  async forLead(leadId: string): Promise<ProjectSummaryDto[]> {
    const rows = await this.prisma.hubProject.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: PROJECT_INCLUDE,
    });
    return rows.map((row) => this.projects.summary(row));
  }

  async get(id: string): Promise<AdminProjectDto> {
    return this.projects.adminView(await this.projects.forStaff(id));
  }

  /**
   * Changes the lead developer, or the split and deposit (only before the main quote
   * is sent: the client sees the deposit, the team their shares).
   */
  async update(id: string, dto: AdminUpdateProjectDto, staff: AuthUser, ctx: RequestContext) {
    const project = await this.projects.forStaff(id);
    if (project.status === 'COMPLETED' || project.status === 'CANCELLED') {
      throw new ConflictException({
        error: 'PROJECT_CLOSED',
        message: 'This project is finished.',
      });
    }
    const money =
      dto.studentPercent !== undefined ||
      dto.leadPercent !== undefined ||
      dto.platformPercent !== undefined ||
      dto.depositPercent !== undefined;
    if (money && project.quotes.some((q) => q.kind === 'MAIN' && q.status !== 'DRAFT')) {
      throw new ConflictException({
        error: 'QUOTE_SENT',
        message: 'The split and deposit are fixed once the main quote is sent.',
      });
    }
    const split = {
      studentPercent: dto.studentPercent ?? project.studentPercent,
      leadPercent: dto.leadPercent ?? project.leadPercent,
      platformPercent: dto.platformPercent ?? project.platformPercent,
    };
    if (split.studentPercent + split.leadPercent + split.platformPercent !== 100) {
      throw new ConflictException({
        error: 'SPLIT_NOT_100',
        message: 'The split must add up to 100%.',
      });
    }
    if (dto.leadId !== undefined) {
      const lead = await this.prisma.user.count({ where: { id: dto.leadId, ...READY_LEAD } });
      if (!lead) {
        throw new BadRequestException({
          error: 'NOT_LEAD',
          message: 'Choose a lead developer who is ready to work.',
        });
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.hubProject.update({
        where: { id },
        data: {
          ...split,
          ...(dto.depositPercent !== undefined ? { depositPercent: dto.depositPercent } : {}),
          ...(dto.leadId !== undefined ? { leadId: dto.leadId } : {}),
        },
      });
      // A new lead takes the old one's place in the team's room (git access follows
      // the project's lead by itself).
      if (dto.leadId !== undefined && dto.leadId !== project.leadId) {
        const room = await tx.chatRoom.findUnique({
          where: { kind_refId: { kind: 'HUB', refId: id } },
          select: { id: true },
        });
        if (room) {
          if (project.leadId) await this.chat.removeMember(room.id, project.leadId, tx);
          await this.chat.addMember(room.id, dto.leadId, 'ADULT', tx);
        }
      }
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'hub.project_admin_update',
          entityType: 'HubProject',
          entityId: id,
          before: {
            leadId: project.leadId,
            studentPercent: project.studentPercent,
            leadPercent: project.leadPercent,
            platformPercent: project.platformPercent,
            depositPercent: project.depositPercent,
          },
          after: { ...split, leadId: dto.leadId ?? project.leadId, reason: dto.reason.trim() },
          context: ctx,
        },
        tx,
      );
    });
    return this.get(id);
  }

  /** Cancels a project that hasn't been paid for (paid ones are settled by hand first). */
  async cancel(id: string, reason: string, staff: AuthUser, ctx: RequestContext) {
    const project = await this.projects.forStaff(id);
    if (project.status === 'COMPLETED' || project.status === 'CANCELLED') {
      throw new ConflictException({
        error: 'PROJECT_CLOSED',
        message: 'This project is finished.',
      });
    }
    if (project.invoices.some((i) => i.status === 'PAID')) {
      throw new ConflictException({
        error: 'PAID_INVOICES',
        message: 'The client has paid on this project: settle it (refund or deliver) first.',
      });
    }
    if (project.invoices.some((i) => i.status === 'OPEN')) {
      throw new ConflictException({
        error: 'OPEN_INVOICES',
        message: 'Void its open invoices first.',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.hubProject.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason.trim() },
      });
      await tx.hubQuote.updateMany({
        where: { projectId: id, status: { in: ['DRAFT', 'SENT'] } },
        data: { status: 'WITHDRAWN', withdrawnAt: new Date() },
      });
      // Milestones waiting for the client go too (nothing can be accepted or invoiced).
      await tx.hubDelivery.updateMany({
        where: { projectId: id, status: 'SUBMITTED' },
        data: { status: 'WITHDRAWN', decidedAt: new Date() },
      });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'hub.project_cancel',
          entityType: 'HubProject',
          entityId: id,
          after: { reason: reason.trim() },
          context: ctx,
        },
        tx,
      );
    });
    await this.team.closeProject(id, 'project_cancelled');
    return this.get(id);
  }
}
