import { hash, verify } from '@node-rs/argon2';

// Argon2id with OWASP's recommended minimum cost (19 MiB, 2 passes). Argon2id is the
// library default algorithm.
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

export {
  ADULT_PASSWORD_MIN_LENGTH,
  CHILD_PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from '@kcp/shared';

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * A real hash of a random value. Verifying against it when an account does not exist
 * keeps login timing the same whether or not the email is registered.
 */
let dummyHash: Promise<string> | undefined;
export function dummyPasswordHash(): Promise<string> {
  dummyHash ??= hashPassword(`dummy-${Math.random()}`);
  return dummyHash;
}
