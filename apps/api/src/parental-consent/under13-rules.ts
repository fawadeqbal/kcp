import type { PrismaClient, Under13ConsentMethod } from '@kcp/database';
import type { FeatureFlagsService } from '../feature-flags/feature-flags.service.js';

/** The order parents see the methods in: quickest first. */
export const METHOD_ORDER: Under13ConsentMethod[] = ['CARD_CHECK', 'EMAIL_PLUS', 'SIGNED_FORM'];

/** The verified parental consent methods a country accepts, in the order to offer them. */
export async function consentMethodsFor(
  prisma: Pick<PrismaClient, 'country'>,
  countryCode: string | null | undefined,
): Promise<Under13ConsentMethod[]> {
  if (!countryCode) return [];
  const country = await prisma.country.findUnique({
    where: { code: countryCode },
    select: { under13ConsentMethods: true },
  });
  const accepted = new Set(country?.under13ConsentMethods ?? []);
  return METHOD_ORDER.filter((method) => accepted.has(method));
}

/**
 * Accounts for children under 13 are open in a country when the under_13_accounts
 * flag is on there and the country accepts at least one consent method.
 */
export async function under13Open(
  prisma: Pick<PrismaClient, 'country'>,
  flags: Pick<FeatureFlagsService, 'isEnabled'>,
  countryCode: string | null | undefined,
): Promise<boolean> {
  if (!(await flags.isEnabled('under_13_accounts', countryCode ?? null))) return false;
  return (await consentMethodsFor(prisma, countryCode)).length > 0;
}
