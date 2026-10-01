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
import type { RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import type {
  PullAuthorDto,
  PullDetailDto,
  PullSummaryDto,
  WorkspaceDto,
} from '../events/events.dto.js';
import { assertKind } from '../events/events.shared.js';
import {
  ForgejoError,
  type ForgejoPull,
  type ForgejoReview,
  ForgejoService,
} from '../events/forgejo.service.js';
import { branchFor } from '../events/git-workspace.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { HubTimeService } from './time.service.js';
import { isLeadDeveloper } from './hub-rules.js';

const MAX_DIFF = 100_000;
const HUB_ORG = 'kcp-hub';
/** A pull request about a task starts with its reference: "T-3: Order form". */
const TASK_PREFIX = /^T-(\d+):\s*/;
/** Every task prefix at the start of a title ("T-5: T-6: Fix"). */
const TASK_PREFIXES = /^(?:T-\d+:\s*)+/;

type Role = 'member' | 'lead' | 'staff';

const projectNotFound = () =>
  new NotFoundException({ error: 'PROJECT_NOT_FOUND', message: 'No such project.' });

/** The git server's refusals as answers the apps understand. */
function fromForgejo(error: unknown): never {
  if (error instanceof ForgejoError) {
    if (error.status === 404) throw projectNotFound();
    if (error.status === 405 || error.status === 409 || error.status === 422) {
      throw new ConflictException({ error: 'GIT_REFUSED', message: error.message });
    }
    throw new HttpException(
      { statusCode: 502, error: 'GIT_SERVER_ERROR', message: 'The git server had a problem.' },
      HttpStatus.BAD_GATEWAY,
    );
  }
  throw error;
}

/** The repository's first files. */
function starter(title: string): Record<string, string> {
  return {
    'README.md': `# ${title}\n\nA client project in the hub. \`main\` changes only through pull requests the lead developer approves: work on your own branch, open a pull request, and name its task (e.g. "T-3: Order form").\n`,
    'index.html':
      '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>Preview</title>\n    <link rel="stylesheet" href="style.css" />\n  </head>\n  <body>\n    <h1>Coming soon</h1>\n    <script src="script.js"></script>\n  </body>\n</html>\n',
    'style.css': 'body {\n  font-family: system-ui, sans-serif;\n}\n',
    'script.js': '',
  };
}

/**
 * A hub project's repository on the platform's git server: the team's students push
 * their own branches (only while their timer runs), open pull requests named after
 * their task, and the lead developer reviews (with a score) and merges. Nothing
 * reaches `main` without the lead's approval of its latest commit.
 */
@Injectable()
export class HubGitService {
  private readonly logger = new Logger(HubGitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly forgejo: ForgejoService,
    private readonly config: AppConfigService,
    private readonly time: HubTimeService,
    private readonly audit: AuditService,
  ) {}

  get enabled() {
    return this.forgejo.enabled;
  }

  private assertGit() {
    if (!this.forgejo.enabled) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          error: 'GIT_NOT_SET_UP',
          message: 'Team repositories are not set up on this server.',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /** The project and what the viewer is to it (404 when nothing). */
  async access(user: AuthUser, projectId: string) {
    const project = await this.prisma.hubProject.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { status: 'APPROVED' },
          include: { student: { select: { studentProfile: { select: { nickname: true } } } } },
        },
        tasks: { select: { id: true, number: true, assigneeId: true, status: true } },
      },
    });
    if (!project) throw projectNotFound();
    let role: Role | null = null;
    if (project.members.some((m) => m.studentId === user.id)) role = 'member';
    else if (project.leadId === user.id && (await isLeadDeveloper(this.prisma, user.id)))
      role = 'lead';
    else if (user.isStaff && ['admin', 'super_admin'].includes(user.roleKey)) role = 'staff';
    if (!role) throw projectNotFound();
    return { project, role };
  }

  private nickname(
    project: Awaited<ReturnType<HubGitService['access']>>['project'],
    userId: string,
  ) {
    return (
      project.members.find((m) => m.studentId === userId)?.student.studentProfile?.nickname ?? ''
    );
  }

  /** The project's repository, made (with the lead and the team) the first time. */
  async ensureRepo(projectId: string): Promise<string | null> {
    if (!this.forgejo.enabled) return null;
    const project = await this.prisma.hubProject.findUniqueOrThrow({
      where: { id: projectId },
      include: {
        lead: { select: { id: true, displayName: true } },
        members: {
          where: { status: 'APPROVED' },
          include: { student: { select: { studentProfile: { select: { nickname: true } } } } },
        },
      },
    });
    if (project.repo) return project.repo;
    try {
      await this.forgejo.ensureOrg(HUB_ORG, 'Hub projects');
      // The number for people, part of the ID so that another database on the same git
      // server (a demo, staging, a reset) never meets this project's repository.
      const repo = await this.forgejo.ensureRepo(
        HUB_ORG,
        `project-${project.number}-${project.id.replaceAll('-', '').slice(-8)}`,
        starter(project.title),
      );
      const people = [
        ...(project.lead
          ? [{ id: project.lead.id, name: project.lead.displayName ?? 'Lead' }]
          : []),
        ...project.members.map((m) => ({
          id: m.studentId,
          name: m.student.studentProfile?.nickname ?? '',
        })),
      ];
      for (const person of people) {
        await this.forgejo.addCollaborator(repo, await this.forgejo.ensureAccount(person));
      }
      await this.prisma.hubProject.update({ where: { id: projectId }, data: { repo } });
      return repo;
    } catch (error) {
      fromForgejo(error);
    }
  }

  /** Adds someone to the repository, if it exists (a new member, a new lead). */
  async addToRepo(projectId: string, person: { id: string; name: string }) {
    if (!this.forgejo.enabled) return;
    const project = await this.prisma.hubProject.findUnique({ where: { id: projectId } });
    if (!project?.repo) {
      await this.ensureRepo(projectId).catch((error: Error) =>
        this.logger.warn(`Repository for project ${projectId} not made: ${error.message}`),
      );
      return;
    }
    try {
      await this.forgejo.addCollaborator(project.repo, await this.forgejo.ensureAccount(person));
    } catch (error) {
      this.logger.warn(`Not added to ${project.repo}: ${(error as Error).message}`);
    }
  }

  async removeFromRepo(projectId: string, userId: string) {
    if (!this.forgejo.enabled) return;
    const [project, account] = await Promise.all([
      this.prisma.hubProject.findUnique({ where: { id: projectId } }),
      this.prisma.gitAccount.findUnique({ where: { userId } }),
    ]);
    if (!project?.repo || !account) return;
    await this.forgejo
      .removeCollaborator(project.repo, account.username)
      .catch((error: Error) =>
        this.logger.warn(`Not removed from ${project.repo}: ${error.message}`),
      );
  }

  private open(project: { status: string }) {
    return project.status === 'ACTIVE' || project.status === 'DELIVERED';
  }

  // ── The workspace and git over HTTP ──────────────────────────────────────

  async workspace(user: AuthUser, projectId: string): Promise<WorkspaceDto> {
    const { project, role } = await this.access(user, projectId);
    if (role === 'staff') throw projectNotFound();
    this.assertGit();
    await this.ensureRepo(project.id);
    const name =
      role === 'member'
        ? this.nickname(project, user.id)
        : ((await this.prisma.user.findUnique({ where: { id: user.id } }))?.displayName ?? 'Lead');
    const username = await this.forgejo.ensureAccount({ id: user.id, name });
    const canPush =
      this.open(project) && (role === 'lead' || (await this.time.runningOn(user.id, project.id)));
    return {
      teamId: `hub-${project.id}`,
      gitUrl: `${this.config.get('API_PUBLIC_URL').replace(/\/$/, '')}/v1/git/hub/${project.id}`,
      branch: branchFor(name, user.id),
      canPush,
      author: { name, email: `${username}@noreply.kcp.invalid` },
    };
  }

  /**
   * Where git requests go, after checking who may read or push: students push their
   * own branch only, and only while their timer runs on this project.
   */
  async gitTarget(user: AuthUser, projectId: string, push: boolean) {
    this.assertGit();
    const { project, role } = await this.access(user, projectId);
    if (push) {
      if (role === 'staff') throw projectNotFound();
      if (!this.open(project)) {
        throw new ConflictException({
          error: 'PROJECT_NOT_ACTIVE',
          message: 'This project isn’t open for work.',
        });
      }
      if (role === 'member' && !(await this.time.runningOn(user.id, project.id))) {
        throw new ConflictException({
          error: 'TIMER_NOT_RUNNING',
          message: 'Start your timer to send code (hub work only counts while it runs).',
        });
      }
    }
    const repo = project.repo ?? (await this.ensureRepo(project.id));
    if (!repo) throw projectNotFound();
    return {
      url: this.forgejo.gitUrl(repo),
      authorization: await this.forgejo.gitAuthorization(),
      ownBranch: role === 'member' ? branchFor(this.nickname(project, user.id), user.id) : null,
    };
  }

  // ── Pull requests ────────────────────────────────────────────────────────

  private async authors(logins: string[], viewerId: string): Promise<Map<string, PullAuthorDto>> {
    const accounts = await this.prisma.gitAccount.findMany({
      where: { username: { in: [...new Set(logins)] } },
      select: {
        username: true,
        userId: true,
        user: {
          select: { kind: true, displayName: true, studentProfile: { select: { nickname: true } } },
        },
      },
    });
    return new Map(
      accounts.map((a) => [
        a.username,
        {
          name: a.user.studentProfile?.nickname ?? a.user.displayName ?? '',
          isAdult: a.user.kind !== 'STUDENT',
          isMe: a.userId === viewerId,
        },
      ]),
    );
  }

  private authorOf(map: Map<string, PullAuthorDto>, login: string | undefined): PullAuthorDto {
    return map.get(login ?? '') ?? { name: 'Staff', isAdult: true, isMe: false };
  }

  private summaryOf(pull: ForgejoPull, authors: Map<string, PullAuthorDto>): PullSummaryDto {
    return {
      number: pull.number,
      title: pull.title,
      author: this.authorOf(authors, pull.user.login),
      state: pull.merged ? 'merged' : pull.state,
      branch: pull.head.ref,
      updatedAt: new Date(pull.updated_at),
    };
  }

  async pulls(user: AuthUser, projectId: string): Promise<PullSummaryDto[]> {
    const { project } = await this.access(user, projectId);
    if (!project.repo) return [];
    try {
      const pulls = await this.forgejo.pulls(project.repo);
      const authors = await this.authors(
        pulls.map((p) => p.user.login),
        user.id,
      );
      return pulls.map((pull) => this.summaryOf(pull, authors));
    } catch (error) {
      fromForgejo(error);
    }
  }

  private async settledPull(repo: string, number: number): Promise<ForgejoPull> {
    let pull = await this.forgejo.pull(repo, number);
    for (let attempt = 0; attempt < 10 && !pull.mergeable && pull.state === 'open'; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      pull = await this.forgejo.pull(repo, number);
    }
    return pull;
  }

  /** The lead's git account (their reviews are the ones that count). */
  private async leadLogin(project: { leadId: string | null }) {
    if (!project.leadId) return null;
    return (
      (await this.prisma.gitAccount.findUnique({ where: { userId: project.leadId } }))?.username ??
      null
    );
  }

  /**
   * Why a pull request can't merge yet: conflicts, changes the lead asked for, or no
   * approval from the lead on its latest commit.
   */
  private async mergeBlocked(
    project: { status: string; leadId: string | null },
    pull: ForgejoPull,
    reviews: ForgejoReview[],
    repo: string,
  ): Promise<string | null> {
    if (!this.open(project)) return 'PROJECT_NOT_ACTIVE';
    if (!pull.mergeable) return 'CONFLICTS';
    const lead = await this.leadLogin(project);
    const head = (await this.forgejo.branchHead(repo, pull.head.ref)) ?? pull.head.sha;
    const leads = reviews.filter(
      (r) =>
        r.user?.login === lead &&
        !r.dismissed &&
        (r.state === 'APPROVED' || r.state === 'REQUEST_CHANGES'),
    );
    const latest = leads.at(-1);
    if (!latest || (latest.commit_id ? latest.commit_id !== head : latest.stale))
      return 'APPROVAL_NEEDED';
    if (latest.state === 'REQUEST_CHANGES') return 'CHANGES_REQUESTED';
    return null;
  }

  async pull(user: AuthUser, projectId: string, number: number): Promise<PullDetailDto> {
    const { project, role } = await this.access(user, projectId);
    if (!project.repo) throw projectNotFound();
    try {
      const [pull, diff, comments, reviews] = await Promise.all([
        this.settledPull(project.repo, number),
        this.forgejo.diff(project.repo, number),
        this.forgejo.comments(project.repo, number),
        this.forgejo.reviews(project.repo, number),
      ]);
      const authors = await this.authors(
        [
          pull.user.login,
          ...comments.map((c) => c.user.login),
          ...reviews.flatMap((r) => (r.user ? [r.user.login] : [])),
        ],
        user.id,
      );
      const open = pull.state === 'open' && !pull.merged;
      const blocked = await this.mergeBlocked(project, pull, reviews, project.repo);
      return {
        ...this.summaryOf(pull, authors),
        body: pull.body ?? '',
        diff: diff.slice(0, MAX_DIFF),
        diffTruncated: diff.length > MAX_DIFF,
        comments: comments.map((c) => ({
          id: c.id,
          body: c.body,
          author: this.authorOf(authors, c.user.login),
          createdAt: new Date(c.created_at),
        })),
        reviews: reviews
          .filter(
            (r) => r.state === 'APPROVED' || r.state === 'REQUEST_CHANGES' || r.state === 'COMMENT',
          )
          .map((r) => ({
            id: r.id,
            state: r.state as 'APPROVED' | 'REQUEST_CHANGES' | 'COMMENT',
            body: r.body ?? '',
            author: this.authorOf(authors, r.user?.login),
            submittedAt: new Date(r.submitted_at),
          })),
        canReview: role === 'lead' && open && this.open(project),
        canMerge: role === 'lead' && open && blocked === null,
        mergeBlocked: open ? blocked : null,
      };
    } catch (error) {
      fromForgejo(error);
    }
  }

  private async actor(user: AuthUser, projectId: string) {
    const { project, role } = await this.access(user, projectId);
    if (role === 'staff' || !project.repo) throw projectNotFound();
    const name = role === 'member' ? this.nickname(project, user.id) : 'Lead';
    const username = await this.forgejo.ensureAccount({ id: user.id, name });
    return { project, role, repo: project.repo, username };
  }

  /** A student opens a pull request from their branch, for one of their tasks. */
  async openPull(
    user: AuthUser,
    projectId: string,
    dto: { branch: string; title: string; body?: string; taskId?: string },
  ): Promise<PullSummaryDto> {
    const { project, role, repo, username } = await this.actor(user, projectId);
    if (!this.open(project)) {
      throw new ConflictException({
        error: 'PROJECT_NOT_ACTIVE',
        message: 'This project isn’t open for work.',
      });
    }
    if (dto.branch === 'main') {
      throw new ConflictException({
        error: 'BRANCH_IS_MAIN',
        message: 'Push your work to your own branch first.',
      });
    }
    dto = { ...dto, title: dto.title.trim() };
    if (role === 'member') {
      assertKind(dto.title);
      if (dto.body) assertKind(dto.body);
      // A student asks to merge their own work only (a task is paid to whoever did it).
      if (dto.branch !== branchFor(this.nickname(project, user.id), user.id)) {
        throw new ForbiddenException({
          error: 'NOT_YOUR_BRANCH',
          message: 'Open a pull request from your own branch.',
        });
      }
    }
    const task = dto.taskId ? project.tasks.find((t) => t.id === dto.taskId) : null;
    if (dto.taskId && (!task || (role === 'member' && task.assigneeId !== user.id))) {
      throw new NotFoundException({ error: 'TASK_NOT_FOUND', message: 'No such task.' });
    }
    try {
      if (!(await this.forgejo.branchHead(repo, dto.branch))) {
        throw new NotFoundException({
          error: 'BRANCH_NOT_FOUND',
          message: 'Push your branch first.',
        });
      }
      const made = await this.forgejo.openPull(repo, username, {
        head: dto.branch,
        // Only the task chosen (one of theirs) is named: a student can't type another's.
        title: task
          ? `T-${task.number}: ${dto.title.replace(TASK_PREFIXES, '')}`
          : role === 'member'
            ? dto.title.replace(TASK_PREFIXES, '')
            : dto.title,
        body: dto.body ?? '',
      });
      if (task && (task.status === 'TODO' || task.status === 'IN_PROGRESS')) {
        await this.prisma.hubTask.update({ where: { id: task.id }, data: { status: 'IN_REVIEW' } });
      }
      const authors = await this.authors([made.user.login], user.id);
      return this.summaryOf(made, authors);
    } catch (error) {
      if (error instanceof ForgejoError && error.status === 409) {
        throw new ConflictException({
          error: 'PULL_EXISTS',
          message: 'This branch already has an open pull request.',
        });
      }
      fromForgejo(error);
    }
  }

  async comment(user: AuthUser, projectId: string, number: number, body: string) {
    const { project, role, repo, username } = await this.actor(user, projectId);
    if (!this.open(project)) {
      throw new ConflictException({
        error: 'PROJECT_NOT_ACTIVE',
        message: 'This project isn’t open for work.',
      });
    }
    if (role === 'member') assertKind(body);
    try {
      await this.forgejo.comment(repo, number, username, body);
    } catch (error) {
      fromForgejo(error);
    }
  }

  /**
   * The lead reviews a pull request: approve or ask for changes, with a score (1–5)
   * for the student who wrote it. The review counts for its latest commit only.
   */
  async review(
    user: AuthUser,
    projectId: string,
    number: number,
    dto: { decision: 'APPROVED' | 'CHANGES_REQUESTED'; score: number; body?: string },
    ctx: RequestContext,
  ) {
    const { project, role, repo, username } = await this.actor(user, projectId);
    if (role !== 'lead') throw projectNotFound();
    if (!this.open(project)) {
      throw new ConflictException({
        error: 'PROJECT_NOT_ACTIVE',
        message: 'This project isn’t open for work.',
      });
    }
    try {
      const pull = await this.forgejo.pull(repo, number);
      if (pull.state !== 'open' || pull.merged) {
        throw new ConflictException({
          error: 'PULL_CLOSED',
          message: 'This pull request is closed.',
        });
      }
      const author = await this.prisma.gitAccount.findUnique({
        where: { username: pull.user.login },
        select: { userId: true, user: { select: { kind: true } } },
      });
      if (!author || author.user.kind !== 'STUDENT') {
        throw new ConflictException({
          error: 'NOT_A_STUDENT_PULL',
          message: 'Only students’ pull requests get reviews.',
        });
      }
      const head = (await this.forgejo.branchHead(repo, pull.head.ref)) ?? pull.head.sha;
      await this.forgejo.review(repo, number, username, {
        event: dto.decision === 'APPROVED' ? 'APPROVED' : 'REQUEST_CHANGES',
        body: dto.body ?? '',
        commit_id: head,
      });
      const taskNumber = TASK_PREFIX.exec(pull.title)?.[1];
      const task = taskNumber ? project.tasks.find((t) => t.number === Number(taskNumber)) : null;
      await this.prisma.$transaction(async (tx) => {
        await tx.hubCodeReview.create({
          data: {
            projectId,
            taskId: task?.id ?? null,
            studentId: author.userId,
            reviewerId: user.id,
            pullNumber: number,
            commit: head,
            decision: dto.decision,
            score: dto.score,
            comment: dto.body?.trim() || null,
          },
        });
        if (task && dto.decision === 'CHANGES_REQUESTED' && task.status === 'IN_REVIEW') {
          await tx.hubTask.update({ where: { id: task.id }, data: { status: 'IN_PROGRESS' } });
        }
        await this.audit.record(
          {
            actor: { id: user.id, roleKey: user.roleKey },
            action: 'hub.code_review',
            entityType: 'HubProject',
            entityId: projectId,
            after: { pullNumber: number, decision: dto.decision, score: dto.score, commit: head },
            context: ctx,
          },
          tx,
        );
      });
    } catch (error) {
      fromForgejo(error);
    }
  }

  /** The lead merges an approved pull request; its task is done. */
  async merge(user: AuthUser, projectId: string, number: number) {
    const { project, role, repo, username } = await this.actor(user, projectId);
    if (role !== 'lead') throw projectNotFound();
    try {
      const [pull, reviews] = await Promise.all([
        this.settledPull(repo, number),
        this.forgejo.reviews(repo, number),
      ]);
      if (pull.state !== 'open' || pull.merged) {
        throw new ConflictException({
          error: 'PULL_CLOSED',
          message: 'This pull request is closed.',
        });
      }
      const blocked = await this.mergeBlocked(project, pull, reviews, repo);
      if (blocked) {
        throw new ConflictException({
          error: blocked,
          message:
            blocked === 'APPROVAL_NEEDED'
              ? 'Approve its latest changes first.'
              : 'This pull request can’t be merged yet.',
        });
      }
      await this.forgejo.merge(repo, number, username);
      const taskNumber = TASK_PREFIX.exec(pull.title)?.[1];
      const task = taskNumber ? project.tasks.find((t) => t.number === Number(taskNumber)) : null;
      if (task && task.status !== 'DONE' && task.status !== 'CANCELLED') {
        await this.prisma.hubTask.update({
          where: { id: task.id },
          data: { status: 'DONE', doneAt: new Date() },
        });
      }
    } catch (error) {
      fromForgejo(error);
    }
  }
}
