import { randomInt } from 'node:crypto';
import { Prisma } from '@kcp/database';
import { FRIEND_CODE_ALPHABET } from '@kcp/shared';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ChatService } from '../chat/chat.service.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { pick, pickTranslation } from '../learning/content.js';
import { MailService } from '../mail/mail.service.js';
import { toMailLanguage } from '../mail/templates.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { PushService } from '../push/push.service.js';
import { SchoolPremiumService } from './school-premium.service.js';
import type {
  AssignmentDto,
  BoardRowDto,
  CatalogTrackDto,
  ClassDecisionResultDto,
  CreateAssignmentDto,
  CreateClassDto,
  JoinClassResultDto,
  LessonState,
  ParentClassRequestDto,
  ProgressRowDto,
  StudentClassDto,
  TeacherClassDto,
  TeacherHomeDto,
  UpdateClassDto,
} from './schools.dto.js';

const JOIN_CODE_LENGTH = 6;
const DAY = 86_400_000;
/** A class is for a school year: this many students at most. */
const MAX_CLASS_SIZE = 60;

const classNotFound = () =>
  new NotFoundException({ error: 'CLASS_NOT_FOUND', message: 'No such class.' });

const profile = { select: { nickname: true, avatarKey: true } } as const;

/**
 * Classes: a teacher makes a class at their school and shares its code; a student
 * joins with the code and a parent approves. The teacher assigns lessons and sees
 * progress on them and a weekly board (nicknames only). Premium comes from the
 * school's licence while the student is in one of its classes.
 */
@Injectable()
export class ClassesService {
  private readonly logger = new Logger(ClassesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly premium: SchoolPremiumService,
    private readonly chat: ChatService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly push: PushService,
    private readonly config: AppConfigService,
  ) {}

  private newJoinCode(): string {
    return Array.from(
      { length: JOIN_CODE_LENGTH },
      () => FRIEND_CODE_ALPHABET[randomInt(FRIEND_CODE_ALPHABET.length)],
    ).join('');
  }

  private async language(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { languageCode: true },
    });
    return user?.languageCode ?? 'en';
  }

  // ── Teachers ─────────────────────────────────────────────────────────────

  private async teacherClass(user: AuthUser, id: string) {
    const found = await this.prisma.schoolClass.findUnique({
      where: { id },
      include: {
        school: {
          select: { id: true, name: true, teachers: { where: { userId: user.id } } },
        },
      },
    });
    // Their own class, at a school they still teach at.
    if (!found || found.teacherId !== user.id || found.school.teachers.length === 0) {
      throw classNotFound();
    }
    return { ...found, school: { id: found.school.id, name: found.school.name } };
  }

  async home(user: AuthUser): Promise<TeacherHomeDto> {
    const language = await this.language(user.id);
    const [links, classes, tracks] = await Promise.all([
      this.prisma.schoolTeacher.findMany({
        where: { userId: user.id },
        include: { school: { select: { id: true, name: true } } },
        orderBy: { addedAt: 'asc' },
      }),
      this.prisma.schoolClass.findMany({
        where: { teacherId: user.id, school: { teachers: { some: { userId: user.id } } } },
        orderBy: [{ archivedAt: { sort: 'asc', nulls: 'first' } }, { createdAt: 'desc' }],
        include: {
          school: { select: { id: true, name: true } },
          members: { select: { status: true } },
          _count: { select: { assignments: true } },
        },
      }),
      this.prisma.track.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    ]);
    return {
      schools: links.map((l) => l.school),
      classes: classes.map((c) => ({
        id: c.id,
        name: c.name,
        school: c.school,
        joinCode: c.joinCode,
        trackId: c.trackId,
        approved: c.members.filter((m) => m.status === 'APPROVED').length,
        pending: c.members.filter((m) => m.status === 'PENDING').length,
        assignments: c._count.assignments,
        archived: c.archivedAt !== null,
      })),
      tracks: tracks.map((t) => ({ id: t.id, name: pick(t.titles, language) })),
    };
  }

  private async checkTrack(trackId: string | null | undefined) {
    if (!trackId) return null;
    const track = await this.prisma.track.findFirst({ where: { id: trackId, isActive: true } });
    if (!track)
      throw new NotFoundException({ error: 'TRACK_NOT_FOUND', message: 'No such track.' });
    return track.id;
  }

  async create(user: AuthUser, dto: CreateClassDto): Promise<TeacherClassDto> {
    const link = await this.prisma.schoolTeacher.findUnique({
      where: { schoolId_userId: { schoolId: dto.schoolId, userId: user.id } },
      include: { school: { select: { name: true } } },
    });
    if (!link)
      throw new NotFoundException({ error: 'SCHOOL_NOT_FOUND', message: 'No such school.' });
    const trackId = await this.checkTrack(dto.trackId);
    const id = await this.prisma.$transaction(async (tx) => {
      const made = await tx.schoolClass.create({
        data: {
          schoolId: dto.schoolId,
          teacherId: user.id,
          name: dto.name,
          trackId,
          joinCode: this.newJoinCode(),
        },
      });
      await this.chat.createRoom(
        'CLASS',
        made.id,
        `${link.school.name}: ${dto.name}`,
        [{ userId: user.id, role: 'ADULT' }],
        tx,
      );
      return made.id;
    });
    return this.detail(user, id);
  }

  async update(user: AuthUser, id: string, dto: UpdateClassDto): Promise<TeacherClassDto> {
    const found = await this.teacherClass(user, id);
    const trackId = await this.checkTrack(dto.trackId);
    await this.prisma.schoolClass.update({ where: { id }, data: { name: dto.name, trackId } });
    const room = await this.chat.roomOf('CLASS', id);
    if (room) await this.chat.rename(room.id, `${found.school.name}: ${dto.name}`);
    return this.detail(user, id);
  }

  /** A new code (the old one stops working), e.g. after it was shared too widely. */
  async newCode(user: AuthUser, id: string): Promise<TeacherClassDto> {
    await this.teacherClass(user, id);
    await this.prisma.schoolClass.update({ where: { id }, data: { joinCode: this.newJoinCode() } });
    return this.detail(user, id);
  }

  /** The school year ended: the class closes, its room stays readable, premium ends. */
  async archive(user: AuthUser, id: string, now = new Date()): Promise<TeacherClassDto> {
    const found = await this.teacherClass(user, id);
    if (found.archivedAt) return this.detail(user, id);
    await this.prisma.schoolClass.update({ where: { id }, data: { archivedAt: now } });
    const room = await this.chat.roomOf('CLASS', id);
    if (room) await this.chat.archive(room.id);
    const members = await this.prisma.classMember.findMany({
      where: { classId: id, status: 'APPROVED' },
      select: { userId: true },
    });
    for (const m of members) await this.premium.revokeFor(m.userId, found.schoolId, now);
    return this.detail(user, id);
  }

  async removeStudent(user: AuthUser, id: string, userId: string): Promise<void> {
    const found = await this.teacherClass(user, id);
    await this.leaveClass(found.id, found.schoolId, userId);
  }

  private async leaveClass(classId: string, schoolId: string, userId: string) {
    const membership = await this.prisma.classMember.findUnique({
      where: { classId_userId: { classId, userId } },
    });
    if (!membership) throw classNotFound();
    await this.prisma.classMember.delete({ where: { classId_userId: { classId, userId } } });
    const room = await this.chat.roomOf('CLASS', classId);
    if (room) await this.chat.removeMember(room.id, userId);
    if (membership.status === 'APPROVED') await this.premium.revokeFor(userId, schoolId);
  }

  async catalog(user: AuthUser): Promise<CatalogTrackDto[]> {
    const language = await this.language(user.id);
    const tracks = await this.prisma.track.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        modules: {
          where: { isActive: true, publishedAt: { not: null } },
          orderBy: { sortOrder: 'asc' },
          include: {
            lessons: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              include: { translations: { select: { languageCode: true, title: true } } },
            },
          },
        },
      },
    });
    return tracks.map((track) => ({
      id: track.id,
      title: pick(track.titles, language),
      modules: track.modules.map((m) => ({
        id: m.id,
        title: pick(m.titles, language),
        lessons: m.lessons.map((l) => ({
          id: l.id,
          title: pickTranslation(l.translations, language)?.title ?? l.slug,
        })),
      })),
    }));
  }

  async assign(user: AuthUser, id: string, dto: CreateAssignmentDto): Promise<TeacherClassDto> {
    const found = await this.teacherClass(user, id);
    if (found.archivedAt) throw this.closed();
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: dto.lessonId, isActive: true, module: { publishedAt: { not: null } } },
    });
    if (!lesson) {
      throw new NotFoundException({ error: 'LESSON_NOT_FOUND', message: 'No such lesson.' });
    }
    try {
      await this.prisma.assignment.create({
        data: { classId: id, lessonId: lesson.id, dueAt: dto.dueAt ?? null, createdById: user.id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          error: 'ALREADY_ASSIGNED',
          message: 'This lesson is set for the class already.',
        });
      }
      throw error;
    }
    const members = await this.prisma.classMember.findMany({
      where: { classId: id, status: 'APPROVED' },
      select: { userId: true },
    });
    await this.notifications.notify(
      members.map((m) => m.userId),
      'assignment_new',
      {
        classId: id,
        className: found.name,
        lessonId: lesson.id,
        ...(dto.dueAt ? { dueAt: dto.dueAt.toISOString() } : {}),
      },
    );
    return this.detail(user, id);
  }

  async unassign(user: AuthUser, id: string, assignmentId: string): Promise<TeacherClassDto> {
    await this.teacherClass(user, id);
    const deleted = await this.prisma.assignment.deleteMany({
      where: { id: assignmentId, classId: id },
    });
    if (deleted.count === 0) throw new NotFoundException('No such assignment.');
    return this.detail(user, id);
  }

  private closed() {
    return new ConflictException({ error: 'CLASS_CLOSED', message: 'This class is closed.' });
  }

  /** XP in the last 7 days of each student, highest first (ties share a rank). */
  private async board(
    students: { userId: string; nickname: string; avatarKey: string }[],
    now: Date,
  ): Promise<BoardRowDto[]> {
    if (students.length === 0) return [];
    const since = new Date(now.getTime() - 6 * DAY);
    since.setUTCHours(0, 0, 0, 0);
    const sums = await this.prisma.xpEvent.groupBy({
      by: ['userId'],
      where: { userId: { in: students.map((s) => s.userId) }, day: { gte: since } },
      _sum: { amount: true },
    });
    const xpOf = new Map(sums.map((s) => [s.userId, Math.max(0, s._sum.amount ?? 0)]));
    const rows = students
      .map((s) => ({ nickname: s.nickname, avatarKey: s.avatarKey, xp: xpOf.get(s.userId) ?? 0 }))
      .toSorted((a, b) => b.xp - a.xp || a.nickname.localeCompare(b.nickname));
    let previous: { xp: number; rank: number } | null = null;
    return rows.map((row, index) => {
      const rank: number = previous && previous.xp === row.xp ? previous.rank : index + 1;
      previous = { xp: row.xp, rank };
      return { rank, ...row };
    });
  }

  private async assignments(classId: string, language: string) {
    return this.prisma.assignment
      .findMany({
        where: { classId },
        orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
        include: {
          lesson: {
            select: {
              id: true,
              slug: true,
              translations: { select: { languageCode: true, title: true } },
              module: { select: { titles: true } },
            },
          },
        },
      })
      .then((rows) =>
        rows.map((a) => ({
          id: a.id,
          lessonId: a.lessonId,
          title: pickTranslation(a.lesson.translations, language)?.title ?? a.lesson.slug,
          moduleTitle: pick(a.lesson.module.titles, language),
          dueAt: a.dueAt,
        })),
      );
  }

  async detail(user: AuthUser, id: string, now = new Date()): Promise<TeacherClassDto> {
    const found = await this.teacherClass(user, id);
    const language = await this.language(user.id);
    const [members, assignmentRows, room, seats] = await Promise.all([
      this.prisma.classMember.findMany({
        where: { classId: id },
        orderBy: { requestedAt: 'asc' },
        include: { user: { select: { studentProfile: profile } } },
      }),
      this.assignments(id, language),
      this.chat.roomOf('CLASS', id),
      this.premium.seats(found.schoolId, now),
    ]);
    const students = members.map((m) => ({
      userId: m.userId,
      nickname: m.user.studentProfile?.nickname ?? '',
      avatarKey: m.user.studentProfile?.avatarKey ?? 'star',
      status: m.status,
    }));
    const approved = students.filter((s) => s.status === 'APPROVED');
    const [covered, progress] = await Promise.all([
      this.premium.covered(
        found.schoolId,
        approved.map((s) => s.userId),
        now,
      ),
      assignmentRows.length && approved.length
        ? this.prisma.lessonProgress.findMany({
            where: {
              userId: { in: approved.map((s) => s.userId) },
              lessonId: { in: assignmentRows.map((a) => a.lessonId) },
            },
            select: { userId: true, lessonId: true, status: true },
          })
        : Promise.resolve([]),
    ]);
    const stateOf = new Map(
      progress.map((p) => [
        `${p.userId}:${p.lessonId}`,
        (p.status === 'COMPLETED' ? 'DONE' : 'STARTED') as LessonState,
      ]),
    );
    const assignmentList: AssignmentDto[] = assignmentRows.map((a) => ({
      ...a,
      done: approved.filter((s) => stateOf.get(`${s.userId}:${a.lessonId}`) === 'DONE').length,
    }));
    const progressRows: ProgressRowDto[] = approved.map((s) => ({
      userId: s.userId,
      nickname: s.nickname,
      avatarKey: s.avatarKey,
      lessons: Object.fromEntries(
        assignmentRows.map((a) => [
          a.id,
          stateOf.get(`${s.userId}:${a.lessonId}`) ?? ('NOT_STARTED' as LessonState),
        ]),
      ),
    }));
    return {
      id: found.id,
      name: found.name,
      school: found.school,
      joinCode: found.joinCode,
      trackId: found.trackId,
      approved: approved.length,
      pending: students.length - approved.length,
      assignments: assignmentRows.length,
      archived: found.archivedAt !== null,
      seats,
      students: students.map((s) => ({ ...s, schoolPremium: covered.has(s.userId) })),
      assignmentList,
      progress: progressRows,
      board: await this.board(approved, now),
      roomId: room?.id ?? null,
    };
  }

  // ── Students ─────────────────────────────────────────────────────────────

  private assertStudent(user: AuthUser) {
    if (user.kind !== 'STUDENT') {
      throw new ForbiddenException({ error: 'STUDENTS_ONLY', message: 'For students only.' });
    }
  }

  async join(user: AuthUser, code: string): Promise<JoinClassResultDto> {
    this.assertStudent(user);
    const found = await this.prisma.schoolClass.findUnique({
      where: { joinCode: code },
      include: {
        school: { select: { name: true } },
        teacher: { select: { displayName: true } },
        _count: { select: { members: true } },
      },
    });
    if (!found || found.archivedAt) {
      throw new NotFoundException({
        error: 'CLASS_CODE_NOT_FOUND',
        message: 'No class has that code.',
      });
    }
    const existing = await this.prisma.classMember.findUnique({
      where: { classId_userId: { classId: found.id, userId: user.id } },
    });
    if (existing) {
      throw new ConflictException({
        error: 'ALREADY_IN_CLASS',
        message: 'You are in this class already.',
      });
    }
    if (found._count.members >= MAX_CLASS_SIZE) {
      throw new ConflictException({ error: 'CLASS_FULL', message: 'This class is full.' });
    }
    await this.prisma.classMember.create({ data: { classId: found.id, userId: user.id } });
    await this.tellParents(user.id, {
      id: found.id,
      name: found.name,
      school: found.school.name,
      teacher: found.teacher.displayName ?? '',
    });
    return { id: found.id, name: found.name, status: 'PENDING' };
  }

  async leave(user: AuthUser, classId: string): Promise<void> {
    this.assertStudent(user);
    const found = await this.prisma.schoolClass.findUnique({ where: { id: classId } });
    if (!found) throw classNotFound();
    await this.leaveClass(found.id, found.schoolId, user.id);
  }

  async mine(user: AuthUser, now = new Date()): Promise<StudentClassDto[]> {
    this.assertStudent(user);
    const language = await this.language(user.id);
    const memberships = await this.prisma.classMember.findMany({
      where: { userId: user.id, class: { archivedAt: null } },
      orderBy: { requestedAt: 'desc' },
      include: {
        class: {
          include: {
            school: { select: { name: true } },
            teacher: { select: { displayName: true } },
          },
        },
      },
    });
    return Promise.all(
      memberships.map(async (m) => {
        const approved = m.status === 'APPROVED';
        const assignmentRows = approved ? await this.assignments(m.classId, language) : [];
        const done = assignmentRows.length
          ? await this.prisma.lessonProgress.findMany({
              where: {
                userId: user.id,
                status: 'COMPLETED',
                lessonId: { in: assignmentRows.map((a) => a.lessonId) },
              },
              select: { lessonId: true },
            })
          : [];
        const doneIds = new Set(done.map((d) => d.lessonId));
        let board: BoardRowDto[] = [];
        let roomId: string | null = null;
        if (approved) {
          const classmates = await this.prisma.classMember.findMany({
            where: { classId: m.classId, status: 'APPROVED' },
            include: { user: { select: { studentProfile: profile } } },
          });
          board = await this.board(
            classmates.map((c) => ({
              userId: c.userId,
              nickname: c.user.studentProfile?.nickname ?? '',
              avatarKey: c.user.studentProfile?.avatarKey ?? 'star',
            })),
            now,
          );
          roomId = (await this.chat.roomOf('CLASS', m.classId))?.id ?? null;
        }
        return {
          id: m.classId,
          name: m.class.name,
          school: m.class.school.name,
          teacher: m.class.teacher.displayName ?? '',
          status: m.status,
          assignments: assignmentRows.map((a) => ({
            lessonId: a.lessonId,
            title: a.title,
            moduleTitle: a.moduleTitle,
            dueAt: a.dueAt,
            done: doneIds.has(a.lessonId),
          })),
          board,
          roomId,
        };
      }),
    );
  }

  // ── Parents ──────────────────────────────────────────────────────────────

  private async childrenOf(parentId: string): Promise<string[]> {
    const links = await this.prisma.parentChildLink.findMany({
      where: { parentId, child: { status: { not: 'DELETED' } } },
      select: { childId: true },
    });
    return links.map((l) => l.childId);
  }

  async requests(parent: AuthUser): Promise<ParentClassRequestDto[]> {
    const kids = await this.childrenOf(parent.id);
    if (kids.length === 0) return [];
    const pending = await this.prisma.classMember.findMany({
      where: { userId: { in: kids }, status: 'PENDING', class: { archivedAt: null } },
      orderBy: { requestedAt: 'desc' },
      include: {
        user: { select: { id: true, studentProfile: profile } },
        class: {
          include: {
            school: { select: { name: true } },
            teacher: { select: { displayName: true } },
          },
        },
      },
    });
    return pending.map((m) => ({
      classId: m.classId,
      child: {
        id: m.user.id,
        nickname: m.user.studentProfile?.nickname ?? '',
        avatarKey: m.user.studentProfile?.avatarKey ?? 'star',
      },
      className: m.class.name,
      school: m.class.school.name,
      teacher: m.class.teacher.displayName ?? '',
      requestedAt: m.requestedAt,
    }));
  }

  async decide(
    parent: AuthUser,
    classId: string,
    childId: string,
    approve: boolean,
    now = new Date(),
  ): Promise<ClassDecisionResultDto> {
    const kids = await this.childrenOf(parent.id);
    const membership = kids.includes(childId)
      ? await this.prisma.classMember.findUnique({
          where: { classId_userId: { classId, userId: childId } },
          include: { class: true },
        })
      : null;
    if (!membership || membership.status !== 'PENDING' || membership.class.archivedAt) {
      throw new NotFoundException({ error: 'REQUEST_NOT_FOUND', message: 'No such request.' });
    }
    if (!approve) {
      await this.prisma.classMember.delete({
        where: { classId_userId: { classId, userId: childId } },
      });
      return { status: 'DECLINED' };
    }
    await this.prisma.classMember.update({
      where: { classId_userId: { classId, userId: childId } },
      data: { status: 'APPROVED', approvedById: parent.id, approvedAt: now },
    });
    const room = await this.chat.roomOf('CLASS', classId);
    if (room) await this.chat.addMember(room.id, childId);
    await this.premium.grantFor(childId, membership.class.schoolId, now);
    await this.notifications.notify([childId], 'class_joined', {
      classId,
      className: membership.class.name,
    });
    return { status: 'APPROVED' };
  }

  /** Both parents hear about a request (bell, email and phone). */
  private async tellParents(
    childId: string,
    found: { id: string; name: string; school: string; teacher: string },
  ) {
    try {
      const child = await this.prisma.studentProfile.findUniqueOrThrow({
        where: { userId: childId },
        select: { nickname: true },
      });
      const parents = await this.prisma.parentChildLink.findMany({
        where: { childId, parent: { status: 'ACTIVE' } },
        select: {
          parent: { select: { id: true, email: true, displayName: true, languageCode: true } },
        },
      });
      const vars = {
        nickname: child.nickname,
        className: found.name,
        school: found.school,
        teacher: found.teacher,
      };
      await this.notifications.notify(
        parents.map((p) => p.parent.id),
        'class_join_request',
        { classId: found.id, childId, ...vars },
      );
      for (const { parent } of parents) {
        if (!parent.email) continue;
        const language = toMailLanguage(parent.languageCode);
        await this.mail
          .send({
            to: parent.email,
            template: 'classJoin',
            language,
            params: {
              name: parent.displayName ?? '',
              actionUrl: `${this.config.get('WEB_APP_URL')}/${language}/dashboard`,
              vars,
            },
          })
          .catch((error: Error) => this.logger.warn(`Class join email not sent: ${error.message}`));
      }
      await this.push
        .sendToUsers(
          parents.map((p) => p.parent.id),
          { kind: 'classJoin', params: { nickname: child.nickname } },
        )
        .catch((error: Error) => this.logger.warn(`Class join push failed: ${error.message}`));
    } catch (error) {
      this.logger.warn(`Parents not told about a class request: ${(error as Error).message}`);
    }
  }
}
