import type { Redis } from 'ioredis';
import type { PrismaService } from '../../database/prisma.service.js';
import type { AuthUser } from '../../permissions/auth-user.js';
import type { ChildSpec, FamilySpec, Pattern } from './cast.js';
import type { Clock, Rng } from './timeline.js';

/** What every step of the demo load shares. */
export interface DemoContext {
  prisma: PrismaService;
  redis: Redis;
  clock: Clock;
  rng: Rng;
  log: (message: string) => void;
}

export interface DemoStaff {
  id: string;
  email: string;
  name: string;
  role: string;
  auth: AuthUser;
}

export interface DemoChild {
  id: string;
  username: string;
  nickname: string;
  spec: ChildSpec;
  pattern: Pattern;
  family: DemoFamily;
  createdAt: Date;
  trialEndsAt: Date | null;
  countryCode: string;
  timezone: string;
  regionId: string | null;
  cityId: string | null;
  auth: AuthUser;
  /** Filled in while learning is simulated. */
  lastActive: Date | null;
}

export interface DemoFamily {
  spec: FamilySpec;
  parentId: string;
  email: string;
  name: string;
  timezone: string;
  createdAt: Date;
  auth: AuthUser;
  guardianId: string | null;
  children: DemoChild[];
}

/** A stretch of time with premium. */
export interface Interval {
  from: Date;
  to: Date;
}

/** Who has premium when: plans (per family), grants and trials (per child). */
export class PremiumCalendar {
  private readonly families = new Map<string, Interval[]>();
  private readonly children = new Map<string, Interval[]>();

  addFamily(parentId: string, interval: Interval) {
    this.families.set(parentId, [...(this.families.get(parentId) ?? []), interval]);
  }

  addChild(childId: string, interval: Interval) {
    this.children.set(childId, [...(this.children.get(childId) ?? []), interval]);
  }

  activeAt(child: DemoChild, at: Date): boolean {
    const inside = (list: Interval[] | undefined) =>
      (list ?? []).some((i) => i.from.getTime() <= at.getTime() && at.getTime() < i.to.getTime());
    if (child.trialEndsAt && at.getTime() < child.trialEndsAt.getTime()) return true;
    return inside(this.children.get(child.id)) || inside(this.families.get(child.family.parentId));
  }

  /** Premium from a plan or from staff (not the trial) at this moment. */
  paidOrGivenAt(child: DemoChild, at: Date): boolean {
    const inside = (list: Interval[] | undefined) =>
      (list ?? []).some((i) => i.from.getTime() <= at.getTime() && at.getTime() < i.to.getTime());
    return inside(this.children.get(child.id)) || inside(this.families.get(child.family.parentId));
  }
}

/** Addresses in the documentation range (RFC 5737), for consent records and sessions. */
export const demoIp = (rng: Rng) => `203.0.113.${rng.int(2, 250)}`;

export const USER_AGENTS = {
  desktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
  android: 'KidsCodingPlatform/1.0.0 (Android 14; Pixel 7a)',
  ios: 'KidsCodingPlatform/1.0.0 (iOS 18.6; iPhone14,5)',
} as const;
