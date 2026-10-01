import { HUB_AGREEMENTS, REVIEW_CRITERIA, REVIEW_SCORE_MAX } from '@kcp/shared';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { EntitlementsService } from '../billing/entitlements.service.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { READINESS_TRACK } from '../readiness/brief.js';
import type {
  HubCandidateDto,
  HubEligibilityDto,
  HubFamilyChildDto,
  HubRulesDto,
  HubStep,
  HubStudentAdminDto,
  UpdateHubRulesDto,
} from './dto/eligibility.dto.js';
import { HUB_STEPS } from './dto/eligibility.dto.js';
import { ageOf, COUNTRY_HUB_SELECT, type CountryHub, isLeadDeveloper } from './hub-rules.js';

const READINESS_MAX = REVIEW_CRITERIA.READINESS.length * REVIEW_SCORE_MAX;
const HUB_CONSENTS = ['HUB_WORK', 'EARNINGS'] as const;

const childNotFound = () =>
  new NotFoundException({ error: 'CHILD_NOT_FOUND', message: 'No such child.' });

export function rulesDto(country: CountryHub): HubRulesDto {
  return {
    countryCode: country.code,
    timeZone: country.timezone,
    enabled: country.hubEnabled,
    minAge: country.hubMinAge,
    weeklyMinutes: country.hubWeeklyMinutes,
    dayStartMinute: country.hubDayStartMinute,
    dayEndMinute: country.hubDayEndMinute,
    schoolDays: country.hubSchoolDays,
    schoolStartMinute: country.hubSchoolStartMinute,
    schoolEndMinute: country.hubSchoolEndMinute,
    studentPercent: country.hubStudentPercent,
    leadPercent: country.hubLeadPercent,
    platformPercent: country.hubPlatformPercent,
    holdDays: country.hubHoldDays,
    withholdingBp: country.hubWithholdingBp,
  };
}

/** What stops (or would stop) a student's hub work, worked out from the database now. */
export interface EligibilityState {
  studentId: string;
  steps: Record<HubStep, boolean>;
  eligible: boolean;
  eligibleAt: Date | null;
  pausedAt: Date | null;
  pausedReason: string | null;
  country: CountryHub | null;
  consentAt: Date | null;
  signedOffAt: Date | null;
  signedOffBy: string | null;
  signOffNote: string | null;
  readinessPassed: boolean;
}

/**
 * Who may do paid hub work. Every step is checked live (a consent taken back, premium
 * ending or staff pausing the student stops it at once); `eligibleAt` records the
 * first time all were done, with an audit entry for each approval along the way.
 */
@Injectable()
export class HubEligibilityService {
  private readonly logger = new Logger(HubEligibilityService.name);
  /** Other parts of the hub act when a student's hub work stops (leave projects, stop timers). */
  private readonly pausedHandlers: ((studentId: string, reason: string) => Promise<void>)[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly config: AppConfigService,
  ) {}

  onPaused(handler: (studentId: string, reason: string) => Promise<void>) {
    this.pausedHandlers.push(handler);
  }

  private async paused(studentId: string, reason: string) {
    for (const handler of this.pausedHandlers) {
      try {
        await handler(studentId, reason);
      } catch (error) {
        this.logger.error(`Hub pause handler failed for ${studentId}: ${(error as Error).message}`);
      }
    }
  }

  // ── Working out the steps ────────────────────────────────────────────────

  private async proTrackDone(studentIds: string[]): Promise<Set<string>> {
    const lessons = await this.prisma.lesson.findMany({
      where: {
        isActive: true,
        module: { trackId: READINESS_TRACK, isActive: true, publishedAt: { not: null } },
      },
      select: { id: true },
    });
    if (lessons.length === 0 || studentIds.length === 0) return new Set();
    const done = await this.prisma.lessonProgress.groupBy({
      by: ['userId'],
      where: {
        userId: { in: studentIds },
        status: 'COMPLETED',
        lessonId: { in: lessons.map((l) => l.id) },
      },
      _count: { _all: true },
    });
    return new Set(done.filter((d) => d._count._all >= lessons.length).map((d) => d.userId));
  }

  /** The state of many students at once (lists for staff and leads). */
  async states(studentIds: string[], now = new Date()): Promise<Map<string, EligibilityState>> {
    const result = new Map<string, EligibilityState>();
    if (studentIds.length === 0) return result;
    const [students, rows, passed, consents, pro, premium] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: studentIds }, kind: 'STUDENT' },
        select: {
          id: true,
          studentProfile: { select: { birthYear: true } },
          country: { select: COUNTRY_HUB_SELECT },
        },
      }),
      this.prisma.hubEligibility.findMany({
        where: { studentId: { in: studentIds } },
        include: { signedOffBy: { select: { displayName: true } } },
      }),
      this.prisma.readinessCheck.findMany({
        where: { studentId: { in: studentIds }, status: 'PASSED' },
        select: { studentId: true },
      }),
      this.prisma.consentRecord.findMany({
        where: {
          childId: { in: studentIds },
          type: { in: [...HUB_CONSENTS] },
          revokedAt: null,
          policyVersion: HUB_AGREEMENTS.parent,
        },
        select: { childId: true, type: true, grantedAt: true },
      }),
      this.proTrackDone(studentIds),
      this.entitlements.statusMany(studentIds, now),
    ]);
    const passedSet = new Set(passed.map((p) => p.studentId));
    for (const student of students) {
      const row = rows.find((r) => r.studentId === student.id);
      const mine = consents.filter((c) => c.childId === student.id);
      const consentAt = HUB_CONSENTS.every((type) => mine.some((c) => c.type === type))
        ? new Date(Math.max(...mine.map((c) => c.grantedAt.getTime())))
        : null;
      const country = student.country;
      const steps: Record<HubStep, boolean> = {
        PRO_TRACK: pro.has(student.id),
        READINESS: passedSet.has(student.id),
        SIGN_OFF: Boolean(row?.signedOffAt),
        PARENT_CONSENT: consentAt !== null,
        AGE: country ? ageOf(student.studentProfile?.birthYear, now) >= country.hubMinAge : false,
        PREMIUM: premium.get(student.id)?.active ?? false,
        COUNTRY: country?.hubEnabled ?? false,
      };
      result.set(student.id, {
        studentId: student.id,
        steps,
        eligible: HUB_STEPS.every((step) => steps[step]) && !row?.revokedAt,
        eligibleAt: row?.eligibleAt ?? null,
        pausedAt: row?.revokedAt ?? null,
        pausedReason: row?.revokedReason ?? null,
        country,
        consentAt,
        signedOffAt: row?.signedOffAt ?? null,
        signedOffBy: row?.signedOffBy?.displayName ?? null,
        signOffNote: row?.signOffNote ?? null,
        readinessPassed: passedSet.has(student.id),
      });
    }
    return result;
  }

  /**
   * One student's state; records `eligibleAt` (with an audit entry) the first time
   * every step is done.
   */
  async check(studentId: string, now = new Date()): Promise<EligibilityState> {
    const state = (await this.states([studentId], now)).get(studentId);
    if (!state)
      throw new NotFoundException({ error: 'STUDENT_NOT_FOUND', message: 'No such student.' });
    if (state.eligible && !state.eligibleAt) {
      const recorded = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.hubEligibility.updateMany({
          where: { studentId, eligibleAt: null },
          data: { eligibleAt: now },
        });
        if (updated.count) {
          await this.audit.record(
            {
              actor: null,
              action: 'hub.eligible',
              entityType: 'User',
              entityId: studentId,
              after: { steps: state.steps },
            },
            tx,
          );
        }
        return updated.count > 0;
      });
      if (recorded) {
        state.eligibleAt = now;
        await this.notifications.notify([studentId], 'hub_eligible', {});
      }
    }
    return state;
  }

  /** Whether the student may take hub work right now. */
  async isEligible(studentId: string, now = new Date()): Promise<boolean> {
    return (await this.check(studentId, now)).eligible;
  }

  toDto(state: EligibilityState): HubEligibilityDto {
    return {
      eligible: state.eligible,
      eligibleAt: state.eligibleAt,
      paused: state.pausedAt !== null,
      pausedAt: state.pausedAt,
      steps: HUB_STEPS.map((key) => ({ key, done: state.steps[key] })),
      rules: state.country ? rulesDto(state.country) : null,
      agreementVersion: HUB_AGREEMENTS.parent,
    };
  }

  // ── Students ─────────────────────────────────────────────────────────────

  async forStudent(user: AuthUser): Promise<HubEligibilityDto> {
    if (user.kind !== 'STUDENT') {
      throw new ForbiddenException({ error: 'STUDENTS_ONLY', message: 'For students only.' });
    }
    return this.toDto(await this.check(user.id));
  }

  // ── Parents ──────────────────────────────────────────────────────────────

  private async ownChild(parentId: string, childId: string) {
    const link = await this.prisma.parentChildLink.findFirst({
      where: { parentId, childId, child: { deletedAt: null } },
      select: {
        child: {
          select: {
            id: true,
            studentProfile: { select: { nickname: true, avatarKey: true } },
          },
        },
      },
    });
    if (!link) throw childNotFound();
    return link.child;
  }

  async family(user: AuthUser): Promise<HubFamilyChildDto[]> {
    const links = await this.prisma.parentChildLink.findMany({
      where: { parentId: user.id, child: { deletedAt: null } },
      orderBy: { createdAt: 'asc' },
      select: {
        child: {
          select: { id: true, studentProfile: { select: { nickname: true, avatarKey: true } } },
        },
      },
    });
    const states = await this.states(links.map((l) => l.child.id));
    return links.flatMap(({ child }) => {
      const state = states.get(child.id);
      if (!state) return [];
      return [this.familyDto(child, state)];
    });
  }

  private familyDto(
    child: { id: string; studentProfile: { nickname: string; avatarKey: string } | null },
    state: EligibilityState,
  ): HubFamilyChildDto {
    return {
      childId: child.id,
      nickname: child.studentProfile?.nickname ?? '',
      avatarKey: child.studentProfile?.avatarKey ?? '',
      readinessPassed: state.readinessPassed,
      signedOff: state.signedOffAt !== null,
      consent: state.consentAt
        ? { grantedAt: state.consentAt, version: HUB_AGREEMENTS.parent }
        : null,
      eligibility: this.toDto(state),
    };
  }

  async forChild(user: AuthUser, childId: string): Promise<HubFamilyChildDto> {
    const child = await this.ownChild(user.id, childId);
    return this.familyDto(child, await this.check(child.id));
  }

  /**
   * The parent agrees to the parent agreement: consent to paid work and to receiving
   * the earnings, recorded as two consent records (append-only). Only once the child
   * passed the readiness check, and only for the agreement's current version.
   */
  async consent(
    user: AuthUser,
    childId: string,
    version: string,
    ctx: RequestContext,
  ): Promise<HubFamilyChildDto> {
    const child = await this.ownChild(user.id, childId);
    if (version !== HUB_AGREEMENTS.parent) {
      throw new ConflictException({
        error: 'AGREEMENT_CHANGED',
        message: 'The agreement has changed: read the new version.',
      });
    }
    const passed = await this.prisma.readinessCheck.count({
      where: { studentId: childId, status: 'PASSED' },
    });
    if (!passed) {
      throw new ConflictException({
        error: 'HUB_NOT_READY',
        message: 'Your child needs to pass the readiness check first.',
      });
    }
    const recorded = await this.prisma.$transaction(async (tx) => {
      // One consent of each kind at a time: a lock on the child's row keeps two clicks
      // from recording two.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${childId}::uuid FOR UPDATE`;
      const active = await tx.consentRecord.findMany({
        where: { childId, type: { in: [...HUB_CONSENTS] }, revokedAt: null },
        select: { id: true, type: true, policyVersion: true },
      });
      // An older version's consent is replaced.
      const stale = active.filter((c) => c.policyVersion !== HUB_AGREEMENTS.parent);
      if (stale.length) {
        await tx.consentRecord.updateMany({
          where: { id: { in: stale.map((c) => c.id) } },
          data: { revokedAt: new Date() },
        });
      }
      const missing = HUB_CONSENTS.filter(
        (type) => !active.some((c) => c.type === type && c.policyVersion === HUB_AGREEMENTS.parent),
      );
      if (missing.length === 0) return false;
      await tx.consentRecord.createMany({
        data: missing.map((type) => ({
          parentId: user.id,
          childId,
          type,
          policyVersion: HUB_AGREEMENTS.parent,
          method: 'EMAIL_CONFIRMATION' as const,
          ipAddress: ctx.ip ?? null,
          userAgent: ctx.userAgent ?? null,
        })),
      });
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'hub.consent',
          entityType: 'User',
          entityId: childId,
          after: { consents: missing, version: HUB_AGREEMENTS.parent },
          context: ctx,
        },
        tx,
      );
      return true;
    });
    if (recorded) {
      // The child's other parents learn who agreed (the earnings are paid to them).
      const others = await this.prisma.parentChildLink.findMany({
        where: { childId, parentId: { not: user.id }, parent: { deletedAt: null } },
        select: { parentId: true },
      });
      const by = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { displayName: true },
      });
      if (others.length) {
        await this.notifications.notify(
          others.map((o) => o.parentId),
          'child_hub_consent',
          { childId, nickname: child.studentProfile?.nickname ?? '', by: by?.displayName ?? '' },
        );
      }
    }
    return this.familyDto(child, await this.check(childId));
  }

  /** The parent takes the consent back: the child's hub work stops at once. */
  async withdraw(user: AuthUser, childId: string, ctx: RequestContext): Promise<HubFamilyChildDto> {
    const child = await this.ownChild(user.id, childId);
    const revoked = await this.prisma.$transaction(async (tx) => {
      const result = await tx.consentRecord.updateMany({
        where: { childId, type: { in: [...HUB_CONSENTS] }, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (result.count) {
        await this.audit.record(
          {
            actor: { id: user.id, roleKey: user.roleKey },
            action: 'hub.consent_withdrawn',
            entityType: 'User',
            entityId: childId,
            context: ctx,
          },
          tx,
        );
      }
      return result.count;
    });
    if (revoked) await this.paused(childId, 'consent_withdrawn');
    return this.familyDto(child, await this.check(childId));
  }

  // ── Lead developers ──────────────────────────────────────────────────────

  async assertLead(userId: string) {
    if (!(await isLeadDeveloper(this.prisma, userId))) {
      throw new ForbiddenException({
        error: 'NOT_LEAD',
        message: 'Only lead developers do this.',
      });
    }
  }

  /** Students who passed the readiness check (newest first), for a lead to sign off. */
  async candidates(user: AuthUser): Promise<HubCandidateDto[]> {
    await this.assertLead(user.id);
    const checks = await this.prisma.readinessCheck.findMany({
      where: { status: 'PASSED', student: { deletedAt: null, status: 'ACTIVE' } },
      orderBy: { passedAt: 'desc' },
      distinct: ['studentId'],
      take: 100,
      select: {
        studentId: true,
        passedAt: true,
        score: true,
        reviewId: true,
        student: {
          select: {
            countryCode: true,
            studentProfile: { select: { nickname: true, avatarKey: true } },
          },
        },
      },
    });
    const states = await this.states(checks.map((c) => c.studentId));
    return checks.map((check) => {
      const state = states.get(check.studentId);
      return {
        studentId: check.studentId,
        nickname: check.student.studentProfile?.nickname ?? '',
        avatarKey: check.student.studentProfile?.avatarKey ?? '',
        countryCode: check.student.countryCode,
        passedAt: check.passedAt!,
        score: check.score,
        maxScore: READINESS_MAX,
        reviewId: check.reviewId,
        signedOffAt: state?.signedOffAt ?? null,
        signedOffBy: state?.signedOffBy ?? null,
        eligible: state?.eligible ?? false,
      };
    });
  }

  /** A lead developer signs a student off for paid work (after the readiness check). */
  async signOff(user: AuthUser, studentId: string, note: string | undefined, ctx: RequestContext) {
    await this.assertLead(user.id);
    const check = await this.prisma.readinessCheck.findFirst({
      where: { studentId, status: 'PASSED', student: { deletedAt: null } },
      orderBy: { passedAt: 'desc' },
      select: {
        id: true,
        student: {
          select: {
            languageCode: true,
            studentProfile: { select: { nickname: true } },
            parentLinks: {
              select: {
                parent: {
                  select: { id: true, email: true, displayName: true, languageCode: true },
                },
              },
            },
          },
        },
      },
    });
    if (!check) {
      throw new NotFoundException({
        error: 'STUDENT_NOT_FOUND',
        message: 'This student hasn’t passed the readiness check.',
      });
    }
    const now = new Date();
    const first = await this.prisma.$transaction(async (tx) => {
      const before = await tx.hubEligibility.findUnique({ where: { studentId } });
      if (before?.signedOffAt) return false;
      await tx.hubEligibility.upsert({
        where: { studentId },
        create: {
          studentId,
          readinessId: check.id,
          signedOffById: user.id,
          signedOffAt: now,
          signOffNote: note ?? null,
        },
        update: {
          readinessId: check.id,
          signedOffById: user.id,
          signedOffAt: now,
          signOffNote: note ?? null,
        },
      });
      await this.audit.record(
        {
          actor: { id: user.id, roleKey: user.roleKey },
          action: 'hub.sign_off',
          entityType: 'User',
          entityId: studentId,
          after: { readinessId: check.id },
          context: ctx,
        },
        tx,
      );
      return true;
    });
    if (!first) {
      throw new ConflictException({
        error: 'ALREADY_SIGNED_OFF',
        message: 'This student is signed off already.',
      });
    }
    const nickname = check.student.studentProfile?.nickname ?? '';
    const parents = check.student.parentLinks.map((l) => l.parent);
    await this.notifications.notify([studentId], 'hub_signed_off', {});
    await this.notifications.notify(
      parents.map((p) => p.id),
      'child_hub_signed_off',
      { childId: studentId, nickname },
    );
    const base = this.config.get('WEB_APP_URL').replace(/\/+$/, '');
    for (const parent of parents) {
      if (!parent.email) continue;
      const language = toMailLanguage(parent.languageCode);
      await this.mail
        .send({
          to: parent.email,
          template: 'hubConsent',
          language,
          params: {
            name: parent.displayName ?? '',
            actionUrl: `${base}/${language}/children/${studentId}/hub`,
            vars: { nickname },
          },
        })
        .catch((error: Error) => this.logger.warn(`Hub consent email not sent: ${error.message}`));
    }
    await this.check(studentId, now);
  }

  // ── Staff ────────────────────────────────────────────────────────────────

  async adminList(status?: 'eligible' | 'waiting' | 'paused'): Promise<HubStudentAdminDto[]> {
    // Everyone who passed the readiness check or has a hub record.
    const [passed, rows] = await Promise.all([
      this.prisma.readinessCheck.findMany({
        where: { status: 'PASSED' },
        distinct: ['studentId'],
        select: { studentId: true },
      }),
      this.prisma.hubEligibility.findMany({ select: { studentId: true } }),
    ]);
    const ids = [...new Set([...passed.map((p) => p.studentId), ...rows.map((r) => r.studentId)])];
    const [states, students] = await Promise.all([
      this.states(ids),
      this.prisma.user.findMany({
        where: { id: { in: ids }, deletedAt: null },
        select: {
          id: true,
          username: true,
          countryCode: true,
          studentProfile: { select: { nickname: true } },
        },
      }),
    ]);
    return students
      .map((student) => {
        const state = states.get(student.id)!;
        return {
          studentId: student.id,
          username: student.username ?? '',
          nickname: student.studentProfile?.nickname ?? '',
          countryCode: student.countryCode,
          eligibility: this.toDto(state),
          signedOffBy: state.signedOffBy,
          signedOffAt: state.signedOffAt,
          signOffNote: state.signOffNote,
          pausedReason: state.pausedReason,
        };
      })
      .filter((row) =>
        status === 'eligible'
          ? row.eligibility.eligible
          : status === 'paused'
            ? row.eligibility.paused
            : status === 'waiting'
              ? !row.eligibility.eligible && !row.eligibility.paused
              : true,
      )
      .toSorted((a, b) => a.nickname.localeCompare(b.nickname));
  }

  /** Staff pause a student's hub work (a safety report, a parent's call), with a reason. */
  async pause(staff: AuthUser, studentId: string, reason: string, ctx: RequestContext) {
    const student = await this.prisma.user.findFirst({
      where: { id: studentId, kind: 'STUDENT', deletedAt: null },
      select: {
        id: true,
        parentLinks: { select: { parentId: true } },
        studentProfile: { select: { nickname: true } },
      },
    });
    if (!student)
      throw new NotFoundException({ error: 'STUDENT_NOT_FOUND', message: 'No such student.' });
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.hubEligibility.upsert({
        where: { studentId },
        create: { studentId, revokedAt: now, revokedById: staff.id, revokedReason: reason },
        update: { revokedAt: now, revokedById: staff.id, revokedReason: reason },
      });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'hub.pause',
          entityType: 'User',
          entityId: studentId,
          after: { reason },
          context: ctx,
        },
        tx,
      );
    });
    await this.paused(studentId, 'paused_by_staff');
    await this.notifications.notify([studentId], 'hub_paused', {});
    await this.notifications.notify(
      student.parentLinks.map((l) => l.parentId),
      'child_hub_paused',
      { childId: studentId, nickname: student.studentProfile?.nickname ?? '' },
    );
  }

  async resume(staff: AuthUser, studentId: string, ctx: RequestContext) {
    const row = await this.prisma.hubEligibility.findUnique({ where: { studentId } });
    if (!row?.revokedAt) {
      throw new ConflictException({ error: 'NOT_PAUSED', message: 'This student isn’t paused.' });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.hubEligibility.update({
        where: { studentId },
        data: { revokedAt: null, revokedById: null, revokedReason: null },
      });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'hub.resume',
          entityType: 'User',
          entityId: studentId,
          before: { reason: row.revokedReason },
          context: ctx,
        },
        tx,
      );
    });
    await this.check(studentId);
  }

  // ── Country rules (staff) ────────────────────────────────────────────────

  async countries(): Promise<HubRulesDto[]> {
    const countries = await this.prisma.country.findMany({
      orderBy: { code: 'asc' },
      select: COUNTRY_HUB_SELECT,
    });
    return countries.map(rulesDto);
  }

  async updateRules(
    staff: AuthUser,
    code: string,
    dto: UpdateHubRulesDto,
    ctx: RequestContext,
  ): Promise<HubRulesDto> {
    const before = await this.prisma.country.findUnique({
      where: { code },
      select: COUNTRY_HUB_SELECT,
    });
    if (!before) throw new NotFoundException('Country not found.');
    const changes = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    ) as UpdateHubRulesDto;
    const next = { ...rulesDto(before), ...changes };
    if (next.studentPercent + next.leadPercent + next.platformPercent !== 100) {
      throw new ConflictException({
        error: 'SPLIT_NOT_100',
        message: 'The split must add up to 100%.',
      });
    }
    if (next.dayEndMinute <= next.dayStartMinute || next.schoolEndMinute < next.schoolStartMinute) {
      throw new ConflictException({
        error: 'BAD_HOURS',
        message: 'Each time range must end after it starts.',
      });
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.country.update({
        where: { code },
        data: {
          hubEnabled: next.enabled,
          hubMinAge: next.minAge,
          hubWeeklyMinutes: next.weeklyMinutes,
          hubDayStartMinute: next.dayStartMinute,
          hubDayEndMinute: next.dayEndMinute,
          hubSchoolDays: [...new Set(next.schoolDays)].toSorted((a, b) => a - b),
          hubSchoolStartMinute: next.schoolStartMinute,
          hubSchoolEndMinute: next.schoolEndMinute,
          hubStudentPercent: next.studentPercent,
          hubLeadPercent: next.leadPercent,
          hubPlatformPercent: next.platformPercent,
          hubHoldDays: next.holdDays,
          hubWithholdingBp: next.withholdingBp,
        },
        select: COUNTRY_HUB_SELECT,
      });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'country.hub_rules',
          entityType: 'Country',
          entityId: code,
          before: { ...rulesDto(before) },
          after: { ...rulesDto(saved) },
          context: ctx,
        },
        tx,
      );
      return saved;
    });
    return rulesDto(updated);
  }
}
