import type { Prisma } from '@kcp/database';
import { HUB_AGREEMENTS, HUB_SHARE_TOTAL } from '@kcp/shared';
import {
  ConflictException,
  ForbiddenException,
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
import { ClientsService } from './clients.service.js';
import { statementOfWork } from './contracts.js';
import type {
  CreateQuoteDto,
  LeadProjectDto,
  ShareInputDto,
  TaskInputDto,
  UpdateProjectDto,
  UpdateQuoteDto,
  UpdateTaskDto,
} from './dto/projects.dto.js';
import { HubInvoicesService } from './invoices.service.js';
import { ProjectsService, projectNotFound } from './projects.service.js';
import { isLeadDeveloper } from './hub-rules.js';

type Tx = Prisma.TransactionClient;

const quoteNotFound = () =>
  new NotFoundException({ error: 'QUOTE_NOT_FOUND', message: 'No such quote.' });
const taskNotFound = () =>
  new NotFoundException({ error: 'TASK_NOT_FOUND', message: 'No such task.' });

/** Tasks that still count for a quote's shares. */
const live = (task: { status: string }) => task.status !== 'CANCELLED';

/**
 * Scoping and quotes. The lead developer splits a project into tasks (each with a
 * share of the students' pool, adding up to 100%), prices it and sends the quote; the
 * client approves it (with its statement of work) and the deposit invoice is issued.
 * Changes beyond the statement of work get a quote of their own.
 */
@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly invoices: HubInvoicesService,
    private readonly clients: ClientsService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
  ) {}

  private async view(user: AuthUser, projectId: string): Promise<LeadProjectDto> {
    return this.projects.leadView(await this.projects.forLead(user, projectId));
  }

  private assertOpen(project: { status: string }) {
    if (project.status === 'COMPLETED' || project.status === 'CANCELLED') {
      throw new ConflictException({
        error: 'PROJECT_CLOSED',
        message: 'This project is finished.',
      });
    }
  }

  /** The lead's quote, locked for the change (404 when it isn't theirs). */
  private async leadQuote(tx: Tx, user: AuthUser, quoteId: string) {
    const quote = await tx.hubQuote.findUnique({
      where: { id: quoteId },
      include: { project: true, tasks: true },
    });
    if (!quote || quote.project.leadId !== user.id) throw quoteNotFound();
    if (!(await isLeadDeveloper(this.prisma, user.id))) throw quoteNotFound();
    await tx.$queryRaw`SELECT id FROM hub_quotes WHERE id = ${quoteId}::uuid FOR UPDATE`;
    return quote;
  }

  async updateProject(
    user: AuthUser,
    projectId: string,
    dto: UpdateProjectDto,
    ctx: RequestContext,
  ) {
    const project = await this.projects.forLead(user, projectId);
    this.assertOpen(project);
    await this.prisma.$transaction(async (tx) => {
      await tx.hubProject.update({
        where: { id: projectId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.summary !== undefined ? { summary: dto.summary.trim() } : {}),
          ...(dto.deadline !== undefined
            ? { deadline: new Date(`${dto.deadline}T00:00:00Z`) }
            : {}),
        },
      });
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'hub.project_update',
          entityType: 'HubProject',
          entityId: projectId,
          before: { title: project.title, deadline: project.deadline?.toISOString() ?? null },
          after: { title: dto.title ?? project.title, deadline: dto.deadline ?? null },
          context: ctx,
        },
        tx,
      );
    });
    return this.view(user, projectId);
  }

  // ── Quotes ───────────────────────────────────────────────────────────────

  /** A new draft quote: the main one first, change quotes once the main one is approved. */
  async createQuote(user: AuthUser, projectId: string, dto: CreateQuoteDto) {
    const project = await this.projects.forLead(user, projectId);
    this.assertOpen(project);
    const main = project.quotes.find((q) => q.kind === 'MAIN' && q.status === 'APPROVED');
    if (dto.kind === 'MAIN' && main) {
      throw new ConflictException({
        error: 'MAIN_APPROVED',
        message: 'The main quote is approved: changes need a change quote.',
      });
    }
    if (
      dto.kind === 'MAIN' &&
      project.quotes.some((q) => q.kind === 'MAIN' && q.status === 'SENT')
    ) {
      throw new ConflictException({
        error: 'QUOTE_WITH_CLIENT',
        message: 'A quote is with the client: withdraw it first.',
      });
    }
    if (dto.kind === 'CHANGE' && !main) {
      throw new ConflictException({
        error: 'MAIN_NOT_APPROVED',
        message: 'Change quotes come after the main quote is approved.',
      });
    }
    if (project.quotes.some((q) => q.status === 'DRAFT')) {
      throw new ConflictException({
        error: 'DRAFT_EXISTS',
        message: 'Finish the draft quote first.',
      });
    }
    await this.prisma
      .$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM hub_projects WHERE id = ${projectId}::uuid FOR UPDATE`;
        const last = await tx.hubQuote.aggregate({ where: { projectId }, _max: { version: true } });
        const quote = await tx.hubQuote.create({
          data: {
            projectId,
            version: (last._max.version ?? 0) + 1,
            kind: dto.kind,
            priceMinor: dto.priceMinor,
            note: dto.note?.trim() || null,
            createdById: user.id,
          },
        });
        // A new main quote starts from the tasks of the last one (withdrawn or declined).
        const previous = project.quotes.filter((q) => q.kind === 'MAIN').at(-1);
        if (dto.kind === 'MAIN' && previous) {
          for (const task of previous.tasks.filter(live)) {
            await tx.hubTask.update({ where: { id: task.id }, data: { quoteId: quote.id } });
          }
        }
      })
      .catch((error: { code?: string }) => {
        if (error.code === 'P2002') {
          throw new ConflictException({
            error: 'DRAFT_EXISTS',
            message: 'Finish the draft quote first.',
          });
        }
        throw error;
      });
    return this.view(user, projectId);
  }

  async updateQuote(user: AuthUser, quoteId: string, dto: UpdateQuoteDto) {
    const projectId = await this.prisma.$transaction(async (tx) => {
      const quote = await this.leadQuote(tx, user, quoteId);
      if (quote.status !== 'DRAFT') {
        throw new ConflictException({
          error: 'QUOTE_NOT_DRAFT',
          message: 'Only a draft can change.',
        });
      }
      await tx.hubQuote.update({
        where: { id: quoteId },
        data: {
          ...(dto.priceMinor !== undefined ? { priceMinor: dto.priceMinor } : {}),
          ...(dto.note !== undefined ? { note: dto.note.trim() || null } : {}),
        },
      });
      return quote.projectId;
    });
    return this.view(user, projectId);
  }

  /** Sends a draft quote to the client: its tasks must add up to 100% of the pool. */
  async send(user: AuthUser, quoteId: string, ctx: RequestContext) {
    const projectId = await this.prisma.$transaction(async (tx) => {
      const quote = await this.leadQuote(tx, user, quoteId);
      if (quote.status !== 'DRAFT') {
        throw new ConflictException({
          error: 'QUOTE_NOT_DRAFT',
          message: 'This quote was sent already.',
        });
      }
      const tasks = quote.tasks.filter(live);
      if (tasks.length === 0) {
        throw new ConflictException({ error: 'NO_TASKS', message: 'Add the tasks first.' });
      }
      const total = tasks.reduce((sum, t) => sum + t.shareBp, 0);
      if (total !== HUB_SHARE_TOTAL) {
        throw new ConflictException({
          error: 'SHARES_NOT_100',
          message: 'The tasks’ shares must add up to 100%.',
          details: { total },
        });
      }
      const project = await tx.hubProject.findUniqueOrThrow({
        where: { id: quote.projectId },
        include: { org: { select: { name: true } } },
      });
      const depositMinor =
        quote.kind === 'MAIN' ? Math.round((quote.priceMinor * project.depositPercent) / 100) : 0;
      const sowText = statementOfWork({
        orgName: project.org.name,
        projectTitle: project.title,
        summary: project.summary,
        quoteVersion: quote.version,
        currency: project.currency,
        priceMinor: quote.priceMinor,
        depositMinor,
        deadline: project.deadline ? project.deadline.toISOString().slice(0, 10) : null,
        tasks: tasks.toSorted((a, b) => a.number - b.number),
      });
      await tx.hubQuote.update({
        where: { id: quoteId },
        data: {
          status: 'SENT',
          depositMinor,
          sowText,
          sowVersion: HUB_AGREEMENTS.sow,
          sentAt: new Date(),
        },
      });
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'hub.quote_send',
          entityType: 'HubQuote',
          entityId: quoteId,
          after: { version: quote.version, priceMinor: quote.priceMinor, depositMinor },
          context: ctx,
        },
        tx,
      );
      await this.invoices.refreshStatus(tx, quote.projectId);
      return quote.projectId;
    });
    await this.tellClient(projectId, 'hubQuoteSent');
    return this.view(user, projectId);
  }

  /** The lead takes a sent quote back (to change it): a new version follows. */
  async withdraw(user: AuthUser, quoteId: string, ctx: RequestContext) {
    const projectId = await this.prisma.$transaction(async (tx) => {
      const quote = await this.leadQuote(tx, user, quoteId);
      if (quote.status !== 'SENT') {
        throw new ConflictException({
          error: 'QUOTE_NOT_SENT',
          message: 'Only a sent quote can be withdrawn.',
        });
      }
      await tx.hubQuote.update({
        where: { id: quoteId },
        data: { status: 'WITHDRAWN', withdrawnAt: new Date() },
      });
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'hub.quote_withdraw',
          entityType: 'HubQuote',
          entityId: quoteId,
          context: ctx,
        },
        tx,
      );
      await this.invoices.refreshStatus(tx, quote.projectId);
      return quote.projectId;
    });
    return this.view(user, projectId);
  }

  // ── Tasks ────────────────────────────────────────────────────────────────

  /**
   * Adds a task: to a draft quote, or (shares rebalanced after) to an approved one for
   * work inside its statement of work.
   */
  async addTask(user: AuthUser, quoteId: string, dto: TaskInputDto) {
    const projectId = await this.prisma.$transaction(async (tx) => {
      const quote = await this.leadQuote(tx, user, quoteId);
      if (quote.status !== 'DRAFT' && quote.status !== 'APPROVED') {
        throw new ConflictException({
          error: 'QUOTE_LOCKED',
          message: 'Tasks change on a draft (or an approved quote, for work inside it).',
        });
      }
      if (quote.status === 'APPROVED' && quote.acceptedAt) {
        throw new ConflictException({
          error: 'QUOTE_ACCEPTED',
          message: 'This work was accepted already.',
        });
      }
      await tx.$queryRaw`SELECT id FROM hub_projects WHERE id = ${quote.projectId}::uuid FOR UPDATE`;
      const last = await tx.hubTask.aggregate({
        where: { projectId: quote.projectId },
        _max: { number: true, sortOrder: true },
      });
      await tx.hubTask.create({
        data: {
          projectId: quote.projectId,
          quoteId,
          number: (last._max.number ?? 0) + 1,
          title: dto.title.trim(),
          spec: dto.spec.trim(),
          skillTags: dto.skillTags,
          estimateMinutes: dto.estimateMinutes,
          // On an approved quote the shares are rebalanced together afterwards.
          shareBp: quote.status === 'APPROVED' ? 0 : dto.shareBp,
          sortOrder: (last._max.sortOrder ?? 0) + 1,
        },
      });
      return quote.projectId;
    });
    return this.view(user, projectId);
  }

  private async leadTask(tx: Tx, user: AuthUser, taskId: string) {
    const task = await tx.hubTask.findUnique({
      where: { id: taskId },
      include: { quote: true, project: { select: { leadId: true } } },
    });
    if (!task || task.project.leadId !== user.id) throw taskNotFound();
    if (!(await isLeadDeveloper(this.prisma, user.id))) throw taskNotFound();
    return task;
  }

  async updateTask(user: AuthUser, taskId: string, dto: UpdateTaskDto) {
    const projectId = await this.prisma.$transaction(async (tx) => {
      const task = await this.leadTask(tx, user, taskId);
      if (task.quote.acceptedAt || task.status === 'DONE' || task.status === 'CANCELLED') {
        throw new ConflictException({
          error: 'TASK_LOCKED',
          message: 'This task can’t change now.',
        });
      }
      // A sent quote's tasks are what the client is looking at.
      if (task.quote.status === 'SENT') {
        throw new ConflictException({
          error: 'QUOTE_WITH_CLIENT',
          message: 'A quote is with the client: withdraw it first.',
        });
      }
      await tx.hubTask.update({
        where: { id: taskId },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.spec !== undefined ? { spec: dto.spec.trim() } : {}),
          ...(dto.skillTags !== undefined ? { skillTags: dto.skillTags } : {}),
          ...(dto.estimateMinutes !== undefined ? { estimateMinutes: dto.estimateMinutes } : {}),
        },
      });
      return task.projectId;
    });
    return this.view(user, projectId);
  }

  /** Removes a task from a draft, or cancels one of an approved quote (not done yet). */
  async removeTask(user: AuthUser, taskId: string, ctx: RequestContext) {
    const projectId = await this.prisma.$transaction(async (tx) => {
      const task = await this.leadTask(tx, user, taskId);
      if (task.quote.status === 'DRAFT') {
        await tx.hubTask.delete({ where: { id: taskId } });
        return task.projectId;
      }
      if (task.quote.status !== 'APPROVED' || task.status === 'DONE' || task.quote.acceptedAt) {
        throw new ConflictException({
          error: 'TASK_LOCKED',
          message: 'This task can’t be removed now.',
        });
      }
      await tx.hubTask.update({
        where: { id: taskId },
        data: { status: 'CANCELLED', assigneeId: null },
      });
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'hub.task_cancel',
          entityType: 'HubTask',
          entityId: taskId,
          before: { shareBp: task.shareBp, assigneeId: task.assigneeId },
          context: ctx,
        },
        tx,
      );
      return task.projectId;
    });
    return this.view(user, projectId);
  }

  /**
   * New shares for a quote's tasks, all at once (they must add up to 100%). On an
   * approved quote this is how work inside it is rebalanced: in the audit log, and
   * shown to the students, before the client accepts the work.
   */
  async setShares(user: AuthUser, quoteId: string, shares: ShareInputDto[], ctx: RequestContext) {
    const projectId = await this.prisma.$transaction(async (tx) => {
      const quote = await this.leadQuote(tx, user, quoteId);
      if (quote.status !== 'DRAFT' && !(quote.status === 'APPROVED' && !quote.acceptedAt)) {
        throw new ConflictException({
          error: 'QUOTE_LOCKED',
          message: 'These shares can’t change now.',
        });
      }
      const tasks = quote.tasks.filter(live);
      const next = new Map(shares.map((s) => [s.taskId, s.shareBp]));
      if (shares.some((s) => !tasks.some((t) => t.id === s.taskId))) throw taskNotFound();
      const total = tasks.reduce((sum, t) => sum + (next.get(t.id) ?? t.shareBp), 0);
      if (total !== HUB_SHARE_TOTAL) {
        throw new ConflictException({
          error: 'SHARES_NOT_100',
          message: 'The tasks’ shares must add up to 100%.',
          details: { total },
        });
      }
      for (const task of tasks) {
        const shareBp = next.get(task.id);
        if (shareBp !== undefined && shareBp !== task.shareBp) {
          await tx.hubTask.update({ where: { id: task.id }, data: { shareBp } });
        }
      }
      if (quote.status === 'APPROVED') {
        await this.audit.record(
          {
            actor: { id: user.id, roleKey: user.roleKey },
            action: 'hub.shares',
            entityType: 'HubQuote',
            entityId: quoteId,
            before: Object.fromEntries(tasks.map((t) => [t.id, t.shareBp])),
            after: Object.fromEntries(tasks.map((t) => [t.id, next.get(t.id) ?? t.shareBp])),
            context: ctx,
          },
          tx,
        );
      }
      return quote.projectId;
    });
    return this.view(user, projectId);
  }

  // ── The client's answer ──────────────────────────────────────────────────

  /**
   * The client's owner approves a sent quote and its statement of work: the deposit
   * invoice follows (or the work starts at once when there's none).
   */
  async approve(
    user: AuthUser,
    projectId: string,
    quoteId: string,
    sowVersion: string,
    ctx: RequestContext,
  ) {
    const project = await this.projects.forClient(user, projectId);
    const member = await this.clients.membership(user);
    if (member.role !== 'OWNER') {
      throw new ForbiddenException({
        error: 'OWNER_ONLY',
        message: 'Only your organisation’s owner can do this.',
      });
    }
    this.clients.assertAgreement(member.org);
    let invoiceId: string | null = null;
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM hub_quotes WHERE id = ${quoteId}::uuid FOR UPDATE`;
      const quote = await tx.hubQuote.findUnique({ where: { id: quoteId } });
      if (!quote || quote.projectId !== project.id || quote.status === 'DRAFT')
        throw quoteNotFound();
      if (quote.status !== 'SENT') {
        throw new ConflictException({
          error: 'QUOTE_NOT_SENT',
          message: 'This quote isn’t waiting for an answer.',
        });
      }
      if (sowVersion !== quote.sowVersion) {
        throw new ConflictException({
          error: 'AGREEMENT_CHANGED',
          message: 'The statement of work has changed: read the new version.',
        });
      }
      await tx.hubQuote.update({
        where: { id: quoteId },
        data: { status: 'APPROVED', approvedAt: new Date(), approvedById: user.id },
      });
      if (quote.depositMinor > 0) {
        const invoice = await this.invoices.issue(tx, quote, 'DEPOSIT', quote.depositMinor);
        invoiceId = invoice.id;
      }
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'hub.quote_approve',
          entityType: 'HubQuote',
          entityId: quoteId,
          after: { sowVersion, depositMinor: quote.depositMinor },
          context: ctx,
        },
        tx,
      );
      await this.invoices.refreshStatus(tx, project.id);
    });
    if (invoiceId) await this.invoices.tell(invoiceId, 'hubInvoiceIssued');
    return this.projects.clientView((await this.projects.load(project.id))!);
  }

  async decline(
    user: AuthUser,
    projectId: string,
    quoteId: string,
    reason: string,
    ctx: RequestContext,
  ) {
    const project = await this.projects.forClient(user, projectId);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM hub_quotes WHERE id = ${quoteId}::uuid FOR UPDATE`;
      const quote = await tx.hubQuote.findUnique({ where: { id: quoteId } });
      if (!quote || quote.projectId !== project.id || quote.status === 'DRAFT')
        throw quoteNotFound();
      if (quote.status !== 'SENT') {
        throw new ConflictException({
          error: 'QUOTE_NOT_SENT',
          message: 'This quote isn’t waiting for an answer.',
        });
      }
      await tx.hubQuote.update({
        where: { id: quoteId },
        data: { status: 'DECLINED', declinedAt: new Date(), declineReason: reason.trim() },
      });
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'hub.quote_decline',
          entityType: 'HubQuote',
          entityId: quoteId,
          after: { reason: reason.trim() },
          context: ctx,
        },
        tx,
      );
      await this.invoices.refreshStatus(tx, project.id);
    });
    return this.projects.clientView((await this.projects.load(project.id))!);
  }

  /** Emails the client's people about their project. */
  private async tellClient(projectId: string, template: 'hubQuoteSent') {
    const project = await this.prisma.hubProject.findUnique({
      where: { id: projectId },
      select: {
        title: true,
        org: {
          select: {
            members: {
              where: { user: { deletedAt: null, status: 'ACTIVE' } },
              select: { user: { select: { email: true, displayName: true, languageCode: true } } },
            },
          },
        },
      },
    });
    if (!project) throw projectNotFound();
    const base = this.config.get('WEB_APP_URL').replace(/\/+$/, '');
    for (const { user } of project.org.members) {
      if (!user.email) continue;
      const language = toMailLanguage(user.languageCode);
      await this.mail
        .send({
          to: user.email,
          template,
          language,
          params: {
            name: user.displayName ?? '',
            actionUrl: `${base}/${language}/client/projects/${projectId}`,
            vars: { project: project.title },
          },
        })
        .catch((error: Error) => this.logger.warn(`Client email not sent: ${error.message}`));
    }
  }
}
