import type { Prisma } from '@kcp/database';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { ClientsService, reference } from './clients.service.js';
import type {
  AdminProjectDto,
  ClientProjectDto,
  ClientQuoteDto,
  HubInvoiceDto,
  HubPersonDto,
  HubQuoteDto,
  HubTaskDto,
  LeadProjectDto,
  ProjectSummaryDto,
} from './dto/projects.dto.js';
import { HubEligibilityService } from './eligibility.service.js';
import { LedgerService } from './ledger/ledger.service.js';

export const projectNotFound = () =>
  new NotFoundException({ error: 'PROJECT_NOT_FOUND', message: 'No such project.' });

/** Everything a project's views are made from. */
export const PROJECT_INCLUDE = {
  org: { select: { name: true, billingName: true, billingAddress: true, taxId: true } },
  lead: { select: { displayName: true, email: true } },
  quotes: {
    orderBy: { version: 'asc' },
    include: {
      approvedBy: { select: { displayName: true, email: true } },
      tasks: { orderBy: [{ sortOrder: 'asc' }, { number: 'asc' }] },
    },
  },
  invoices: {
    orderBy: { number: 'asc' },
    include: { payments: true, quote: { select: { version: true } } },
  },
  members: {
    include: {
      student: { select: { studentProfile: { select: { nickname: true, avatarKey: true } } } },
    },
  },
} satisfies Prisma.HubProjectInclude;

export type LoadedProject = Prisma.HubProjectGetPayload<{ include: typeof PROJECT_INCLUDE }>;
type LoadedTask = LoadedProject['quotes'][number]['tasks'][number];
type LoadedInvoice = LoadedProject['invoices'][number];

const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : null);

/**
 * Hub projects: loading them for whoever asks (each sees their own part), and the
 * views of them. The lead developer and staff see everything; the client sees their
 * deliverables, quotes and invoices, never who builds what.
 */
@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clients: ClientsService,
    private readonly eligibility: HubEligibilityService,
    private readonly ledger: LedgerService,
  ) {}

  load(id: string, db: Prisma.TransactionClient | PrismaService = this.prisma) {
    return db.hubProject.findUnique({ where: { id }, include: PROJECT_INCLUDE });
  }

  /** A project the signed-in lead developer leads (404 otherwise). */
  async forLead(user: AuthUser, id: string): Promise<LoadedProject> {
    await this.eligibility.assertLead(user.id);
    const project = await this.load(id);
    if (!project || project.leadId !== user.id) throw projectNotFound();
    return project;
  }

  /** A project of the signed-in client's organisation (404 otherwise). */
  async forClient(user: AuthUser, id: string): Promise<LoadedProject> {
    const member = await this.clients.membership(user);
    const project = await this.load(id);
    if (!project || project.orgId !== member.orgId) throw projectNotFound();
    return project;
  }

  /** The project a task belongs to (404 when there's no such task). */
  async taskProject(taskId: string): Promise<string> {
    const task = await this.prisma.hubTask.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    if (!task) throw new NotFoundException({ error: 'TASK_NOT_FOUND', message: 'No such task.' });
    return task.projectId;
  }

  async forLeadCheck(user: AuthUser) {
    await this.eligibility.assertLead(user.id);
  }

  /** The client organisation's projects (newest first). */
  async listForClient(user: AuthUser): Promise<ProjectSummaryDto[]> {
    const member = await this.clients.membership(user);
    const rows = await this.prisma.hubProject.findMany({
      where: { orgId: member.orgId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: PROJECT_INCLUDE,
    });
    return rows.map((row) => this.summary(row));
  }

  async forStaff(id: string): Promise<LoadedProject> {
    const project = await this.load(id);
    if (!project) throw projectNotFound();
    return project;
  }

  // ── Views ────────────────────────────────────────────────────────────────

  summary(project: LoadedProject): ProjectSummaryDto {
    return {
      id: project.id,
      reference: reference('P', project.number),
      title: project.title,
      status: project.status,
      currency: project.currency,
      leadName: project.lead?.displayName ?? project.lead?.email ?? null,
      clientName: project.org.name,
      deadline: day(project.deadline),
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }

  /** Students on (or once on) the team, by ID. */
  people(project: LoadedProject): Map<string, HubPersonDto> {
    return new Map(
      project.members.map((m) => [
        m.studentId,
        {
          id: m.studentId,
          pseudonym: m.pseudonym,
          nickname: m.student.studentProfile?.nickname ?? '',
          avatarKey: m.student.studentProfile?.avatarKey ?? '',
        },
      ]),
    );
  }

  task(task: LoadedTask, people: Map<string, HubPersonDto>): HubTaskDto {
    return {
      id: task.id,
      number: task.number,
      reference: `T-${task.number}`,
      quoteId: task.quoteId,
      title: task.title,
      spec: task.spec,
      skillTags: task.skillTags,
      estimateMinutes: task.estimateMinutes,
      shareBp: task.shareBp,
      status: task.status,
      assignee: task.assigneeId ? (people.get(task.assigneeId) ?? null) : null,
      doneAt: task.doneAt,
    };
  }

  quotes(project: LoadedProject, people: Map<string, HubPersonDto>): HubQuoteDto[] {
    return project.quotes.map((quote) => ({
      id: quote.id,
      version: quote.version,
      kind: quote.kind,
      status: quote.status,
      priceMinor: quote.priceMinor,
      depositMinor: quote.depositMinor,
      note: quote.note,
      sowText: quote.sowText,
      sowVersion: quote.sowVersion,
      sentAt: quote.sentAt,
      approvedAt: quote.approvedAt,
      approvedBy: quote.approvedBy?.displayName ?? quote.approvedBy?.email ?? null,
      declinedAt: quote.declinedAt,
      declineReason: quote.declineReason,
      acceptedAt: quote.acceptedAt,
      tasks: quote.tasks.map((task) => this.task(task, people)),
    }));
  }

  invoice(project: Pick<LoadedProject, 'title' | 'org'>, invoice: LoadedInvoice): HubInvoiceDto {
    return {
      id: invoice.id,
      reference: reference('H', invoice.number),
      kind: invoice.kind,
      status: invoice.status,
      currency: invoice.currency,
      amountMinor: invoice.amountMinor,
      issuedAt: invoice.issuedAt,
      dueAt: invoice.dueAt,
      paidAt: invoice.paidAt,
      voidedAt: invoice.voidedAt,
      voidReason: invoice.voidReason,
      projectId: invoice.projectId,
      projectTitle: project.title,
      quoteVersion: invoice.quote.version,
      clientName: project.org.name,
      billingName: project.org.billingName,
      billingAddress: project.org.billingAddress,
      taxId: project.org.taxId,
      payments: invoice.payments
        .toSorted((a, b) => a.paidAt.getTime() - b.paidAt.getTime())
        .map((p) => ({
          provider: p.provider,
          amountMinor: p.amountMinor,
          method: p.method,
          reference: p.reference,
          paidAt: p.paidAt,
        })),
    };
  }

  leadView(project: LoadedProject): LeadProjectDto {
    const people = this.people(project);
    return {
      ...this.summary(project),
      summary: project.summary,
      split: {
        student: project.studentPercent,
        lead: project.leadPercent,
        platform: project.platformPercent,
      },
      depositPercent: project.depositPercent,
      quotes: this.quotes(project, people),
      invoices: project.invoices.map((invoice) => this.invoice(project, invoice)),
      portfolioAllowed: project.portfolioAllowed,
    };
  }

  clientView(project: LoadedProject): ClientProjectDto {
    const quotes: ClientQuoteDto[] = project.quotes
      .filter((q) => q.status !== 'DRAFT' && q.sentAt && q.sowText && q.sowVersion)
      .map((quote) => ({
        id: quote.id,
        version: quote.version,
        kind: quote.kind,
        status: quote.status as ClientQuoteDto['status'],
        priceMinor: quote.priceMinor,
        depositMinor: quote.depositMinor,
        note: quote.note,
        sowText: quote.sowText!,
        sowVersion: quote.sowVersion!,
        sentAt: quote.sentAt!,
        approvedAt: quote.approvedAt,
        declinedAt: quote.declinedAt,
        acceptedAt: quote.acceptedAt,
        deliverables: quote.tasks
          .filter((task) => task.status !== 'CANCELLED')
          .map((task) => ({
            number: task.number,
            title: task.title,
            estimateMinutes: task.estimateMinutes,
            status: task.status,
          })),
      }));
    return {
      ...this.summary(project),
      summary: project.summary,
      quotes,
      invoices: project.invoices.map((invoice) => this.invoice(project, invoice)),
      portfolioAllowed: project.portfolioAllowed,
    };
  }

  async adminView(project: LoadedProject): Promise<AdminProjectDto> {
    return {
      ...this.leadView(project),
      orgId: project.orgId,
      intakeId: project.intakeId,
      leadId: project.leadId,
      fundsMinor: await this.ledger.balance('PROJECT_FUNDS', project.currency, project.id),
      cancelReason: project.cancelReason,
    };
  }
}
