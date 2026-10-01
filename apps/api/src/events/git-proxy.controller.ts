import { Readable } from 'node:stream';
import {
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import type { AuthUser } from '../permissions/auth-user.js';
import { Can, CurrentUser } from '../permissions/permission.decorators.js';
import { refusedUpdate, refUpdates } from './git-proxy.js';
import { GitWorkspaceService } from './git-workspace.service.js';

const SERVICES = new Set(['git-upload-pack', 'git-receive-pack']);
/** Headers passed on to the git server, and back to the browser. */
const REQUEST_HEADERS = ['content-type', 'content-encoding', 'git-protocol', 'accept'];
const RESPONSE_HEADERS = ['content-type', 'content-encoding', 'cache-control', 'expires', 'pragma'];

/**
 * Git over HTTP for team repositories (isomorphic-git in the browser): the API checks
 * the student's session and team, then passes the request to the git server with its
 * own credentials. Pushes may only update the student's branches, never `main`.
 */
@ApiExcludeController()
@Controller('git/teams/:id')
export class GitProxyController {
  private readonly logger = new Logger(GitProxyController.name);

  constructor(private readonly workspace: GitWorkspaceService) {}

  @Get('info/refs')
  @Can('read', 'EventTeam')
  async refs(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('service') service: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!SERVICES.has(service)) throw new ForbiddenException('Only smart HTTP.');
    const target = await this.workspace.gitTarget(user, id, service === 'git-receive-pack');
    await this.forward(
      `${target.url}/info/refs?service=${service}`,
      'GET',
      target.authorization,
      req,
      res,
    );
  }

  @Post('git-upload-pack')
  @HttpCode(200)
  @Can('read', 'EventTeam')
  async upload(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const target = await this.workspace.gitTarget(user, id, false);
    await this.forward(`${target.url}/git-upload-pack`, 'POST', target.authorization, req, res);
  }

  @Post('git-receive-pack')
  @HttpCode(200)
  @Can('update', 'EventTeam')
  async receive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const target = await this.workspace.gitTarget(user, id, true);
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const updates = refUpdates(body, req.headers['content-encoding']);
    const refused = updates ? refusedUpdate(updates, target.ownBranch) : 'the request';
    if (refused) {
      throw new ForbiddenException({
        error: 'PUSH_REFUSED',
        message:
          refused === 'refs/heads/main'
            ? 'main changes through pull requests: push your own branch.'
            : target.ownBranch
              ? `Push your own branch (${target.ownBranch}), not ${refused}.`
              : `Pushing ${refused} is not allowed.`,
      });
    }
    await this.forward(`${target.url}/git-receive-pack`, 'POST', target.authorization, req, res);
  }

  private async forward(
    url: string,
    method: 'GET' | 'POST',
    authorization: string,
    req: Request,
    res: Response,
  ) {
    const headers: Record<string, string> = { Authorization: authorization };
    for (const name of REQUEST_HEADERS) {
      const value = req.headers[name];
      if (typeof value === 'string') headers[name] = value;
    }
    let upstream: globalThis.Response;
    try {
      const signal = AbortSignal.timeout(60_000);
      upstream =
        method === 'POST'
          ? await fetch(url, {
              method: 'POST',
              headers,
              body: Buffer.isBuffer(req.body) ? new Uint8Array(req.body) : new Uint8Array(),
              signal,
            })
          : await fetch(url, { headers, signal });
    } catch (error) {
      this.logger.error(`Git server unreachable: ${(error as Error).message}`);
      res.status(502).type('text/plain').send('The git server is not reachable.');
      return;
    }
    res.status(upstream.status);
    for (const name of RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    if (!upstream.body) {
      res.end();
      return;
    }
    Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream).pipe(res);
  }
}
