import type { Prisma } from '@kcp/database';
import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { randomToken } from '../common/crypto/tokens.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { ForgejoService } from '../events/forgejo.service.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { StorageService } from '../storage/storage.service.js';
import { ClientsService, reference } from './clients.service.js';
import type {
  CreateDeliveryDto,
  HubChangeDto,
  HubCommentDto,
  HubDeliveryDto,
  PreviewDto,
} from './dto/deliveries.dto.js';
import { HubInvoicesService } from './invoices.service.js';
import { ProjectsService } from './projects.service.js';
import { isLeadDeveloper } from './hub-rules.js';

/** What a preview may hold: static site files, recognised by their extension. */
export const PREVIEW_TYPES: Record<string, string> = {
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
  json: 'application/json',
  txt: 'text/plain',
  md: 'text/plain',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  ico: 'image/x-icon',
  woff2: 'font/woff2',
};
const TEXT_TYPES = new Set([
  'text/html',
  'text/css',
  'text/javascript',
  'application/json',
  'text/plain',
  'image/svg+xml',
]);
export const PREVIEW_MAX_FILES = 200;
export const PREVIEW_MAX_FILE_BYTES = 1024 * 1024;
export const PREVIEW_MAX_TOTAL_BYTES = 5 * 1024 * 1024;

export interface PreviewFile {
  path: string;
  size: number;
  type: string;
}

/** The files a preview keeps from a repository tree (static site files, within limits). */
export function previewFiles(tree: { path: string; size: number }[]): PreviewFile[] {
  const files: PreviewFile[] = [];
  let total = 0;
  for (const entry of tree.toSorted((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    const parts = entry.path.split('/');
    if (parts.some((part) => part.startsWith('.') || part === 'node_modules')) continue;
    const type = PREVIEW_TYPES[entry.path.split('.').pop()?.toLowerCase() ?? ''];
    if (!type || entry.size > PREVIEW_MAX_FILE_BYTES) continue;
    if (files.length >= PREVIEW_MAX_FILES || total + entry.size > PREVIEW_MAX_TOTAL_BYTES) break;
    files.push({ path: entry.path, size: entry.size, type });
    total += entry.size;
  }
  return files;
}

const deliveryNotFound = () =>
  new NotFoundException({ error: 'DELIVERY_NOT_FOUND', message: 'No such delivery.' });

type Tx = Prisma.TransactionClient;

/**
 * Deliveries: the lead shares a milestone (the repository's main branch, kept as a
 * static preview); the client accepts it, or asks for changes (to the lead, never to
 * the students). Accepting a quote's final delivery accepts its work and issues the
 * final invoice. Messages between the client and the platform, and change requests.
 */
@Injectable()
export class DeliveriesService {
  private readonly logger = new Logger(DeliveriesService.name);
  /** Run when a quote's work is accepted (sharing out the money already paid, Sprint 7). */
  private readonly acceptedHandlers: ((quoteId: string) => Promise<void>)[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly clients: ClientsService,
    private readonly invoices: HubInvoicesService,
    private readonly forgejo: ForgejoService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
  ) {}

  onAccepted(handler: (quoteId: string) => Promise<void>) {
    this.acceptedHandlers.push(handler);
  }

  dto(
    delivery: Prisma.HubDeliveryGetPayload<{ include: { quote: { select: { version: true } } } }>,
  ): HubDeliveryDto {
    return {
      id: delivery.id,
      number: delivery.number,
      reference: `M-${delivery.number}`,
      quoteId: delivery.quoteId,
      quoteVersion: delivery.quote.version,
      title: delivery.title,
      notes: delivery.notes,
      final: delivery.final,
      commit: delivery.commit,
      status: delivery.status,
      submittedAt: delivery.submittedAt,
      decidedAt: delivery.decidedAt,
      clientComment: delivery.clientComment,
      previewToken: delivery.status === 'WITHDRAWN' ? null : delivery.previewToken,
      fileCount: ((delivery.files ?? []) as unknown as PreviewFile[]).length,
    };
  }

  async list(projectId: string): Promise<HubDeliveryDto[]> {
    const rows = await this.prisma.hubDelivery.findMany({
      where: { projectId },
      orderBy: { number: 'asc' },
      include: { quote: { select: { version: true } } },
    });
    return rows.map((row) => this.dto(row));
  }

  // ── The lead shares a milestone ──────────────────────────────────────────

  /**
   * Keeps the repository's main branch (at its latest commit) as a preview in storage,
   * and shares it with the client. A final delivery needs every task of its quote done.
   */
  async create(user: AuthUser, projectId: string, dto: CreateDeliveryDto, ctx: RequestContext) {
    const project = await this.projects.forLead(user, projectId);
    if (project.status !== 'ACTIVE' && project.status !== 'DELIVERED') {
      throw new ConflictException({
        error: 'PROJECT_NOT_ACTIVE',
        message: 'This project isn’t open for work.',
      });
    }
    const quote = project.quotes.find((q) => q.id === dto.quoteId);
    if (!quote || quote.status !== 'APPROVED') {
      throw new NotFoundException({ error: 'QUOTE_NOT_FOUND', message: 'No such quote.' });
    }
    if (quote.acceptedAt) {
      throw new ConflictException({
        error: 'QUOTE_ACCEPTED',
        message: 'This work was accepted already.',
      });
    }
    if (dto.final && quote.tasks.some((t) => t.status !== 'DONE' && t.status !== 'CANCELLED')) {
      throw new ConflictException({
        error: 'TASKS_OPEN',
        message: 'Finish (or cancel) every task of the quote before the final delivery.',
      });
    }
    if (!this.forgejo.enabled || !project.repo) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          error: 'GIT_NOT_SET_UP',
          message: 'The project has no repository to preview.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const repo = project.repo;
    const commit = await this.forgejo.branchHead(repo, 'main');
    if (!commit)
      throw new ConflictException({
        error: 'NOTHING_TO_PREVIEW',
        message: 'main has no commits yet.',
      });
    const tree = await this.forgejo.tree(repo, commit);
    const files = previewFiles(tree);
    if (!files.some((f) => f.path === 'index.html')) {
      throw new ConflictException({
        error: 'NO_INDEX',
        message: 'The preview needs an index.html at the top of the repository.',
      });
    }
    const id = await this.save(
      projectId,
      quote.id,
      { title: dto.title.trim(), notes: dto.notes.trim(), final: dto.final, commit },
      async (deliveryId) => {
        for (const file of files) {
          const sha = tree.find((entry) => entry.path === file.path)!.sha;
          await this.storage.putBinary(
            `hub/previews/${deliveryId}/${file.path}`,
            await this.forgejo.blob(repo, sha),
            file.type,
          );
        }
        return files;
      },
      user,
      ctx,
    );
    await this.tellClient(projectId, 'hubDeliveryReady', { title: dto.title.trim() });
    return id;
  }

  /**
   * Saves a delivery and its preview files (written by `write`, which returns their
   * list). Also used by the demo data, with files of its own.
   */
  async save(
    projectId: string,
    quoteId: string,
    data: { title: string; notes: string; final: boolean; commit: string },
    write: (deliveryId: string) => Promise<PreviewFile[]>,
    actor: AuthUser | null,
    ctx?: RequestContext,
  ): Promise<string> {
    const delivery = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM hub_projects WHERE id = ${projectId}::uuid FOR UPDATE`;
      const waiting = await tx.hubDelivery.count({ where: { quoteId, status: 'SUBMITTED' } });
      if (waiting) {
        throw new ConflictException({
          error: 'DELIVERY_WAITING',
          message: 'The client hasn’t answered the last delivery yet: withdraw it first.',
        });
      }
      const last = await tx.hubDelivery.aggregate({ where: { projectId }, _max: { number: true } });
      return tx.hubDelivery.create({
        data: {
          projectId,
          quoteId,
          number: (last._max.number ?? 0) + 1,
          ...data,
          previewToken: randomToken(),
          createdById: actor?.id ?? null,
        },
      });
    });
    try {
      const files = await write(delivery.id);
      await this.prisma.hubDelivery.update({
        where: { id: delivery.id },
        data: { files: files as unknown as Prisma.InputJsonArray },
      });
    } catch (error) {
      // No half-made preview: the delivery goes too.
      await this.prisma.hubDelivery.delete({ where: { id: delivery.id } });
      await this.storage.deletePrefix(`hub/previews/${delivery.id}/`).catch(() => 0);
      throw error;
    }
    await this.audit.record({
      actor: actor ? { id: actor.id, roleKey: actor.roleKey } : null,
      action: 'hub.delivery',
      entityType: 'HubProject',
      entityId: projectId,
      after: {
        deliveryId: delivery.id,
        number: delivery.number,
        final: data.final,
        commit: data.commit,
      },
      context: ctx,
    });
    return delivery.id;
  }

  async withdraw(user: AuthUser, deliveryId: string, ctx: RequestContext) {
    const delivery = await this.prisma.hubDelivery.findUnique({
      where: { id: deliveryId },
      include: { project: { select: { leadId: true } } },
    });
    if (!delivery || delivery.project.leadId !== user.id) throw deliveryNotFound();
    if (!(await isLeadDeveloper(this.prisma, user.id))) throw deliveryNotFound();
    const done = await this.prisma.hubDelivery.updateMany({
      where: { id: deliveryId, status: 'SUBMITTED' },
      data: { status: 'WITHDRAWN', decidedAt: new Date() },
    });
    if (!done.count) {
      throw new ConflictException({
        error: 'DELIVERY_DECIDED',
        message: 'The client answered this delivery already.',
      });
    }
    await this.audit.record({
      actor: { id: user.id, roleKey: user.roleKey },
      action: 'hub.delivery_withdraw',
      entityType: 'HubProject',
      entityId: delivery.projectId,
      after: { deliveryId },
      context: ctx,
    });
  }

  // ── The client answers ───────────────────────────────────────────────────

  private async clientDelivery(user: AuthUser, projectId: string, deliveryId: string) {
    const project = await this.projects.forClient(user, projectId);
    const delivery = await this.prisma.hubDelivery.findFirst({
      where: { id: deliveryId, projectId: project.id },
    });
    if (!delivery) throw deliveryNotFound();
    // A cancelled or finished project takes no more answers (nor a final invoice).
    if (project.status !== 'ACTIVE' && project.status !== 'DELIVERED') {
      throw new ConflictException({
        error: 'PROJECT_NOT_ACTIVE',
        message: 'This project is closed.',
      });
    }
    return { project, delivery };
  }

  /**
   * The client accepts a delivery. The final one accepts the quote's work: the final
   * invoice is issued, and the money already paid on the quote can be shared out.
   */
  async accept(
    user: AuthUser,
    projectId: string,
    deliveryId: string,
    allowPortfolio: boolean | undefined,
    ctx: RequestContext,
  ) {
    const { project, delivery } = await this.clientDelivery(user, projectId, deliveryId);
    const member = await this.clients.membership(user);
    if (member.role !== 'OWNER') {
      throw new ForbiddenException({
        error: 'OWNER_ONLY',
        message: 'Only your organisation’s owner can do this.',
      });
    }
    let invoiceId: string | null = null;
    await this.prisma.$transaction(async (tx) => {
      const done = await tx.hubDelivery.updateMany({
        where: { id: deliveryId, status: 'SUBMITTED' },
        data: { status: 'ACCEPTED', decidedAt: new Date(), decidedById: user.id },
      });
      if (!done.count) {
        throw new ConflictException({
          error: 'DELIVERY_DECIDED',
          message: 'This delivery was answered already.',
        });
      }
      if (delivery.final) invoiceId = await this.acceptQuote(tx, delivery.quoteId);
      if (delivery.final && allowPortfolio !== undefined) {
        await tx.hubProject.update({
          where: { id: project.id },
          data: { portfolioAllowed: allowPortfolio },
        });
      }
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'hub.delivery_accept',
          entityType: 'HubProject',
          entityId: project.id,
          after: { deliveryId, final: delivery.final, allowPortfolio: allowPortfolio ?? null },
          context: ctx,
        },
        tx,
      );
      await this.invoices.refreshStatus(tx, project.id);
    });
    if (invoiceId) await this.invoices.tell(invoiceId, 'hubInvoiceIssued');
    if (delivery.final)
      for (const handler of this.acceptedHandlers) await handler(delivery.quoteId);
  }

  /** The quote's work is accepted: the final invoice (what the deposit didn't cover). */
  private async acceptQuote(tx: Tx, quoteId: string): Promise<string | null> {
    const quote = await tx.hubQuote.findUniqueOrThrow({
      where: { id: quoteId },
      include: { invoices: true },
    });
    if (quote.acceptedAt) return null;
    await tx.hubQuote.update({ where: { id: quoteId }, data: { acceptedAt: new Date() } });
    const invoiced = quote.invoices
      .filter((i) => i.status !== 'VOID')
      .reduce((sum, i) => sum + i.amountMinor, 0);
    const rest = quote.priceMinor - invoiced;
    if (rest <= 0) return null;
    const invoice = await this.invoices.issue(tx, quote, 'FINAL', rest);
    return invoice.id;
  }

  /** The client asks for changes: they go to the lead as a change request. */
  async requestChanges(
    user: AuthUser,
    projectId: string,
    deliveryId: string,
    comment: string,
    ctx: RequestContext,
  ) {
    const { project } = await this.clientDelivery(user, projectId, deliveryId);
    await this.prisma.$transaction(async (tx) => {
      const done = await tx.hubDelivery.updateMany({
        where: { id: deliveryId, status: 'SUBMITTED' },
        data: {
          status: 'CHANGES_REQUESTED',
          decidedAt: new Date(),
          decidedById: user.id,
          clientComment: comment.trim(),
        },
      });
      if (!done.count) {
        throw new ConflictException({
          error: 'DELIVERY_DECIDED',
          message: 'This delivery was answered already.',
        });
      }
      await tx.hubChangeRequest.create({
        data: { projectId: project.id, deliveryId, body: comment.trim(), createdById: user.id },
      });
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'hub.delivery_changes',
          entityType: 'HubProject',
          entityId: project.id,
          after: { deliveryId },
          context: ctx,
        },
        tx,
      );
    });
  }

  // ── The preview (the sandbox page, with the secret link) ─────────────────

  async preview(token: string): Promise<PreviewDto> {
    const delivery = await this.prisma.hubDelivery.findUnique({
      where: { previewToken: token },
      include: { project: { select: { title: true, status: true } } },
    });
    if (!delivery || delivery.status === 'WITHDRAWN' || delivery.project.status === 'CANCELLED') {
      throw new NotFoundException({
        error: 'PREVIEW_NOT_FOUND',
        message: 'This preview isn’t available.',
      });
    }
    const files = (delivery.files ?? []) as unknown as PreviewFile[];
    const out = [];
    for (const file of files) {
      const body = await this.storage.getBinary(`hub/previews/${delivery.id}/${file.path}`);
      if (!body) continue;
      const text = TEXT_TYPES.has(file.type);
      out.push({
        path: file.path,
        type: file.type,
        text: text ? body.toString('utf8') : null,
        base64: text ? null : body.toString('base64'),
      });
    }
    return {
      projectTitle: delivery.project.title,
      title: delivery.title,
      reference: `M-${delivery.number}`,
      submittedAt: delivery.submittedAt,
      files: out,
    };
  }

  // ── Messages between the client and the platform ─────────────────────────

  async comments(projectId: string, viewer: AuthUser): Promise<HubCommentDto[]> {
    const rows = await this.prisma.hubComment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
      take: 500,
      include: {
        author: {
          select: {
            displayName: true,
            email: true,
            role: { select: { key: true, isStaff: true } },
          },
        },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      body: row.body,
      from: !row.author
        ? 'staff'
        : row.author.role.key === 'client'
          ? 'client'
          : row.author.role.isStaff
            ? 'staff'
            : 'lead',
      authorName: row.author?.displayName ?? row.author?.email ?? '',
      isMine: row.authorId === viewer.id,
      deliveryId: row.deliveryId,
      createdAt: row.createdAt,
    }));
  }

  async addComment(viewer: AuthUser, projectId: string, body: string, deliveryId?: string) {
    if (deliveryId) {
      const delivery = await this.prisma.hubDelivery.count({
        where: { id: deliveryId, projectId },
      });
      if (!delivery) throw deliveryNotFound();
    }
    await this.prisma.hubComment.create({
      data: { projectId, authorId: viewer.id, body: body.trim(), deliveryId: deliveryId ?? null },
    });
    if (viewer.roleKey !== 'client') {
      await this.tellClient(projectId, 'hubMessage', {});
    }
  }

  // ── Change requests ──────────────────────────────────────────────────────

  async changes(projectId: string): Promise<HubChangeDto[]> {
    const rows = await this.prisma.hubChangeRequest.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((row) => ({
      id: row.id,
      body: row.body,
      status: row.status,
      deliveryId: row.deliveryId,
      createdAt: row.createdAt,
      decidedAt: row.decidedAt,
      note: row.note,
      quoteId: row.quoteId,
    }));
  }

  async addChange(user: AuthUser, projectId: string, body: string) {
    const project = await this.projects.forClient(user, projectId);
    if (project.status === 'COMPLETED' || project.status === 'CANCELLED') {
      throw new ConflictException({
        error: 'PROJECT_CLOSED',
        message: 'This project is finished.',
      });
    }
    await this.prisma.hubChangeRequest.create({
      data: { projectId, body: body.trim(), createdById: user.id },
    });
  }

  /** The lead answers a change request: in scope (new tasks), quoted, or declined. */
  async decideChange(
    user: AuthUser,
    changeId: string,
    dto: { decision: 'IN_SCOPE' | 'QUOTED' | 'DECLINED'; note: string; quoteId?: string },
    ctx: RequestContext,
  ) {
    const change = await this.prisma.hubChangeRequest.findUnique({
      where: { id: changeId },
      include: { project: { select: { leadId: true } } },
    });
    if (
      !change ||
      change.project.leadId !== user.id ||
      !(await isLeadDeveloper(this.prisma, user.id))
    ) {
      throw new NotFoundException({
        error: 'CHANGE_NOT_FOUND',
        message: 'No such change request.',
      });
    }
    if (dto.quoteId) {
      const quote = await this.prisma.hubQuote.count({
        where: { id: dto.quoteId, projectId: change.projectId, kind: 'CHANGE' },
      });
      if (!quote)
        throw new NotFoundException({ error: 'QUOTE_NOT_FOUND', message: 'No such quote.' });
    }
    const done = await this.prisma.hubChangeRequest.updateMany({
      where: { id: changeId, status: 'OPEN' },
      data: {
        status: dto.decision,
        note: dto.note.trim(),
        quoteId: dto.quoteId ?? null,
        decidedById: user.id,
        decidedAt: new Date(),
      },
    });
    if (!done.count) {
      throw new ConflictException({
        error: 'CHANGE_DECIDED',
        message: 'This change request was answered already.',
      });
    }
    await this.audit.record({
      actor: { id: user.id, roleKey: user.roleKey },
      action: 'hub.change_decide',
      entityType: 'HubProject',
      entityId: change.projectId,
      after: { changeId, decision: dto.decision },
      context: ctx,
    });
    await this.tellClient(change.projectId, 'hubMessage', {});
  }

  /** Emails the client's people about their project. */
  private async tellClient(
    projectId: string,
    template: 'hubDeliveryReady' | 'hubMessage',
    vars: Record<string, string>,
  ) {
    const project = await this.prisma.hubProject.findUnique({
      where: { id: projectId },
      select: {
        number: true,
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
    if (!project) return;
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
            vars: { project: project.title, reference: reference('P', project.number), ...vars },
          },
        })
        .catch((error: Error) => this.logger.warn(`Client email not sent: ${error.message}`));
    }
  }
}
