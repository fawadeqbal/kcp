import type { Prisma } from '@kcp/database';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { AdultInvitesService } from '../auth/adult-invites.service.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { READY_MENTOR } from '../events/events.shared.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { ClientsService, intakeDto } from './clients.service.js';
import type {
  AcceptedIntakeDto,
  AcceptIntakeDto,
  AdminClientDto,
  AdminIntakeDto,
  HubLeadDto,
  IntakeStatusValue,
} from './dto/clients.dto.js';
import { COUNTRY_HUB_SELECT } from './hub-rules.js';

const OPEN_PROJECTS = ['SCOPING', 'QUOTED', 'AWAITING_DEPOSIT', 'ACTIVE', 'DELIVERED'] as const;

/** Lead developers: ready mentors (check passed, code signed, active) marked as leads. */
export const READY_LEAD = {
  ...READY_MENTOR,
  mentorProfile: { ...READY_MENTOR.mentorProfile, isLead: true },
};

/**
 * The admin Hub queue: project requests are accepted (a project for a lead developer,
 * and a client account if the requester has none) or declined with a reason.
 */
@Injectable()
export class IntakeAdminService {
  private readonly logger = new Logger(IntakeAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly invites: AdultInvitesService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
    private readonly portal: ClientsService,
  ) {}

  private readonly include = {
    project: { select: { id: true } },
    org: { select: { name: true } },
    decidedBy: { select: { displayName: true, email: true } },
  } satisfies Prisma.HubIntakeInclude;

  private toAdmin(
    intake: Prisma.HubIntakeGetPayload<{ include: IntakeAdminService['include'] }>,
  ): AdminIntakeDto {
    return {
      ...intakeDto(intake),
      contactName: intake.contactName,
      contactEmail: intake.contactEmail,
      company: intake.company,
      countryCode: intake.countryCode,
      languageCode: intake.languageCode,
      orgId: intake.orgId,
      orgName: intake.org?.name ?? null,
      decidedBy: intake.decidedBy?.displayName ?? intake.decidedBy?.email ?? null,
    };
  }

  async list(status?: IntakeStatusValue): Promise<AdminIntakeDto[]> {
    const rows = await this.prisma.hubIntake.findMany({
      // Unconfirmed site requests aren't in the queue (they may be spam).
      where: status ? { status } : { status: { not: 'UNCONFIRMED' } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: this.include,
    });
    return rows.map((row) => this.toAdmin(row));
  }

  async get(id: string): Promise<AdminIntakeDto> {
    const intake = await this.prisma.hubIntake.findUnique({ where: { id }, include: this.include });
    if (!intake)
      throw new NotFoundException({ error: 'INTAKE_NOT_FOUND', message: 'No such request.' });
    return this.toAdmin(intake);
  }

  async leads(): Promise<HubLeadDto[]> {
    const leads = await this.prisma.user.findMany({
      where: READY_LEAD,
      orderBy: { displayName: 'asc' },
      select: {
        id: true,
        displayName: true,
        email: true,
        _count: { select: { hubProjectsLed: { where: { status: { in: [...OPEN_PROJECTS] } } } } },
      },
    });
    return leads.map((lead) => ({
      id: lead.id,
      name: lead.displayName ?? lead.email ?? '',
      openProjects: lead._count.hubProjectsLed,
    }));
  }

  private async decided(id: string) {
    const intake = await this.prisma.hubIntake.findUnique({ where: { id } });
    if (!intake)
      throw new NotFoundException({ error: 'INTAKE_NOT_FOUND', message: 'No such request.' });
    if (intake.status !== 'NEW') {
      throw new ConflictException({
        error: 'INTAKE_DECIDED',
        message: 'This request was decided already.',
      });
    }
    return intake;
  }

  /**
   * Accepts a request: a project in scoping for the lead developer, in the client's
   * organisation (a new one, with a client account invited, for a request from the site).
   */
  async accept(
    id: string,
    dto: AcceptIntakeDto,
    staff: AuthUser,
    ctx: RequestContext,
  ): Promise<AcceptedIntakeDto> {
    const intake = await this.decided(id);
    const lead = await this.prisma.user.findFirst({
      where: { id: dto.leadId, ...READY_LEAD },
      select: { id: true, displayName: true },
    });
    if (!lead) {
      throw new BadRequestException({
        error: 'NOT_LEAD',
        message: 'Choose a lead developer who is ready to work.',
      });
    }
    const orgId = intake.orgId ?? dto.orgId ?? null;
    const countryCode = dto.countryCode ?? intake.countryCode;
    let country = null;
    if (orgId) {
      const org = await this.prisma.clientOrg.findUnique({
        where: { id: orgId },
        select: { country: { select: COUNTRY_HUB_SELECT } },
      });
      if (!org)
        throw new NotFoundException({ error: 'CLIENT_NOT_FOUND', message: 'No such client.' });
      country = org.country;
    } else {
      if (!countryCode) {
        throw new BadRequestException({
          error: 'COUNTRY_NEEDED',
          message: 'Choose the client’s country.',
        });
      }
      country = await this.prisma.country.findUnique({
        where: { code: countryCode },
        select: COUNTRY_HUB_SELECT,
      });
      if (!country)
        throw new BadRequestException({ error: 'COUNTRY_NEEDED', message: 'No such country.' });
    }
    const split = {
      studentPercent: country.hubStudentPercent,
      leadPercent: country.hubLeadPercent,
      platformPercent: country.hubPlatformPercent,
    };
    const title = dto.title?.trim() || intake.title;

    const makeProject = (tx: Prisma.TransactionClient, projectOrgId: string) =>
      tx.hubProject.create({
        data: {
          orgId: projectOrgId,
          intakeId: intake.id,
          title,
          summary: intake.brief,
          leadId: lead.id,
          currency: dto.currency,
          ...split,
          depositPercent: dto.depositPercent ?? 30,
          deadline: intake.deadline,
          createdById: staff.id,
        },
      });
    const record = async (
      tx: Prisma.TransactionClient,
      projectId: string,
      projectOrgId: string,
    ) => {
      const done = await tx.hubIntake.updateMany({
        where: { id: intake.id, status: 'NEW' },
        data: {
          status: 'ACCEPTED',
          orgId: projectOrgId,
          decidedById: staff.id,
          decidedAt: new Date(),
        },
      });
      if (done.count === 0) {
        throw new ConflictException({
          error: 'INTAKE_DECIDED',
          message: 'This request was decided already.',
        });
      }
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'hub.intake_accept',
          entityType: 'HubIntake',
          entityId: intake.id,
          after: { projectId, orgId: projectOrgId, leadId: lead.id, currency: dto.currency },
          context: ctx,
        },
        tx,
      );
    };

    let result: AcceptedIntakeDto;
    if (orgId) {
      result = await this.prisma.$transaction(async (tx) => {
        const project = await makeProject(tx, orgId);
        await record(tx, project.id, orgId);
        return { projectId: project.id, orgId, invited: false };
      });
    } else {
      // A request from the site: the requester gets a client account in a new organisation.
      const existing = await this.prisma.user.findUnique({
        where: { email: intake.contactEmail },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException({
          error: 'EMAIL_TAKEN',
          message:
            'An account with this email exists already: pick the client’s organisation, or contact them.',
        });
      }
      let made: { projectId: string; orgId: string } | null = null;
      await this.invites.invite(
        {
          email: intake.contactEmail,
          displayName: intake.contactName,
          languageCode: intake.languageCode,
          roleKey: 'client',
          countryCode: country.code,
        },
        staff,
        ctx,
        async (tx, userId) => {
          const org = await tx.clientOrg.create({
            data: { name: dto.orgName?.trim() || intake.company, countryCode: country.code },
          });
          await tx.clientMember.create({ data: { orgId: org.id, userId, role: 'OWNER' } });
          const project = await makeProject(tx, org.id);
          await record(tx, project.id, org.id);
          made = { projectId: project.id, orgId: org.id };
        },
      );
      result = { ...made!, invited: true };
    }
    if (!result.invited) {
      const language = toMailLanguage(intake.languageCode);
      await this.mail
        .send({
          to: intake.contactEmail,
          template: 'hubIntakeAccepted',
          language,
          params: {
            name: intake.contactName,
            actionUrl: `${this.config.get('WEB_APP_URL').replace(/\/+$/, '')}/${language}/client/projects/${result.projectId}`,
            vars: { title, lead: lead.displayName ?? '' },
          },
        })
        .catch((error: Error) => this.logger.warn(`Acceptance email not sent: ${error.message}`));
    }
    return result;
  }

  async decline(id: string, reason: string, staff: AuthUser, ctx: RequestContext): Promise<void> {
    const intake = await this.decided(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.hubIntake.update({
        where: { id },
        data: {
          status: 'DECLINED',
          declineReason: reason.trim(),
          decidedById: staff.id,
          decidedAt: new Date(),
        },
      });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'hub.intake_decline',
          entityType: 'HubIntake',
          entityId: id,
          after: { reason: reason.trim() },
          context: ctx,
        },
        tx,
      );
    });
    const language = toMailLanguage(intake.languageCode);
    await this.mail
      .send({
        to: intake.contactEmail,
        template: 'hubIntakeDeclined',
        language,
        params: {
          name: intake.contactName,
          actionUrl: `${this.config.get('SITE_URL').replace(/\/+$/, '')}/${language}/hire`,
          vars: { title: intake.title, reason: reason.trim() },
        },
      })
      .catch((error: Error) => this.logger.warn(`Decline email not sent: ${error.message}`));
  }

  async clientList(): Promise<AdminClientDto[]> {
    const orgs = await this.prisma.clientOrg.findMany({
      orderBy: { name: 'asc' },
      take: 500,
      select: {
        id: true,
        createdAt: true,
        _count: { select: { projects: true, intakes: true } },
      },
    });
    return Promise.all(
      orgs.map(async (org) => ({
        ...(await this.portal.orgDto(org.id)),
        createdAt: org.createdAt,
        people: await this.portal.colleagues(org.id),
        projects: org._count.projects,
        intakes: org._count.intakes,
      })),
    );
  }
}
