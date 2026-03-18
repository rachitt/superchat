# ── Stage 1: Install dependencies ──
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @superchat/server...

# ── Stage 2: Build ──
FROM deps AS build
COPY packages/shared/ packages/shared/
COPY apps/server/ apps/server/
RUN pnpm --filter @superchat/shared build 2>/dev/null || true
RUN pnpm --filter @superchat/server build

# ── Stage 3: Production image ──
FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/package.json ./apps/server/
COPY --from=build /app/apps/server/drizzle ./apps/server/drizzle
COPY --from=build /app/packages/shared/ ./packages/shared/
COPY --from=deps /app/pnpm-workspace.yaml /app/package.json ./

EXPOSE 4000

CMD ["node", "apps/server/dist/index.js"]
