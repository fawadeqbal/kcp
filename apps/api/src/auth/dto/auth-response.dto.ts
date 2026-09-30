export class AcceptedResponseDto {
  /** Always "accepted". The response is the same whether or not the email is registered. */
  status!: 'accepted';
}

export class VerifiedResponseDto {
  status!: 'verified' | 'password_reset';
}

export class RoleSummaryDto {
  key!: string;
  name!: string;
  isStaff!: boolean;
}

export class StudentSummaryDto {
  nickname!: string;
  avatarKey!: string;
}

export class MeDto {
  id!: string;
  kind!: 'STUDENT' | 'ADULT';
  email!: string | null;
  username!: string | null;
  displayName!: string | null;
  languageCode!: string;
  countryCode!: string | null;
  role!: RoleSummaryDto;
  /** Whether two-factor login is switched on (staff only). */
  twoFactorEnabled!: boolean;
  /** Parents: the terms changed since they last accepted them (ask before going on). */
  mustAcceptTerms!: boolean;
  /** Students only: what other children see. */
  student!: StudentSummaryDto | null;
  /**
   * The caller's permission rules in CASL format, so apps can hide what the API
   * would refuse anyway. The API always re-checks.
   */
  rules!: Record<string, unknown>[];
}

export class LoginResponseDto {
  /**
   * authenticated = signed in. mfa_required = send the authenticator code to
   * /v1/auth/mfa/verify. mfa_setup_required = staff account without two-factor yet:
   * call /v1/auth/mfa/setup, then /v1/auth/mfa/verify.
   */
  status!: 'authenticated' | 'mfa_required' | 'mfa_setup_required';
  /** Send as "Authorization: Bearer …". */
  accessToken?: string;
  /** Seconds until the access token expires. */
  expiresIn?: number;
  /** Only when tokenDelivery is "body". */
  refreshToken?: string;
  /** Short-lived token for the two-factor step. */
  mfaToken?: string;
  user?: MeDto;
}

export class MfaSetupResponseDto {
  /** Base32 secret, for typing into an authenticator app by hand. */
  secret!: string;
  /** otpauth:// link; show it as a QR code. */
  otpauthUrl!: string;
}
