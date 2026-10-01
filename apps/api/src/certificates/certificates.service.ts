import { randomInt } from 'node:crypto';
import { subject } from '@casl/ability';
import type { Prisma } from '@kcp/database';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { EntitlementsService } from '../billing/entitlements.service.js';
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service.js';
import { activeContent, publishedModule } from '../learning/content.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AppAbility } from '../permissions/ability.factory.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { requestProjectReview } from '../reviews/review-request.js';
import { certificatePdf } from './certificate-pdf.js';
import type {
  CertificateDto,
  CertificateListDto,
  VerifiedCertificateDto,
} from './certificates.dto.js';

/** No 0/O or 1/I: codes are read off paper. */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const codePart = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(32)]).join('');
const newCode = () => `KCP-${codePart()}-${codePart()}`;

type Titles = Record<string, string>;
const pick = (titles: unknown, language: string) => {
  const map = (titles ?? {}) as Titles;
  return map[language] ?? map['en'] ?? '';
};

/**
 * Certificates for finished modules (every lesson done and the project shipped).
 * Getting one is part of premium. Each has a code anyone can check online; the
 * certificate shows the nickname only, never the child's name.
 */
@Injectable()
export class CertificatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
    private readonly flags: FeatureFlagsService,
  ) {}

  /**
   * Module projects whose mentor review isn't approved yet, when certificates need an
   * approval (feature flag, per country). Empty when they don't.
   */
  private async awaitingApproval(userId: string): Promise<Set<string>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { countryCode: true },
    });
    if (!(await this.flags.isEnabled('mentor_approval_for_certificates', user?.countryCode))) {
      return new Set();
    }
    const projects = await this.prisma.project.findMany({
      where: { userId, status: 'SHIPPED' },
      select: {
        brief: { select: { moduleId: true } },
        reviews: { where: { status: 'APPROVED' }, select: { id: true }, take: 1 },
      },
    });
    return new Set(projects.filter((p) => p.reviews.length === 0).map((p) => p.brief.moduleId));
  }

  /**
   * Premium students who shipped before mentor reviews existed (or whose review was
   * cancelled) get one requested now, so their certificate isn't stuck.
   */
  private async requestMissingReviews(userId: string, moduleIds: string[]) {
    if (!moduleIds.length) return;
    const projects = await this.prisma.project.findMany({
      where: {
        userId,
        status: 'SHIPPED',
        brief: { moduleId: { in: moduleIds } },
        reviews: { none: { status: { in: ['WAITING', 'IN_REVIEW', 'CHANGES_REQUESTED'] } } },
      },
      select: {
        id: true,
        files: true,
        portfolioItem: { select: { version: true } },
        user: { select: { languageCode: true } },
      },
    });
    for (const project of projects) {
      await requestProjectReview(this.prisma, {
        studentId: userId,
        projectId: project.id,
        version: project.portfolioItem?.version ?? 1,
        files: project.files as Prisma.InputJsonObject,
        languageCode: project.user.languageCode,
      });
    }
  }

  private dto(
    c: {
      id: string;
      code: string;
      moduleId: string;
      nickname: string;
      moduleTitles: Prisma.JsonValue;
      trackTitles: Prisma.JsonValue;
      issuedAt: Date;
      revokedAt: Date | null;
    },
    language: string,
  ): CertificateDto {
    return {
      id: c.id,
      code: c.code,
      moduleId: c.moduleId,
      nickname: c.nickname,
      moduleTitle: pick(c.moduleTitles, language),
      trackTitle: pick(c.trackTitles, language),
      issuedAt: c.issuedAt,
      revoked: c.revokedAt !== null,
    };
  }

  /** Modules the student finished: every active lesson done, and the project shipped. */
  private async finishedModules(userId: string): Promise<Set<string>> {
    const modules = await this.prisma.module.findMany({
      where: publishedModule,
      select: {
        id: true,
        lessons: { where: activeContent, select: { id: true } },
        projectBrief: { select: { id: true, isActive: true } },
      },
    });
    const [done, shipped] = await Promise.all([
      this.prisma.lessonProgress.findMany({
        where: { userId, status: 'COMPLETED' },
        select: { lessonId: true },
      }),
      this.prisma.project.findMany({
        where: { userId, status: 'SHIPPED' },
        select: { briefId: true },
      }),
    ]);
    const doneLessons = new Set(done.map((d) => d.lessonId));
    const shippedBriefs = new Set(shipped.map((p) => p.briefId));
    return new Set(
      modules
        .filter(
          (m) =>
            m.lessons.length > 0 &&
            m.lessons.every((l) => doneLessons.has(l.id)) &&
            (!m.projectBrief?.isActive || shippedBriefs.has(m.projectBrief.id)),
        )
        .map((m) => m.id),
    );
  }

  private assertStudent(user: AuthUser) {
    if (user.kind !== 'STUDENT') {
      throw new ForbiddenException({
        error: 'STUDENTS_ONLY',
        message: 'Only students earn certificates.',
      });
    }
  }

  /** Every module, whether the student finished it, and their certificate if any. */
  async list(user: AuthUser, language: string): Promise<CertificateListDto> {
    this.assertStudent(user);
    const [modules, finished, owned, premium] = await Promise.all([
      this.prisma.module.findMany({
        where: publishedModule,
        orderBy: [{ track: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
        select: { id: true, titles: true },
      }),
      this.finishedModules(user.id),
      this.prisma.certificate.findMany({ where: { userId: user.id } }),
      this.entitlements.status(user.id),
    ]);
    const byModule = new Map(owned.map((c) => [c.moduleId, c]));
    const awaiting = await this.awaitingApproval(user.id);
    if (premium.active) {
      await this.requestMissingReviews(
        user.id,
        [...finished].filter((id) => awaiting.has(id) && !byModule.has(id)),
      );
    }
    return {
      premium: premium.active,
      modules: modules.map((m) => {
        const certificate = byModule.get(m.id);
        return {
          moduleId: m.id,
          moduleTitle: pick(m.titles, language),
          finished: finished.has(m.id),
          awaitingReview: !certificate && finished.has(m.id) && awaiting.has(m.id),
          certificate: certificate ? this.dto(certificate, language) : null,
        };
      }),
    };
  }

  /** Issues the certificate for a finished module (premium). Issuing twice returns the first. */
  async issue(user: AuthUser, moduleId: string, language: string): Promise<CertificateDto> {
    this.assertStudent(user);
    return this.issueFor(user.id, moduleId, language);
  }

  /**
   * After a mentor approves a module project: the certificate, if the student can have
   * it now (premium, module finished). Never throws.
   */
  async issueIfEligible(userId: string, moduleId: string): Promise<boolean> {
    try {
      await this.issueFor(userId, moduleId, 'en');
      return true;
    } catch {
      return false;
    }
  }

  private async issueFor(userId: string, moduleId: string, language: string) {
    const user = { id: userId };
    const existing = await this.prisma.certificate.findUnique({
      where: { userId_moduleId: { userId: user.id, moduleId } },
    });
    if (existing) return this.dto(existing, language);
    if (!(await this.entitlements.status(user.id)).active) {
      throw new ForbiddenException({
        error: 'PREMIUM_REQUIRED',
        message: 'Certificates are part of premium.',
      });
    }
    if (!(await this.finishedModules(user.id)).has(moduleId)) {
      throw new BadRequestException({
        error: 'MODULE_NOT_FINISHED',
        message: 'Finish every lesson and ship the project first.',
      });
    }
    if ((await this.awaitingApproval(user.id)).has(moduleId)) {
      throw new ConflictException({
        error: 'REVIEW_PENDING',
        message: 'A mentor reviews your project first.',
      });
    }
    const [module, profile] = await Promise.all([
      this.prisma.module.findUniqueOrThrow({
        where: { id: moduleId },
        select: { titles: true, track: { select: { titles: true } } },
      }),
      this.prisma.studentProfile.findUniqueOrThrow({
        where: { userId: user.id },
        select: { nickname: true },
      }),
    ]);
    let created;
    for (let attempt = 0; ; attempt++) {
      try {
        created = await this.prisma.certificate.create({
          data: {
            code: newCode(),
            userId: user.id,
            moduleId,
            nickname: profile.nickname,
            moduleTitles: module.titles as Prisma.InputJsonValue,
            trackTitles: module.track.titles as Prisma.InputJsonValue,
          },
        });
        break;
      } catch (error) {
        const conflict = (error as { code?: string }).code === 'P2002';
        if (!conflict || attempt >= 3) throw error;
        // Issued meanwhile (a second click), or a code clash: look again.
        const again = await this.prisma.certificate.findUnique({
          where: { userId_moduleId: { userId: user.id, moduleId } },
        });
        if (again) return this.dto(again, language);
      }
    }
    const data = {
      certificateId: created.id,
      moduleTitles: module.titles as Prisma.InputJsonValue,
    };
    await this.notifications.notify([user.id], 'certificate_issued', data);
    await this.notifications.notify(
      await this.notifications.parentsOf(user.id),
      'child_certificate',
      {
        ...data,
        childId: user.id,
        nickname: profile.nickname,
      },
    );
    return this.dto(created, language);
  }

  /** A child's certificates, for their parent (the caller was checked as the parent). */
  async forChild(childId: string, language: string): Promise<CertificateDto[]> {
    const owned = await this.prisma.certificate.findMany({
      where: { userId: childId },
      orderBy: { issuedAt: 'asc' },
    });
    return owned.map((c) => this.dto(c, language));
  }

  /** The PDF, for the student, their parents, or staff allowed to read certificates. */
  async pdf(
    id: string,
    user: AuthUser,
    ability: AppAbility,
  ): Promise<{ code: string; pdf: Uint8Array }> {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id },
      include: {
        user: { select: { parentLinks: { select: { parentId: true } } } },
      },
    });
    const allowed =
      certificate &&
      ability.can(
        'read',
        subject('Certificate', {
          userId: certificate.userId,
          parentIds: certificate.user.parentLinks.map((l) => l.parentId),
        }),
      );
    if (!certificate || !allowed) throw new NotFoundException('Certificate not found.');
    if (certificate.revokedAt) {
      throw new ConflictException({
        error: 'CERTIFICATE_REVOKED',
        message: 'This certificate was revoked.',
      });
    }
    const lessons = await this.prisma.lesson.count({
      where: { moduleId: certificate.moduleId, ...activeContent },
    });
    const pdf = await certificatePdf({
      code: certificate.code,
      nickname: certificate.nickname,
      moduleTitle: pick(certificate.moduleTitles, 'en'),
      trackTitle: pick(certificate.trackTitles, 'en'),
      lessons,
      issuedAt: certificate.issuedAt,
      verifyUrl: `${this.config.get('WEB_APP_URL')}/en/certificates/${certificate.code}`,
    });
    return { code: certificate.code, pdf };
  }

  /** Checking a certificate by its code (public). */
  async verify(code: string): Promise<VerifiedCertificateDto> {
    const certificate = await this.prisma.certificate.findUnique({ where: { code } });
    if (!certificate) throw new NotFoundException('No certificate has this code.');
    return {
      code: certificate.code,
      nickname: certificate.nickname,
      moduleTitles: certificate.moduleTitles as Titles,
      trackTitles: certificate.trackTitles as Titles,
      issuedAt: certificate.issuedAt,
      valid: certificate.revokedAt === null,
    };
  }

  /** Staff revoke a certificate (for example after cheating), with a reason. */
  async revoke(id: string, reason: string, staff: AuthUser, ctx: RequestContext) {
    const certificate = await this.prisma.certificate.findUnique({ where: { id } });
    if (!certificate) throw new NotFoundException('Certificate not found.');
    if (certificate.revokedAt) return;
    await this.prisma.$transaction(async (tx) => {
      await tx.certificate.update({ where: { id }, data: { revokedAt: new Date() } });
      await this.audit.record(
        {
          actor: { id: staff.id, roleKey: staff.roleKey },
          action: 'certificate.revoke',
          entityType: 'Certificate',
          entityId: id,
          after: { code: certificate.code, reason },
          context: ctx,
        },
        tx,
      );
    });
  }
}
