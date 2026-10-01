import { Prisma } from '@kcp/database';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service.js';
import { AdultInvitesService } from '../auth/adult-invites.service.js';
import type { RequestContext } from '../common/request-context.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { SchoolPremiumService } from './school-premium.service.js';
import type {
  AddTeacherDto,
  AddTeacherResultDto,
  AdminLicenseDto,
  AdminSchoolDto,
  AdminSchoolSummaryDto,
  CreateLicenseDto,
  LicenseState,
  SaveSchoolDto,
} from './schools.dto.js';

const schoolNotFound = () => new NotFoundException('No such school.');

/**
 * Admin → Schools: the schools, their teachers (invited like mentors) and their
 * licences (invoiced, then marked paid when the bank transfer arrives).
 */
@Injectable()
export class SchoolsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly premium: SchoolPremiumService,
    private readonly invites: AdultInvitesService,
    private readonly audit: AuditService,
  ) {}

  private record(
    staff: AuthUser,
    action: string,
    entityType: string,
    entityId: string,
    ctx: RequestContext,
    values: { before?: Prisma.InputJsonObject; after?: Prisma.InputJsonObject },
    tx?: Prisma.TransactionClient,
  ) {
    return this.audit.record(
      {
        actor: { id: staff.id, roleKey: staff.roleKey },
        action,
        entityType,
        entityId,
        ...values,
        context: ctx,
      },
      tx,
    );
  }

  private async studentsIn(schoolIds: string[]) {
    const members = await this.prisma.classMember.findMany({
      where: { status: 'APPROVED', class: { schoolId: { in: schoolIds }, archivedAt: null } },
      select: { userId: true, class: { select: { schoolId: true } } },
    });
    const bySchool = new Map<string, Set<string>>();
    for (const m of members) {
      const set = bySchool.get(m.class.schoolId) ?? new Set<string>();
      set.add(m.userId);
      bySchool.set(m.class.schoolId, set);
    }
    return bySchool;
  }

  async list(now = new Date()): Promise<AdminSchoolSummaryDto[]> {
    const schools = await this.prisma.school.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { teachers: true, classes: { where: { archivedAt: null } } } },
      },
    });
    const students = await this.studentsIn(schools.map((s) => s.id));
    return Promise.all(
      schools.map(async (school) => ({
        id: school.id,
        name: school.name,
        countryCode: school.countryCode,
        city: school.city,
        teachers: school._count.teachers,
        classes: school._count.classes,
        students: students.get(school.id)?.size ?? 0,
        seats: await this.premium.seats(school.id, now),
      })),
    );
  }

  private licenseState(
    license: { paidAt: Date | null; cancelledAt: Date | null; endsAt: Date },
    now: Date,
  ): LicenseState {
    if (license.cancelledAt) return 'CANCELLED';
    if (license.endsAt <= now) return 'ENDED';
    return license.paidAt ? 'PAID' : 'INVOICED';
  }

  async get(id: string, now = new Date()): Promise<AdminSchoolDto> {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        teachers: {
          orderBy: { addedAt: 'asc' },
          include: {
            user: { select: { id: true, displayName: true, email: true, passwordHash: true } },
          },
        },
        licenses: { orderBy: { startsAt: 'desc' } },
        classes: {
          orderBy: [{ archivedAt: { sort: 'asc', nulls: 'first' } }, { name: 'asc' }],
          include: {
            teacher: { select: { displayName: true } },
            members: { select: { status: true } },
            _count: { select: { assignments: true } },
          },
        },
      },
    });
    if (!school) throw schoolNotFound();
    const [students, used] = await Promise.all([
      this.studentsIn([school.id]),
      this.prisma.premiumGrant.groupBy({
        by: ['licenseId'],
        where: {
          licenseId: { in: school.licenses.map((l) => l.id) },
          revokedAt: null,
          endsAt: { gt: now },
        },
        _count: { _all: true },
      }),
    ]);
    const usedBy = new Map(used.map((u) => [u.licenseId, u._count._all]));
    const licenses: AdminLicenseDto[] = school.licenses.map((l) => ({
      id: l.id,
      seats: l.seats,
      used: usedBy.get(l.id) ?? 0,
      startsAt: l.startsAt,
      endsAt: l.endsAt,
      invoiceNumber: l.invoiceNumber,
      amountMinor: l.amountMinor,
      currency: l.currency,
      paidAt: l.paidAt,
      paymentReference: l.paymentReference,
      cancelledAt: l.cancelledAt,
      state: this.licenseState(l, now),
    }));
    return {
      id: school.id,
      name: school.name,
      countryCode: school.countryCode,
      city: school.city,
      contactName: school.contactName,
      contactEmail: school.contactEmail,
      teachers: school.teachers.length,
      classes: school.classes.filter((c) => !c.archivedAt).length,
      students: students.get(school.id)?.size ?? 0,
      seats: await this.premium.seats(school.id, now),
      teacherList: school.teachers.map((t) => ({
        id: t.user.id,
        name: t.user.displayName ?? '',
        email: t.user.email ?? '',
        invited: t.user.passwordHash === null,
        classes: school.classes.filter((c) => c.teacherId === t.userId && !c.archivedAt).length,
      })),
      licenses,
      classList: school.classes.map((c) => ({
        id: c.id,
        name: c.name,
        teacher: c.teacher.displayName ?? '',
        approved: c.members.filter((m) => m.status === 'APPROVED').length,
        pending: c.members.filter((m) => m.status === 'PENDING').length,
        assignments: c._count.assignments,
        archived: c.archivedAt !== null,
      })),
    };
  }

  private async checkCountry(code: string) {
    const country = await this.prisma.country.findUnique({ where: { code } });
    if (!country) {
      throw new BadRequestException({ error: 'COUNTRY_UNKNOWN', message: 'Unknown country.' });
    }
  }

  async create(staff: AuthUser, dto: SaveSchoolDto, ctx: RequestContext): Promise<AdminSchoolDto> {
    await this.checkCountry(dto.countryCode);
    const id = await this.prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: dto.name,
          countryCode: dto.countryCode,
          city: dto.city || null,
          contactName: dto.contactName,
          contactEmail: dto.contactEmail,
        },
      });
      await this.record(
        staff,
        'school.create',
        'School',
        school.id,
        ctx,
        {
          after: { name: dto.name, countryCode: dto.countryCode },
        },
        tx,
      );
      return school.id;
    });
    return this.get(id);
  }

  async update(
    staff: AuthUser,
    id: string,
    dto: SaveSchoolDto,
    ctx: RequestContext,
  ): Promise<AdminSchoolDto> {
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) throw schoolNotFound();
    await this.checkCountry(dto.countryCode);
    await this.prisma.$transaction(async (tx) => {
      await tx.school.update({
        where: { id },
        data: {
          name: dto.name,
          countryCode: dto.countryCode,
          city: dto.city || null,
          contactName: dto.contactName,
          contactEmail: dto.contactEmail,
        },
      });
      await this.record(
        staff,
        'school.update',
        'School',
        id,
        ctx,
        {
          before: { name: school.name },
          after: { name: dto.name },
        },
        tx,
      );
    });
    return this.get(id);
  }

  /**
   * Adds a teacher: an existing teacher account is linked; a new address gets an
   * account and an invitation email (they choose a password, then set up two-factor).
   */
  async addTeacher(
    staff: AuthUser,
    schoolId: string,
    dto: AddTeacherDto,
    ctx: RequestContext,
  ): Promise<AddTeacherResultDto> {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw schoolNotFound();
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: { select: { key: true } } },
    });
    if (existing) {
      if (existing.role.key !== 'teacher') {
        throw new ConflictException({
          error: 'EMAIL_TAKEN',
          message: 'This address belongs to an account that isn’t a teacher’s.',
        });
      }
      await this.prisma.$transaction(async (tx) => {
        await tx.schoolTeacher.upsert({
          where: { schoolId_userId: { schoolId, userId: existing.id } },
          create: { schoolId, userId: existing.id },
          update: {},
        });
        await this.record(
          staff,
          'school.teacher_add',
          'School',
          schoolId,
          ctx,
          {
            after: { userId: existing.id },
          },
          tx,
        );
      });
      return { userId: existing.id, invited: false };
    }
    if (!dto.displayName) {
      throw new BadRequestException({
        error: 'NAME_NEEDED',
        message: 'Give the new teacher’s name (students see it).',
      });
    }
    const userId = await this.invites.invite(
      {
        email: dto.email,
        displayName: dto.displayName,
        languageCode: dto.languageCode ?? 'en',
        roleKey: 'teacher',
        countryCode: school.countryCode,
      },
      staff,
      ctx,
      async (tx, id) => {
        await tx.schoolTeacher.create({ data: { schoolId, userId: id } });
        await this.record(
          staff,
          'school.teacher_add',
          'School',
          schoolId,
          ctx,
          {
            after: { userId: id },
          },
          tx,
        );
      },
    );
    return { userId, invited: true };
  }

  async removeTeacher(
    staff: AuthUser,
    schoolId: string,
    userId: string,
    ctx: RequestContext,
  ): Promise<void> {
    const link = await this.prisma.schoolTeacher.findUnique({
      where: { schoolId_userId: { schoolId, userId } },
    });
    if (!link) throw new NotFoundException('Not a teacher at this school.');
    const classes = await this.prisma.schoolClass.count({
      where: { schoolId, teacherId: userId, archivedAt: null },
    });
    if (classes > 0) {
      throw new ConflictException({
        error: 'TEACHER_HAS_CLASSES',
        message: 'This teacher still has classes here: they archive them first.',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.schoolTeacher.delete({ where: { schoolId_userId: { schoolId, userId } } });
      await this.record(
        staff,
        'school.teacher_remove',
        'School',
        schoolId,
        ctx,
        {
          before: { userId },
        },
        tx,
      );
    });
  }

  async addLicense(
    staff: AuthUser,
    schoolId: string,
    dto: CreateLicenseDto,
    ctx: RequestContext,
  ): Promise<AdminSchoolDto> {
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw schoolNotFound();
    if (dto.endsAt <= dto.startsAt) {
      throw new BadRequestException({
        error: 'LICENSE_DATES',
        message: 'The licence ends after it starts.',
      });
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        const license = await tx.schoolLicense.create({
          data: {
            schoolId,
            seats: dto.seats,
            startsAt: dto.startsAt,
            endsAt: dto.endsAt,
            invoiceNumber: dto.invoiceNumber,
            amountMinor: dto.amountMinor,
            currency: dto.currency,
            createdById: staff.id,
          },
        });
        await this.record(
          staff,
          'license.create',
          'SchoolLicense',
          license.id,
          ctx,
          {
            after: {
              schoolId,
              seats: dto.seats,
              invoiceNumber: dto.invoiceNumber,
              amountMinor: dto.amountMinor,
              currency: dto.currency,
            },
          },
          tx,
        );
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          error: 'INVOICE_TAKEN',
          message: 'Another licence has this invoice number.',
        });
      }
      throw error;
    }
    return this.get(schoolId);
  }

  private async license(id: string) {
    const license = await this.prisma.schoolLicense.findUnique({ where: { id } });
    if (!license) throw new NotFoundException('No such licence.');
    return license;
  }

  /** The bank transfer arrived: premium starts for the school's students. */
  async markPaid(
    staff: AuthUser,
    id: string,
    paymentReference: string,
    ctx: RequestContext,
    now = new Date(),
  ): Promise<AdminSchoolDto> {
    const license = await this.license(id);
    if (license.paidAt || license.cancelledAt) {
      throw new ConflictException({
        error: 'LICENSE_CLOSED',
        message: 'This licence is already paid or cancelled.',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.schoolLicense.update({
        where: { id },
        data: { paidAt: now, paymentReference },
      });
      await this.record(
        staff,
        'license.paid',
        'SchoolLicense',
        id,
        ctx,
        {
          after: { paymentReference },
        },
        tx,
      );
    });
    await this.premium.licensePaid(license.schoolId, now);
    return this.get(license.schoolId, now);
  }

  async cancel(
    staff: AuthUser,
    id: string,
    reason: string,
    ctx: RequestContext,
    now = new Date(),
  ): Promise<AdminSchoolDto> {
    const license = await this.license(id);
    if (license.cancelledAt) {
      throw new ConflictException({
        error: 'LICENSE_CLOSED',
        message: 'This licence is already cancelled.',
      });
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.schoolLicense.update({ where: { id }, data: { cancelledAt: now } });
      await this.record(
        staff,
        'license.cancel',
        'SchoolLicense',
        id,
        ctx,
        {
          after: { reason },
        },
        tx,
      );
    });
    await this.premium.licenseCancelled(id, now);
    // Another paid licence may still cover the school's students.
    await this.premium.licensePaid(license.schoolId, now);
    return this.get(license.schoolId, now);
  }
}
