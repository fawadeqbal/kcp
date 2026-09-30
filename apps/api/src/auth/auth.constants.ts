/** httpOnly cookies that carry the refresh token for browsers, one per app. */
export const REFRESH_COOKIE = 'kcp_refresh';
export const ADMIN_REFRESH_COOKIE = 'kcp_admin_refresh';
/** The cookie is only sent to the auth routes that need it. */
export const REFRESH_COOKIE_PATH = '/v1/auth';

export const JWT_ISSUER = 'kcp-api';
export const ACCESS_AUDIENCE = 'kcp-access';
export const MFA_AUDIENCE = 'kcp-mfa';
export const MFA_TOKEN_TTL_SECONDS = 300;

export const EMAIL_VERIFICATION_TTL_HOURS = 48;
export const PASSWORD_RESET_TTL_HOURS = 1;

/** Name shown in authenticator apps for staff two-factor codes. */
export const TOTP_ISSUER = 'Kids Coding Platform';

/** Version of the terms and privacy policy (packages/shared: the web app shows it too). */
export { TERMS_VERSION } from '@kcp/shared';

/** Wrong two-factor codes in a row (per account) before two-factor login pauses. */
export const MFA_MAX_FAILURES = 10;
export const MFA_LOCK_SECONDS = 60 * 60;

/** A refresh token presented again within this window is treated as a race between
 *  browser tabs, not as theft. */
export const REFRESH_REUSE_GRACE_SECONDS = 10;
