import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiAcceptedResponse, ApiNoContentResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Request, Response } from 'express';
import { byBodyField, byIp, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { ReqContext, type RequestContext } from '../common/request-context.js';
import { AppConfigService } from '../config/app-config.service.js';
import type { AuthUser } from '../permissions/auth-user.js';
import { Authenticated, CurrentUser, Public } from '../permissions/permission.decorators.js';
import { ADMIN_REFRESH_COOKIE, REFRESH_COOKIE, REFRESH_COOKIE_PATH } from './auth.constants.js';
import { AuthService, type AuthenticatedResult } from './auth.service.js';
import {
  AcceptedResponseDto,
  LoginResponseDto,
  MeDto,
  MfaSetupResponseDto,
  VerifiedResponseDto,
} from './dto/auth-response.dto.js';
import {
  type ClientApp,
  LoginDto,
  MfaTokenDto,
  MfaVerifyDto,
  RefreshDto,
  StudentLoginDto,
  type TokenDelivery,
} from './dto/login.dto.js';
import {
  AcceptTermsDto,
  ChangePasswordDto,
  EmailDto,
  ParentSignUpDto,
  ResetPasswordDto,
  TokenDto,
} from './dto/sign-up.dto.js';

const MINUTE = 60;

/**
 * "Forgot password" and "send the link again" answer after at least this long, so the
 * time taken (sending an email or not) doesn't tell whether an account exists.
 */
const ANSWER_FLOOR_MS = 800;
const answerLogger = new Logger('AuthController');
/**
 * Answers after `ms` whatever the work does: the email goes out in the background, so
 * a slow or failing mail server can't show which addresses have an account either.
 */
async function answerAfter(ms: number, work: Promise<unknown>): Promise<void> {
  work.catch((error: unknown) =>
    answerLogger.error(`Couldn't send an account email: ${(error as Error).message}`),
  );
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const cookieName = (app: ClientApp = 'web') =>
  app === 'admin' ? ADMIN_REFRESH_COOKIE : REFRESH_COOKIE;
const HOUR = 3600;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfigService,
  ) {}

  /** Parent sign-up. Sends a confirmation email; the account works once it is confirmed. */
  @Post('parents/sign-up')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit(
    { name: 'sign-up-ip', limit: 20, windowSeconds: HOUR, key: byIp },
    { name: 'sign-up-email', limit: 3, windowSeconds: HOUR, key: byBodyField('email') },
  )
  @ApiAcceptedResponse({ type: AcceptedResponseDto })
  async signUpParent(
    @Body() dto: ParentSignUpDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<AcceptedResponseDto> {
    await this.auth.signUpParent(dto, ctx);
    return { status: 'accepted' };
  }

  /** Confirms an email address with the token from the email link. */
  @Post('email/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'verify-ip', limit: 30, windowSeconds: 15 * MINUTE, key: byIp })
  @ApiOkResponse({ type: VerifiedResponseDto })
  async verifyEmail(@Body() dto: TokenDto): Promise<VerifiedResponseDto> {
    await this.auth.verifyEmail(dto.token);
    return { status: 'verified' };
  }

  /** Sends the confirmation email again (if the account is still waiting for it). */
  @Post('email/resend')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit(
    { name: 'resend-ip', limit: 10, windowSeconds: HOUR, key: byIp },
    { name: 'resend-email', limit: 3, windowSeconds: HOUR, key: byBodyField('email') },
  )
  @ApiAcceptedResponse({ type: AcceptedResponseDto })
  async resendVerification(@Body() dto: EmailDto): Promise<AcceptedResponseDto> {
    await answerAfter(ANSWER_FLOOR_MS, this.auth.resendVerification(dto.email));
    return { status: 'accepted' };
  }

  /** Emails a password-reset link. The response is the same whether or not the account exists. */
  @Post('password/forgot')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @RateLimit(
    { name: 'forgot-ip', limit: 10, windowSeconds: HOUR, key: byIp },
    { name: 'forgot-email', limit: 3, windowSeconds: HOUR, key: byBodyField('email') },
  )
  @ApiAcceptedResponse({ type: AcceptedResponseDto })
  async forgotPassword(@Body() dto: EmailDto): Promise<AcceptedResponseDto> {
    await answerAfter(ANSWER_FLOOR_MS, this.auth.forgotPassword(dto.email));
    return { status: 'accepted' };
  }

  /** Sets a new password with the token from the email link and signs out every session. */
  @Post('password/reset')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'reset-ip', limit: 20, windowSeconds: 15 * MINUTE, key: byIp })
  @ApiOkResponse({ type: VerifiedResponseDto })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @ReqContext() ctx: RequestContext,
  ): Promise<VerifiedResponseDto> {
    await this.auth.resetPassword(dto.token, dto.password, ctx);
    return { status: 'password_reset' };
  }

  /** Email and password login for adults. Staff continue with two-factor login. */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit(
    { name: 'login-ip', limit: 30, windowSeconds: 15 * MINUTE, key: byIp },
    { name: 'login-email', limit: 10, windowSeconds: 15 * MINUTE, key: byBodyField('email') },
  )
  @ApiOkResponse({ type: LoginResponseDto })
  async login(
    @Body() dto: LoginDto,
    @ReqContext() ctx: RequestContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.auth.login(dto.email, dto.password, ctx, dto.app);
    return this.deliver(result, dto.app === 'mobile' ? 'body' : dto.tokenDelivery, res, dto.app);
  }

  /** Student login with the username and password their parent set. */
  @Post('students/login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit(
    // A school's classrooms share one IP: the limit per username stops guessing.
    { name: 'student-login-ip', limit: 300, windowSeconds: 15 * MINUTE, key: byIp },
    {
      name: 'student-login-username',
      limit: 10,
      windowSeconds: 15 * MINUTE,
      key: byBodyField('username'),
    },
  )
  @ApiOkResponse({ type: LoginResponseDto })
  async loginStudent(
    @Body() dto: StudentLoginDto,
    @ReqContext() ctx: RequestContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.auth.loginStudent(dto.username, dto.password, ctx, dto.app);
    return this.deliver(result, dto.app === 'mobile' ? 'body' : dto.tokenDelivery, res, dto.app);
  }

  /** Staff without two-factor yet: returns a secret to add to an authenticator app. */
  @Post('mfa/setup')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'mfa-setup-ip', limit: 10, windowSeconds: 15 * MINUTE, key: byIp })
  @ApiOkResponse({ type: MfaSetupResponseDto })
  setupMfa(@Body() dto: MfaTokenDto): Promise<MfaSetupResponseDto> {
    return this.auth.setupMfa(dto.mfaToken);
  }

  /** Second login step for staff: the 6-digit authenticator code. */
  @Post('mfa/verify')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit(
    { name: 'mfa-ip', limit: 20, windowSeconds: 15 * MINUTE, key: byIp },
    { name: 'mfa-token', limit: 5, windowSeconds: 5 * MINUTE, key: byBodyField('mfaToken') },
  )
  @ApiOkResponse({ type: LoginResponseDto })
  async verifyMfa(
    @Body() dto: MfaVerifyDto,
    @ReqContext() ctx: RequestContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const result = await this.auth.verifyMfa(dto.mfaToken, dto.code, ctx);
    return this.deliver(result, dto.app === 'mobile' ? 'body' : dto.tokenDelivery, res, dto.app);
  }

  /** Swaps the refresh token (cookie or body) for a new access token and refresh token. */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RateLimit({ name: 'refresh-ip', limit: 600, windowSeconds: 15 * MINUTE, key: byIp })
  @ApiOkResponse({ type: LoginResponseDto })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @ReqContext() ctx: RequestContext,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const token = dto.refreshToken ?? this.cookieToken(req, dto.app);
    if (!token) {
      this.clearCookie(res, dto.app);
      throw new UnauthorizedException({
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Please log in.',
      });
    }
    try {
      const result = await this.auth.refresh(token, ctx);
      // A token that came in a cookie goes back in a cookie: a script on the page must
      // never be able to read it. Only apps that keep it themselves (mobile) get it back.
      return this.deliver(result, dto.refreshToken ? 'body' : 'cookie', res, dto.app);
    } catch (error) {
      this.clearCookie(res, dto.app);
      throw error;
    }
  }

  /** Ends the current session. Safe to call more than once. */
  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(dto.refreshToken ?? this.cookieToken(req, dto.app));
    this.clearCookie(res, dto.app);
  }

  /** A signed-in adult changes their password; every other device is signed out. */
  @Post('password/change')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit({ name: 'password-change-ip', limit: 10, windowSeconds: 15 * MINUTE, key: byIp })
  @ApiNoContentResponse()
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.auth.changePassword(user, dto.currentPassword, dto.newPassword, ctx);
  }

  /** A parent accepts the current terms of use and privacy policy. */
  @Post('terms/accept')
  @Authenticated()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async acceptTerms(
    @Body() dto: AcceptTermsDto,
    @CurrentUser() user: AuthUser,
    @ReqContext() ctx: RequestContext,
  ): Promise<void> {
    await this.auth.acceptTerms(user.id, dto.version, ctx);
  }

  /** The signed-in account, its role and permission rules. */
  @Get('me')
  @Authenticated()
  @ApiOkResponse({ type: MeDto })
  me(@CurrentUser() user: AuthUser): Promise<MeDto> {
    return this.auth.me(user.id);
  }

  // ── Refresh-token delivery ─────────────────────────────────────────────────

  private deliver(
    result: AuthenticatedResult,
    delivery: TokenDelivery | undefined,
    res: Response,
    app: ClientApp = 'web',
  ): LoginResponseDto {
    if (!result.refreshToken) {
      return result.response;
    }
    if (delivery === 'body') {
      return { ...result.response, refreshToken: result.refreshToken };
    }
    res.cookie(cookieName(app), result.refreshToken, {
      ...this.cookieOptions(),
      expires: result.refreshExpiresAt,
    });
    return result.response;
  }

  private cookieToken(req: Request, app: ClientApp = 'web'): string | undefined {
    const value = (req.cookies as Record<string, unknown> | undefined)?.[cookieName(app)];
    return typeof value === 'string' && value ? value : undefined;
  }

  private clearCookie(res: Response, app: ClientApp = 'web'): void {
    res.clearCookie(cookieName(app), this.cookieOptions());
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      // Strict: the browser only sends it on requests from our own site, which blocks
      // cross-site request forgery on the refresh endpoint.
      sameSite: 'strict',
      secure: this.config.isProduction || this.config.get('API_PUBLIC_URL').startsWith('https://'),
      path: REFRESH_COOKIE_PATH,
      domain: this.config.get('COOKIE_DOMAIN'),
    };
  }
}
