/**
 * Reference data every environment needs: languages, roles, countries, regions,
 * cities, feature flags, levels, badges, plans and placeholder prices. Safe to run many times (every write is an upsert).
 *
 * Run with: pnpm db:seed
 */
import type { Prisma } from '../generated/prisma/client.js';
import { createPrismaClient } from '../src/client.js';
import { badges } from './seed-data/badges.js';
import { countries } from './seed-data/locations.js';
import { featureFlags } from './seed-data/feature-flags.js';
import { languages } from './seed-data/languages.js';
import { levels } from './seed-data/levels.js';
import { permissionMatrix } from '../src/permission-matrix.js';
import { planPrices, plans } from './seed-data/plans.js';
import { roles } from './seed-data/roles.js';

const prisma = createPrismaClient();

async function seedLanguages() {
  for (const [index, lang] of languages.entries()) {
    await prisma.language.upsert({
      where: { code: lang.code },
      create: { ...lang, sortOrder: index },
      update: { name: lang.name, nativeName: lang.nativeName, direction: lang.direction },
    });
  }
  return languages.length;
}

async function seedRoles() {
  for (const r of roles) {
    await prisma.role.upsert({
      where: { key: r.key },
      create: r,
      update: { name: r.name, description: r.description, isStaff: r.isStaff },
    });
  }
  // The permission matrix is replaced as a whole, so removing a rule in code removes it here.
  let ruleCount = 0;
  await prisma.$transaction(async (tx) => {
    for (const [roleKey, rules] of Object.entries(permissionMatrix)) {
      const role = await tx.role.findUniqueOrThrow({ where: { key: roleKey } });
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      for (const rule of rules) {
        const permission = await tx.permission.upsert({
          where: { action_subject: { action: rule.action, subject: rule.subject } },
          create: { action: rule.action, subject: rule.subject },
          update: {},
        });
        await tx.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: permission.id,
            conditions: (rule.conditions as Prisma.InputJsonObject | undefined) ?? undefined,
            fields: rule.fields ?? [],
            inverted: rule.inverted ?? false,
          },
        });
        ruleCount++;
      }
    }
  });
  return { roles: roles.length, rules: ruleCount };
}

async function seedLocations() {
  let regionCount = 0;
  let cityCount = 0;
  for (const { regions, ...country } of countries) {
    // `isActive` is only set on create, so switching a country on or off in the
    // admin panel is never undone by re-running the seed.
    await prisma.country.upsert({
      where: { code: country.code },
      create: country,
      // The currency is set once: staff may change it in the admin panel after that.
      update: {
        names: country.names,
        timezone: country.timezone,
        defaultLanguageCode: country.defaultLanguageCode,
      },
    });
    for (const { cities, ...region } of regions) {
      const savedRegion = await prisma.region.upsert({
        where: { countryCode_slug: { countryCode: country.code, slug: region.slug } },
        create: { ...region, countryCode: country.code },
        update: { names: region.names },
      });
      regionCount++;
      for (const city of cities) {
        await prisma.city.upsert({
          where: { regionId_slug: { regionId: savedRegion.id, slug: city.slug } },
          create: { ...city, regionId: savedRegion.id },
          update: { names: city.names },
        });
        cityCount++;
      }
    }
  }
  return { countries: countries.length, regions: regionCount, cities: cityCount };
}

async function seedFeatureFlags() {
  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      create: flag,
      update: { description: flag.description },
    });
  }
  return featureFlags.length;
}

async function seedLevels() {
  // Nothing points at levels, so the table is simply replaced.
  await prisma.$transaction([prisma.level.deleteMany(), prisma.level.createMany({ data: levels })]);
  return levels.length;
}

async function seedBadges() {
  // Badges are kept in step with the catalog; ones no longer listed are switched off
  // (students keep what they earned).
  for (const badge of badges) {
    const data = { ...badge, criteria: badge.criteria as Prisma.InputJsonObject, isActive: true };
    await prisma.badge.upsert({ where: { key: badge.key }, create: data, update: data });
  }
  await prisma.badge.updateMany({
    where: { key: { notIn: badges.map((badge) => badge.key) } },
    data: { isActive: false },
  });
  return badges.length;
}

async function seedPlans() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { key: plan.key },
      create: plan,
      update: { interval: plan.interval, sortOrder: plan.sortOrder },
    });
  }
  let created = 0;
  for (const price of planPrices) {
    const country = await prisma.country.findUnique({
      where: { code: price.countryCode },
      select: { currency: true },
    });
    // A placeholder only fits the currency it was written for (staff may have changed it).
    if (!country || country.currency !== price.currency) continue;
    const existing = await prisma.planPrice.findUnique({
      where: { planKey_countryCode: { planKey: price.planKey, countryCode: price.countryCode } },
    });
    if (existing) continue;
    await prisma.planPrice.create({ data: price });
    created++;
  }
  return { plans: plans.length, newPrices: created };
}

async function main() {
  const languageCount = await seedLanguages();
  const { roles: roleCount, rules: ruleCount } = await seedRoles();
  const locations = await seedLocations();
  const flagCount = await seedFeatureFlags();
  const levelCount = await seedLevels();
  const badgeCount = await seedBadges();
  const pricing = await seedPlans();
  console.info(
    `Seeded ${languageCount} languages, ${roleCount} roles (${ruleCount} permission rules), ` +
      `${locations.countries} countries, ` +
      `${locations.regions} regions, ${locations.cities} cities, ${flagCount} feature flags, ` +
      `${levelCount} levels, ${badgeCount} badges, ${pricing.plans} plans ` +
      `(${pricing.newPrices} new prices).`,
  );
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
