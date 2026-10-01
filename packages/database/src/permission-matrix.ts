import {
  type PermissionRule,
  ROLE_KEYS,
  type RoleKey,
  SELF_PLACEHOLDER as SELF,
} from './constants.js';

/**
 * Who may do what. This file is the source of truth: the seed rewrites the
 * role_permissions table from it on every deploy (prisma/seed.ts), and the API loads the rules
 * from the database. Every rule here must be covered by a test in
 * apps/api/src/permissions/ability.factory.spec.ts.
 *
 * Subjects are checked with extra attributes the API attaches:
 *   User  → roleKey (the account's role), accountKind (STUDENT/ADULT), status,
 *           parentIds (IDs of linked parents)
 *   Child → id, parentIds
 *   ConsentRecord → parentId, childId
 *   Submission → userId
 *   Project → userId
 *   Billing → parentId
 *   Certificate → userId, parentIds
 *   Review → studentId, parentIds
 *   MentorProfile → userId
 *   Friendship → userIds (the two students), parentIds (their parents)
 *   Chat → memberIds (the room's members), parentIds (the members' parents)
 *   EventTeam → memberIds (its students), parentIds (their parents), mentorId
 *   School → teacherIds
 *   SchoolClass → teacherId, memberIds (approved students), parentIds (their parents)
 *   ClassMember → userId, parentIds
 *   ReadinessCheck → studentId, parentIds
 *   HubEligibility → studentId, parentIds
 *   ClientOrg → memberIds (its client accounts)
 *   HubIntake, HubInvoice → clientIds (the organisation's client accounts)
 *   HubProject → clientIds, leadId, memberIds (the team's students), parentIds (theirs)
 *   HubEarnings → studentId, parentIds
 *   PayoutAccount, Payout, HubStory → parentId
 */

/** Fields any adult may change on their own account. */
const OWN_PROFILE_FIELDS = ['displayName', 'languageCode', 'countryCode', 'regionId', 'cityId'];

const readSelf: PermissionRule = { action: 'read', subject: 'User', conditions: { id: SELF } };
const updateOwnProfile: PermissionRule = {
  action: 'update',
  subject: 'User',
  conditions: { id: SELF },
  fields: OWN_PROFILE_FIELDS,
};

export const permissionMatrix: Record<RoleKey, PermissionRule[]> = {
  [ROLE_KEYS.STUDENT]: [
    readSelf,
    // Students save drafts, check their code and track progress — only their own.
    { action: 'create', subject: 'Submission' },
    { action: 'read', subject: 'Submission', conditions: { userId: SELF } },
    // …build and ship their own projects…
    { action: 'create', subject: 'Project' },
    { action: 'read', subject: 'Project', conditions: { userId: SELF } },
    // …see the weekly boards, and tell us what they think.
    { action: 'read', subject: 'Leaderboard' },
    { action: 'create', subject: 'Feedback' },
    // Certificates for the modules they finished (premium).
    { action: 'create', subject: 'Certificate' },
    { action: 'read', subject: 'Certificate', conditions: { userId: SELF } },
    // Mentors' reviews of their own projects.
    { action: 'read', subject: 'Review', conditions: { studentId: SELF } },
    // Friends: ask by friend code (both parents approve), see and end their own.
    { action: 'create', subject: 'Friendship' },
    { action: 'read', subject: 'Friendship', conditions: { userIds: { $all: [SELF] } } },
    { action: 'delete', subject: 'Friendship', conditions: { userIds: { $all: [SELF] } } },
    // Rooms they're in (team, class, event): read, write and report.
    { action: 'read', subject: 'Chat', conditions: { memberIds: { $all: [SELF] } } },
    { action: 'create', subject: 'Chat', conditions: { memberIds: { $all: [SELF] } } },
    // Hackathons: see open events, make or join a team (a parent approves), and work
    // in their team's repository.
    { action: 'read', subject: 'Event' },
    { action: 'create', subject: 'EventTeam' },
    { action: 'read', subject: 'EventTeam', conditions: { memberIds: { $all: [SELF] } } },
    { action: 'update', subject: 'EventTeam', conditions: { memberIds: { $all: [SELF] } } },
    // Classes: join with the teacher's code (a parent approves), see their classes and
    // assignments, leave a class.
    { action: 'create', subject: 'ClassMember' },
    { action: 'delete', subject: 'ClassMember', conditions: { userId: SELF } },
    { action: 'read', subject: 'SchoolClass', conditions: { memberIds: { $all: [SELF] } } },
    // The hub readiness check (the service checks they may take it).
    { action: 'create', subject: 'ReadinessCheck' },
    { action: 'read', subject: 'ReadinessCheck', conditions: { studentId: SELF } },
    { action: 'update', subject: 'ReadinessCheck', conditions: { studentId: SELF } },
    // The hub: their own steps towards paid work, the projects they're on (the board,
    // their time, the repository) and their own earnings.
    { action: 'read', subject: 'HubEligibility', conditions: { studentId: SELF } },
    { action: 'read', subject: 'HubProject', conditions: { memberIds: { $all: [SELF] } } },
    { action: 'update', subject: 'HubProject', conditions: { memberIds: { $all: [SELF] } } },
    { action: 'read', subject: 'HubEarnings', conditions: { studentId: SELF } },
  ],

  [ROLE_KEYS.PARENT]: [
    readSelf,
    updateOwnProfile,
    // A parent can see the accounts of children linked to them — and no one else's.
    { action: 'read', subject: 'User', conditions: { parentIds: { $all: [SELF] } } },
    // Parents create their children's accounts and manage only their own children.
    { action: 'create', subject: 'Child' },
    { action: 'read', subject: 'Child', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'update', subject: 'Child', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'delete', subject: 'Child', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'read', subject: 'ConsentRecord', conditions: { parentId: SELF } },
    { action: 'create', subject: 'Feedback' },
    // Their own family's plan: see it, pay, change or cancel it, and read invoices.
    { action: 'read', subject: 'Billing', conditions: { parentId: SELF } },
    { action: 'update', subject: 'Billing', conditions: { parentId: SELF } },
    // Their children's certificates (checked against the family in the service).
    { action: 'read', subject: 'Certificate', conditions: { parentIds: { $all: [SELF] } } },
    // Mentors' reviews of their children's projects.
    { action: 'read', subject: 'Review', conditions: { parentIds: { $all: [SELF] } } },
    // Their children's friends: approve or decline requests, end a friendship.
    { action: 'read', subject: 'Friendship', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'update', subject: 'Friendship', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'delete', subject: 'Friendship', conditions: { parentIds: { $all: [SELF] } } },
    // Their children's rooms: read only.
    { action: 'read', subject: 'Chat', conditions: { parentIds: { $all: [SELF] } } },
    // Hackathons: approve their child joining a team.
    { action: 'read', subject: 'Event' },
    { action: 'read', subject: 'EventTeam', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'update', subject: 'EventTeam', conditions: { parentIds: { $all: [SELF] } } },
    // Approve (or decline) a child's place in a class; see their classes and results.
    { action: 'read', subject: 'ClassMember', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'update', subject: 'ClassMember', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'read', subject: 'SchoolClass', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'read', subject: 'ReadinessCheck', conditions: { parentIds: { $all: [SELF] } } },
    // The hub: consent to paid work and earnings for their own children (or take it back).
    { action: 'read', subject: 'HubEligibility', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'update', subject: 'HubEligibility', conditions: { parentIds: { $all: [SELF] } } },
    // Approve each project before their child joins it; see their children's earnings;
    // their payout account and payouts (they confirm each one); earnings stories.
    { action: 'read', subject: 'HubProject', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'update', subject: 'HubProject', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'read', subject: 'HubEarnings', conditions: { parentIds: { $all: [SELF] } } },
    { action: 'create', subject: 'PayoutAccount' },
    { action: 'read', subject: 'PayoutAccount', conditions: { parentId: SELF } },
    { action: 'update', subject: 'PayoutAccount', conditions: { parentId: SELF } },
    { action: 'delete', subject: 'PayoutAccount', conditions: { parentId: SELF } },
    { action: 'read', subject: 'Payout', conditions: { parentId: SELF } },
    { action: 'update', subject: 'Payout', conditions: { parentId: SELF } },
    { action: 'read', subject: 'HubStory', conditions: { parentId: SELF } },
    { action: 'update', subject: 'HubStory', conditions: { parentId: SELF } },
  ],

  // Mentors review students' projects (they see nicknames only, never accounts), keep
  // notes for other mentors, and sign the code of conduct on their own profile. The
  // service lets them review only once their background check passed.
  [ROLE_KEYS.MENTOR]: [
    readSelf,
    updateOwnProfile,
    { action: 'read', subject: 'Review' },
    { action: 'update', subject: 'Review' },
    { action: 'create', subject: 'MentorNote' },
    { action: 'read', subject: 'MentorNote' },
    { action: 'read', subject: 'MentorProfile', conditions: { userId: SELF } },
    {
      action: 'update',
      subject: 'MentorProfile',
      conditions: { userId: SELF },
      fields: ['codeOfConduct'],
    },
    // Rooms of the teams they mentor: read and write (as an adult member).
    { action: 'read', subject: 'Chat', conditions: { memberIds: { $all: [SELF] } } },
    { action: 'create', subject: 'Chat', conditions: { memberIds: { $all: [SELF] } } },
    // Hackathons: review the pull requests of the teams they mentor, and score the
    // submissions of events they judge (the service checks both).
    { action: 'read', subject: 'Event' },
    { action: 'read', subject: 'EventTeam', conditions: { mentorId: SELF } },
    { action: 'update', subject: 'EventTeam', conditions: { mentorId: SELF } },
    { action: 'create', subject: 'EventScore' },
    { action: 'read', subject: 'EventScore' },
    // The hub: lead developers sign students off and lead the projects they're given
    // (the service checks they're a ready lead).
    { action: 'read', subject: 'HubEligibility' },
    { action: 'update', subject: 'HubEligibility' },
    { action: 'read', subject: 'HubProject', conditions: { leadId: SELF } },
    { action: 'update', subject: 'HubProject', conditions: { leadId: SELF } },
  ],
  // Preview lessons before they're published (publishing modules is for admins), and
  // translate in the content studio: write drafts, review and publish each other's
  // (the service makes sure the reviewer isn't the last editor).
  [ROLE_KEYS.CONTENT_CREATOR]: [
    readSelf,
    updateOwnProfile,
    { action: 'read', subject: 'Content' },
    { action: 'create', subject: 'ContentText' },
    { action: 'read', subject: 'ContentText' },
    { action: 'update', subject: 'ContentText' },
  ],
  // Clients: their organisation, its project requests, projects (quotes, deliveries,
  // messages to the lead) and invoices. Never any student's account or identity: the
  // team is shown with pseudonyms only (checked by tests on every client route).
  [ROLE_KEYS.CLIENT]: [
    readSelf,
    updateOwnProfile,
    { action: 'read', subject: 'ClientOrg', conditions: { memberIds: { $all: [SELF] } } },
    { action: 'update', subject: 'ClientOrg', conditions: { memberIds: { $all: [SELF] } } },
    { action: 'create', subject: 'HubIntake' },
    { action: 'read', subject: 'HubIntake', conditions: { clientIds: { $all: [SELF] } } },
    { action: 'read', subject: 'HubProject', conditions: { clientIds: { $all: [SELF] } } },
    { action: 'update', subject: 'HubProject', conditions: { clientIds: { $all: [SELF] } } },
    { action: 'read', subject: 'HubInvoice', conditions: { clientIds: { $all: [SELF] } } },
    { action: 'update', subject: 'HubInvoice', conditions: { clientIds: { $all: [SELF] } } },
  ],
  [ROLE_KEYS.TEACHER]: [
    readSelf,
    updateOwnProfile,
    // The schools they teach at (staff add them), and their own classes: codes,
    // students, assignments, progress on those lessons and the class board.
    { action: 'read', subject: 'School', conditions: { teacherIds: { $all: [SELF] } } },
    { action: 'create', subject: 'SchoolClass' },
    { action: 'read', subject: 'SchoolClass', conditions: { teacherId: SELF } },
    { action: 'update', subject: 'SchoolClass', conditions: { teacherId: SELF } },
    // Their classes' rooms: read and write (as an adult member).
    { action: 'read', subject: 'Chat', conditions: { memberIds: { $all: [SELF] } } },
    { action: 'create', subject: 'Chat', conditions: { memberIds: { $all: [SELF] } } },
  ],

  [ROLE_KEYS.MODERATOR]: [
    { action: 'read', subject: 'User' },
    // Can suspend students and parents (and sign them out), never staff.
    {
      action: 'update',
      subject: 'User',
      fields: ['status', 'sessions'],
      conditions: { roleKey: { $in: [ROLE_KEYS.STUDENT, ROLE_KEYS.PARENT] } },
    },
    { action: 'read', subject: 'Child' },
    // Reads the feedback button's messages and marks them read or done.
    { action: 'read', subject: 'Feedback' },
    { action: 'update', subject: 'Feedback', fields: ['status'] },
    // Looks into the boards and a student's XP history when cheating is reported.
    { action: 'read', subject: 'LeaderboardSeason' },
    { action: 'read', subject: 'XpAdjustment' },
    // Ends a friendship that was reported (with a reason, in the audit log).
    { action: 'read', subject: 'Friendship' },
    { action: 'delete', subject: 'Friendship' },
    // The moderation queue: reports with their context, and warn, mute, hide or dismiss
    // (suspending goes through User.status above). Reads any room for context.
    { action: 'read', subject: 'Moderation' },
    { action: 'update', subject: 'Moderation' },
    { action: 'read', subject: 'Chat' },
    { action: 'read', subject: 'BlockedTerm' },
    // Hackathons: see events and teams (for reports about them).
    { action: 'read', subject: 'Event' },
    { action: 'read', subject: 'EventTeam' },
    // Classes (for reports about a class room).
    { action: 'read', subject: 'SchoolClass' },
  ],

  [ROLE_KEYS.ADMIN]: [
    { action: 'read', subject: 'User' },
    // Can manage every account except admins and super admins.
    // "sessions" = sign the account out everywhere.
    {
      action: 'update',
      subject: 'User',
      fields: ['status', 'sessions', 'displayName', 'languageCode'],
      conditions: { roleKey: { $nin: [ROLE_KEYS.ADMIN, ROLE_KEYS.SUPER_ADMIN] } },
    },
    { action: 'read', subject: 'Child' },
    { action: 'read', subject: 'AuditLog' },
    { action: 'read', subject: 'Role' },
    { action: 'read', subject: 'ConsentRecord' },
    { action: 'manage', subject: 'FeatureFlag' },
    // Switch a country on (with its prices set) and change its currency; switch a
    // language on or off. Preview and publish content.
    {
      action: 'update',
      subject: 'Country',
      fields: ['isActive', 'currency', 'under13ConsentMethods', 'hubRules'],
    },
    // Checks the consent forms parents of under-13s upload (approve or reject).
    { action: 'read', subject: 'ParentalConsent' },
    { action: 'update', subject: 'ParentalConsent' },
    { action: 'update', subject: 'Language', fields: ['isActive'] },
    { action: 'read', subject: 'Content' },
    { action: 'update', subject: 'Content' },
    { action: 'manage', subject: 'ContentText' },
    // Mentors: invites, background checks, languages and workload; reviews at a glance
    // (not mentors' private notes about students).
    { action: 'manage', subject: 'MentorProfile' },
    { action: 'read', subject: 'Review' },
    // Crash reports from the mobile app.
    { action: 'read', subject: 'AppCrash' },
    { action: 'read', subject: 'Feedback' },
    { action: 'update', subject: 'Feedback', fields: ['status'] },
    // Pilot families get premium by hand (with a reason, in the audit log).
    { action: 'manage', subject: 'PremiumGrant' },
    { action: 'read', subject: 'Metrics' },
    // Families' payments: looks them up, records manual payments and refunds (with a
    // reason). Prices per country too.
    { action: 'manage', subject: 'Payment' },
    // The waitlist from the marketing site, and revoking a certificate (with a reason).
    { action: 'read', subject: 'Waitlist' },
    { action: 'read', subject: 'Certificate' },
    { action: 'update', subject: 'Certificate' },
    { action: 'read', subject: 'PlanPrice' },
    { action: 'update', subject: 'PlanPrice' },
    // Runs seasons, takes a cheater's XP away and gives badges like "Helper" — each
    // with a written reason in the audit log.
    { action: 'manage', subject: 'LeaderboardSeason' },
    { action: 'read', subject: 'XpAdjustment' },
    { action: 'create', subject: 'XpAdjustment' },
    { action: 'create', subject: 'UserBadge' },
    { action: 'delete', subject: 'UserBadge' },
    { action: 'read', subject: 'Friendship' },
    { action: 'delete', subject: 'Friendship' },
    { action: 'read', subject: 'Moderation' },
    { action: 'update', subject: 'Moderation' },
    { action: 'read', subject: 'Chat' },
    { action: 'manage', subject: 'BlockedTerm' },
    // Hackathons: set up and run events, teams, mentors and judges; read the scores.
    { action: 'manage', subject: 'Event' },
    { action: 'manage', subject: 'EventTeam' },
    { action: 'read', subject: 'EventScore' },
    // Schools: licences (invoices, payments), teachers; classes to help teachers.
    { action: 'manage', subject: 'School' },
    { action: 'read', subject: 'SchoolClass' },
    // How many students passed the readiness check (the Gate 2 number).
    { action: 'read', subject: 'ReadinessCheck' },
    // The hub: intake, clients and projects; who may do paid work (pause a student,
    // with a reason); and the ledger (read only).
    { action: 'manage', subject: 'Hub' },
    { action: 'read', subject: 'Ledger' },
    { action: 'read', subject: 'ClientOrg' },
    { action: 'read', subject: 'HubIntake' },
    { action: 'read', subject: 'HubProject' },
    // Client invoices: record bank transfers, void an unpaid invoice (with a reason).
    { action: 'manage', subject: 'HubInvoice' },
    // Earnings and payouts: prepare payout batches and send approved ones (approving a
    // batch takes two super admins), check parents' payout accounts.
    { action: 'read', subject: 'HubEarnings' },
    { action: 'read', subject: 'PayoutAccount' },
    { action: 'update', subject: 'PayoutAccount', fields: ['verified'] },
    { action: 'read', subject: 'Payout' },
    { action: 'create', subject: 'Payout' },
    { action: 'update', subject: 'Payout' },
    { action: 'manage', subject: 'HubStory' },
  ],

  [ROLE_KEYS.SUPER_ADMIN]: [{ action: 'manage', subject: 'all' }],
};
