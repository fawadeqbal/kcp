/**
 * Creates (or with --cleanup, removes) the students the load test signs in as:
 * `load-000001` … with one password, in Pakistan's regions and cities, on the public
 * boards, with a trial running. Straight into the database: signing up 1,000 families
 * through the API would take hours of rate limits.
 *
 *   node src/seed.ts --students=1000
 *   node src/seed.ts --cleanup
 */
import { hash } from '@node-rs/argon2';
import { createPrismaClient } from '@kcp/database';
import { assertNotProduction, option, PASSWORD, username, USERNAME_PREFIX } from './shared.ts';

const prisma = createPrismaClient();
assertNotProduction(process.env['DATABASE_URL'] ?? '');

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { username: { startsWith: USERNAME_PREFIX }, status: { not: 'DELETED' } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  for (let i = 0; i < ids.length; i += 500) {
    const batch = ids.slice(i, i + 500);
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { userId: { in: batch } } }),
      prisma.submission.deleteMany({ where: { userId: { in: batch } } }),
      prisma.challengeDraft.deleteMany({ where: { userId: { in: batch } } }),
      prisma.lessonProgress.deleteMany({ where: { userId: { in: batch } } }),
      prisma.userBadge.deleteMany({ where: { userId: { in: batch } } }),
      prisma.notification.deleteMany({ where: { userId: { in: batch } } }),
      prisma.streak.deleteMany({ where: { userId: { in: batch } } }),
      prisma.studentProfile.deleteMany({ where: { userId: { in: batch } } }),
      // XP history is append-only by design: those accounts stay, anonymous and off the boards.
      prisma.user.updateMany({
        where: { id: { in: batch } },
        data: { status: 'DELETED', passwordHash: null },
      }),
    ]);
  }
  console.log(`Removed ${ids.length} load-test students (their XP history stays, anonymous).`);
}

async function seed(count: number) {
  const [role, country] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { key: 'student' } }),
    prisma.country.findUniqueOrThrow({
      where: { code: 'PK' },
      include: { regions: { include: { cities: true } } },
    }),
  ]);
  const places = country.regions.flatMap((region) =>
    region.cities.map((city) => ({ regionId: region.id, cityId: city.id })),
  );
  const passwordHash = await hash(PASSWORD, { memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  const existing = new Set(
    (
      await prisma.user.findMany({
        where: { username: { startsWith: USERNAME_PREFIX }, status: 'ACTIVE' },
        select: { username: true },
      })
    ).map((u) => u.username),
  );
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  let created = 0;
  for (let i = 1; i <= count; i++) {
    const name = username(i);
    if (existing.has(name)) continue;
    const place = places[i % places.length]!;
    const profile = {
      nickname: `Load${String(i).padStart(4, '0')}`,
      avatarKey: 'rocket',
      birthYear: new Date().getUTCFullYear() - 14,
      showOnPublicBoards: true,
      trialEndsAt,
    };
    await prisma.user.upsert({
      where: { username: name },
      create: {
        kind: 'STUDENT',
        status: 'ACTIVE',
        roleId: role.id,
        username: name,
        passwordHash,
        languageCode: ['ur', 'en', 'ar'][i % 3]!,
        countryCode: 'PK',
        ...place,
        studentProfile: { create: profile },
      },
      // A student removed by --cleanup comes back with a new profile.
      update: {
        status: 'ACTIVE',
        passwordHash,
        deletedAt: null,
        studentProfile: { upsert: { create: profile, update: { trialEndsAt } } },
      },
    });
    created++;
  }
  console.log(`${count} load-test students ready (${created} new). Password: "${PASSWORD}".`);
}

try {
  if (process.argv.includes('--cleanup')) await cleanup();
  else await seed(option('students', 1000));
} finally {
  await prisma.$disconnect();
}
