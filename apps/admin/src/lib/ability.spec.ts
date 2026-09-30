import { abilityFrom, userSubject } from './ability';

// Shaped like the rules the API sends with /v1/auth/me (see permission-matrix.ts).
const ADMIN_RULES = [
  { action: 'read', subject: 'User' },
  {
    action: 'update',
    subject: 'User',
    fields: ['status', 'sessions', 'displayName', 'languageCode'],
    conditions: { roleKey: { $nin: ['admin', 'super_admin'] } },
  },
  { action: 'read', subject: 'AuditLog' },
];

const MODERATOR_RULES = [
  { action: 'read', subject: 'User' },
  {
    action: 'update',
    subject: 'User',
    fields: ['status', 'sessions'],
    conditions: { roleKey: { $in: ['student', 'parent'] } },
  },
];

const account = (roleKey: string) =>
  userSubject({ id: 'u1', kind: 'ADULT', status: 'ACTIVE', role: { key: roleKey } });

describe('admin ability', () => {
  it('lets admins suspend parents but not other admins', () => {
    const ability = abilityFrom(ADMIN_RULES);
    expect(ability.can('update', account('parent'), 'status')).toBe(true);
    expect(ability.can('update', account('admin'), 'status')).toBe(false);
    expect(ability.can('update', account('super_admin'), 'sessions')).toBe(false);
  });

  it('never allows fields the rules do not list', () => {
    const ability = abilityFrom(ADMIN_RULES);
    expect(ability.can('update', account('parent'), 'role')).toBe(false);
  });

  it('keeps moderators to students and parents, and hides the audit log', () => {
    const ability = abilityFrom(MODERATOR_RULES);
    expect(ability.can('update', account('student'), 'status')).toBe(true);
    expect(ability.can('update', account('moderator'), 'status')).toBe(false);
    expect(ability.can('read', 'AuditLog')).toBe(false);
  });
});
