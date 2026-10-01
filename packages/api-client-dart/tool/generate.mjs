#!/usr/bin/env node
/*
 * Generates the mobile app's Dart API client (package kcp_api) from the API's
 * OpenAPI document (packages/api-client-ts/openapi.json, made by `pnpm api:client`).
 *
 * Only the operations the app uses go in (MOBILE_OPERATIONS): the app can't call
 * staff endpoints or start a purchase even by mistake, and the client stays small.
 * The generated code is committed, so building the app needs Flutter only.
 *
 *   pnpm api:client          # first, when the API changed
 *   pnpm api:client:dart     # needs Java 17+ and Flutter (dart) on PATH
 *
 * The OpenAPI Generator (a Java program) is downloaded once into a cache folder
 * (KCP_CACHE_DIR, default ~/.cache/kcp) and checked against a pinned SHA-256.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const GENERATOR_VERSION = '7.25.0';
const GENERATOR_SHA256 = '41ce4f6b07f196676439d710759fa1ced7a08066d06ff1bf314681470289efae';
const GENERATOR_URL = `https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli/${GENERATOR_VERSION}/openapi-generator-cli-${GENERATOR_VERSION}.jar`;

/** Everything the mobile app may call: method and path, as in the OpenAPI document. */
export const MOBILE_OPERATIONS = [
  // Signing in and out (students and parents; no sign-up, no password reset: web only).
  'post /v1/auth/login',
  'post /v1/auth/students/login',
  // Younger children: a picture password, or a parent signing this device in.
  'post /v1/auth/students/picture-login',
  'post /v1/auth/pairing',
  'post /v1/auth/pairing/status',
  'post /v1/auth/pairing/claim',
  'post /v1/auth/refresh',
  'post /v1/auth/logout',
  'get /v1/auth/me',
  // Phones and crash reports.
  'put /v1/devices',
  'post /v1/devices/remove',
  'post /v1/app/crashes',
  // Students: lessons, quizzes, practice, progress.
  'get /v1/learning/tracks',
  'get /v1/learning/lessons/{id}',
  'post /v1/learning/lessons/{id}/start',
  'post /v1/learning/quizzes/{id}/answers',
  // Explorer (block lessons and games) works on phones and tablets.
  'put /v1/learning/challenges/{id}/draft',
  'post /v1/learning/challenges/{id}/submissions',
  'get /v1/projects/{id}',
  'put /v1/projects/{id}/draft',
  'post /v1/projects/{id}/ship',
  'get /v1/learning/practice',
  'get /v1/progress',
  'get /v1/leaderboards',
  // Leagues and friends (a parent of each child approves friends).
  'get /v1/league',
  'post /v1/league/seen',
  'get /v1/friends',
  'post /v1/friends/requests',
  'delete /v1/friends/requests/{id}',
  'get /v1/friends/board',
  'delete /v1/friends/{userId}',
  // Minutes learning (while a lesson or practice is open), and the skill map.
  'post /v1/activity/heartbeat',
  'get /v1/skills',
  'get /v1/badges',
  'post /v1/badges/seen',
  'get /v1/certificates',
  // Team rooms: phrases, typed text from 13 (filtered), and reports.
  'get /v1/rooms',
  'get /v1/rooms/{id}/messages',
  'post /v1/rooms/{id}/messages',
  'post /v1/rooms/{id}/read',
  'post /v1/rooms/{id}/reports',
  // Parents: children, their progress and switches, the plan's status (no purchases).
  'get /v1/children',
  'get /v1/children/{id}',
  'patch /v1/children/{id}',
  'get /v1/children/{id}/consents',
  'put /v1/children/{id}/consents',
  'get /v1/children/{id}/certificates',
  'get /v1/children/{id}/parental-consent',
  'put /v1/children/{id}/picture-password',
  'post /v1/auth/pairing/lookup',
  'post /v1/auth/pairing/approve',
  'get /v1/friend-requests',
  'post /v1/friend-requests/{id}/decision',
  'get /v1/children/{id}/friends',
  'get /v1/children/{id}/skills',
  'get /v1/reports',
  'delete /v1/children/{id}/friends/{friendId}',
  'get /v1/children/{childId}/rooms',
  'get /v1/children/{childId}/rooms/{roomId}/messages',
  // Hackathon teams: a parent approves each child's place.
  'get /v1/event-requests',
  'post /v1/event-requests/{teamId}/decision',
  // A teacher's class: a parent approves each child's place.
  'get /v1/class-requests',
  'post /v1/class-requests/{classId}/decision',
  'get /v1/billing',
  'get /v1/account/email-preferences',
  'put /v1/account/email-preferences',
  // Everyone.
  'get /v1/notifications',
  'post /v1/notifications/read',
  'post /v1/feedback',
  'get /v1/languages',
];

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(here, '..');
const repoRoot = resolve(packageDir, '../..');
const specPath = join(repoRoot, 'packages/api-client-ts/openapi.json');

/** The document with only MOBILE_OPERATIONS, and only the schemas they use. */
export function mobileSpec(spec, operations = MOBILE_OPERATIONS) {
  const wanted = new Set(operations);
  const paths = {};
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const [method, operation] of Object.entries(item)) {
      if (!wanted.has(`${method} ${path}`)) continue;
      paths[path] ??= {};
      paths[path][method] = operation;
      wanted.delete(`${method} ${path}`);
    }
  }
  if (wanted.size > 0) {
    throw new Error(`Not in the API any more: ${[...wanted].join(', ')}`);
  }
  // Every schema reachable from the kept operations.
  const schemas = spec.components?.schemas ?? {};
  const kept = new Set();
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') {
        const name = value.replace('#/components/schemas/', '');
        if (!kept.has(name) && schemas[name]) {
          kept.add(name);
          visit(schemas[name]);
        }
      } else {
        visit(value);
      }
    }
  };
  visit(paths);
  return {
    ...spec,
    paths,
    components: {
      ...spec.components,
      schemas: Object.fromEntries(Object.entries(schemas).filter(([name]) => kept.has(name))),
    },
  };
}

function generatorJar() {
  const cacheDir = process.env.KCP_CACHE_DIR ?? join(homedir(), '.cache', 'kcp');
  const jar = join(cacheDir, `openapi-generator-cli-${GENERATOR_VERSION}.jar`);
  const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
  if (existsSync(jar) && sha256(jar) === GENERATOR_SHA256) return jar;
  mkdirSync(cacheDir, { recursive: true });
  console.log(`Downloading OpenAPI Generator ${GENERATOR_VERSION}…`);
  execFileSync('curl', ['-fsSL', '--retry', '3', '-o', jar, GENERATOR_URL], { stdio: 'inherit' });
  if (sha256(jar) !== GENERATOR_SHA256) {
    rmSync(jar);
    throw new Error('The downloaded OpenAPI Generator does not match the pinned SHA-256.');
  }
  return jar;
}

const run = (command, args, cwd) => execFileSync(command, args, { cwd, stdio: 'inherit' });

function main() {
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));
  const work = mkdtempSync(join(tmpdir(), 'kcp-dart-client-'));
  try {
    const filtered = join(work, 'openapi.mobile.json');
    writeFileSync(filtered, JSON.stringify(mobileSpec(spec), null, 2));
    const out = join(work, 'out');
    run('java', [
      '-jar',
      generatorJar(),
      'generate',
      '--input-spec',
      filtered,
      '--generator-name',
      'dart-dio',
      '--output',
      out,
      '--global-property',
      'apiTests=false,modelTests=false,apiDocs=false,modelDocs=false',
      '--additional-properties',
      [
        'pubName=kcp_api',
        'pubVersion=1.0.0',
        'pubDescription=Kids Coding Platform API client for the mobile app (generated)',
        'serializationLibrary=json_serializable',
        'dateLibrary=core',
        // A value the API adds later (a new quiz kind…) parses as "unknown" instead of
        // breaking every response that contains it, in app versions already installed.
        'enumUnknownDefaultCase=true',
      ].join(','),
    ]);

    // Replace the generated parts of the package; keep our own files (tool/, README…).
    for (const name of ['lib', 'build.yaml']) {
      rmSync(join(packageDir, name), { recursive: true, force: true });
      cpSync(join(out, name), join(packageDir, name), { recursive: true });
    }
    // The generator writes `List<SomeEnum>.unknownDefaultOpenApi` for lists of enums;
    // json_serializable wants the element's value there.
    const modelDir = join(packageDir, 'lib/src/model');
    for (const file of readdirSync(modelDir)) {
      const path = join(modelDir, file);
      const code = readFileSync(path, 'utf8');
      const fixed = code.replace(
        /unknownEnumValue: List<(\w+)>\.unknownDefaultOpenApi/g,
        'unknownEnumValue: $1.unknownDefaultOpenApi',
      );
      if (fixed !== code) writeFileSync(path, fixed);
    }
    // A pubspec for the pub workspace (the generator's asks for an old SDK: the
    // json_serializable output needs Dart 3.8 or newer).
    const pubspec = readFileSync(join(out, 'pubspec.yaml'), 'utf8')
      .replace(/^homepage:.*\n/m, '')
      .replace(/sdk: '[^']*'/, 'sdk: ^3.9.0')
      .replace(/^version: .*$/m, (line) => `${line}\npublish_to: none\nresolution: workspace`)
      .replace(/^ {2}test: .*\n/m, '')
      .replace('build_runner: any', 'build_runner: ^2.7.1')
      .replace(/\n{3,}/g, '\n\n');
    writeFileSync(
      join(packageDir, 'pubspec.yaml'),
      `# Generated by tool/generate.mjs. Do not edit.\n${pubspec}`,
    );
    writeFileSync(
      join(packageDir, 'analysis_options.yaml'),
      '# Generated code: analysed by the generator, not by our lint rules.\nanalyzer:\n  errors:\n    unused_import: ignore\n    unused_element: ignore\n    deprecated_member_use_from_same_package: ignore\n',
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }

  // The json_serializable part files, then one formatting pass for a stable diff.
  run('dart', ['pub', 'get'], packageDir);
  run('dart', ['run', 'build_runner', 'build', '--delete-conflicting-outputs'], packageDir);
  run('dart', ['format', 'lib'], packageDir);
  console.log('Dart API client generated in packages/api-client-dart.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
