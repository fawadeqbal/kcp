import { randomBytes } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';

export class ForgejoError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface ForgejoPull {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  merged: boolean;
  user: { login: string };
  head: { ref: string; sha: string };
  base: { ref: string };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  mergeable: boolean;
}

export interface ForgejoComment {
  id: number;
  body: string;
  user: { login: string };
  created_at: string;
}

export interface ForgejoReview {
  id: number;
  state: 'APPROVED' | 'REQUEST_CHANGES' | 'COMMENT' | 'PENDING' | string;
  body: string;
  user: { login: string } | null;
  submitted_at: string;
  /** The commit the review was made on. */
  commit_id?: string;
  stale: boolean;
  dismissed: boolean;
}

const notSetUp = () =>
  new HttpException(
    {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      error: 'GIT_NOT_SET_UP',
      message: 'Team repositories are not set up on this server.',
    },
    HttpStatus.SERVICE_UNAVAILABLE,
  );

/**
 * The self-hosted git server (Forgejo) that keeps the hackathon teams' repositories.
 * Only the API talks to it, with its admin token: API calls made for a student carry
 * `Sudo: <their git account>` so pull requests, comments and reviews are theirs, and
 * git itself goes through the API's proxy (GitProxyController). Every repository is
 * private, `main` is protected (changes arrive through pull requests), and nobody
 * signs in to the git server directly.
 */
@Injectable()
export class ForgejoService {
  private readonly logger = new Logger(ForgejoService.name);
  private admin: string | null = null;

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
  ) {}

  get enabled(): boolean {
    return Boolean(this.config.get('FORGEJO_URL') && this.config.get('FORGEJO_TOKEN'));
  }

  private get base(): string {
    const url = this.config.get('FORGEJO_URL');
    if (!url) throw notSetUp();
    return url.replace(/\/$/, '');
  }

  private get token(): string {
    const token = this.config.get('FORGEJO_TOKEN');
    if (!token) throw notSetUp();
    return token;
  }

  private async request(
    method: string,
    path: string,
    { body, sudo, accept }: { body?: unknown; sudo?: string; accept?: string } = {},
  ): Promise<Response> {
    let response: Response;
    try {
      response = await fetch(`${this.base}/api/v1${path}`, {
        method,
        headers: {
          Authorization: `token ${this.token}`,
          Accept: accept ?? 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(sudo ? { Sudo: sudo } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      this.logger.error(`Git server unreachable: ${(error as Error).message}`);
      throw new ForgejoError(503, 'The git server is not reachable.');
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      let message = text.slice(0, 300);
      try {
        message = (JSON.parse(text) as { message?: string }).message ?? message;
      } catch {
        // Not JSON.
      }
      throw new ForgejoError(response.status, message);
    }
    return response;
  }

  private async json<T>(
    method: string,
    path: string,
    options: { body?: unknown; sudo?: string } = {},
  ): Promise<T> {
    const response = await this.request(method, path, options);
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  /** The admin account's name (git over HTTP signs in with it and the token). */
  async adminName(): Promise<string> {
    this.admin ??= (await this.json<{ login: string }>('GET', '/user')).login;
    return this.admin;
  }

  /** Basic credentials for git over HTTP (the proxy adds them; students never see them). */
  async gitAuthorization(): Promise<string> {
    const name = await this.adminName();
    return `Basic ${Buffer.from(`${name}:${this.token}`).toString('base64')}`;
  }

  /** Where a repository's git endpoints are, e.g. …/kcp-spring-jam/team-1a2b3c4d.git */
  gitUrl(repo: string): string {
    return `${this.base}/${repo}.git`;
  }

  // ── Accounts, organisations, repositories ────────────────────────────────

  /** The git account of a student or mentor, made the first time it's needed. */
  async ensureAccount(user: { id: string; name: string }): Promise<string> {
    const existing = await this.prisma.gitAccount.findUnique({ where: { userId: user.id } });
    // gitId 0: recorded without a git server (demo data); made on the server now.
    if (existing && existing.gitId > 0) return existing.username;
    const username = `kcp-${user.id.replaceAll('-', '').slice(-12)}`;
    let gitId: number;
    try {
      const made = await this.json<{ id: number }>('POST', '/admin/users', {
        body: {
          username,
          email: `${username}@noreply.kcp.invalid`,
          full_name: user.name.slice(0, 50),
          // Nobody signs in with it: the API acts for them.
          password: randomBytes(24).toString('base64url'),
          must_change_password: false,
          visibility: 'private',
        },
      });
      gitId = made.id;
    } catch (error) {
      if (!(error instanceof ForgejoError) || error.status !== 422) throw error;
      // Made before (a database restored from a backup): find it.
      gitId = (await this.json<{ id: number }>('GET', `/users/${username}`)).id;
    }
    await this.prisma.gitAccount.upsert({
      where: { userId: user.id },
      create: { userId: user.id, username, gitId },
      update: { username, gitId },
    });
    return username;
  }

  /** The organisation that holds an event's repositories. */
  async ensureOrg(name: string, fullName: string): Promise<void> {
    try {
      await this.json('POST', '/orgs', {
        body: { username: name, full_name: fullName.slice(0, 100), visibility: 'private' },
      });
    } catch (error) {
      if (!(error instanceof ForgejoError) || error.status !== 422) throw error;
    }
  }

  /**
   * A team's repository: private, starting with the event's starter files on `main`,
   * and `main` protected (only pull requests change it).
   */
  async ensureRepo(org: string, name: string, starter: Record<string, string>): Promise<string> {
    const repo = `${org}/${name}`;
    let made = false;
    try {
      await this.json('POST', `/orgs/${org}/repos`, {
        body: {
          name,
          private: true,
          auto_init: true,
          default_branch: 'main',
          readme: 'Default',
        },
      });
      made = true;
    } catch (error) {
      if (!(error instanceof ForgejoError) || error.status !== 409) throw error;
    }
    // Checked every time, so a repository whose set-up stopped half way is finished
    // on the next try: starter files that are missing, and main's protection.
    const existing = await this.json<{ path: string; sha: string }[]>(
      'GET',
      `/repos/${repo}/contents?ref=main`,
    );
    const shaOf = new Map(existing.map((file) => [file.path, file.sha]));
    // A new repository has only its README: starter files replace it. Later, only
    // missing ones are added (never over the team's work).
    const files = Object.entries(starter)
      .filter(([path]) => made || !shaOf.has(path))
      .map(([path, content]) => ({
        operation: shaOf.has(path) ? 'update' : 'create',
        path,
        content: Buffer.from(content).toString('base64'),
        ...(shaOf.has(path) ? { sha: shaOf.get(path) } : {}),
      }));
    if (files.length) {
      await this.json('POST', `/repos/${repo}/contents`, {
        body: { branch: 'main', message: 'Starter files', files },
      });
    }
    const rules = await this.json<{ rule_name?: string; branch_name?: string }[]>(
      'GET',
      `/repos/${repo}/branch_protections`,
    );
    if (!rules.some((rule) => (rule.rule_name ?? rule.branch_name) === 'main')) {
      await this.json('POST', `/repos/${repo}/branch_protections`, {
        body: { rule_name: 'main', branch_name: 'main', enable_push: false },
      });
    }
    return repo;
  }

  async addCollaborator(repo: string, username: string, permission: 'write' | 'read' = 'write') {
    await this.json('PUT', `/repos/${repo}/collaborators/${username}`, { body: { permission } });
  }

  async removeCollaborator(repo: string, username: string) {
    try {
      await this.json('DELETE', `/repos/${repo}/collaborators/${username}`);
    } catch (error) {
      if (!(error instanceof ForgejoError) || error.status !== 404) throw error;
    }
  }

  /** The latest commit of a branch (null when the branch doesn't exist). */
  async branchHead(repo: string, branch: string): Promise<string | null> {
    try {
      const found = await this.json<{ commit: { id: string } }>(
        'GET',
        `/repos/${repo}/branches/${encodeURIComponent(branch)}`,
      );
      return found.commit.id;
    } catch (error) {
      if (error instanceof ForgejoError && error.status === 404) return null;
      throw error;
    }
  }

  async branches(repo: string): Promise<string[]> {
    const list = await this.json<{ name: string }[]>('GET', `/repos/${repo}/branches?limit=50`);
    return list.map((b) => b.name);
  }

  /** A file at a commit or branch (null when it isn't there). */
  async file(repo: string, ref: string, path: string): Promise<string | null> {
    try {
      const response = await this.request(
        'GET',
        `/repos/${repo}/raw/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`,
        { accept: '*/*' },
      );
      return await response.text();
    } catch (error) {
      if (error instanceof ForgejoError && error.status === 404) return null;
      throw error;
    }
  }

  // ── Pull requests ────────────────────────────────────────────────────────

  pulls(repo: string): Promise<ForgejoPull[]> {
    return this.json('GET', `/repos/${repo}/pulls?state=all&sort=recentupdate&limit=50`);
  }

  pull(repo: string, number: number): Promise<ForgejoPull> {
    return this.json('GET', `/repos/${repo}/pulls/${number}`);
  }

  async diff(repo: string, number: number): Promise<string> {
    const response = await this.request('GET', `/repos/${repo}/pulls/${number}.diff`, {
      accept: 'text/plain',
    });
    return response.text();
  }

  openPull(repo: string, sudo: string, pull: { head: string; title: string; body: string }) {
    return this.json<ForgejoPull>('POST', `/repos/${repo}/pulls`, {
      sudo,
      body: { head: pull.head, base: 'main', title: pull.title, body: pull.body },
    });
  }

  comments(repo: string, number: number): Promise<ForgejoComment[]> {
    return this.json('GET', `/repos/${repo}/issues/${number}/comments`);
  }

  comment(repo: string, number: number, sudo: string, body: string) {
    return this.json<ForgejoComment>('POST', `/repos/${repo}/issues/${number}/comments`, {
      sudo,
      body: { body },
    });
  }

  reviews(repo: string, number: number): Promise<ForgejoReview[]> {
    return this.json('GET', `/repos/${repo}/pulls/${number}/reviews`);
  }

  review(
    repo: string,
    number: number,
    sudo: string,
    review: {
      event: 'APPROVED' | 'REQUEST_CHANGES' | 'COMMENT';
      body: string;
      /** The commit reviewed (the branch's latest): approvals count for that code only. */
      commit_id?: string;
    },
  ) {
    return this.json<ForgejoReview>('POST', `/repos/${repo}/pulls/${number}/reviews`, {
      sudo,
      body: review,
    });
  }

  async merge(repo: string, number: number, sudo: string) {
    // 405 means "try again later": the server is still checking the latest push.
    for (let attempt = 0; ; attempt++) {
      try {
        await this.json('POST', `/repos/${repo}/pulls/${number}/merge`, {
          sudo,
          body: { Do: 'merge', delete_branch_after_merge: false },
        });
        return;
      } catch (error) {
        if (!(error instanceof ForgejoError) || error.status !== 405 || attempt >= 9) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }
}
