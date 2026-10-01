import type { PayoutAccount, Prisma } from '@kcp/database';
import { ibanValid, normaliseIban, PAYOUT_COOLING_HOURS } from '@kcp/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { verifyPassword } from '../common/crypto/passwords.js';
import { SecretBox } from '../common/crypto/secret-box.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type {
  AdminPayoutAccountDto,
  PayoutAccountDetailsDto,
  PayoutAccountDto,
  SetPayoutAccountDto,
} from './dto/payouts.dto.js';

const HOUR = 3_600_000;

/** What's encrypted: the holder's name and the IBAN (or the other details). */
interface AccountDetails {
  holderName: string;
  iban?: string;
  details?: string;
}

type Tx = Prisma.TransactionClient;

const accountNotFound = () =>
  new NotFoundException({ error: 'ACCOUNT_NOT_FOUND', message: 'No such payout account.' });

/** Whether an account can be paid now: live, past its cooling-off time, and checked by staff. */
export function accountState(account: PayoutAccount, now = new Date()) {
  if (account.usableFrom > now) return 'COOLING' as const;
  if (!account.verifiedAt) return 'CHECKING' as const;
  return 'READY' as const;
}

/**
 * Parents' payout accounts. Changing one needs the password again, stops payouts waiting
 * for the old account, emails the parent, and the new one can be paid only after 48
 * hours and once staff have checked it — so a stolen session can't quietly redirect a
 * child's earnings.
 */
@Injectable()
export class PayoutAccountsService {
  private readonly logger = new Logger(PayoutAccountsService.name);
  private readonly box: SecretBox;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
  ) {
    this.box = new SecretBox(config.get('ENCRYPTION_KEY'));
  }

  details(account: PayoutAccount): AccountDetails {
    // Wiped when the parent's account was deleted.
    if (!account.detailsCipher) return { holderName: '' };
    return JSON.parse(this.box.decrypt(account.detailsCipher)) as AccountDetails;
  }

  private dto(account: PayoutAccount, now = new Date()): PayoutAccountDto {
    return {
      id: account.id,
      kind: account.kind,
      holderName: this.details(account).holderName,
      currency: account.currency,
      countryCode: account.countryCode,
      last4: account.last4,
      usableFrom: account.usableFrom,
      state: accountState(account, now),
      createdAt: account.createdAt,
    };
  }

  /** The parent's live account. */
  live(parentId: string, db: PrismaService | Tx = this.prisma) {
    return db.payoutAccount.findFirst({ where: { parentId, removedAt: null } });
  }

  async get(user: AuthUser): Promise<PayoutAccountDto | null> {
    this.assertParent(user);
    const account = await this.live(user.id);
    return account ? this.dto(account) : null;
  }

  private assertParent(user: AuthUser) {
    if (user.roleKey !== 'parent') {
      throw new ForbiddenException({
        error: 'PARENTS_ONLY',
        message: 'Only parents have payout accounts.',
      });
    }
  }

  private async checkPassword(user: AuthUser, password: string) {
    const parent = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!parent.passwordHash || !(await verifyPassword(parent.passwordHash, password))) {
      throw new BadRequestException({
        error: 'WRONG_PASSWORD',
        message: 'Your password is not right.',
      });
    }
  }

  /** Sets (or replaces) the parent's payout account. */
  async set(
    user: AuthUser,
    dto: SetPayoutAccountDto,
    ctx: RequestContext,
  ): Promise<PayoutAccountDto> {
    this.assertParent(user);
    await this.checkPassword(user, dto.password);
    let details: AccountDetails;
    let countryCode: string;
    let last4: string;
    if (dto.kind === 'IBAN') {
      const iban = normaliseIban(dto.iban ?? '');
      if (!ibanValid(iban)) {
        throw new BadRequestException({
          error: 'BAD_IBAN',
          message: 'That IBAN isn’t right: check it.',
        });
      }
      details = { holderName: dto.holderName.trim(), iban };
      countryCode = iban.slice(0, 2);
      last4 = iban.slice(-4);
    } else {
      const text = dto.details?.trim() ?? '';
      if (text.length < 5 || !dto.countryCode) {
        throw new BadRequestException({
          error: 'DETAILS_NEEDED',
          message: 'Say how to pay you, and the country.',
        });
      }
      details = { holderName: dto.holderName.trim(), details: text };
      countryCode = dto.countryCode;
      const digits = text.replace(/\s/g, '');
      last4 = digits.slice(-4);
    }
    if (!Intl.supportedValuesOf('currency').includes(dto.currency)) {
      throw new BadRequestException({ error: 'BAD_CURRENCY', message: 'Unknown currency.' });
    }
    const now = new Date();
    const account = await this.prisma.$transaction(async (tx) => {
      await this.retire(tx, user.id, now);
      return tx.payoutAccount.create({
        data: {
          parentId: user.id,
          kind: dto.kind,
          currency: dto.currency,
          countryCode,
          detailsCipher: this.box.encrypt(JSON.stringify(details)),
          last4,
          usableFrom: new Date(now.getTime() + PAYOUT_COOLING_HOURS * HOUR),
        },
      });
    });
    await this.audit.record({
      actor: { id: user.id, roleKey: user.roleKey },
      action: 'payout_account.set',
      entityType: 'PayoutAccount',
      entityId: account.id,
      after: { kind: account.kind, currency: account.currency, countryCode, last4 },
      context: ctx,
    });
    await this.tell(user.id, last4);
    return this.dto(account, now);
  }

  /** The parent removes their account: nothing can be paid until they set a new one. */
  async remove(user: AuthUser, password: string, ctx: RequestContext): Promise<void> {
    this.assertParent(user);
    await this.checkPassword(user, password);
    const removed = await this.prisma.$transaction((tx) => this.retire(tx, user.id, new Date()));
    if (!removed) throw accountNotFound();
    await this.audit.record({
      actor: { id: user.id, roleKey: user.roleKey },
      action: 'payout_account.remove',
      entityType: 'PayoutAccount',
      entityId: removed.id,
      context: ctx,
    });
  }

  /**
   * Retires the parent's live account (if any): payouts waiting for it stop, and the
   * money stays payable for the next round. Payouts of a batch already sent stay as they
   * are (staff may be paying them by hand right now): staff record or cancel them.
   */
  async retire(tx: Tx, parentId: string, now: Date): Promise<PayoutAccount | null> {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${parentId}::uuid FOR UPDATE`;
    const live = await tx.payoutAccount.findFirst({ where: { parentId, removedAt: null } });
    if (!live) return null;
    await tx.payoutAccount.update({ where: { id: live.id }, data: { removedAt: now } });
    await tx.payout.updateMany({
      where: {
        accountId: live.id,
        status: { in: ['AWAITING_PARENT', 'CONFIRMED'] },
        batch: { status: { in: ['DRAFT', 'APPROVED'] } },
      },
      data: { status: 'CANCELLED', failureReason: 'ACCOUNT_CHANGED' },
    });
    return live;
  }

  private async tell(parentId: string, last4: string) {
    const parent = await this.prisma.user.findUnique({
      where: { id: parentId },
      select: { email: true, displayName: true, languageCode: true },
    });
    if (!parent?.email) return;
    const language = toMailLanguage(parent.languageCode);
    await this.mail
      .send({
        to: parent.email,
        template: 'hubPayoutAccountChanged',
        language,
        params: {
          name: parent.displayName ?? '',
          actionUrl: `${this.config.get('WEB_APP_URL').replace(/\/+$/, '')}/${language}/payouts`,
          vars: { last4 },
        },
      })
      .catch((error: Error) => this.logger.warn(`Account change email not sent: ${error.message}`));
  }

  // ── Staff ────────────────────────────────────────────────────────────────

  async list(
    show: 'waiting' | 'all' = 'waiting',
    where: Prisma.PayoutAccountWhereInput = {},
  ): Promise<AdminPayoutAccountDto[]> {
    const rows = await this.prisma.payoutAccount.findMany({
      where: { ...(show === 'waiting' ? { removedAt: null, verifiedAt: null } : {}), ...where },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { parent: { select: { displayName: true, email: true } } },
    });
    return rows.map((row) => ({
      ...this.dto(row),
      parentId: row.parentId,
      parentName: row.parent.displayName ?? '',
      parentEmail: row.parent.email,
      verifiedAt: row.verifiedAt,
      removedAt: row.removedAt,
    }));
  }

  /** The full details, for checking with the parent (every look is in the audit log). */
  async reveal(staff: AuthUser, id: string, ctx: RequestContext): Promise<PayoutAccountDetailsDto> {
    const account = await this.prisma.payoutAccount.findUnique({ where: { id } });
    if (!account) throw accountNotFound();
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: 'payout_account.reveal',
      entityType: 'PayoutAccount',
      entityId: id,
      context: ctx,
    });
    const details = this.details(account);
    return {
      holderName: details.holderName,
      iban: details.iban ?? null,
      details: details.details ?? null,
    };
  }

  /** Staff checked the account with the parent (a call, a document). */
  async verify(staff: AuthUser, id: string, ctx: RequestContext): Promise<AdminPayoutAccountDto> {
    const done = await this.prisma.payoutAccount.updateMany({
      where: { id, removedAt: null, verifiedAt: null },
      data: { verifiedAt: new Date(), verifiedById: staff.id },
    });
    if (!done.count) {
      const account = await this.prisma.payoutAccount.findUnique({ where: { id } });
      if (!account) throw accountNotFound();
      throw new ConflictException({
        error: account.removedAt ? 'ACCOUNT_REMOVED' : 'ACCOUNT_VERIFIED',
        message: account.removedAt ? 'The parent removed this account.' : 'Checked already.',
      });
    }
    await this.audit.record({
      actor: { id: staff.id, roleKey: staff.roleKey },
      action: 'payout_account.verify',
      entityType: 'PayoutAccount',
      entityId: id,
      context: ctx,
    });
    return (await this.list('all', { id }))[0]!;
  }
}
