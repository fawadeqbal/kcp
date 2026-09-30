/** Messages for API error codes the admin panel shows. English only. */
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email or password is incorrect.',
  NOT_STAFF: 'This account can’t use the admin panel. Parents log in on the main site.',
  ACCOUNT_DISABLED: 'This account is not active.',
  EMAIL_NOT_VERIFIED: 'This email address hasn’t been confirmed yet.',
  INVALID_CODE: 'That code didn’t work. Check the time on your phone and try the newest code.',
  MFA_ALREADY_ENABLED: 'Two-factor authentication is already set up. Enter a code instead.',
  TOO_MANY_REQUESTS: 'Too many attempts. Wait a few minutes and try again.',
  CANNOT_CHANGE_OWN_STATUS: 'You can’t suspend or reactivate your own account.',
  INVALID_STATUS_CHANGE: 'This account’s status can’t be changed that way.',
  INVALID_OR_EXPIRED_TOKEN: 'Your sign-in step expired. Start again.',
  NOT_A_FAMILY: 'Premium is for students and parents, not staff accounts.',
  NO_CHILDREN: 'This parent has no child accounts yet. Premium belongs to children.',
  ACCOUNT_DELETED: 'This account was deleted.',
  ALREADY_REVOKED: 'This grant was already revoked.',
};

export const NETWORK_ERROR = 'We couldn’t reach the API. Check your connection and try again.';
export const GENERIC_ERROR = 'Something went wrong. Please try again.';

/**
 * The message to show for an API error. Codes listed above get our own wording;
 * other refusals (a conflict, a rule not met) show the API's own sentence, which is
 * written for people.
 */
export function errorMessage(
  code: string | undefined,
  status?: number,
  apiMessage?: unknown,
): string {
  if (code && MESSAGES[code]) return MESSAGES[code];
  if (typeof apiMessage === 'string' && apiMessage && status && [400, 409, 422].includes(status)) {
    return apiMessage;
  }
  if (status === 403) return 'Your role doesn’t allow this.';
  if (status === 404) return 'Not found. It may have been deleted.';
  return GENERIC_ERROR;
}
