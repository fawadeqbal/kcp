/**
 * Proves the hand-written protections in the init migration work.
 * Everything runs inside one transaction that is rolled back, so no test rows
 * are left behind (audit_logs rows could never be deleted otherwise).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(here, '../../../.env'), quiet: true });

const client = new Client({ connectionString: process.env['DATABASE_URL'] });

/** Runs a statement that must fail, without aborting the surrounding transaction. */
async function expectBlocked(sql: string, params: unknown[], message: RegExp) {
  await client.query('SAVEPOINT attempt');
  await expect(client.query(sql, params)).rejects.toThrow(message);
  await client.query('ROLLBACK TO SAVEPOINT attempt');
}

describe('database protections', () => {
  beforeAll(async () => {
    await client.connect();
  });

  beforeEach(async () => {
    await client.query('BEGIN');
  });

  afterEach(async () => {
    await client.query('ROLLBACK');
  });

  afterAll(async () => {
    await client.end();
  });

  it('audit_logs accepts inserts but blocks updates and deletes', async () => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO audit_logs (id, action, entity_type) VALUES (gen_random_uuid(), 'user.suspend', 'User') RETURNING id`,
    );
    const id = rows[0]?.id;
    await expectBlocked(`UPDATE audit_logs SET action = 'x' WHERE id = $1`, [id], /append-only/);
    await expectBlocked(`DELETE FROM audit_logs WHERE id = $1`, [id], /append-only/);
  });

  it('consent_records can be revoked once and never rewritten', async () => {
    const role = await client.query<{ id: string }>(
      `INSERT INTO roles (id, key, name, updated_at) VALUES (gen_random_uuid(), 'e2e_' || gen_random_uuid(), 'E2E', now()) RETURNING id`,
    );
    const roleId = role.rows[0]?.id;
    await client.query(
      `INSERT INTO languages (code, name, native_name) VALUES ('en', 'English', 'English') ON CONFLICT DO NOTHING`,
    );
    const users = await client.query<{ id: string }>(
      `INSERT INTO users (id, kind, role_id, updated_at) VALUES
         (gen_random_uuid(), 'ADULT', $1, now()),
         (gen_random_uuid(), 'STUDENT', $1, now())
       RETURNING id`,
      [roleId],
    );
    const [parentId, childId] = users.rows.map((row) => row.id);
    const consent = await client.query<{ id: string }>(
      `INSERT INTO consent_records (id, parent_id, child_id, type, policy_version, method)
       VALUES (gen_random_uuid(), $1, $2, 'PUBLIC_LEADERBOARDS', '2026-09', 'EMAIL_CONFIRMATION') RETURNING id`,
      [parentId, childId],
    );
    const consentId = consent.rows[0]?.id;

    await expectBlocked(
      `UPDATE consent_records SET type = 'EARNINGS' WHERE id = $1`,
      [consentId],
      /only revoked_at may be set/,
    );

    await client.query(`UPDATE consent_records SET revoked_at = now() WHERE id = $1`, [consentId]);

    await expectBlocked(
      `UPDATE consent_records SET revoked_at = now() WHERE id = $1`,
      [consentId],
      /already revoked/,
    );
  });
});
