# syntax=docker/dockerfile:1
#
# API image — build from the repository root:
#   docker build -f apps/api/Dockerfile --target api -t kcp-api .
#   docker build -f apps/api/Dockerfile --target migrate -t kcp-migrate .
#
# Targets
#   api      the NestJS server (small, production dependencies only, runs as non-root)
#   migrate  applies Prisma migrations, syncs reference data and imports the lessons, then exits —
#            run it before each deploy

ARG NODE_VERSION=24

# ── base: Node + pnpm (version pinned by "packageManager" in package.json) ──
FROM node:${NODE_VERSION}-alpine AS base
ENV COREPACK_HOME=/corepack \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    PNPM_STORE_DIR=/pnpm-store
RUN corepack enable
WORKDIR /repo
COPY package.json ./
RUN corepack install && chmod -R a+rX /corepack

# ── build: install, compile the database package and the API, then prune ──
FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.cjs ./
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
COPY packages/checks/package.json packages/checks/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --filter "@kcp/api..." --store-dir /pnpm-store
COPY tsconfig.base.json ./
COPY packages/database packages/database
COPY packages/shared packages/shared
COPY packages/checks packages/checks
COPY apps/api apps/api
RUN pnpm --filter "@kcp/api..." run build
# Copies the API with only its production dependencies (including the built
# @kcp/database and @kcp/shared packages) into /out/api.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm --filter @kcp/api deploy --prod --store-dir /pnpm-store /out/api

# ── migrate: migrations, reference data and lessons ──
FROM base AS migrate
COPY pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.cjs ./
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/
COPY packages/checks/package.json packages/checks/
COPY tools/content-import/package.json tools/content-import/
RUN --mount=type=cache,id=pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --filter "@kcp/content-import..." --store-dir /pnpm-store
COPY tsconfig.base.json ./
COPY packages/database packages/database
COPY packages/shared packages/shared
COPY packages/checks packages/checks
COPY tools/content-import tools/content-import
# Builds @kcp/database (with the Prisma client), @kcp/shared, @kcp/checks and the importer.
RUN pnpm --filter "@kcp/content-import..." run build
COPY content content
WORKDIR /repo/packages/database
ENV PATH=/repo/packages/database/node_modules/.bin:$PATH
USER node
# Apply migrations, sync reference data (languages, roles, permission rules,
# countries), then import the lessons from content/. All three steps are safe to repeat.
CMD ["sh", "-c", "prisma migrate deploy && prisma db seed && node /repo/tools/content-import/dist/cli.js import /repo/content --hold-new"]

# ── api: the runtime image ──
FROM node:${NODE_VERSION}-alpine AS api
ARG APP_VERSION=dev
ENV NODE_ENV=production \
    API_PORT=3000 \
    APP_VERSION=${APP_VERSION}
WORKDIR /app
COPY --from=build --chown=node:node /out/api ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${API_PORT}/v1/health/live" > /dev/null || exit 1
CMD ["node", "dist/main.js"]
