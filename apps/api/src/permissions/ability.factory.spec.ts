import { subject } from '@casl/ability';
import { permissionMatrix, ROLE_KEYS, type RoleKey } from '@kcp/database';
import {
  type AppAbility,
  type AppRawRule,
  buildAbility,
  canOnAll,
  interpolateConditions,
  rulesForUser,
} from './ability.factory.js';

/**
 * Tests the real permission matrix (the same rules the seed writes to the database).
 * If you change a rule in packages/database/src/permission-matrix.ts, a test here
 * should change too.
 */

const ME = 'user-me';
const OTHER_PARENT = 'user-other-parent';

function abilityFor(role: RoleKey, userId = ME): AppAbility {
  return buildAbility(rulesForUser(permissionMatrix[role] as AppRawRule[], userId));
}

const user = (attrs: { id: string; roleKey: RoleKey; parentIds?: string[] }) =>
  subject('User', {
    id: attrs.id,
    roleKey: attrs.roleKey,
    accountKind: attrs.roleKey === ROLE_KEYS.STUDENT ? 'STUDENT' : 'ADULT',
    status: 'ACTIVE',
    parentIds: attrs.parentIds ?? [],
  });

const self = (role: RoleKey) => user({ id: ME, roleKey: role });
const myChild = user({ id: 'child-1', roleKey: ROLE_KEYS.STUDENT, parentIds: [ME] });
const otherChild = user({ id: 'child-2', roleKey: ROLE_KEYS.STUDENT, parentIds: [OTHER_PARENT] });
const aParent = user({ id: 'parent-2', roleKey: ROLE_KEYS.PARENT });
const aMentor = user({ id: 'mentor-1', roleKey: ROLE_KEYS.MENTOR });
const anAdmin = user({ id: 'admin-2', roleKey: ROLE_KEYS.ADMIN });
const aSuperAdmin = user({ id: 'super-1', roleKey: ROLE_KEYS.SUPER_ADMIN });

const child = (id: string, parentIds: string[]) => subject('Child', { id, parentIds });

describe('interpolateConditions', () => {
  it('replaces the placeholder anywhere in nested conditions', () => {
    expect(
      interpolateConditions(
        { id: '${user.id}', parentIds: { $all: ['${user.id}'] }, other: 'x' },
        'u1',
      ),
    ).toEqual({ id: 'u1', parentIds: { $all: ['u1'] }, other: 'x' });
  });
});

describe('permission matrix', () => {
  describe('student', () => {
    const ability = abilityFor(ROLE_KEYS.STUDENT);

    it('can read only their own account', () => {
      expect(ability.can('read', self(ROLE_KEYS.STUDENT))).toBe(true);
      expect(ability.can('read', otherChild)).toBe(false);
      expect(ability.can('read', aParent)).toBe(false);
    });

    it('cannot change accounts or list users', () => {
      expect(ability.can('update', self(ROLE_KEYS.STUDENT))).toBe(false);
      expect(canOnAll(ability, 'read', 'User')).toBe(false);
    });

    it('checks code and reads only their own submissions', () => {
      expect(ability.can('create', 'Submission')).toBe(true);
      expect(ability.can('read', subject('Submission', { userId: ME }))).toBe(true);
      expect(ability.can('read', subject('Submission', { userId: 'someone-else' }))).toBe(false);
      expect(canOnAll(ability, 'read', 'Submission')).toBe(false);
    });
  });

  describe('student projects, boards and feedback', () => {
    const ability = abilityFor(ROLE_KEYS.STUDENT);

    it('builds and ships only their own projects', () => {
      expect(ability.can('create', 'Project')).toBe(true);
      expect(ability.can('read', subject('Project', { userId: ME }))).toBe(true);
      expect(ability.can('read', subject('Project', { userId: 'someone-else' }))).toBe(false);
      expect(canOnAll(ability, 'read', 'Project')).toBe(false);
    });

    it('sees the leaderboards and sends feedback, but reads no one’s feedback', () => {
      expect(ability.can('read', 'Leaderboard')).toBe(true);
      expect(ability.can('create', 'Feedback')).toBe(true);
      expect(ability.can('read', 'Feedback')).toBe(false);
      expect(ability.can('create', 'PremiumGrant')).toBe(false);
    });
  });

  describe('pilot tools', () => {
    it('lets families send feedback and staff read it', () => {
      expect(abilityFor(ROLE_KEYS.PARENT).can('create', 'Feedback')).toBe(true);
      expect(abilityFor(ROLE_KEYS.PARENT).can('read', 'Feedback')).toBe(false);
      expect(abilityFor(ROLE_KEYS.PARENT).can('read', 'Leaderboard')).toBe(false);
      expect(abilityFor(ROLE_KEYS.PARENT).can('create', 'Project')).toBe(false);
      for (const role of [ROLE_KEYS.MODERATOR, ROLE_KEYS.ADMIN]) {
        expect(canOnAll(abilityFor(role), 'read', 'Feedback')).toBe(true);
        expect(abilityFor(role).can('update', 'Feedback', 'status')).toBe(true);
        expect(abilityFor(role).can('update', 'Feedback', 'message')).toBe(false);
      }
    });

    it('lets only admins grant premium and read the numbers', () => {
      expect(abilityFor(ROLE_KEYS.ADMIN).can('create', 'PremiumGrant')).toBe(true);
      expect(abilityFor(ROLE_KEYS.ADMIN).can('update', 'PremiumGrant')).toBe(true);
      expect(abilityFor(ROLE_KEYS.ADMIN).can('read', 'Metrics')).toBe(true);
      expect(abilityFor(ROLE_KEYS.SUPER_ADMIN).can('create', 'PremiumGrant')).toBe(true);
      for (const role of [ROLE_KEYS.MODERATOR, ROLE_KEYS.CONTENT_CREATOR, ROLE_KEYS.PARENT]) {
        expect(abilityFor(role).can('create', 'PremiumGrant')).toBe(false);
        expect(abilityFor(role).can('read', 'Metrics')).toBe(false);
      }
    });
  });

  describe('leaderboards and badges', () => {
    it('lets moderators look into boards and XP, and only admins change them', () => {
      const moderator = abilityFor(ROLE_KEYS.MODERATOR);
      expect(moderator.can('read', 'LeaderboardSeason')).toBe(true);
      expect(moderator.can('read', 'XpAdjustment')).toBe(true);
      expect(moderator.can('create', 'LeaderboardSeason')).toBe(false);
      expect(moderator.can('create', 'XpAdjustment')).toBe(false);
      expect(moderator.can('create', 'UserBadge')).toBe(false);
      const admin = abilityFor(ROLE_KEYS.ADMIN);
      expect(admin.can('create', 'LeaderboardSeason')).toBe(true);
      expect(admin.can('update', 'LeaderboardSeason')).toBe(true);
      expect(admin.can('create', 'XpAdjustment')).toBe(true);
      expect(admin.can('create', 'UserBadge')).toBe(true);
      expect(admin.can('delete', 'UserBadge')).toBe(true);
      for (const role of [ROLE_KEYS.STUDENT, ROLE_KEYS.PARENT, ROLE_KEYS.CONTENT_CREATOR]) {
        expect(abilityFor(role).can('read', 'LeaderboardSeason')).toBe(false);
        expect(abilityFor(role).can('read', 'XpAdjustment')).toBe(false);
        expect(abilityFor(role).can('create', 'UserBadge')).toBe(false);
      }
    });
  });

  describe('payments', () => {
    it('lets parents see and change only their own family’s plan', () => {
      const parent = abilityFor(ROLE_KEYS.PARENT);
      expect(parent.can('read', subject('Billing', { parentId: ME }))).toBe(true);
      expect(parent.can('update', subject('Billing', { parentId: ME }))).toBe(true);
      expect(parent.can('read', subject('Billing', { parentId: 'someone-else' }))).toBe(false);
      expect(parent.can('read', 'Payment')).toBe(false);
      expect(parent.can('update', 'PlanPrice')).toBe(false);
    });

    it('lets admins handle payments and prices, and no one else', () => {
      const admin = abilityFor(ROLE_KEYS.ADMIN);
      for (const action of ['read', 'create', 'update'] as const) {
        expect(admin.can(action, 'Payment')).toBe(true);
      }
      expect(admin.can('read', 'PlanPrice')).toBe(true);
      expect(admin.can('update', 'PlanPrice')).toBe(true);
      for (const role of [ROLE_KEYS.STUDENT, ROLE_KEYS.MODERATOR, ROLE_KEYS.CONTENT_CREATOR]) {
        expect(abilityFor(role).can('read', 'Payment')).toBe(false);
        expect(abilityFor(role).can('read', 'PlanPrice')).toBe(false);
        expect(abilityFor(role).can('read', subject('Billing', { parentId: ME }))).toBe(false);
      }
    });
  });

  describe('content', () => {
    it('lets content creators preview, and only admins publish', () => {
      expect(abilityFor(ROLE_KEYS.CONTENT_CREATOR).can('read', 'Content')).toBe(true);
      expect(abilityFor(ROLE_KEYS.CONTENT_CREATOR).can('update', 'Content')).toBe(false);
      expect(abilityFor(ROLE_KEYS.ADMIN).can('update', 'Content')).toBe(true);
      for (const role of [
        ROLE_KEYS.STUDENT,
        ROLE_KEYS.PARENT,
        ROLE_KEYS.MODERATOR,
        ROLE_KEYS.MENTOR,
      ]) {
        expect(abilityFor(role).can('read', 'Content')).toBe(false);
      }
    });

    it('lets content creators and admins translate in the studio, and no one else', () => {
      for (const role of [ROLE_KEYS.CONTENT_CREATOR, ROLE_KEYS.ADMIN]) {
        for (const action of ['create', 'read', 'update'] as const) {
          expect(abilityFor(role).can(action, 'ContentText')).toBe(true);
        }
      }
      expect(abilityFor(ROLE_KEYS.CONTENT_CREATOR).can('delete', 'ContentText')).toBe(false);
      for (const role of [
        ROLE_KEYS.STUDENT,
        ROLE_KEYS.PARENT,
        ROLE_KEYS.MODERATOR,
        ROLE_KEYS.MENTOR,
        ROLE_KEYS.TEACHER,
      ]) {
        expect(abilityFor(role).can('read', 'ContentText')).toBe(false);
      }
    });

    it('never shows content creators student data', () => {
      const creator = abilityFor(ROLE_KEYS.CONTENT_CREATOR);
      expect(creator.can('read', subject('User', { id: 'a-student', roleKey: 'student' }))).toBe(
        false,
      );
      for (const target of ['Child', 'Submission', 'Project', 'Feedback'] as const) {
        expect(creator.can('read', target)).toBe(false);
      }
    });
  });

  describe('mentor reviews', () => {
    const mine = subject('Review', { studentId: ME, parentIds: [] });
    const myChilds = subject('Review', { studentId: 'child-1', parentIds: [ME] });
    const anothers = subject('Review', { studentId: 'child-2', parentIds: [OTHER_PARENT] });

    it('lets mentors review and keep notes, and see only their own profile', () => {
      const mentor = abilityFor(ROLE_KEYS.MENTOR);
      expect(mentor.can('read', anothers)).toBe(true);
      expect(mentor.can('update', anothers)).toBe(true);
      expect(mentor.can('create', 'MentorNote')).toBe(true);
      expect(mentor.can('read', subject('MentorProfile', { userId: ME }))).toBe(true);
      expect(mentor.can('read', subject('MentorProfile', { userId: 'another-mentor' }))).toBe(
        false,
      );
      expect(mentor.can('update', subject('MentorProfile', { userId: ME }), 'codeOfConduct')).toBe(
        true,
      );
      expect(
        mentor.can('update', subject('MentorProfile', { userId: ME }), 'backgroundCheck'),
      ).toBe(false);
      // Mentors never see accounts, families or payments.
      for (const target of ['Child', 'Billing', 'Payment', 'ConsentRecord'] as const) {
        expect(mentor.can('read', target)).toBe(false);
      }
    });

    it('lets students read their own reviews and parents their children’s', () => {
      expect(abilityFor(ROLE_KEYS.STUDENT).can('read', mine)).toBe(true);
      expect(abilityFor(ROLE_KEYS.STUDENT).can('read', anothers)).toBe(false);
      expect(abilityFor(ROLE_KEYS.STUDENT).can('update', mine)).toBe(false);
      expect(abilityFor(ROLE_KEYS.PARENT).can('read', myChilds)).toBe(true);
      expect(abilityFor(ROLE_KEYS.PARENT).can('read', anothers)).toBe(false);
      for (const role of [ROLE_KEYS.STUDENT, ROLE_KEYS.PARENT]) {
        expect(abilityFor(role).can('read', 'MentorNote')).toBe(false);
      }
    });

    it('lets admins run mentors’ onboarding but not read their notes', () => {
      const admin = abilityFor(ROLE_KEYS.ADMIN);
      expect(admin.can('update', 'MentorProfile')).toBe(true);
      expect(admin.can('read', 'Review')).toBe(true);
      expect(admin.can('update', 'Review')).toBe(false);
      expect(admin.can('read', 'MentorNote')).toBe(false);
      for (const role of [ROLE_KEYS.MODERATOR, ROLE_KEYS.CONTENT_CREATOR, ROLE_KEYS.TEACHER]) {
        expect(abilityFor(role).can('read', 'Review')).toBe(false);
      }
    });
  });

  describe('verified parental consent (under 13)', () => {
    it('lets admins check signed forms and set the methods per country', () => {
      const admin = abilityFor(ROLE_KEYS.ADMIN);
      expect(admin.can('read', 'ParentalConsent')).toBe(true);
      expect(admin.can('update', 'ParentalConsent')).toBe(true);
      expect(admin.can('update', 'Country', 'under13ConsentMethods')).toBe(true);
      for (const role of [
        ROLE_KEYS.STUDENT,
        ROLE_KEYS.PARENT,
        ROLE_KEYS.MENTOR,
        ROLE_KEYS.TEACHER,
        ROLE_KEYS.MODERATOR,
        ROLE_KEYS.CONTENT_CREATOR,
      ]) {
        expect(abilityFor(role).can('read', 'ParentalConsent')).toBe(false);
        expect(abilityFor(role).can('update', 'Country', 'under13ConsentMethods')).toBe(false);
      }
    });
  });

  describe('friends', () => {
    const ours = subject('Friendship', { userIds: [ME, 'child-9'], parentIds: [] });
    const myChilds = subject('Friendship', {
      userIds: ['child-1', 'child-9'],
      parentIds: [ME, OTHER_PARENT],
    });
    const others = subject('Friendship', {
      userIds: ['child-2', 'child-9'],
      parentIds: [OTHER_PARENT],
    });

    it('lets students ask, see and end only their own friendships', () => {
      const student = abilityFor(ROLE_KEYS.STUDENT);
      expect(student.can('create', 'Friendship')).toBe(true);
      expect(student.can('read', ours)).toBe(true);
      expect(student.can('delete', ours)).toBe(true);
      expect(student.can('read', others)).toBe(false);
      expect(student.can('update', ours)).toBe(false);
    });

    it('lets parents decide only for their own children', () => {
      const parent = abilityFor(ROLE_KEYS.PARENT);
      expect(parent.can('update', myChilds)).toBe(true);
      expect(parent.can('delete', myChilds)).toBe(true);
      expect(parent.can('update', others)).toBe(false);
      expect(parent.can('read', others)).toBe(false);
      expect(parent.can('create', 'Friendship')).toBe(false);
    });

    it('lets moderators and admins end a reported friendship, and no one else', () => {
      for (const role of [ROLE_KEYS.MODERATOR, ROLE_KEYS.ADMIN]) {
        expect(abilityFor(role).can('delete', others)).toBe(true);
        expect(abilityFor(role).can('create', 'Friendship')).toBe(false);
      }
      for (const role of [ROLE_KEYS.MENTOR, ROLE_KEYS.TEACHER, ROLE_KEYS.CONTENT_CREATOR]) {
        expect(abilityFor(role).can('read', 'Friendship')).toBe(false);
      }
    });
  });

  describe('hackathons', () => {
    const myTeam = subject('EventTeam', { memberIds: [ME], parentIds: [], mentorId: null });
    const childTeam = subject('EventTeam', {
      memberIds: ['child-1'],
      parentIds: [ME],
      mentorId: null,
    });
    const mentored = subject('EventTeam', { memberIds: ['child-2'], parentIds: [], mentorId: ME });
    const other = subject('EventTeam', {
      memberIds: ['child-3'],
      parentIds: [OTHER_PARENT],
      mentorId: null,
    });

    it('lets students work in their own team, parents approve theirs, mentors review theirs', () => {
      const student = abilityFor(ROLE_KEYS.STUDENT);
      expect(student.can('read', 'Event')).toBe(true);
      expect(student.can('create', 'Event')).toBe(false);
      expect(student.can('update', myTeam)).toBe(true);
      expect(student.can('read', other)).toBe(false);
      const parent = abilityFor(ROLE_KEYS.PARENT);
      expect(parent.can('update', childTeam)).toBe(true);
      expect(parent.can('update', other)).toBe(false);
      const mentor = abilityFor(ROLE_KEYS.MENTOR);
      expect(mentor.can('update', mentored)).toBe(true);
      expect(mentor.can('read', other)).toBe(false);
      expect(mentor.can('create', 'EventScore')).toBe(true);
      expect(student.can('create', 'EventScore')).toBe(false);
    });

    it('lets only admins run events', () => {
      expect(abilityFor(ROLE_KEYS.ADMIN).can('create', 'Event')).toBe(true);
      expect(abilityFor(ROLE_KEYS.ADMIN).can('update', other)).toBe(true);
      expect(abilityFor(ROLE_KEYS.MODERATOR).can('read', other)).toBe(true);
      expect(abilityFor(ROLE_KEYS.MODERATOR).can('update', 'Event')).toBe(false);
    });
  });

  describe('schools and the readiness check', () => {
    const myClass = subject('SchoolClass', { teacherId: ME, memberIds: [], parentIds: [] });
    const joined = subject('SchoolClass', { teacherId: 't-2', memberIds: [ME], parentIds: [] });
    const childClass = subject('SchoolClass', {
      teacherId: 't-2',
      memberIds: ['child-1'],
      parentIds: [ME],
    });
    const otherClass = subject('SchoolClass', {
      teacherId: 't-3',
      memberIds: ['child-3'],
      parentIds: [OTHER_PARENT],
    });
    const childPlace = subject('ClassMember', { userId: 'child-1', parentIds: [ME] });
    const otherPlace = subject('ClassMember', { userId: 'child-3', parentIds: [OTHER_PARENT] });

    it('lets teachers run their own classes only, students join, parents approve', () => {
      const teacher = abilityFor(ROLE_KEYS.TEACHER);
      expect(teacher.can('create', 'SchoolClass')).toBe(true);
      expect(teacher.can('update', myClass)).toBe(true);
      expect(teacher.can('read', otherClass)).toBe(false);
      expect(teacher.can('read', subject('School', { teacherIds: [ME] }))).toBe(true);
      expect(teacher.can('read', subject('School', { teacherIds: ['t-3'] }))).toBe(false);
      const student = abilityFor(ROLE_KEYS.STUDENT);
      expect(student.can('create', 'ClassMember')).toBe(true);
      expect(student.can('read', joined)).toBe(true);
      expect(student.can('read', otherClass)).toBe(false);
      expect(student.can('create', 'SchoolClass')).toBe(false);
      const parent = abilityFor(ROLE_KEYS.PARENT);
      expect(parent.can('update', childPlace)).toBe(true);
      expect(parent.can('update', otherPlace)).toBe(false);
      expect(parent.can('read', childClass)).toBe(true);
    });

    it('keeps licences to staff, and readiness checks to the student and their parents', () => {
      expect(abilityFor(ROLE_KEYS.ADMIN).can('update', 'School')).toBe(true);
      expect(abilityFor(ROLE_KEYS.MODERATOR).can('update', 'School')).toBe(false);
      expect(abilityFor(ROLE_KEYS.TEACHER).can('update', 'School')).toBe(false);
      const mine = subject('ReadinessCheck', { studentId: ME, parentIds: [] });
      const childs = subject('ReadinessCheck', { studentId: 'child-1', parentIds: [ME] });
      const other = subject('ReadinessCheck', { studentId: 'child-3', parentIds: [OTHER_PARENT] });
      expect(abilityFor(ROLE_KEYS.STUDENT).can('update', mine)).toBe(true);
      expect(abilityFor(ROLE_KEYS.STUDENT).can('read', other)).toBe(false);
      expect(abilityFor(ROLE_KEYS.PARENT).can('read', childs)).toBe(true);
      expect(abilityFor(ROLE_KEYS.PARENT).can('read', other)).toBe(false);
    });
  });

  describe('rooms and moderation', () => {
    const mine = subject('Chat', { memberIds: [ME, 'child-9'], parentIds: [] });
    const myChilds = subject('Chat', { memberIds: ['child-1'], parentIds: [ME] });
    const others = subject('Chat', { memberIds: ['child-2'], parentIds: [OTHER_PARENT] });

    it('lets students read and write only in their own rooms, and parents read their children’s', () => {
      const student = abilityFor(ROLE_KEYS.STUDENT);
      expect(student.can('read', mine)).toBe(true);
      expect(student.can('create', mine)).toBe(true);
      expect(student.can('read', others)).toBe(false);
      expect(student.can('read', 'Moderation')).toBe(false);
      const parent = abilityFor(ROLE_KEYS.PARENT);
      expect(parent.can('read', myChilds)).toBe(true);
      expect(parent.can('create', myChilds)).toBe(false);
      expect(parent.can('read', others)).toBe(false);
    });

    it('gives moderators and admins the queue; only admins change the word list', () => {
      for (const role of [ROLE_KEYS.MODERATOR, ROLE_KEYS.ADMIN]) {
        const staff = abilityFor(role);
        expect(staff.can('read', 'Moderation')).toBe(true);
        expect(staff.can('update', 'Moderation')).toBe(true);
        expect(staff.can('read', others)).toBe(true);
        expect(staff.can('create', others)).toBe(false);
        expect(staff.can('read', 'BlockedTerm')).toBe(true);
      }
      expect(abilityFor(ROLE_KEYS.MODERATOR).can('create', 'BlockedTerm')).toBe(false);
      expect(abilityFor(ROLE_KEYS.ADMIN).can('create', 'BlockedTerm')).toBe(true);
      for (const role of [ROLE_KEYS.MENTOR, ROLE_KEYS.TEACHER, ROLE_KEYS.CONTENT_CREATOR]) {
        expect(abilityFor(role).can('read', 'Moderation')).toBe(false);
      }
      // Mentors and teachers write in the rooms they're members of.
      for (const role of [ROLE_KEYS.MENTOR, ROLE_KEYS.TEACHER]) {
        expect(abilityFor(role).can('create', mine)).toBe(true);
        expect(abilityFor(role).can('read', others)).toBe(false);
      }
    });
  });

  describe('certificates and the waitlist', () => {
    const mine = subject('Certificate', { userId: ME, parentIds: [] });
    const myChilds = subject('Certificate', { userId: 'child-1', parentIds: [ME] });
    const anothers = subject('Certificate', { userId: 'child-2', parentIds: [OTHER_PARENT] });

    it('lets students earn and read only their own certificates', () => {
      const student = abilityFor(ROLE_KEYS.STUDENT);
      expect(student.can('create', 'Certificate')).toBe(true);
      expect(student.can('read', mine)).toBe(true);
      expect(student.can('read', anothers)).toBe(false);
      expect(student.can('update', mine)).toBe(false);
    });

    it("lets parents read their own children's certificates only", () => {
      const parent = abilityFor(ROLE_KEYS.PARENT);
      expect(parent.can('read', myChilds)).toBe(true);
      expect(parent.can('read', anothers)).toBe(false);
      expect(parent.can('create', 'Certificate')).toBe(false);
      expect(parent.can('update', myChilds)).toBe(false);
    });

    it('lets admins read and revoke certificates and read the waitlist, and no one else', () => {
      const admin = abilityFor(ROLE_KEYS.ADMIN);
      expect(admin.can('read', anothers)).toBe(true);
      expect(admin.can('update', anothers)).toBe(true);
      expect(admin.can('read', 'Waitlist')).toBe(true);
      expect(admin.can('update', 'Waitlist')).toBe(false);
      for (const role of [
        ROLE_KEYS.STUDENT,
        ROLE_KEYS.PARENT,
        ROLE_KEYS.MODERATOR,
        ROLE_KEYS.MENTOR,
        ROLE_KEYS.CONTENT_CREATOR,
      ]) {
        expect(abilityFor(role).can('read', 'Waitlist')).toBe(false);
        expect(abilityFor(role).can('update', anothers)).toBe(false);
      }
      expect(abilityFor(ROLE_KEYS.MODERATOR).can('read', anothers)).toBe(false);
    });
  });

  describe('learning is for students', () => {
    it('does not let parents, mentors or moderators submit code', () => {
      for (const role of [
        ROLE_KEYS.PARENT,
        ROLE_KEYS.MENTOR,
        ROLE_KEYS.MODERATOR,
        ROLE_KEYS.ADMIN,
      ]) {
        expect(abilityFor(role).can('create', 'Submission')).toBe(false);
      }
    });
  });

  describe('parent', () => {
    const ability = abilityFor(ROLE_KEYS.PARENT);

    it('can read their own account and their own children', () => {
      expect(ability.can('read', self(ROLE_KEYS.PARENT))).toBe(true);
      expect(ability.can('read', myChild)).toBe(true);
    });

    it("cannot read other families' children or other adults", () => {
      expect(ability.can('read', otherChild)).toBe(false);
      expect(ability.can('read', aParent)).toBe(false);
      expect(ability.can('read', aMentor)).toBe(false);
    });

    it('can edit their own profile fields, never their role or status', () => {
      expect(ability.can('update', self(ROLE_KEYS.PARENT), 'displayName')).toBe(true);
      expect(ability.can('update', self(ROLE_KEYS.PARENT), 'languageCode')).toBe(true);
      expect(ability.can('update', self(ROLE_KEYS.PARENT), 'roleId')).toBe(false);
      expect(ability.can('update', self(ROLE_KEYS.PARENT), 'status')).toBe(false);
      expect(ability.can('update', aParent, 'displayName')).toBe(false);
    });

    it('cannot list users or see staff data', () => {
      expect(canOnAll(ability, 'read', 'User')).toBe(false);
      expect(ability.can('read', 'AuditLog')).toBe(false);
      expect(ability.can('read', 'FeatureFlag')).toBe(false);
    });
  });

  describe.each([ROLE_KEYS.MENTOR, ROLE_KEYS.CONTENT_CREATOR, ROLE_KEYS.CLIENT, ROLE_KEYS.TEACHER])(
    '%s',
    (role) => {
      const ability = abilityFor(role);

      it('can read and edit only their own account', () => {
        expect(ability.can('read', self(role))).toBe(true);
        expect(ability.can('update', self(role), 'displayName')).toBe(true);
        expect(ability.can('read', myChild)).toBe(false);
        expect(ability.can('read', otherChild)).toBe(false);
        expect(canOnAll(ability, 'read', 'User')).toBe(false);
      });
    },
  );

  describe('moderator', () => {
    const ability = abilityFor(ROLE_KEYS.MODERATOR);

    it('can list and read all accounts', () => {
      expect(canOnAll(ability, 'read', 'User')).toBe(true);
      expect(ability.can('read', otherChild)).toBe(true);
    });

    it('can suspend students and parents only', () => {
      expect(ability.can('update', otherChild, 'status')).toBe(true);
      expect(ability.can('update', aParent, 'status')).toBe(true);
      expect(ability.can('update', aMentor, 'status')).toBe(false);
      expect(ability.can('update', anAdmin, 'status')).toBe(false);
    });

    it('cannot change anything but status', () => {
      expect(ability.can('update', aParent, 'displayName')).toBe(false);
      expect(ability.can('update', aParent, 'roleId')).toBe(false);
      expect(ability.can('read', 'AuditLog')).toBe(false);
    });
  });

  describe('admin', () => {
    const ability = abilityFor(ROLE_KEYS.ADMIN);

    it('can list users and manage non-admin accounts', () => {
      expect(canOnAll(ability, 'read', 'User')).toBe(true);
      expect(ability.can('update', aParent, 'status')).toBe(true);
      expect(ability.can('update', aMentor, 'status')).toBe(true);
      expect(ability.can('update', otherChild, 'displayName')).toBe(true);
    });

    it('cannot change other admins, super admins or anyone’s role', () => {
      expect(ability.can('update', anAdmin, 'status')).toBe(false);
      expect(ability.can('update', aSuperAdmin, 'status')).toBe(false);
      expect(ability.can('update', aParent, 'roleId')).toBe(false);
    });

    it('can read the audit log and run platform settings, but not delete accounts', () => {
      expect(ability.can('read', 'AuditLog')).toBe(true);
      expect(ability.can('update', 'AuditLog')).toBe(false);
      expect(ability.can('update', 'FeatureFlag')).toBe(true);
      expect(ability.can('update', 'Country', 'isActive')).toBe(true);
      expect(ability.can('update', 'Country', 'currency')).toBe(true);
      expect(ability.can('update', 'Country', 'names')).toBe(false);
      expect(ability.can('update', 'Language', 'isActive')).toBe(true);
      expect(ability.can('update', 'Language', 'direction')).toBe(false);
      expect(ability.can('delete', aParent)).toBe(false);
      expect(ability.can('update', 'Role')).toBe(false);
    });
  });

  describe('super admin', () => {
    const ability = abilityFor(ROLE_KEYS.SUPER_ADMIN);

    it('can do everything', () => {
      expect(canOnAll(ability, 'read', 'User')).toBe(true);
      expect(ability.can('update', anAdmin, 'status')).toBe(true);
      expect(ability.can('update', 'Role')).toBe(true);
      expect(ability.can('delete', 'FeatureFlag')).toBe(true);
    });
  });
});

describe('child accounts', () => {
  it('parents create children and manage only their own', () => {
    const ability = abilityFor(ROLE_KEYS.PARENT);
    expect(ability.can('create', 'Child')).toBe(true);
    for (const action of ['read', 'update', 'delete'] as const) {
      expect(ability.can(action, child('c1', [ME]))).toBe(true);
      expect(ability.can(action, child('c2', [OTHER_PARENT]))).toBe(false);
    }
    expect(ability.can('read', subject('ConsentRecord', { parentId: ME }))).toBe(true);
    expect(ability.can('read', subject('ConsentRecord', { parentId: OTHER_PARENT }))).toBe(false);
  });

  it('students, mentors and teachers cannot manage children', () => {
    for (const role of [ROLE_KEYS.STUDENT, ROLE_KEYS.MENTOR, ROLE_KEYS.TEACHER, ROLE_KEYS.CLIENT]) {
      const ability = abilityFor(role);
      expect(ability.can('create', 'Child')).toBe(false);
      expect(ability.can('read', child('c1', [ME]))).toBe(false);
    }
  });

  it('staff can see children but not change them through the family routes', () => {
    for (const role of [ROLE_KEYS.MODERATOR, ROLE_KEYS.ADMIN]) {
      const ability = abilityFor(role);
      expect(ability.can('read', child('c1', [OTHER_PARENT]))).toBe(true);
      expect(ability.can('update', child('c1', [OTHER_PARENT]))).toBe(false);
      expect(ability.can('create', 'Child')).toBe(false);
    }
  });

  it('lets admins and moderators sign accounts out, within their limits', () => {
    expect(abilityFor(ROLE_KEYS.ADMIN).can('update', aParent, 'sessions')).toBe(true);
    expect(abilityFor(ROLE_KEYS.ADMIN).can('update', anAdmin, 'sessions')).toBe(false);
    expect(abilityFor(ROLE_KEYS.MODERATOR).can('update', otherChild, 'sessions')).toBe(true);
    expect(abilityFor(ROLE_KEYS.MODERATOR).can('update', aMentor, 'sessions')).toBe(false);
    expect(abilityFor(ROLE_KEYS.PARENT).can('update', self(ROLE_KEYS.PARENT), 'sessions')).toBe(
      false,
    );
  });
});

describe('canOnAll', () => {
  it('is false when any deny rule exists', () => {
    const ability = buildAbility([
      { action: 'read', subject: 'User' },
      { action: 'read', subject: 'User', inverted: true, conditions: { roleKey: 'super_admin' } },
    ]);
    expect(canOnAll(ability, 'read', 'User')).toBe(false);
  });
});
