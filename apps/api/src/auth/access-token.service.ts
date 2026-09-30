import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AccountKind } from '@kcp/database';
import { AppConfigService } from '../config/app-config.service.js';
import {
  ACCESS_AUDIENCE,
  JWT_ISSUER,
  MFA_AUDIENCE,
  MFA_TOKEN_TTL_SECONDS,
} from './auth.constants.js';

export interface AccessTokenClaims {
  sub: string;
  sid: string;
  role: string;
  kind: AccountKind;
}

export type MfaStage = 'verify' | 'setup';

export interface MfaTokenClaims {
  sub: string;
  stage: MfaStage;
}

/** Signs and checks the short-lived JWTs: access tokens and two-factor step tokens. */
@Injectable()
export class AccessTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  get accessTtlSeconds(): number {
    return this.config.get('ACCESS_TOKEN_TTL_SECONDS');
  }

  signAccess(claims: AccessTokenClaims): Promise<string> {
    return this.jwt.signAsync(
      { sid: claims.sid, role: claims.role, kind: claims.kind },
      {
        subject: claims.sub,
        audience: ACCESS_AUDIENCE,
        issuer: JWT_ISSUER,
        expiresIn: this.accessTtlSeconds,
      },
    );
  }

  async verifyAccess(token: string): Promise<AccessTokenClaims> {
    try {
      const payload = await this.jwt.verifyAsync<AccessTokenClaims>(token, {
        audience: ACCESS_AUDIENCE,
        issuer: JWT_ISSUER,
        algorithms: ['HS256'],
      });
      if (!payload.sub || !payload.sid) {
        throw new Error('missing claims');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Your session has expired. Please log in again.');
    }
  }

  signMfa(claims: MfaTokenClaims): Promise<string> {
    return this.jwt.signAsync(
      { stage: claims.stage },
      {
        subject: claims.sub,
        audience: MFA_AUDIENCE,
        issuer: JWT_ISSUER,
        expiresIn: MFA_TOKEN_TTL_SECONDS,
      },
    );
  }

  async verifyMfa(token: string): Promise<MfaTokenClaims> {
    try {
      const payload = await this.jwt.verifyAsync<MfaTokenClaims>(token, {
        audience: MFA_AUDIENCE,
        issuer: JWT_ISSUER,
        algorithms: ['HS256'],
      });
      if (!payload.sub || (payload.stage !== 'verify' && payload.stage !== 'setup')) {
        throw new Error('bad claims');
      }
      return payload;
    } catch {
      throw new UnauthorizedException({
        error: 'MFA_EXPIRED',
        message: 'This sign-in attempt has expired. Please start again.',
      });
    }
  }
}
