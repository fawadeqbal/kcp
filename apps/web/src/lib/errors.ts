/** API error codes that have their own translated message under "errors.*". */
export const KNOWN_ERROR_CODES = [
  'INVALID_CREDENTIALS',
  'EMAIL_NOT_VERIFIED',
  'ACCOUNT_DISABLED',
  'INVALID_OR_EXPIRED_TOKEN',
  'TOO_MANY_REQUESTS',
  'UNSUPPORTED_COUNTRY',
  'UNSUPPORTED_LANGUAGE',
  'NICKNAME_INVALID_FORMAT',
  'NICKNAME_INAPPROPRIATE',
  'NICKNAME_LOOKS_LIKE_REAL_NAME',
  'NICKNAME_CONTAINS_CONTACT_INFO',
  'TOO_MANY_CHILDREN',
  'BIRTH_YEAR_NOT_ALLOWED',
  'CONFIRMATION_MISMATCH',
  'INVALID_LOCATION',
  'PASSWORD_TOO_WEAK',
  'WRONG_PASSWORD',
] as const;

export type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

/** Maps an API error code (or a thrown network error) to a message key. */
export function errorMessageKey(code: string | undefined, networkError = false) {
  if (networkError) return 'network' as const;
  return (KNOWN_ERROR_CODES as readonly string[]).includes(code ?? '')
    ? (code as KnownErrorCode)
    : ('generic' as const);
}

/** Nickname problems belong next to the nickname field rather than at the top of the form. */
export function isNicknameError(code: string | undefined): boolean {
  return code?.startsWith('NICKNAME_') ?? false;
}
