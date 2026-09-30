import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { subject } from '@casl/ability';
import { type ConsentType, Prisma, ROLE_KEYS } from '@kcp/database';
import {
  allowedBirthYears,
  AVATAR_KEYS,
  type ChildConsent,
  MAX_CHILDREN_PER_PARENT,
  MAX_TRIALS_PER_FAMILY,
  TRIAL_DAYS,
} from '@kcp/shared';
import { AuditService } from '../audit/audit.service.js';
import { TERMS_VERSION } from '../auth/auth.constants.js';
import { BillingService } from '../billing/billing.service.js';
import { EntitlementsService, type PremiumStatus } from '../billing/entitlements.service.js';
import { SessionService } from '../auth/session.service.js';
import { assertStrongPassword } from '../auth/password-policy.js';
import { hashPassword } from '../common/crypto/passwords.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service.js';
import type { AppAbility } from '../permissions/ability.factory.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { LeaderboardService } from '../progress/leaderboard.service.js';
import { ProgressService } from '../progress/progress.service.js';
import { levelFor, localDay, visibleStreak } from '../progress/xp-rules.js';
import { StorageService } from '../storage/storage.service.js';
import type {
  ChildConsentsDto,
  ChildDto,
  ChildRulesDto,
  ConsentRecordDto,
  CreateChildDto,
  UpdateChildDto,
} from './dto/children.dto.js';
import { checkNickname, generateUsername, suggestNicknames } from './nickname-policy.js';

/** A family can't grow endlessly (limits abuse of the sign-up flow). */

const CONSENT_TYPES: Record<ChildConsent, ConsentType> = {
  publicLeaderboards: 'PUBLIC_LEADERBOARDS',
  publicPortfolio: 'PUBLIC_PORTFOLIO',
};

const childInclude = {
  studentProfile: true,
  streak: true,
  country: { select: { timezone: true } },
  parentLinks: { select: { parentId: true } },
  _count: { select: { lessonProgress: { where: { status: 'COMPLETED' } }, badges: true } },
} satisfies Prisma.UserInclude;

type LoadedChild = Prisma.UserGetPayload<{ include: typeof childInclude }>;

/** The attributes permission rules check on a Child (see permission-matrix.ts). */
export function childSubject(child: Pick<LoadedChild, 'id' | 'parentLinks'>) {
  return subject('Child', {
    id: child.id,
    parentIds: child.parentLinks.map((link) => link.parentId),
  });
}

function toChildDto(
  child: LoadedChild,
  levels: { number: number; minXp: number }[],
  premium: PremiumStatus,
): ChildDto {
  const profile = child.studentProfile;
  if (!profile || !child.username) {
    throw new NotFoundException('Child not found.');
  }
  return {
    id: child.id,
    username: child.username,
    nickname: profile.nickname,
    avatarKey: profile.avatarKey,
    birthYear: profile.birthYear,
    languageCode: child.languageCode,
    countryCode: child.countryCode,
    regionId: child.regionId,
    cityId: child.cityId,
    status: child.status,
    consents: {
      publicLeaderboards: profile.showOnPublicBoards,
      publicPortfolio: profile.publicPortfolio,
    },
    createdAt: child.createdAt,
    lastLoginAt: child.lastLoginAt,
    lessonsCompleted: child._count.lessonProgress,
    premiumUntil: premium.until,
    premiumSource: premium.source,
    trialEndsAt: premium.trialEndsAt,
    xpTotal: profile.xpTotal,
    level: levelFor(profile.xpTotal, levels).number,
    badges: child._count.badges,
    streakReminders: profile.streakReminders,
    streak: visibleStreak(
      {
        current: child.streak?.current ?? 0,
        longest: child.streak?.longest ?? 0,
        lastGoalDay: child.streak?.lastGoalDay?.toISOString().slice(0, 10) ?? null,
        freezes: child.streak?.freezes ?? 0,
      },
      localDay(new Date(), child.country?.timezone ?? 'UTC'),
    ),
  };
}

const nicknameMessages = {
  INVALID_FORMAT: 'Use 3–20 letters, digits or _, starting with a letter.',
  INAPPROPRIATE: 'Please choose a different nickname.',
  LOOKS_LIKE_REAL_NAME:
    'This looks like a real name. Pick a nickname that doesn’t reveal who your child is.',
  CONTAINS_CONTACT_INFO: 'Nicknames can’t contain links, social media names or long numbers.',
} as const;

/**
 * Child accounts, managed by their parent. Every change is recorded in the audit
 * log, and every consent switch in the append-only consent records.
 */
@Injectable()
export class ChildrenService {
  private readonly logger = new Logger(ChildrenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sessions: SessionService,
    private readonly flags: FeatureFlagsService,
    private readonly progress: ProgressService,
    private readonly leaderboards: LeaderboardService,
    private readonly storage: StorageService,
    private readonly entitlements: EntitlementsService,
    private readonly billing: BillingService,
  ) {}

  private async dto(child: LoadedChild): Promise<ChildDto> {
    const [levels, premium] = await Promise.all([
      this.progress.levels(),
      this.entitlements.status(child.id),
    ]);
    return toChildDto(child, levels, premium);
  }

  async rules(parent: AuthUser): Promise<ChildRulesDto> {
    const parentCountry = await this.prisma.user.findUnique({
      where: { id: parent.id },
      select: { countryCode: true },
    });
    const under13Open = await this.flags.isEnabled('under_13_accounts', parentCountry?.countryCode);
    return {
      birthYears: allowedBirthYears(new Date().getUTCFullYear(), under13Open),
      avatarKeys: [...AVATAR_KEYS],
      under13Open,
    };
  }

  nicknameSuggestions(count = 6): string[] {
    return suggestNicknames(count);
  }

  async list(parent: AuthUser): Promise<ChildDto[]> {
    const children = await this.prisma.user.findMany({
      where: {
        kind: 'STUDENT',
        status: { not: 'DELETED' },
        parentLinks: { some: { parentId: parent.id } },
      },
      include: childInclude,
      orderBy: { createdAt: 'asc' },
    });
    const [levels, premium] = await Promise.all([
      this.progress.levels(),
      this.entitlements.statusMany(children.map((child) => child.id)),
    ]);
    const none = { active: false, source: null, until: null, trialEndsAt: null };
    return children.map((child) => toChildDto(child, levels, premium.get(child.id) ?? none));
  }

  async get(id: string, parent: AuthUser, ability: AppAbility): Promise<ChildDto> {
    return this.dto(await this.loadForParent(id, parent, ability, 'read'));
  }

  async create(dto: CreateChildDto, parent: AuthUser, ctx: RequestContext): Promise<ChildDto> {
    // Only a parent can give consent for their own child — not staff, whatever their role.
    if (parent.roleKey !== ROLE_KEYS.PARENT) {
      throw new ForbiddenException({
        error: 'PARENTS_ONLY',
        message: 'Only parent accounts can add children.',
      });
    }
    const parentUser = await this.prisma.user.findUniqueOrThrow({ where: { id: parent.id } });
    await this.assertNickname(dto.nickname, parentUser.displayName);

    const rules = await this.rules(parent);
    if (!rules.birthYears.includes(dto.birthYear)) {
      throw new BadRequestException({
        error: 'BIRTH_YEAR_NOT_ALLOWED',
        message: rules.under13Open
          ? 'This platform is for children aged 9 to 16.'
          : 'Accounts for children under 13 are not open yet.',
      });
    }
    await this.assertLanguage(dto.languageCode);
    await this.assertLocation(dto.countryCode, dto.regionId, dto.cityId);

    assertStrongPassword(dto.password, { nickname: dto.nickname, name: parentUser.displayName });
    const [studentRole, passwordHash] = await Promise.all([
      this.prisma.role.findUniqueOrThrow({ where: { key: ROLE_KEYS.STUDENT } }),
      hashPassword(dto.password),
    ]);
    const username = await this.uniqueUsername();
    const grants: ConsentType[] = [
      'ACCOUNT',
      ...(Object.keys(CONSENT_TYPES) as ChildConsent[])
        .filter((key) => dto.consents[key])
        .map((key) => CONSENT_TYPES[key]),
    ];

    const child = await this.withUniqueUsername(username, (candidate) =>
      this.prisma.$transaction(async (tx) => {
        // Lock the parent's row so two requests at once can't pass the family limit.
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${parent.id}::uuid FOR UPDATE`;
        // A free trial for each new child, up to the family's limit.
        const { trialsStarted } = await tx.user.findUniqueOrThrow({
          where: { id: parent.id },
          select: { trialsStarted: true },
        });
        const trial = trialsStarted < MAX_TRIALS_PER_FAMILY;
        const existing = await tx.parentChildLink.count({
          where: { parentId: parent.id, child: { status: { not: 'DELETED' } } },
        });
        if (existing >= MAX_CHILDREN_PER_PARENT) {
          throw new BadRequestException({
            error: 'TOO_MANY_CHILDREN',
            message: `A family can have up to ${MAX_CHILDREN_PER_PARENT} child accounts.`,
          });
        }
        const created = await tx.user.create({
          data: {
            kind: 'STUDENT',
            status: 'ACTIVE',
            roleId: studentRole.id,
            username: candidate,
            passwordHash,
            languageCode: dto.languageCode,
            countryCode: dto.countryCode,
            regionId: dto.regionId ?? null,
            cityId: dto.cityId ?? null,
            studentProfile: {
              create: {
                nickname: dto.nickname,
                avatarKey: dto.avatarKey,
                birthYear: dto.birthYear,
                showOnPublicBoards: dto.consents.publicLeaderboards,
                publicPortfolio: dto.consents.publicPortfolio,
                trialEndsAt: trial ? new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000) : null,
              },
            },
            parentLinks: { create: { parentId: parent.id, isPrimary: true } },
          },
          include: childInclude,
        });
        if (trial) {
          await tx.user.update({
            where: { id: parent.id },
            data: { trialsStarted: { increment: 1 } },
          });
        }
        await tx.consentRecord.createMany({
          data: grants.map((type) => ({
            parentId: parent.id,
            childId: created.id,
            type,
            policyVersion: TERMS_VERSION,
            method: 'EMAIL_CONFIRMATION' as const,
            ipAddress: ctx.ip ?? null,
            userAgent: ctx.userAgent ?? null,
          })),
        });
        await this.audit.record(
          {
            actor: { id: parent.id, roleKey: parent.roleKey },
            action: 'child.create',
            entityType: 'User',
            entityId: created.id,
            after: { consents: grants },
            context: ctx,
          },
          tx,
        );
        return created;
      }),
    );
    // Every child is covered by the family's plan; its price follows at renewal.
    await this.billing.childrenChanged(parent.id);
    return this.dto(child);
  }

  async update(
    id: string,
    dto: UpdateChildDto,
    parent: AuthUser,
    ability: AppAbility,
    ctx: RequestContext,
  ) {
    const child = await this.loadForParent(id, parent, ability, 'update');
    if (dto.nickname && dto.nickname !== child.studentProfile?.nickname) {
      const parentUser = await this.prisma.user.findUniqueOrThrow({ where: { id: parent.id } });
      await this.assertNickname(dto.nickname, parentUser.displayName);
    }
    if (dto.languageCode) await this.assertLanguage(dto.languageCode);
    if (dto.regionId !== undefined || dto.cityId !== undefined) {
      await this.assertLocation(child.countryCode ?? '', dto.regionId, dto.cityId);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id },
        data: {
          ...(dto.languageCode ? { languageCode: dto.languageCode } : {}),
          // Location changes as a pair: a region, and optionally a city in it.
          ...(dto.regionId !== undefined
            ? { regionId: dto.regionId, cityId: dto.cityId ?? null }
            : {}),
          studentProfile: {
            update: {
              ...(dto.nickname ? { nickname: dto.nickname } : {}),
              ...(dto.avatarKey ? { avatarKey: dto.avatarKey } : {}),
              ...(dto.streakReminders !== undefined
                ? { streakReminders: dto.streakReminders }
                : {}),
            },
          },
        },
        include: childInclude,
      });
      await this.audit.record(
        {
          actor: { id: parent.id, roleKey: parent.roleKey },
          action: 'child.update',
          entityType: 'User',
          entityId: id,
          after: { fields: Object.keys(dto) },
          context: ctx,
        },
        tx,
      );
      return result;
    });
    return this.dto(updated);
  }

  /**
   * Switches public leaderboards and public portfolio on or off. A switch turned on
   * adds a consent record; a switch turned off revokes the active one.
   */
  async setConsents(
    id: string,
    consents: ChildConsentsDto,
    parent: AuthUser,
    ability: AppAbility,
    ctx: RequestContext,
  ): Promise<ChildDto> {
    await this.loadForParent(id, parent, ability, 'update');

    const updated = await this.prisma.$transaction(async (tx) => {
      // Read the current switches under a row lock, so two quick toggles can't leave
      // the profile public while its consent record is revoked.
      await tx.$queryRaw`SELECT user_id FROM student_profiles WHERE user_id = ${id}::uuid FOR UPDATE`;
      const current = await tx.studentProfile.findUniqueOrThrow({ where: { userId: id } });
      const before: Record<ChildConsent, boolean> = {
        publicLeaderboards: current.showOnPublicBoards,
        publicPortfolio: current.publicPortfolio,
      };
      for (const key of Object.keys(CONSENT_TYPES) as ChildConsent[]) {
        if (before[key] === consents[key]) continue;
        const type = CONSENT_TYPES[key];
        if (consents[key]) {
          await tx.consentRecord.create({
            data: {
              parentId: parent.id,
              childId: id,
              type,
              policyVersion: TERMS_VERSION,
              method: 'EMAIL_CONFIRMATION',
              ipAddress: ctx.ip ?? null,
              userAgent: ctx.userAgent ?? null,
            },
          });
        } else {
          await tx.consentRecord.updateMany({
            where: { childId: id, type, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
      }
      const result = await tx.user.update({
        where: { id },
        data: {
          studentProfile: {
            update: {
              showOnPublicBoards: consents.publicLeaderboards,
              publicPortfolio: consents.publicPortfolio,
              // A share link given out earlier must not come back to life later.
              ...(consents.publicPortfolio ? {} : { portfolioShareToken: null }),
            },
          },
        },
        include: childInclude,
      });
      await this.audit.record(
        {
          actor: { id: parent.id, roleKey: parent.roleKey },
          action: 'child.consent_change',
          entityType: 'User',
          entityId: id,
          before: { ...before },
          after: { ...consents },
          context: ctx,
        },
        tx,
      );
      return result;
    });
    await this.leaderboards.refreshStudent(id);
    return this.dto(updated);
  }

  async consentHistory(
    id: string,
    parent: AuthUser,
    ability: AppAbility,
  ): Promise<ConsentRecordDto[]> {
    await this.loadForParent(id, parent, ability, 'read');
    return this.prisma.consentRecord.findMany({
      where: { childId: id },
      orderBy: { grantedAt: 'desc' },
      select: {
        id: true,
        type: true,
        policyVersion: true,
        method: true,
        grantedAt: true,
        revokedAt: true,
      },
    });
  }

  /** Sets a new password and signs the child out of every device. */
  async resetPassword(
    id: string,
    password: string,
    parent: AuthUser,
    ability: AppAbility,
    ctx: RequestContext,
  ) {
    const child = await this.loadForParent(id, parent, ability, 'update');
    assertStrongPassword(password, {
      username: child.username,
      nickname: child.studentProfile?.nickname,
    });
    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash } });
      await this.audit.record(
        {
          actor: { id: parent.id, roleKey: parent.roleKey },
          action: 'child.password_reset',
          entityType: 'User',
          entityId: id,
          context: ctx,
        },
        tx,
      );
    });
    await this.sessions.revokeAllForUser(id);
  }

  /**
   * Deletes a child's account: personal data (nickname, birth year, location, login,
   * saved code) is removed and the family link dropped. Consent records stay as legal evidence,
   * and the anonymous account row keeps future progress data consistent.
   */
  async delete(
    id: string,
    confirmNickname: string,
    parent: AuthUser,
    ability: AppAbility,
    ctx: RequestContext,
  ) {
    const child = await this.loadForParent(id, parent, ability, 'delete');
    if (confirmNickname.trim().toLowerCase() !== child.studentProfile?.nickname.toLowerCase()) {
      throw new BadRequestException({
        error: 'CONFIRMATION_MISMATCH',
        message: 'Type your child’s nickname exactly to confirm.',
      });
    }
    await this.remove(id, parent, ctx);
  }

  /**
   * Removes a child's account (the caller checked it's the parent's child): used when
   * the parent deletes the child, and when the parent deletes their whole account.
   */
  async remove(
    id: string,
    parent: Pick<AuthUser, 'id' | 'roleKey'>,
    ctx: RequestContext,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.consentRecord.updateMany({
        where: { childId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.studentProfile.delete({ where: { userId: id } });
      await tx.parentChildLink.deleteMany({ where: { childId: id } });
      await tx.verificationToken.deleteMany({ where: { userId: id } });
      // The child's code and messages can contain anything they typed; lesson
      // progress, XP and streaks stay, anonymous.
      await tx.challengeDraft.deleteMany({ where: { userId: id } });
      await tx.submission.deleteMany({ where: { userId: id } });
      await tx.portfolioItem.deleteMany({ where: { userId: id } });
      await tx.project.deleteMany({ where: { userId: id } });
      await tx.feedback.deleteMany({ where: { userId: id } });
      // Certificates show the nickname to anyone with the code: they go too (checking
      // the code then finds nothing). So do the child's notifications, and the
      // parents' ones that name the child.
      await tx.certificate.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { data: { path: ['childId'], equals: id } } });
      await tx.user.update({
        where: { id },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
          username: `deleted-${id}`,
          passwordHash: null,
          countryCode: null,
          regionId: null,
          cityId: null,
        },
      });
      // No personal data in the audit trail: it outlives the account.
      await this.audit.record(
        {
          actor: { id: parent.id, roleKey: parent.roleKey },
          action: 'child.delete',
          entityType: 'User',
          entityId: id,
          context: ctx,
        },
        tx,
      );
    });
    // Sessions hold the child's IP addresses and devices: remove them, don't just end them.
    await this.sessions.deleteAllForUser(id);
    await this.billing.childrenChanged(parent.id);
    await this.leaderboards.refreshStudent(id);
    // Shipped project files. If storage is down, the rows are gone already and the
    // files can't be reached; the nightly sweep (ProjectsService) deletes them again.
    try {
      await this.storage.deletePrefix(`projects/${id}/`);
    } catch (error) {
      this.logger.warn(
        `Could not delete project files of a deleted child: ${(error as Error).message}`,
      );
    }
  }

  /** Checks the caller is this child's parent (404 otherwise), for routes on the child. */
  async assertParentOf(
    id: string,
    parent: AuthUser,
    ability: AppAbility,
    action: 'read' | 'update',
  ): Promise<void> {
    await this.loadForParent(id, parent, ability, action);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Loads a child for the family routes. They act on behalf of the child's own parent,
   * so the caller must be linked to the child as well as allowed by their rules —
   * staff (even super admins) use the admin endpoints instead. Anything else looks
   * like it doesn't exist.
   */
  private async loadForParent(
    id: string,
    parent: AuthUser,
    ability: AppAbility,
    action: 'read' | 'update' | 'delete',
  ): Promise<LoadedChild> {
    const child = await this.prisma.user.findFirst({
      where: { id, kind: 'STUDENT', status: { not: 'DELETED' } },
      include: childInclude,
    });
    const isOwnChild = child?.parentLinks.some((link) => link.parentId === parent.id) ?? false;
    if (!child || !isOwnChild || !ability.can(action, childSubject(child))) {
      throw new NotFoundException('Child not found.');
    }
    return child;
  }

  /** Runs `create` with a fresh username until it doesn't collide (very rare). */
  private async withUniqueUsername<T>(
    first: string,
    create: (username: string) => Promise<T>,
  ): Promise<T> {
    let username = first;
    for (let attempt = 1; ; attempt++) {
      try {
        return await create(username);
      } catch (error) {
        const collision =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < 5;
        if (!collision) throw error;
        username = await this.uniqueUsername();
      }
    }
  }

  private async assertNickname(nickname: string, parentName: string | null): Promise<void> {
    const problem = checkNickname(nickname, parentName);
    if (problem) {
      throw new BadRequestException({
        error: `NICKNAME_${problem}`,
        message: nicknameMessages[problem],
      });
    }
  }

  private async assertLanguage(code: string): Promise<void> {
    const language = await this.prisma.language.findFirst({ where: { code, isActive: true } });
    if (!language) {
      throw new BadRequestException({
        error: 'UNSUPPORTED_LANGUAGE',
        message: 'This language is not available yet.',
      });
    }
  }

  private async assertLocation(
    countryCode: string,
    regionId?: string,
    cityId?: string,
  ): Promise<void> {
    const country = await this.prisma.country.findFirst({
      where: { code: countryCode, isActive: true },
    });
    if (!country) {
      throw new BadRequestException({
        error: 'UNSUPPORTED_COUNTRY',
        message: 'We are not open in this country yet.',
      });
    }
    if (cityId && !regionId) {
      throw new BadRequestException({
        error: 'INVALID_LOCATION',
        message: 'Choose a region for this city.',
      });
    }
    if (regionId) {
      const region = await this.prisma.region.findFirst({ where: { id: regionId, countryCode } });
      const city = cityId
        ? await this.prisma.city.findFirst({ where: { id: cityId, regionId } })
        : true;
      if (!region || !city) {
        throw new BadRequestException({
          error: 'INVALID_LOCATION',
          message: 'This region or city is not in that country.',
        });
      }
    }
  }

  private async uniqueUsername(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const username = generateUsername();
      if (!(await this.prisma.user.findUnique({ where: { username }, select: { id: true } }))) {
        return username;
      }
    }
    throw new ConflictException('Could not create a unique username. Please try again.');
  }
}
