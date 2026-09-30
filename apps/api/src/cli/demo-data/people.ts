import { createHash, randomBytes } from 'node:crypto';
import { type ConsentType, Prisma, ROLE_KEYS } from '@kcp/database';
import {
  allowedBirthYears,
  AVATAR_KEYS,
  MAX_TRIALS_PER_FAMILY,
  TERMS_VERSION,
  TRIAL_DAYS,
} from '@kcp/shared';
import {
  checkNickname,
  generateUsername,
  SUGGESTION_WORDS,
} from '../../children/nickname-policy.js';
import { hashPassword } from '../../common/crypto/passwords.js';
import {
  DEMO_DOMAIN,
  FAMILIES,
  PARENTS_WITHOUT_CHILDREN,
  PASSWORDS,
  STAFF,
  type ChildSpec,
  type FamilySpec,
} from './cast.js';
import {
  type DemoChild,
  type DemoContext,
  type DemoFamily,
  type DemoStaff,
  demoIp,
  USER_AGENTS,
} from './context.js';
import { DAY_MS, plusDays, plusMinutes } from './timeline.js';

export const demoEmail = (local: string) => `${local}@${DEMO_DOMAIN}`;

/** A one-time link's stored form (the link itself was only ever in an email). */
export const tokenHash = () => createHash('sha256').update(randomBytes(32)).digest('hex');

async function roleIds(ctx: DemoContext) {
  const roles = await ctx.prisma.role.findMany({ select: { id: true, key: true } });
  const byKey = new Map(roles.map((role) => [role.key, role.id]));
  return (key: string) => {
    const id = byKey.get(key);
    if (!id) throw new Error(`Role "${key}" is missing: run \`pnpm db:seed\` first.`);
    return id;
  };
}

/** The team: each one logs in to the admin panel and sets up two-factor login once. */
export async function createStaff(ctx: DemoContext): Promise<DemoStaff[]> {
  const role = await roleIds(ctx);
  const passwordHash = await hashPassword(PASSWORDS.staff);
  const staff: DemoStaff[] = [];
  for (const [index, member] of STAFF.entries()) {
    const createdAt = ctx.clock.ago(70 - index, 8, 10 * index);
    const user = await ctx.prisma.user.create({
      data: {
        kind: 'ADULT',
        status: 'ACTIVE',
        roleId: role(member.role),
        email: demoEmail(member.email),
        emailVerifiedAt: createdAt,
        displayName: member.name,
        passwordHash,
        languageCode: 'en',
        createdAt,
        updatedAt: createdAt,
      },
    });
    await ctx.prisma.auditLog.create({
      data: {
        action: 'staff.create',
        entityType: 'User',
        entityId: user.id,
        after: { role: member.role },
        createdAt,
      },
    });
    staff.push({
      id: user.id,
      email: user.email!,
      name: member.name,
      role: member.role,
      auth: {
        id: user.id,
        sessionId: 'demo-data',
        roleId: role(member.role),
        roleKey: member.role,
        kind: 'ADULT',
        isStaff: true,
      },
    });
  }
  return staff;
}

interface Places {
  timezone: (country: string) => string;
  city: (country: string, slug: string) => { regionId: string; cityId: string };
}

async function places(ctx: DemoContext): Promise<Places> {
  const [countries, cities] = await Promise.all([
    ctx.prisma.country.findMany({ select: { code: true, timezone: true, isActive: true } }),
    ctx.prisma.city.findMany({
      select: { id: true, slug: true, region: { select: { id: true, countryCode: true } } },
    }),
  ]);
  for (const code of ['PK', 'EG']) {
    if (!countries.find((c) => c.code === code)?.isActive) {
      throw new Error(
        `${code} must be switched on (Admin → Countries and languages, or \`pnpm db:seed\` on a new database).`,
      );
    }
  }
  return {
    timezone: (code) => countries.find((c) => c.code === code)?.timezone ?? 'UTC',
    city: (country, slug) => {
      const city = cities.find((c) => c.slug === slug && c.region.countryCode === country);
      if (!city) throw new Error(`City "${slug}" (${country}) is missing: run \`pnpm db:seed\`.`);
      return { regionId: city.region.id, cityId: city.id };
    },
  };
}

/** Nicknames like the ones the app suggests ("SwiftFalcon27"), all passing its rules. */
class Nicknames {
  private readonly used = new Set<string>();

  constructor(private readonly ctx: DemoContext) {}

  next(parentName: string): string {
    const { adjectives, nouns } = SUGGESTION_WORDS;
    for (;;) {
      const base = `${this.ctx.rng.pick(adjectives)}${this.ctx.rng.pick(nouns)}`;
      const nickname = this.ctx.rng.chance(0.7) ? `${base}${this.ctx.rng.int(10, 100)}` : base;
      if (this.used.has(nickname.toLowerCase())) continue;
      if (checkNickname(nickname, parentName) !== null) continue;
      this.used.add(nickname.toLowerCase());
      return nickname;
    }
  }
}

async function uniqueUsername(ctx: DemoContext, taken: Set<string>): Promise<string> {
  for (;;) {
    const username = generateUsername();
    if (taken.has(username)) continue;
    if (await ctx.prisma.user.findUnique({ where: { username }, select: { id: true } })) continue;
    taken.add(username);
    return username;
  }
}

const CONSENTS = { boards: 'PUBLIC_LEADERBOARDS', portfolio: 'PUBLIC_PORTFOLIO' } as const;

/**
 * Families, the way the web app makes them: a parent who signed up and confirmed their
 * email, then added their children (each with a free trial, consent records and an
 * audit entry). Everything is dated in the past, so it reads like real history.
 */
export async function createFamilies(ctx: DemoContext): Promise<DemoFamily[]> {
  const role = await roleIds(ctx);
  const where = await places(ctx);
  const nicknames = new Nicknames(ctx);
  const usernames = new Set<string>();
  const [parentHash, childHash] = await Promise.all([
    hashPassword(PASSWORDS.parent),
    hashPassword(PASSWORDS.child),
  ]);
  const year = ctx.clock.now.getUTCFullYear();
  const birthYears = allowedBirthYears(year, false);
  const families: DemoFamily[] = [];

  for (const spec of FAMILIES) {
    const firstJoin = Math.max(...spec.children.map((child) => child.joined));
    // Signed up a little before adding the first child.
    const createdAt = ctx.clock.ago(firstJoin, 6, ctx.rng.int(0, 50));
    const parent = await createParent(ctx, {
      name: spec.name,
      email: spec.email,
      language: spec.language,
      country: spec.country,
      createdAt,
      verified: true,
      roleId: role(ROLE_KEYS.PARENT),
      passwordHash: parentHash,
    });
    const family: DemoFamily = {
      spec,
      parentId: parent.id,
      email: parent.email,
      name: spec.name,
      timezone: where.timezone(spec.country),
      createdAt,
      auth: {
        id: parent.id,
        sessionId: 'demo-data',
        roleId: role(ROLE_KEYS.PARENT),
        roleKey: ROLE_KEYS.PARENT,
        kind: 'ADULT',
        isStaff: false,
      },
      guardianId: null,
      children: [],
    };

    // Oldest account first, as the parent added them.
    const children = spec.children.toSorted((a, b) => b.joined - a.joined);
    for (const [index, childSpec] of children.entries()) {
      const child = await createChild(ctx, family, childSpec, {
        trial: index < MAX_TRIALS_PER_FAMILY,
        roleId: role(ROLE_KEYS.STUDENT),
        passwordHash: childHash,
        nickname: nicknames.next(spec.name),
        username: await uniqueUsername(ctx, usernames),
        birthYear: year - (childSpec.age ?? ctx.rng.pick([14, 15, 16] as const)),
        birthYears,
        place: childSpec.city ? where.city(spec.country, childSpec.city) : null,
      });
      family.children.push(child);
    }
    await ctx.prisma.user.update({
      where: { id: parent.id },
      data: { trialsStarted: Math.min(children.length, MAX_TRIALS_PER_FAMILY) },
    });

    if (spec.guardian) {
      family.guardianId = await addGuardian(ctx, family, spec, {
        roleId: role(ROLE_KEYS.PARENT),
        passwordHash: parentHash,
      });
    }
    families.push(family);
  }

  for (const [index, extra] of PARENTS_WITHOUT_CHILDREN.entries()) {
    await createParent(ctx, {
      ...extra,
      createdAt: ctx.clock.ago(3 + index * 4, 7, 20),
      roleId: role(ROLE_KEYS.PARENT),
      passwordHash: parentHash,
    });
  }
  return families;
}

async function createParent(
  ctx: DemoContext,
  params: {
    name: string;
    email: string;
    language: string;
    country: string;
    createdAt: Date;
    verified: boolean;
    roleId: string;
    passwordHash: string;
  },
) {
  const { createdAt } = params;
  const verifiedAt = plusMinutes(createdAt, ctx.rng.int(2, 40));
  const user = await ctx.prisma.user.create({
    data: {
      kind: 'ADULT',
      status: params.verified ? 'ACTIVE' : 'PENDING_VERIFICATION',
      roleId: params.roleId,
      email: demoEmail(params.email),
      emailVerifiedAt: params.verified ? verifiedAt : null,
      passwordHash: params.passwordHash,
      displayName: params.name,
      languageCode: params.language,
      countryCode: params.country,
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: createdAt,
      createdAt,
      updatedAt: params.verified ? verifiedAt : createdAt,
    },
  });
  await ctx.prisma.verificationToken.create({
    data: {
      userId: user.id,
      purpose: 'EMAIL_VERIFICATION',
      tokenHash: tokenHash(),
      expiresAt: new Date(createdAt.getTime() + DAY_MS),
      usedAt: params.verified ? verifiedAt : null,
      createdAt,
    },
  });
  await ctx.prisma.auditLog.create({
    data: {
      actorId: user.id,
      actorRole: ROLE_KEYS.PARENT,
      action: 'auth.sign_up',
      entityType: 'User',
      entityId: user.id,
      after: { role: ROLE_KEYS.PARENT, countryCode: params.country, termsVersion: TERMS_VERSION },
      ipAddress: demoIp(ctx.rng),
      userAgent: USER_AGENTS.desktop,
      createdAt,
    },
  });
  return { id: user.id, email: user.email! };
}

async function createChild(
  ctx: DemoContext,
  family: DemoFamily,
  spec: ChildSpec,
  params: {
    trial: boolean;
    roleId: string;
    passwordHash: string;
    nickname: string;
    username: string;
    birthYear: number;
    birthYears: number[];
    place: { regionId: string; cityId: string } | null;
  },
): Promise<DemoChild> {
  if (!params.birthYears.includes(params.birthYear)) {
    throw new Error(`Birth year ${params.birthYear} isn't allowed for new accounts.`);
  }
  const createdAt = ctx.clock.ago(spec.joined, 8, ctx.rng.int(0, 59));
  const boards = spec.boards ?? true;
  const portfolio = spec.portfolio ?? false;
  // Some parents switched the public portfolio on later, after a first project.
  const portfolioLater = portfolio && ctx.rng.chance(0.5) && spec.joined > 12;
  const trialEndsAt = params.trial ? new Date(createdAt.getTime() + TRIAL_DAYS * DAY_MS) : null;
  const ip = demoIp(ctx.rng);

  const user = await ctx.prisma.user.create({
    data: {
      kind: 'STUDENT',
      status: 'ACTIVE',
      roleId: params.roleId,
      username: params.username,
      passwordHash: params.passwordHash,
      languageCode: family.spec.language,
      countryCode: family.spec.country,
      regionId: params.place?.regionId ?? null,
      cityId: params.place?.cityId ?? null,
      createdAt,
      updatedAt: createdAt,
      studentProfile: {
        create: {
          nickname: params.nickname,
          avatarKey: ctx.rng.pick(AVATAR_KEYS),
          birthYear: params.birthYear,
          showOnPublicBoards: boards,
          publicPortfolio: portfolio,
          trialEndsAt,
          createdAt,
          updatedAt: createdAt,
        },
      },
      parentLinks: { create: { parentId: family.parentId, isPrimary: true, createdAt } },
    },
  });

  const grants: { type: ConsentType; at: Date; revokedAt?: Date }[] = [
    { type: 'ACCOUNT', at: createdAt },
  ];
  if (boards) grants.push({ type: CONSENTS.boards, at: createdAt });
  if (portfolio) {
    const at = portfolioLater ? ctx.clock.cap(plusDays(createdAt, ctx.rng.int(6, 12))) : createdAt;
    grants.push({ type: CONSENTS.portfolio, at });
  }
  // One family switched the boards off for a while, then on again.
  if (boards && spec.pattern === 'returning' && family.spec.country === 'EG') {
    grants[1] = {
      type: CONSENTS.boards,
      at: createdAt,
      revokedAt: plusDays(createdAt, 10),
    };
    grants.push({ type: CONSENTS.boards, at: plusDays(createdAt, 30) });
  }
  await ctx.prisma.consentRecord.createMany({
    data: grants.map((grant) => ({
      parentId: family.parentId,
      childId: user.id,
      type: grant.type,
      policyVersion: TERMS_VERSION,
      method: 'EMAIL_CONFIRMATION' as const,
      grantedAt: grant.at,
      revokedAt: grant.revokedAt ?? null,
      ipAddress: ip,
      userAgent: USER_AGENTS.desktop,
    })),
  });
  const initial = grants.filter((g) => g.at.getTime() === createdAt.getTime()).map((g) => g.type);
  await ctx.prisma.auditLog.create({
    data: {
      actorId: family.parentId,
      actorRole: ROLE_KEYS.PARENT,
      action: 'child.create',
      entityType: 'User',
      entityId: user.id,
      after: { consents: initial },
      ipAddress: ip,
      userAgent: USER_AGENTS.desktop,
      createdAt,
    },
  });
  // Later switches, as the parent dashboard records them.
  for (const grant of grants) {
    const changes: { at: Date; before: boolean; after: boolean }[] = [];
    if (grant.at.getTime() !== createdAt.getTime()) {
      changes.push({ at: grant.at, before: false, after: true });
    }
    if (grant.revokedAt) changes.push({ at: grant.revokedAt, before: true, after: false });
    for (const change of changes) {
      const key = grant.type === CONSENTS.boards ? 'publicLeaderboards' : 'publicPortfolio';
      const other = grant.type === CONSENTS.boards ? 'publicPortfolio' : 'publicLeaderboards';
      const otherOn = grant.type === CONSENTS.boards ? portfolio && !portfolioLater : boards;
      await ctx.prisma.auditLog.create({
        data: {
          actorId: family.parentId,
          actorRole: ROLE_KEYS.PARENT,
          action: 'child.consent_change',
          entityType: 'User',
          entityId: user.id,
          before: { [key]: change.before, [other]: otherOn },
          after: { [key]: change.after, [other]: otherOn },
          ipAddress: ip,
          userAgent: USER_AGENTS.desktop,
          createdAt: change.at,
        },
      });
    }
  }

  return {
    id: user.id,
    username: params.username,
    nickname: params.nickname,
    spec,
    pattern: spec.pattern,
    family,
    createdAt,
    trialEndsAt,
    countryCode: family.spec.country,
    timezone: family.timezone,
    regionId: params.place?.regionId ?? null,
    cityId: params.place?.cityId ?? null,
    auth: {
      id: user.id,
      sessionId: 'demo-data',
      roleId: params.roleId,
      roleKey: ROLE_KEYS.STUDENT,
      kind: 'STUDENT',
      isStaff: false,
    },
    lastActive: null,
  };
}

/** A second adult on the family (a guardian), linked to every child. */
async function addGuardian(
  ctx: DemoContext,
  family: DemoFamily,
  spec: FamilySpec,
  params: { roleId: string; passwordHash: string },
): Promise<string> {
  const guardian = spec.guardian!;
  const createdAt = plusDays(family.createdAt, 3);
  const user = await createParent(ctx, {
    name: guardian.name,
    email: guardian.email,
    language: spec.language,
    country: spec.country,
    createdAt,
    verified: true,
    ...params,
  });
  await ctx.prisma.parentChildLink.createMany({
    data: family.children.map((child) => ({
      parentId: user.id,
      childId: child.id,
      relationship: 'GUARDIAN' as const,
      isPrimary: false,
      createdAt: plusMinutes(createdAt, 30),
    })),
  });
  return user.id;
}

/** Sign-ins: one current session per account that was used lately, older ones ended. */
export async function createSessions(ctx: DemoContext, families: DemoFamily[]) {
  const rows: Prisma.SessionCreateManyInput[] = [];
  const session = (userId: string, at: Date, days: number, agent: string, ended?: Date) => {
    rows.push({
      userId,
      refreshTokenHash: tokenHash(),
      userAgent: agent,
      ipAddress: demoIp(ctx.rng),
      authenticatedAt: at,
      createdAt: at,
      expiresAt: new Date(at.getTime() + days * DAY_MS),
      revokedAt: ended ?? null,
    });
  };
  const lastLogins: { id: string; at: Date }[] = [];
  for (const family of families) {
    const parentLogin = ctx.clock.ago(ctx.rng.int(0, 6), ctx.rng.int(5, 18), ctx.rng.int(0, 60));
    session(family.parentId, parentLogin, 30, ctx.rng.pick([USER_AGENTS.desktop, USER_AGENTS.mac]));
    // Signed out on another computer earlier.
    if (family.createdAt.getTime() < ctx.clock.now.getTime() - 3 * DAY_MS) {
      session(
        family.parentId,
        plusDays(family.createdAt, 1),
        30,
        USER_AGENTS.desktop,
        plusDays(family.createdAt, 2),
      );
    }
    lastLogins.push({ id: family.parentId, at: parentLogin });
    for (const child of family.children) {
      if (!child.lastActive) continue;
      const at = plusMinutes(child.lastActive, -2);
      const phone = child.pattern === 'star' || child.pattern === 'new';
      session(child.id, at, 30, phone ? USER_AGENTS.android : USER_AGENTS.desktop);
      lastLogins.push({ id: child.id, at });
    }
  }
  await ctx.prisma.session.createMany({ data: rows });
  for (const login of lastLogins) {
    await ctx.prisma.user.update({ where: { id: login.id }, data: { lastLoginAt: login.at } });
  }
  return rows.length;
}

/**
 * Phones registered for push notifications: students who learn on the app, and some
 * parents. Tokens look like Firebase's but reach no phone (pushes are only logged
 * without a Firebase account).
 */
export async function createDevices(ctx: DemoContext, families: DemoFamily[]) {
  const sessions = await ctx.prisma.session.findMany({
    where: {
      revokedAt: null,
      expiresAt: { gt: ctx.clock.now },
      userId: {
        in: families.flatMap((f) => [f.parentId, ...f.children.map((c) => c.id)]),
      },
    },
    select: { id: true, userId: true, userAgent: true, createdAt: true },
  });
  const languages = new Map<string, string>();
  for (const family of families) {
    languages.set(family.parentId, family.spec.language);
    for (const child of family.children) languages.set(child.id, family.spec.language);
  }
  const rows: Prisma.DeviceTokenCreateManyInput[] = [];
  for (const session of sessions) {
    const android = session.userAgent === USER_AGENTS.android;
    const parentPhone = !android && ctx.rng.chance(0.25);
    if (!android && !parentPhone) continue;
    rows.push({
      userId: session.userId,
      token: `demo-${randomBytes(12).toString('hex')}:APA91b${randomBytes(48).toString('base64url')}`,
      platform: android ? 'ANDROID' : 'IOS',
      languageCode: languages.get(session.userId) ?? 'en',
      sessionId: session.id,
      createdAt: session.createdAt,
      lastSeenAt: session.createdAt,
    });
  }
  await ctx.prisma.deviceToken.createMany({ data: rows });
  return rows.length;
}

/** A parent who asked for a new password last week (the link was used). */
export async function createPasswordResets(ctx: DemoContext, families: DemoFamily[]) {
  const picked = families.filter((_, index) => index % 9 === 4);
  for (const family of picked) {
    const at = ctx.clock.ago(ctx.rng.int(3, 20), 17, 5);
    await ctx.prisma.verificationToken.create({
      data: {
        userId: family.parentId,
        purpose: 'PASSWORD_RESET',
        tokenHash: tokenHash(),
        createdAt: at,
        expiresAt: new Date(at.getTime() + 60 * 60 * 1000),
        usedAt: plusMinutes(at, ctx.rng.int(3, 30)),
      },
    });
    await ctx.prisma.auditLog.create({
      data: {
        actorId: family.parentId,
        actorRole: ROLE_KEYS.PARENT,
        action: 'auth.password_reset',
        entityType: 'User',
        entityId: family.parentId,
        ipAddress: demoIp(ctx.rng),
        userAgent: USER_AGENTS.desktop,
        createdAt: plusMinutes(at, 31),
      },
    });
  }
}
