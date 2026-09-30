import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { MOBILE_OPERATIONS, mobileSpec } from './generate.mjs';

const spec = JSON.parse(
  readFileSync(new URL('../../api-client-ts/openapi.json', import.meta.url), 'utf8'),
);

test('every operation the app uses is still in the API', () => {
  assert.doesNotThrow(() => mobileSpec(spec));
});

test('the app gets no staff endpoints and no way to start a purchase', () => {
  const paths = Object.keys(mobileSpec(spec).paths);
  assert.ok(paths.every((path) => !path.startsWith('/v1/admin') && !path.startsWith('/v1/users')));
  assert.ok(!paths.includes('/v1/billing/checkout'));
  assert.ok(!paths.includes('/v1/auth/parents/sign-up'));
  assert.equal(
    Object.values(mobileSpec(spec).paths).reduce((n, item) => n + Object.keys(item).length, 0),
    MOBILE_OPERATIONS.length,
  );
});

test('keeps only the schemas the operations use', () => {
  const schemas = Object.keys(mobileSpec(spec).components.schemas);
  assert.ok(schemas.includes('QuizDto'));
  assert.ok(schemas.includes('QuizLineDto'));
  assert.ok(!schemas.includes('GrantPremiumDto'));
  assert.ok(!schemas.includes('AppCrashListDto'));
});

test('refuses an operation the API no longer has', () => {
  assert.throws(() => mobileSpec(spec, ['get /v1/nothing']), /Not in the API/);
});
