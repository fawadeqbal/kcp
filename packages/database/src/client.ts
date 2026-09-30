import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export interface CreatePrismaClientOptions {
  /** PostgreSQL connection string. Defaults to process.env.DATABASE_URL. */
  connectionString?: string;
  /** Prisma log levels. Defaults to warnings and errors. */
  log?: ('query' | 'info' | 'warn' | 'error')[];
}

/**
 * Driver adapter for PostgreSQL. Prisma 7 talks to the database through the `pg`
 * driver instead of its own engine binary.
 */
export function createPgAdapter(connectionString: string): PrismaPg {
  return new PrismaPg({ connectionString });
}

/** Creates a standalone Prisma client (scripts, seeds, tests). The API uses PrismaService. */
export function createPrismaClient(options: CreatePrismaClientOptions = {}): PrismaClient {
  const connectionString = options.connectionString ?? process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return new PrismaClient({
    adapter: createPgAdapter(connectionString),
    log: options.log ?? ['warn', 'error'],
  });
}
