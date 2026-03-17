# CLAUDE.md

## Git Conventions

- Short one-liner commit messages. No multi-line, no bullet points, no Co-Authored-By.

## Build & Dev

```bash
pnpm dev                                # all apps (turborepo)
pnpm dev --filter @superchat/web        # Next.js only
pnpm dev --filter @superchat/server     # Fastify only
pnpm build                              # build all
pnpm test                               # vitest
pnpm --filter @superchat/server db:generate   # Drizzle migrations
pnpm --filter @superchat/server db:migrate    # apply migrations
```

## Project Overview

SuperChat — production-grade chat app with AI (@SuperBot), games, and Living Messages. Monorepo: Turborepo + pnpm.

**Stack**: Next.js 15 + Tailwind + shadcn/ui | Fastify + tRPC v11 | Socket.IO + Redis adapter | PostgreSQL (Neon) + Drizzle ORM + pgvector | BullMQ workers | Better Auth | Vercel AI SDK (Gemini/OpenAI/Anthropic) | Zustand + TanStack Query

## Architecture

- `apps/web/` — Next.js frontend (App Router, client components)
- `apps/server/` — Fastify backend (tRPC + Socket.IO + BullMQ)
- `packages/shared/` — Types, Zod validators, constants

**tRPC** = request/response (CRUD, auth, search). **Socket.IO** = real-time (messages, presence, typing, games, living updates).

### Key Patterns

- Socket events defined in `packages/shared/src/types/socket-events.ts` (single source of truth)
- Messages have `type` field + `payload` JSONB for living messages (poll, countdown, etc.)
- AI tools use Vercel AI SDK `tool()` with `inputSchema` (not `parameters` — v6 API)
- Bot messages use `sql\`now() + interval '2 seconds'\`` for ordering after user messages (Neon clock skew)
- Socket rooms: `user:{id}`, `channel:{id}`, `thread:{id}`, `game:{id}`

## Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

## UI Design

- Use the `design-skill` for ALL frontend UI work — it references images in `references/images/` to maintain visual consistency
- Always study reference designs before building new components
- Dark theme first, shadcn/ui base, Tailwind theme tokens only

## Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness
- Use Playwright MCP to verify frontend changes in-browser — don't rely on assumptions
