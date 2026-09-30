import { ROLE_KEYS, STAFF_ROLE_KEYS, type RoleKey } from '../../src/constants.js';

export interface RoleSeed {
  key: RoleKey;
  name: string;
  description: string;
  isStaff: boolean;
}

const role = (key: RoleKey, name: string, description: string): RoleSeed => ({
  key,
  name,
  description,
  isStaff: STAFF_ROLE_KEYS.includes(key),
});

// Roles from the scope's "Roles and permissions" table.
export const roles: RoleSeed[] = [
  role(
    ROLE_KEYS.STUDENT,
    'Student',
    'Kids 9–16. Lessons, projects, leaderboards; hub work once approved.',
  ),
  role(
    ROLE_KEYS.PARENT,
    'Parent / guardian',
    'Creates and approves child accounts, pays, receives earnings.',
  ),
  role(ROLE_KEYS.MENTOR, 'Mentor', 'Reviews code, runs hub teams, grades projects.'),
  role(
    ROLE_KEYS.CONTENT_CREATOR,
    'Content creator',
    'Creates and translates lessons. No access to student data.',
  ),
  role(ROLE_KEYS.CLIENT, 'Client', 'Business contact. Submits projects; never contacts students.'),
  role(ROLE_KEYS.TEACHER, 'Teacher', 'School staff (Phase 2). Manages classes and assignments.'),
  role(ROLE_KEYS.MODERATOR, 'Moderator', 'Reviews reports and flagged chat; can suspend accounts.'),
  role(ROLE_KEYS.ADMIN, 'Admin', 'Operations staff with assigned permissions.'),
  role(
    ROLE_KEYS.SUPER_ADMIN,
    'Super admin',
    'Founders. Everything, including roles, countries and money.',
  ),
];
