import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';
import { ADULT_PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '@kcp/shared';

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ParentSignUpDto {
  /** The parent's email address. It becomes their login. */
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  /** At least 10 characters. A short sentence is easy to remember and hard to guess. */
  @IsString()
  @MinLength(ADULT_PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;

  /** How we greet the parent. Never shown publicly. */
  @Transform(trim)
  @IsString()
  @Length(1, 80)
  displayName!: string;

  /** Language for emails and the app, e.g. "en", "ar", "ur". */
  @IsString()
  @Matches(/^[a-z]{2}$/)
  languageCode!: string;

  /** ISO country code, e.g. "PK". */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z]{2}$/)
  countryCode!: string;

  /** Must be true: the parent accepts the terms and privacy policy. */
  @Equals(true, { message: 'You need to accept the terms and privacy policy.' })
  acceptTerms!: boolean;
}

export class EmailDto {
  @Transform(trimLower)
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class TokenDto {
  /** The token from the email link. */
  @IsString()
  @Length(20, 200)
  token!: string;
}

export class ResetPasswordDto extends TokenDto {
  @IsString()
  @MinLength(ADULT_PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @IsString()
  @MinLength(ADULT_PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword!: string;
}

export class AcceptTermsDto {
  /** The version the parent read (TERMS_VERSION), e.g. "2026-10". */
  @IsString()
  @MaxLength(40)
  version!: string;
}
