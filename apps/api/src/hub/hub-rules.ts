import type { HubRules, HubSplitPercents } from '@kcp/shared';
import type { PrismaService } from '../database/prisma.service.js';
import { isReadyMentor } from '../events/events.shared.js';

/** The Country.hub* columns the hub reads. */
export interface CountryHub {
  code: string;
  timezone: string;
  hubEnabled: boolean;
  hubMinAge: number;
  hubWeeklyMinutes: number;
  hubDayStartMinute: number;
  hubDayEndMinute: number;
  hubSchoolDays: number[];
  hubSchoolStartMinute: number;
  hubSchoolEndMinute: number;
  hubStudentPercent: number;
  hubLeadPercent: number;
  hubPlatformPercent: number;
  hubHoldDays: number;
  hubWithholdingBp: number;
}

export const COUNTRY_HUB_SELECT = {
  code: true,
  timezone: true,
  hubEnabled: true,
  hubMinAge: true,
  hubWeeklyMinutes: true,
  hubDayStartMinute: true,
  hubDayEndMinute: true,
  hubSchoolDays: true,
  hubSchoolStartMinute: true,
  hubSchoolEndMinute: true,
  hubStudentPercent: true,
  hubLeadPercent: true,
  hubPlatformPercent: true,
  hubHoldDays: true,
  hubWithholdingBp: true,
} as const;

/** The working-hours rules for a student in this country. */
export function rulesOf(country: CountryHub): HubRules {
  return {
    timeZone: country.timezone,
    minAge: country.hubMinAge,
    weeklyMinutes: country.hubWeeklyMinutes,
    dayStartMinute: country.hubDayStartMinute,
    dayEndMinute: country.hubDayEndMinute,
    schoolDays: country.hubSchoolDays,
    schoolStartMinute: country.hubSchoolStartMinute,
    schoolEndMinute: country.hubSchoolEndMinute,
  };
}

export function splitOf(country: CountryHub): HubSplitPercents {
  return {
    student: country.hubStudentPercent,
    lead: country.hubLeadPercent,
    platform: country.hubPlatformPercent,
  };
}

/**
 * The age a student has surely reached, from their birth year (the platform never asks
 * for the date): someone born in 2011 is surely 15 only from 1 January 2027. The hub's
 * minimum age is a legal limit, so it's never met early.
 */
export const ageOf = (birthYear: number | null | undefined, now: Date) =>
  birthYear ? Math.max(0, now.getUTCFullYear() - birthYear - 1) : 0;

/**
 * A lead developer who may act now: a ready mentor (check passed, code of conduct
 * signed, not paused) marked as a lead. Checked on every lead action, so taking the
 * role away (or pausing the mentor) stops them at once.
 */
export async function isLeadDeveloper(prisma: PrismaService, userId: string): Promise<boolean> {
  return (
    (await isReadyMentor(prisma, userId)) &&
    (await prisma.mentorProfile.count({ where: { userId, isLead: true } })) > 0
  );
}
