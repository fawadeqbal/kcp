import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export type TokenDelivery = 'cookie' | 'body';
export type ClientApp = 'web' | 'admin' | 'mobile';

export class TokenDeliveryDto {
  /**
   * How to hand over the refresh token. Browsers use "cookie" (the default): an
   * httpOnly cookie scripts can't read. The mobile app uses "body" and keeps it in
   * secure storage.
   */
  @IsOptional()
  @IsIn(['cookie', 'body'])
  tokenDelivery?: TokenDelivery;

  /**
   * Which app is signing in. The admin panel keeps its own refresh cookie, so a
   * staff session and a parent session in the same browser never overwrite each
   * other, and only staff can sign in to it. The mobile app is for students and
   * parents only, and always gets its refresh token in the body.
   */
  @IsOptional()
  @IsIn(['web', 'admin', 'mobile'])
  app?: ClientApp;
}

export class LoginDto extends TokenDeliveryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(1, 128)
  password!: string;
}

export class MfaTokenDto {
  /** The short-lived token returned by login when a second step is needed. */
  @IsString()
  @Length(20, 2000)
  mfaToken!: string;
}

export class MfaVerifyDto extends TokenDeliveryDto {
  @IsString()
  @Length(20, 2000)
  mfaToken!: string;

  /** The 6-digit code from the authenticator app. */
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from your authenticator app.' })
  code!: string;
}

export class RefreshDto extends TokenDeliveryDto {
  /** Only for tokenDelivery "body" clients; browsers send the cookie instead. */
  @IsOptional()
  @IsString()
  @Length(20, 200)
  refreshToken?: string;
}

export class StudentLoginDto extends TokenDeliveryDto {
  /** The login name the parent received, e.g. "swift-falcon-4821". */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @Length(3, 60)
  username!: string;

  @IsString()
  @Length(1, 128)
  password!: string;
}
