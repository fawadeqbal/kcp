# kcp_api: the mobile app's API client (generated)

Dart client for the API, generated with OpenAPI Generator (`dart-dio`,
`json_serializable`) from `packages/api-client-ts/openapi.json`. Only the operations
the app may call are in it (`MOBILE_OPERATIONS` in `tool/generate.mjs`): no staff
endpoints, no purchases.

Don't edit `lib/`, `pubspec.yaml`, `build.yaml` or `analysis_options.yaml` by hand.
After an API change:

```bash
pnpm api:client        # the OpenAPI document and the TypeScript client
pnpm api:client:dart   # this package (needs Java 17+ and Flutter's dart on PATH)
```

The generator downloads OpenAPI Generator once (pinned version and SHA-256) into
`~/.cache/kcp` (or `KCP_CACHE_DIR`). CI regenerates the package and fails when the
committed code differs. `node --test tool/*.test.mjs` checks the operation list.
