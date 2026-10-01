/**
 * Creates a staff account (for example the first super admin) with a temporary
 * password. On first login the account must set up two-factor authentication.
 *
 *   pnpm staff:create --email fawad@example.com --name "Fawad Iqbal" --role super_admin
 */
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { parseArgs } from 'node:util';
import {
  createPrismaClient,
  ROLE_KEYS,
  STAFF_ROLE_KEYS,
  TWO_FACTOR_ROLE_KEYS,
} from '@kcp/database';
import { config as loadEnv } from 'dotenv';
import { hashPassword } from '../common/crypto/passwords.js';

loadEnv({ path: path.resolve(process.cwd(), '../../.env'), quiet: true });

// Staff, and the adults who sign in to the web app with two-factor (mentors, teachers).
const STAFF_ROLES = [...TWO_FACTOR_ROLE_KEYS] as string[];

const { values } = parseArgs({
  // pnpm may pass a literal "--" through; ignore it.
  args: process.argv.slice(2).filter((arg) => arg !== '--'),
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    role: { type: 'string', default: ROLE_KEYS.SUPER_ADMIN },
  },
});

const email = values.email?.trim().toLowerCase();
if (!email || !values.name || !STAFF_ROLES.includes(values.role ?? '')) {
  console.error(
    `Usage: pnpm staff:create --email <email> --name "<name>" [--role ${STAFF_ROLES.join('|')}]`,
  );
  process.exit(1);
}

const prisma = createPrismaClient();
try {
  const role = await prisma.role.findUniqueOrThrow({ where: { key: values.role } });
  if (await prisma.user.findUnique({ where: { email } })) {
    console.error(`An account with ${email} already exists.`);
    process.exitCode = 1;
  } else {
    const password = randomBytes(12).toString('base64url');
    const user = await prisma.user.create({
      data: {
        kind: 'ADULT',
        status: 'ACTIVE',
        roleId: role.id,
        email,
        emailVerifiedAt: new Date(),
        displayName: values.name,
        passwordHash: await hashPassword(password),
      },
    });
    await prisma.auditLog.create({
      data: {
        action: 'staff.create',
        entityType: 'User',
        entityId: user.id,
        after: { role: role.key },
      },
    });
    console.info(`Created ${role.name} ${email}`);
    console.info(`Temporary password: ${password}`);
    console.info(
      (STAFF_ROLE_KEYS as readonly string[]).includes(role.key)
        ? 'Log in to the admin panel (http://localhost:3002 locally), set up two-factor authentication, then change the password (forgot-password link on the web app).'
        : 'Log in to the web app (http://localhost:3001/en/login locally) and set up two-factor authentication, then change the password (forgot-password link).',
    );
  }
} finally {
  await prisma.$disconnect();
}
