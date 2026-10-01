import { randomUUID } from 'node:crypto';
import type { HubIntake, Prisma } from '@kcp/database';
import { HUB_AGREEMENTS, HUB_INTAKE_FILE_MAX_BYTES, HUB_INTAKE_MAX_FILES } from '@kcp/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AuditService } from '../audit/audit.service.js';
import { AdultInvitesService } from '../auth/adult-invites.service.js';
import { randomToken, sha256 } from '../common/crypto/tokens.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { StorageService } from '../storage/storage.service.js';
import type {
  ClientMeDto,
  ClientOrgDto,
  CreateIntakeDto,
  IntakeDto,
  IntakeFileDto,
  InviteColleagueDto,
  PublicIntakeDto,
  UpdateClientOrgDto,
} from './dto/clients.dto.js';

/** What a request's file may be (recognised by its first bytes, never by its name). */
export const INTAKE_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
] as const;
/** The site's email link lasts a week; unconfirmed requests go after that. */
const CONFIRM_DAYS = 7;
const DAY = 86_400_000;

/** Recognises a file by its first bytes: PDF, PNG, JPEG or plain UTF-8 text. */
export function intakeFileType(body: Buffer): (typeof INTAKE_FILE_TYPES)[number] | null {
  if (body.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'image/jpeg';
  // Text: valid UTF-8 with no control characters other than tabs and line breaks.
  const text = body.toString('utf8');
  const control = body.some(
    (byte) => byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d,
  );
  if (!text.includes('\uFFFD') && !control) {
    return 'text/plain';
  }
  return null;
}

/** A file name safe to keep and show: no paths, no odd characters, not too long. */
export function safeFileName(raw: string | undefined): string {
  let name = '';
  try {
    name = decodeURIComponent(raw ?? '');
  } catch {
    name = raw ?? '';
  }
  name = name.split(/[\\/]/).pop() ?? '';
  name = name
    .replaceAll(/[^\p{L}\p{N} ._()-]/gu, '_')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .slice(-100);
  return name || 'file';
}

export interface StoredFile extends IntakeFileDto {
  key: string;
}

export const reference = (prefix: string, number: number) =>
  `${prefix}-${String(number).padStart(4, '0')}`;

export function intakeDto(
  intake: Pick<
    HubIntake,
    | 'id'
    | 'number'
    | 'source'
    | 'status'
    | 'title'
    | 'brief'
    | 'budget'
    | 'deadline'
    | 'files'
    | 'createdAt'
    | 'decidedAt'
    | 'declineReason'
  > & { project?: { id: string } | null },
): IntakeDto {
  return {
    id: intake.id,
    reference: reference('R', intake.number),
    source: intake.source,
    status: intake.status,
    title: intake.title,
    brief: intake.brief,
    budget: intake.budget,
    deadline: intake.deadline ? intake.deadline.toISOString().slice(0, 10) : null,
    files: ((intake.files ?? []) as unknown as StoredFile[]).map(({ id, name, size, type }) => ({
      id,
      name,
      size,
      type,
    })),
    createdAt: intake.createdAt,
    decidedAt: intake.decidedAt,
    declineReason: intake.declineReason,
    projectId: intake.project?.id ?? null,
  };
}

const notMember = () =>
  new ForbiddenException({ error: 'NOT_A_CLIENT', message: 'For client accounts only.' });

/**
 * The client side of the hub: project requests from the marketing site (confirmed by
 * email) and from the client portal (with files), and the client's organisation:
 * the client agreement, billing details and colleagues. Everything a client sees is
 * their own organisation's.
 */
@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly storage: StorageService,
    private readonly invites: AdultInvitesService,
    private readonly config: AppConfigService,
  ) {}

  /** The client's membership (403 for anyone who isn't a client). */
  async membership(user: AuthUser) {
    const member = await this.prisma.clientMember.findUnique({
      where: { userId: user.id },
      include: { org: true },
    });
    if (!member || user.roleKey !== 'client') throw notMember();
    if (member.org.status !== 'ACTIVE') {
      throw new ForbiddenException({
        error: 'CLIENT_SUSPENDED',
        message: 'Your organisation’s account is paused. Contact us.',
      });
    }
    return member;
  }

  /** The organisation must have signed the current client agreement. */
  assertAgreement(org: { contractVersion: string | null }) {
    if (org.contractVersion !== HUB_AGREEMENTS.client) {
      throw new ConflictException({
        error: 'AGREEMENT_NEEDED',
        message: 'Sign the client agreement first.',
      });
    }
  }

  private assertOwner(member: { role: string }) {
    if (member.role !== 'OWNER') {
      throw new ForbiddenException({
        error: 'OWNER_ONLY',
        message: 'Only your organisation’s owner can do this.',
      });
    }
  }

  async orgDto(orgId: string): Promise<ClientOrgDto> {
    const org = await this.prisma.clientOrg.findUniqueOrThrow({
      where: { id: orgId },
      include: { contractSignedBy: { select: { displayName: true, email: true } } },
    });
    return {
      id: org.id,
      name: org.name,
      countryCode: org.countryCode,
      billingName: org.billingName,
      billingAddress: org.billingAddress,
      taxId: org.taxId,
      status: org.status,
      contract:
        org.contractVersion && org.contractSignedAt
          ? {
              version: org.contractVersion,
              signedAt: org.contractSignedAt,
              signedBy: org.contractSignedBy?.displayName ?? org.contractSignedBy?.email ?? '',
            }
          : null,
    };
  }

  async colleagues(orgId: string) {
    const members = await this.prisma.clientMember.findMany({
      where: { orgId, user: { deletedAt: null } },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, displayName: true, email: true, passwordHash: true } },
      },
    });
    return members.map((m) => ({
      id: m.user.id,
      name: m.user.displayName ?? '',
      email: m.user.email ?? '',
      role: m.role,
      invited: m.user.passwordHash === null,
    }));
  }

  async me(user: AuthUser): Promise<ClientMeDto> {
    const member = await this.membership(user);
    return {
      org: await this.orgDto(member.orgId),
      role: member.role,
      agreementVersion: HUB_AGREEMENTS.client,
      needsAgreement: member.org.contractVersion !== HUB_AGREEMENTS.client,
      colleagues: await this.colleagues(member.orgId),
    };
  }

  async signAgreement(user: AuthUser, version: string, ctx: RequestContext): Promise<ClientMeDto> {
    const member = await this.membership(user);
    this.assertOwner(member);
    if (version !== HUB_AGREEMENTS.client) {
      throw new ConflictException({
        error: 'AGREEMENT_CHANGED',
        message: 'The agreement has changed: read the new version.',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.clientOrg.update({
        where: { id: member.orgId },
        data: {
          contractVersion: version,
          contractSignedAt: new Date(),
          contractSignedById: user.id,
        },
      });
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'client.agreement',
          entityType: 'ClientOrg',
          entityId: member.orgId,
          after: { version },
          context: ctx,
        },
        tx,
      );
    });
    return this.me(user);
  }

  async updateOrg(
    user: AuthUser,
    dto: UpdateClientOrgDto,
    ctx: RequestContext,
  ): Promise<ClientMeDto> {
    const member = await this.membership(user);
    this.assertOwner(member);
    const data = Object.fromEntries(
      Object.entries(dto)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [
          key,
          (value as string).trim() || (key === 'name' ? undefined : null),
        ]),
    ) as Prisma.ClientOrgUpdateInput;
    await this.prisma.$transaction(async (tx) => {
      await tx.clientOrg.update({ where: { id: member.orgId }, data });
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'client.update',
          entityType: 'ClientOrg',
          entityId: member.orgId,
          before: {
            name: member.org.name,
            billingName: member.org.billingName,
            billingAddress: member.org.billingAddress,
            taxId: member.org.taxId,
          },
          after: data as Prisma.InputJsonObject,
          context: ctx,
        },
        tx,
      );
    });
    return this.me(user);
  }

  /** The owner invites a colleague to the organisation's client portal. */
  async inviteColleague(
    user: AuthUser,
    dto: InviteColleagueDto,
    ctx: RequestContext,
  ): Promise<ClientMeDto> {
    const member = await this.membership(user);
    this.assertOwner(member);
    const count = await this.prisma.clientMember.count({ where: { orgId: member.orgId } });
    if (count >= 10) {
      throw new ConflictException({
        error: 'TOO_MANY_PEOPLE',
        message: 'Up to 10 people per organisation.',
      });
    }
    const inviter = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { languageCode: true },
    });
    await this.invites.invite(
      {
        email: dto.email.toLowerCase(),
        displayName: dto.displayName.trim(),
        languageCode: inviter.languageCode,
        roleKey: 'client',
        countryCode: member.org.countryCode,
      },
      user,
      ctx,
      (tx, userId) =>
        tx.clientMember.create({ data: { orgId: member.orgId, userId, role: 'MEMBER' } }),
    );
    return this.me(user);
  }

  // ── Requests from the marketing site ─────────────────────────────────────

  /**
   * A request from the "Hire our students" page: kept unconfirmed, with a link by
   * email that sends it to the queue. Bots (the hidden field filled in) are dropped
   * without a word.
   */
  async publicIntake(dto: PublicIntakeDto): Promise<void> {
    if (dto.website?.trim()) {
      this.logger.warn('A hub request with the hidden field filled in was dropped');
      return;
    }
    const token = randomToken();
    const email = dto.contactEmail.toLowerCase();
    await this.prisma.hubIntake.create({
      data: {
        source: 'SITE',
        status: 'UNCONFIRMED',
        contactName: dto.contactName.trim(),
        contactEmail: email,
        company: dto.company.trim(),
        countryCode: dto.countryCode ?? null,
        languageCode: dto.languageCode,
        title: dto.title.trim(),
        brief: dto.brief.trim(),
        budget: dto.budget,
        deadline: dto.deadline ? new Date(`${dto.deadline}T00:00:00Z`) : null,
        tokenHash: sha256(token),
        tokenExpiresAt: new Date(Date.now() + CONFIRM_DAYS * DAY),
      },
    });
    const language = toMailLanguage(dto.languageCode);
    await this.mail.send({
      to: email,
      template: 'hubIntakeConfirm',
      language,
      params: {
        name: dto.contactName.trim(),
        actionUrl: `${this.config.get('SITE_URL').replace(/\/+$/, '')}/${language}/hire/confirm?token=${encodeURIComponent(token)}`,
        vars: { title: dto.title.trim() },
      },
    });
  }

  async confirmIntake(token: string): Promise<void> {
    const intake = await this.prisma.hubIntake.findUnique({ where: { tokenHash: sha256(token) } });
    if (!intake)
      throw new NotFoundException({ error: 'LINK_NOT_FOUND', message: 'This link isn’t valid.' });
    if (!intake.tokenExpiresAt || intake.tokenExpiresAt < new Date()) {
      throw new GoneException({ error: 'LINK_EXPIRED', message: 'This link has expired.' });
    }
    await this.prisma.hubIntake.updateMany({
      where: { id: intake.id, status: 'UNCONFIRMED' },
      data: { status: 'NEW', tokenHash: null, tokenExpiresAt: null },
    });
  }

  /** Unconfirmed requests whose link ran out (they hold a stranger's email address). */
  async forgetUnconfirmed(now = new Date()): Promise<number> {
    const { count } = await this.prisma.hubIntake.deleteMany({
      where: { status: 'UNCONFIRMED', tokenExpiresAt: { lt: now } },
    });
    return count;
  }

  @Cron('45 3 * * *', { name: 'hub-intake-cleanup', timeZone: 'UTC' })
  async cleanupScheduled() {
    try {
      await this.forgetUnconfirmed();
    } catch (error) {
      this.logger.error(`Hub request cleanup failed: ${(error as Error).message}`);
    }
  }

  // ── Requests from the client portal ──────────────────────────────────────

  async intakes(user: AuthUser): Promise<IntakeDto[]> {
    const member = await this.membership(user);
    const rows = await this.prisma.hubIntake.findMany({
      where: { orgId: member.orgId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { project: { select: { id: true } } },
    });
    return rows.map(intakeDto);
  }

  private async ownIntake(user: AuthUser, id: string) {
    const member = await this.membership(user);
    const intake = await this.prisma.hubIntake.findFirst({
      where: { id, orgId: member.orgId },
      include: { project: { select: { id: true } } },
    });
    if (!intake)
      throw new NotFoundException({ error: 'INTAKE_NOT_FOUND', message: 'No such request.' });
    return { member, intake };
  }

  async intake(user: AuthUser, id: string): Promise<IntakeDto> {
    return intakeDto((await this.ownIntake(user, id)).intake);
  }

  async createIntake(user: AuthUser, dto: CreateIntakeDto): Promise<IntakeDto> {
    const member = await this.membership(user);
    this.assertAgreement(member.org);
    const account = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const intake = await this.prisma.hubIntake.create({
      data: {
        source: 'PORTAL',
        status: 'NEW',
        orgId: member.orgId,
        createdById: user.id,
        contactName: account.displayName ?? '',
        contactEmail: account.email ?? '',
        company: member.org.name,
        countryCode: member.org.countryCode,
        languageCode: account.languageCode,
        title: dto.title.trim(),
        brief: dto.brief.trim(),
        budget: dto.budget,
        deadline: dto.deadline ? new Date(`${dto.deadline}T00:00:00Z`) : null,
      },
      include: { project: { select: { id: true } } },
    });
    return intakeDto(intake);
  }

  /** Adds a file to a request while it waits in the queue. */
  async addFile(
    user: AuthUser,
    id: string,
    body: Buffer | undefined,
    rawName: string | undefined,
  ): Promise<IntakeDto> {
    const { intake } = await this.ownIntake(user, id);
    if (intake.status !== 'NEW') {
      throw new ConflictException({
        error: 'INTAKE_DECIDED',
        message: 'This request was decided already.',
      });
    }
    if (!body?.length)
      throw new BadRequestException({ error: 'EMPTY_FILE', message: 'The file is empty.' });
    if (body.length > HUB_INTAKE_FILE_MAX_BYTES) {
      throw new BadRequestException({
        error: 'FILE_TOO_LARGE',
        message: 'Files can be up to 10 MB.',
      });
    }
    const type = intakeFileType(body);
    if (!type) {
      throw new BadRequestException({
        error: 'FILE_TYPE',
        message: 'Send a PDF, a PNG or JPEG picture, or a text file.',
      });
    }
    const fileId = randomUUID();
    const key = `hub/intakes/${intake.id}/${fileId}`;
    await this.storage.putBinary(key, body, type);
    const saved = await this.prisma.$transaction(async (tx) => {
      // The request's row is locked while its file list changes (two uploads at once).
      await tx.$queryRaw`SELECT id FROM hub_intakes WHERE id = ${intake.id}::uuid FOR UPDATE`;
      const current = await tx.hubIntake.findUniqueOrThrow({ where: { id: intake.id } });
      const files = (current.files ?? []) as unknown as StoredFile[];
      if (files.length >= HUB_INTAKE_MAX_FILES) return null;
      const next: StoredFile[] = [
        ...files,
        { id: fileId, key, name: safeFileName(rawName), size: body.length, type },
      ];
      return tx.hubIntake.update({
        where: { id: intake.id },
        data: { files: next as unknown as Prisma.InputJsonArray },
        include: { project: { select: { id: true } } },
      });
    });
    if (!saved) {
      await this.storage.deleteKey(key).catch(() => undefined);
      throw new ConflictException({
        error: 'TOO_MANY_FILES',
        message: 'Up to 5 files per request.',
      });
    }
    return intakeDto(saved);
  }

  async removeFile(user: AuthUser, id: string, fileId: string): Promise<IntakeDto> {
    const { intake } = await this.ownIntake(user, id);
    if (intake.status !== 'NEW') {
      throw new ConflictException({
        error: 'INTAKE_DECIDED',
        message: 'This request was decided already.',
      });
    }
    const files = (intake.files ?? []) as unknown as StoredFile[];
    const file = files.find((f) => f.id === fileId);
    if (!file) throw new NotFoundException({ error: 'FILE_NOT_FOUND', message: 'No such file.' });
    const saved = await this.prisma.hubIntake.update({
      where: { id: intake.id },
      data: { files: files.filter((f) => f.id !== fileId) as unknown as Prisma.InputJsonArray },
      include: { project: { select: { id: true } } },
    });
    await this.storage.deleteKey(file.key).catch(() => undefined);
    return intakeDto(saved);
  }

  /** A file of a request, for the client or staff. */
  async file(intakeId: string, fileId: string, orgId: string | null) {
    const intake = await this.prisma.hubIntake.findFirst({
      where: { id: intakeId, ...(orgId ? { orgId } : {}) },
    });
    const file = ((intake?.files ?? []) as unknown as StoredFile[]).find((f) => f.id === fileId);
    if (!intake || !file)
      throw new NotFoundException({ error: 'FILE_NOT_FOUND', message: 'No such file.' });
    const body = await this.storage.getBinary(file.key);
    if (!body) throw new NotFoundException({ error: 'FILE_NOT_FOUND', message: 'No such file.' });
    return { body, name: file.name, type: file.type };
  }

  async clientFile(user: AuthUser, intakeId: string, fileId: string) {
    const member = await this.membership(user);
    return this.file(intakeId, fileId, member.orgId);
  }
}
