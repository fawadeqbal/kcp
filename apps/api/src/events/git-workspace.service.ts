import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import type {
  PullAuthorDto,
  PullDetailDto,
  PullSummaryDto,
  TeamFilesDto,
  WorkspaceDto,
} from './events.dto.js';
import { assertKind, isReadyMentor, submissionOf } from './events.shared.js';
import {
  ForgejoError,
  type ForgejoPull,
  type ForgejoReview,
  ForgejoService,
} from './forgejo.service.js';

const MAX_DIFF = 100_000;
const PREVIEW_FILES = ['index.html', 'style.css', 'script.js'] as const;

type Role = 'member' | 'mentor' | 'judge' | 'staff';

const teamNotFound = () =>
  new NotFoundException({ error: 'TEAM_NOT_FOUND', message: 'No such team.' });
const notRunning = () =>
  new ConflictException({
    error: 'EVENT_NOT_RUNNING',
    message: 'The event isn’t running: the repository is read-only.',
  });

/** Turns the git server's refusals into answers the apps understand. */
function fromForgejo(error: unknown): never {
  if (error instanceof ForgejoError) {
    if (error.status === 404) throw teamNotFound();
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

/** A branch name from a nickname (letters and digits), with a bit of the ID to keep it unique. */
export function branchFor(nickname: string, userId: string): string {
  const ascii = nickname
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 20);
  const suffix = userId.replaceAll('-', '').slice(-4);
  return ascii.length >= 3 ? `${ascii}-${suffix}` : `member-${suffix}`;
}

/**
 * A team's repository: opening the workspace (the repository is made the first time),
 * pull requests with reviews and comments, handing the work in, and the files the
 * judges preview. Students and mentors act as themselves on the git server; only the
 * team's members and its mentor (and staff, reading) get in.
 */
@Injectable()
export class GitWorkspaceService {
  private readonly logger = new Logger(GitWorkspaceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly forgejo: ForgejoService,
    private readonly config: AppConfigService,
  ) {}

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

  /** The team and what the viewer is to it (404 when nothing). */
  async access(user: AuthUser, teamId: string) {
    const team = await this.prisma.eventTeam.findUnique({
      where: { id: teamId },
      include: {
        event: { include: { judges: { select: { userId: true } } } },
        members: {
          include: { user: { select: { studentProfile: { select: { nickname: true } } } } },
        },
        submission: true,
      },
    });
    if (!team) throw teamNotFound();
    let role: Role | null = null;
    if (team.members.some((m) => m.userId === user.id && m.status === 'APPROVED')) role = 'member';
    else if (team.mentorId === user.id && (await isReadyMentor(this.prisma, user.id)))
      role = 'mentor';
    else if (
      team.event.judges.some((j) => j.userId === user.id) &&
      // Judges see the work once judging starts, like the previews.
      ['JUDGING', 'FINISHED'].includes(team.event.status) &&
      (await isReadyMentor(this.prisma, user.id))
    )
      role = 'judge';
    else if (user.isStaff && ['admin', 'moderator', 'super_admin'].includes(user.roleKey))
      role = 'staff';
    if (!role) throw teamNotFound();
    return { team, role };
  }

  private nameOf(team: Awaited<ReturnType<GitWorkspaceService['access']>>['team'], userId: string) {
    return team.members.find((m) => m.userId === userId)?.user.studentProfile?.nickname ?? '';
  }

  /** The team's repository, made (with its members and mentor added) the first time. */
  async ensureRepo(teamId: string): Promise<string> {
    this.assertGit();
    const team = await this.prisma.eventTeam.findUniqueOrThrow({
      where: { id: teamId },
      include: {
        event: true,
        members: {
          where: { status: 'APPROVED' },
          include: { user: { select: { studentProfile: { select: { nickname: true } } } } },
        },
        mentor: { select: { id: true, displayName: true } },
      },
    });
    if (team.repo) return team.repo;
    try {
      const org = team.event.gitOrg ?? `kcp-${team.event.slug}`;
      await this.forgejo.ensureOrg(org, team.event.title);
      if (!team.event.gitOrg) {
        await this.prisma.event.update({ where: { id: team.event.id }, data: { gitOrg: org } });
      }
      const repo = await this.forgejo.ensureRepo(
        org,
        `team-${team.id.replaceAll('-', '').slice(-8)}`,
        team.event.starter as Record<string, string>,
      );
      const people = [
        ...team.members.map((m) => ({ id: m.userId, name: m.user.studentProfile?.nickname ?? '' })),
        ...(team.mentor ? [{ id: team.mentor.id, name: team.mentor.displayName ?? '' }] : []),
      ];
      for (const person of people) {
        await this.forgejo.addCollaborator(repo, await this.forgejo.ensureAccount(person));
      }
      await this.prisma.eventTeam.update({ where: { id: team.id }, data: { repo } });
      return repo;
    } catch (error) {
      fromForgejo(error);
    }
  }

  /** Adds someone to the team's repository, if it exists already. */
  async addToRepo(teamId: string, person: { id: string; name: string }) {
    if (!this.forgejo.enabled) return;
    const team = await this.prisma.eventTeam.findUnique({ where: { id: teamId } });
    if (!team?.repo) return;
    try {
      await this.forgejo.addCollaborator(team.repo, await this.forgejo.ensureAccount(person));
    } catch (error) {
      this.logger.warn(`Not added to ${team.repo}: ${(error as Error).message}`);
    }
  }

  async removeFromRepo(teamId: string, userId: string) {
    if (!this.forgejo.enabled) return;
    const [team, account] = await Promise.all([
      this.prisma.eventTeam.findUnique({ where: { id: teamId } }),
      this.prisma.gitAccount.findUnique({ where: { userId } }),
    ]);
    if (!team?.repo || !account) return;
    await this.forgejo
      .removeCollaborator(team.repo, account.username)
      .catch((error: Error) => this.logger.warn(`Not removed from ${team.repo}: ${error.message}`));
  }

  /** Opens the workspace: where to clone from, the student's branch, and who commits. */
  async workspace(user: AuthUser, teamId: string): Promise<WorkspaceDto> {
    const { team, role } = await this.access(user, teamId);
    if (role !== 'member' && role !== 'mentor') throw teamNotFound();
    await this.ensureRepo(team.id);
    const nickname =
      role === 'member'
        ? this.nameOf(team, user.id)
        : ((await this.prisma.user.findUnique({ where: { id: user.id } }))?.displayName ??
          'Mentor');
    const username = await this.forgejo.ensureAccount({ id: user.id, name: nickname });
    return {
      teamId: team.id,
      gitUrl: `${this.config.get('API_PUBLIC_URL').replace(/\/$/, '')}/v1/git/teams/${team.id}`,
      branch: branchFor(nickname, user.id),
      canPush: team.event.status === 'RUNNING',
      author: { name: nickname, email: `${username}@noreply.kcp.invalid` },
    };
  }

  // ── Git over HTTP (the proxy's checks) ───────────────────────────────────

  /** Where git requests for this team go, after checking who may read or push. */
  async gitTarget(user: AuthUser, teamId: string, push: boolean) {
    this.assertGit();
    const { team, role } = await this.access(user, teamId);
    if (push) {
      if (role !== 'member' && role !== 'mentor') throw teamNotFound();
      if (team.event.status !== 'RUNNING') throw notRunning();
    }
    const repo = team.repo ?? (await this.ensureRepo(team.id));
    return {
      url: this.forgejo.gitUrl(repo),
      authorization: await this.forgejo.gitAuthorization(),
      // Students push their own branch only (the mentor may help on any but main).
      ownBranch: role === 'member' ? branchFor(this.nameOf(team, user.id), user.id) : null,
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
    const map = new Map<string, PullAuthorDto>();
    for (const a of accounts) {
      map.set(a.username, {
        name: a.user.studentProfile?.nickname ?? a.user.displayName ?? '',
        isAdult: a.user.kind !== 'STUDENT',
        isMe: a.userId === viewerId,
      });
    }
    return map;
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

  async pulls(user: AuthUser, teamId: string): Promise<PullSummaryDto[]> {
    const { team } = await this.access(user, teamId);
    if (!team.repo) return [];
    try {
      const pulls = await this.forgejo.pulls(team.repo);
      const authors = await this.authors(
        pulls.map((p) => p.user.login),
        user.id,
      );
      return pulls.map((pull) => this.summaryOf(pull, authors));
    } catch (error) {
      fromForgejo(error);
    }
  }

  /**
   * A pull request, waiting a moment when the git server is still working out whether
   * it can be merged (it says "not mergeable" until it knows).
   */
  private async settledPull(repo: string, number: number): Promise<ForgejoPull> {
    let pull = await this.forgejo.pull(repo, number);
    // The git server works out whether a pull request merges cleanly a moment after it
    // changes (longer when it is busy): wait up to about 5 seconds for that.
    for (let attempt = 0; attempt < 10 && !pull.mergeable && pull.state === 'open'; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      pull = await this.forgejo.pull(repo, number);
    }
    return pull;
  }

  /** The latest review of each reviewer (what counts for merging). */
  private latestReviews(reviews: ForgejoReview[]): ForgejoReview[] {
    const latest = new Map<string, ForgejoReview>();
    for (const review of reviews) {
      if (
        !review.user ||
        review.dismissed ||
        review.state === 'PENDING' ||
        review.state === 'COMMENT'
      ) {
        continue;
      }
      latest.set(review.user.login, review);
    }
    return [...latest.values()];
  }

  async pull(user: AuthUser, teamId: string, number: number): Promise<PullDetailDto> {
    const { team, role } = await this.access(user, teamId);
    if (!team.repo) throw teamNotFound();
    try {
      const [pull, diff, comments, reviews] = await Promise.all([
        this.settledPull(team.repo, number),
        this.forgejo.diff(team.repo, number),
        this.forgejo.comments(team.repo, number),
        this.forgejo.reviews(team.repo, number),
      ]);
      const authors = await this.authors(
        [
          pull.user.login,
          ...comments.map((c) => c.user.login),
          ...reviews.flatMap((r) => (r.user ? [r.user.login] : [])),
        ],
        user.id,
      );
      const author = this.authorOf(authors, pull.user.login);
      const acting = role === 'member' || role === 'mentor';
      const open = pull.state === 'open' && !pull.merged;
      const running = team.event.status === 'RUNNING';
      const mergeBlocked = await this.mergeBlocked(team, pull, reviews, team.repo);
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
        canReview: acting && open && running && !author.isMe,
        canMerge: acting && open && running && mergeBlocked === null,
        mergeBlocked: open ? mergeBlocked : null,
      };
    } catch (error) {
      fromForgejo(error);
    }
  }

  /**
   * Why a pull request can't be merged yet: changes asked for, or no approval from
   * someone other than its author (a teammate or the mentor). A team of one without a
   * mentor merges its own work.
   */
  private async mergeBlocked(
    team: { mentorId: string | null; members: { status: string }[]; event: { status: string } },
    pull: ForgejoPull,
    reviews: ForgejoReview[],
    repo: string,
  ): Promise<string | null> {
    if (team.event.status !== 'RUNNING') return 'EVENT_NOT_RUNNING';
    if (!pull.mergeable) return 'CONFLICTS';
    // A review counts for the code it saw: the branch's latest commit (the git server
    // marks older reviews stale a moment after a push; the branch moves at once).
    const head = (await this.forgejo.branchHead(repo, pull.head.ref)) ?? pull.head.sha;
    const current = (r: ForgejoReview) => (r.commit_id ? r.commit_id === head : !r.stale);
    const latest = this.latestReviews(reviews).filter((r) => r.user?.login !== pull.user.login);
    if (latest.some((r) => r.state === 'REQUEST_CHANGES' && current(r))) return 'CHANGES_REQUESTED';
    const others = team.members.filter((m) => m.status === 'APPROVED').length > 1 || team.mentorId;
    if (others && !latest.some((r) => r.state === 'APPROVED' && current(r))) {
      return 'APPROVAL_NEEDED';
    }
    return null;
  }

  private async actor(user: AuthUser, teamId: string) {
    const { team, role } = await this.access(user, teamId);
    if (role !== 'member' && role !== 'mentor') throw teamNotFound();
    if (!team.repo) throw teamNotFound();
    const account = await this.prisma.gitAccount.findUnique({ where: { userId: user.id } });
    const username =
      account?.username ??
      (await this.forgejo.ensureAccount({ id: user.id, name: this.nameOf(team, user.id) }));
    return { team, role, repo: team.repo, username };
  }

  async openPull(
    user: AuthUser,
    teamId: string,
    dto: { branch: string; title: string; body?: string },
  ): Promise<PullSummaryDto> {
    const { team, role, repo, username } = await this.actor(user, teamId);
    if (team.event.status !== 'RUNNING') throw notRunning();
    if (dto.branch === 'main') {
      throw new ConflictException({
        error: 'BRANCH_IS_MAIN',
        message: 'Push your work to your own branch first.',
      });
    }
    if (role === 'member') {
      assertKind(dto.title);
      if (dto.body) assertKind(dto.body);
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
        title: dto.title,
        body: dto.body ?? '',
      });
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

  async comment(user: AuthUser, teamId: string, number: number, body: string) {
    const { team, role, repo, username } = await this.actor(user, teamId);
    // Like the rooms: the team talks while the event runs and is judged, not after.
    if (!['RUNNING', 'JUDGING'].includes(team.event.status)) throw notRunning();
    if (role === 'member') assertKind(body);
    try {
      await this.forgejo.comment(repo, number, username, body);
    } catch (error) {
      fromForgejo(error);
    }
  }

  async review(
    user: AuthUser,
    teamId: string,
    number: number,
    dto: { event: 'APPROVED' | 'REQUEST_CHANGES' | 'COMMENT'; body?: string },
  ) {
    const { team, role, repo, username } = await this.actor(user, teamId);
    if (team.event.status !== 'RUNNING') throw notRunning();
    if (role === 'member' && dto.body) assertKind(dto.body);
    try {
      const pull = await this.forgejo.pull(repo, number);
      if (pull.user.login === username) {
        throw new ConflictException({
          error: 'OWN_PULL',
          message: 'Someone else reviews your pull request.',
        });
      }
      const head = await this.forgejo.branchHead(repo, pull.head.ref);
      await this.forgejo.review(repo, number, username, {
        event: dto.event,
        body: dto.body ?? '',
        ...(head ? { commit_id: head } : {}),
      });
    } catch (error) {
      fromForgejo(error);
    }
  }

  async merge(user: AuthUser, teamId: string, number: number) {
    const { team, repo, username } = await this.actor(user, teamId);
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
      const blocked = await this.mergeBlocked(team, pull, reviews, repo);
      if (blocked) {
        throw new ConflictException({
          error: blocked,
          message:
            blocked === 'APPROVAL_NEEDED'
              ? 'A teammate or your mentor approves it first.'
              : 'This pull request can’t be merged yet.',
        });
      }
      await this.forgejo.merge(repo, number, username);
    } catch (error) {
      fromForgejo(error);
    }
  }

  // ── Handing in, and the files judges preview ─────────────────────────────

  async submit(
    user: AuthUser,
    teamId: string,
    dto: { title: string; description: string },
    now = new Date(),
  ) {
    const { team, role } = await this.access(user, teamId);
    if (role !== 'member') throw teamNotFound();
    if (team.event.status !== 'RUNNING') throw notRunning();
    assertKind(dto.title);
    assertKind(dto.description);
    let commit: string | null = null;
    if (this.forgejo.enabled && team.repo) {
      commit = await this.forgejo.branchHead(team.repo, 'main').catch(() => null);
    }
    const saved = await this.prisma.eventSubmission.upsert({
      where: { teamId },
      create: {
        teamId,
        title: dto.title,
        description: dto.description,
        commit,
        submittedById: user.id,
        submittedAt: now,
      },
      update: {
        title: dto.title,
        description: dto.description,
        commit,
        submittedById: user.id,
        submittedAt: now,
      },
    });
    return submissionOf(saved)!;
  }

  /** index.html, style.css and script.js at the handed-in commit (or main). */
  async files(
    user: AuthUser,
    teamId: string,
    which: 'submission' | 'main' | undefined,
  ): Promise<TeamFilesDto> {
    const { team, role } = await this.access(user, teamId);
    if (role === 'judge' && !['JUDGING', 'FINISHED'].includes(team.event.status))
      throw teamNotFound();
    if (!team.repo) throw teamNotFound();
    this.assertGit();
    const ref =
      (which !== 'main' && team.submission?.commit) ||
      (await this.forgejo.branchHead(team.repo, 'main').catch(() => null)) ||
      'main';
    const files: Record<string, string> = {};
    try {
      for (const path of PREVIEW_FILES) {
        const content = await this.forgejo.file(team.repo, ref, path);
        if (content !== null) files[path] = content.slice(0, 50_000);
      }
    } catch (error) {
      fromForgejo(error);
    }
    return { ref, files };
  }
}
