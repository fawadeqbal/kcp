import type { AccountKind } from '@kcp/database';

/** The signed-in caller, attached to the request by the auth guard. */
export interface AuthUser {
  id: string;
  sessionId: string;
  roleId: string;
  roleKey: string;
  kind: AccountKind;
  isStaff: boolean;
}
