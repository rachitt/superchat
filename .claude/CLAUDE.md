# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SuperChat is a production-grade chat application with AI features, games, and "Living Messages" (messages that evolve over time). Monorepo managed with Turborepo + pnpm. Target: thousands to millions of users.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui |
| Client State | Zustand + TanStack Query |
| Backend | Fastify + tRPC v11 |
| Real-time | Socket.IO on Fastify with Redis adapter |
| Database | PostgreSQL 16 + Drizzle ORM + pgvector |
| Cache/PubSub | Redis 7 |
| Jobs | BullMQ workers |
| Auth | Better Auth (self-hosted, session-based, works with WebSockets) |
| AI | Vercel AI SDK (OpenAI/Anthropic) |
| Voice AI | ElevenLabs / OpenAI TTS |
| Storage | Cloudflare R2 (S3-compatible, zero egress) |
| Deploy | Vercel (frontend) + Railway/Fly.io (backend) + Neon (Postgres) + Upstash (Redis) |

**Why Fastify + tRPC**: tRPC gives zero-codegen type safety between Next.js and backend. Fastify is 2-3x faster than Express with first-class TypeScript. One language across the entire stack.

## Build & Dev Commands

```bash
pnpm install                  # install all dependencies
pnpm dev                      # run all apps in dev mode (turborepo)
pnpm dev --filter web         # run only the Next.js frontend
pnpm dev --filter server      # run only the Fastify backend
pnpm build                    # build all packages
pnpm lint                     # lint all packages
pnpm test                     # run all tests (vitest)
pnpm test -- --run <file>     # run a single test file
```

### Database

```bash
pnpm --filter server db:generate   # generate Drizzle migrations
pnpm --filter server db:migrate    # apply migrations
pnpm --filter server db:studio     # open Drizzle Studio
```

## System Architecture

```
                    ┌──────────────────────────────┐
                    │         CLIENTS               │
                    │  Next.js (SSR + Client SPA)   │
                    └──────┬───────────┬────────────┘
                           │ HTTPS     │ WSS
                           │ (tRPC)    │ (Socket.IO)
                    ┌──────▼───────────▼────────────┐
                    │      Fastify Server            │
                    │  ┌─────────┐ ┌──────────────┐  │
                    │  │  tRPC   │ │  Socket.IO   │  │
                    │  │ Router  │ │  Handlers    │  │
                    │  └────┬────┘ └──────┬───────┘  │
                    │       │             │          │
                    │  ┌────▼─────────────▼───────┐  │
                    │  │    Service Layer          │  │
                    │  └────┬─────────────┬───────┘  │
                    └───────│─────────────│──────────┘
                            │             │
              ┌─────────────┼─────────────┼──────────────┐
              ▼             ▼             ▼              ▼
         ┌────────┐   ┌────────┐   ┌──────────┐   ┌─────────┐
         │Postgres│   │ Redis  │   │ BullMQ   │   │   R2    │
         │+vector │   │        │   │ Workers  │   │ (media) │
         └────────┘   └────────┘   └──────────┘   └─────────┘
```

### Monorepo Structure

- `apps/web/` — Next.js 15 frontend
- `apps/server/` — Fastify backend (tRPC + Socket.IO + BullMQ workers)
- `packages/shared/` — Shared types, Zod validators, constants (used by both apps)

### Project Structure

```
superchat/
├── turbo.json
├── pnpm-workspace.yaml
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/               # Login, register
│   │   │   ├── (chat)/               # Main chat layout
│   │   │   │   ├── [workspaceSlug]/
│   │   │   │   │   ├── [channelId]/  # Channel view
│   │   │   │   │   └── dm/           # DM view
│   │   │   │   └── games/
│   │   │   └── page.tsx              # Landing page
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui
│   │   │   ├── chat/                 # message-list, message-item, input, thread
│   │   │   ├── living/               # living-message.tsx, poll-widget, countdown, etc.
│   │   │   ├── games/                # lobby, trivia, draw-canvas, cards
│   │   │   ├── gamification/         # xp-bar, achievement-toast, leaderboard
│   │   │   ├── sidebar/              # workspace-sidebar, channel-list, dm-list
│   │   │   └── ai/                   # ai-response, smart-reply-bar
│   │   ├── hooks/                    # use-socket, use-messages, use-presence, use-game
│   │   ├── stores/                   # Zustand stores
│   │   └── lib/                      # trpc client, socket singleton, utils
│   │
│   └── server/                       # Fastify backend
│       └── src/
│           ├── db/schema/            # Drizzle schema definitions
│           ├── trpc/routers/         # auth, users, workspaces, channels, messages, games, ai
│           ├── socket/handlers/      # message, presence, living, game
│           ├── services/             # Business logic layer
│           ├── games/                # Game engine implementations
│           ├── workers/              # BullMQ: ai, living, embedding, gamification, notification
│           └── lib/                  # redis, ai, storage, rate-limit
│
└── packages/
    └── shared/                       # Shared types, Zod validators, constants
        └── src/
            ├── types/                # message.ts, socket-events.ts, game.ts
            ├── validators/           # message.ts, living-payloads.ts, game.ts
            └── constants.ts
```

### Backend Split: tRPC vs Socket.IO

- **tRPC** handles all request/response operations: CRUD, auth, fetching history, search, file uploads
- **Socket.IO** handles all real-time streams: new messages, presence, typing indicators, game state, living message updates

### WebSocket Room Hierarchy

```
user:{userId}            — personal notifications, DM alerts
channel:{channelId}      — channel messages
thread:{messageId}       — thread updates
game:{gameId}            — game state updates
living:{messageId}       — living message subscriptions
presence:{workspaceId}   — online/typing indicators
```

## Database Schema (Key Entities)

```sql
users (id, email, username, display_name, avatar_url, status, bio, xp, level, streak_days, last_active_at, created_at)
workspaces (id, name, slug, icon_url, owner_id, created_at)
workspace_members (workspace_id, user_id, role, joined_at)
channels (id, workspace_id, name, description, type, created_by, created_at)
channel_members (channel_id, user_id, last_read_at)
messages (id, channel_id, author_id, type, content, payload JSONB, payload_version, parent_id, expires_at, is_pinned, edited_at, deleted_at, created_at)
reactions (message_id, user_id, emoji, created_at)
attachments (id, message_id, file_name, file_url, file_type, file_size)
message_embeddings (message_id, embedding VECTOR(1536))
games (id, workspace_id, channel_id, game_type, status, config JSONB, state JSONB, created_by, started_at, finished_at)
game_players (game_id, user_id, score, data JSONB)
achievements (id, name, description, icon, condition JSONB)
user_achievements (user_id, achievement_id, unlocked_at)
notifications (id, user_id, type, data JSONB, read, created_at)
```

**Key indexes**: `messages(channel_id, created_at DESC)`, `messages(parent_id)`, `GIN on messages.payload`, `HNSW on message_embeddings.embedding`

## Living Messages

The key differentiator. Messages aren't static — they're interactive widgets that update in real-time.

**Types**: `poll`, `countdown`, `live_score`, `trivia`, `dynamic_card`, `self_destruct`

**How it works**:
1. Messages have a `type` field and a `payload` JSONB column
2. User interactions (`living:interact` Socket.IO event) update the payload atomically (optimistic locking via `payload_version`)
3. Server broadcasts `message:update` to channel room
4. Frontend `<LivingMessage>` component dynamically loads the right widget
5. Time-based updates (countdowns, live scores) use BullMQ repeatable jobs

**Extensibility**: Adding a new living message type = new widget component + payload Zod validator + optional BullMQ worker.

## Feature Phases

1. **Phase 1 — Core Chat**: Auth, profiles, workspaces, channels, DMs, real-time messaging, threading, reactions, typing/presence, file uploads, infinite scroll
2. **Phase 2 — AI**: @SuperBot assistant, smart replies, summarization, semantic search (pgvector), auto-moderation
3. **Phase 3 — Living Messages**: Poll, countdown, live score, dynamic card, self-destruct widgets
4. **Phase 4 — Games**: Pluggable game engine, trivia, word chain, drawing, cards, XP/levels/badges/leaderboards
5. **Phase 5 — Advanced**: Voice AI, sentiment analysis, webhooks, slash commands, admin dashboard, push notifications

## Socket.IO Events

All Socket.IO event types are defined in `packages/shared/src/types/socket-events.ts` — this is the single source of truth.

## Parallel Development (Git Worktrees)

This project uses multiple Claude instances via git worktrees for parallel feature work. Rules:

1. Phase 1 core is built on `main` first — it's the foundation
2. Each feature branch works in its own directory scope (e.g., `games/` doesn't touch `living/`)
3. Shared types in `packages/shared/` — merge those PRs first to avoid conflicts
4. Database migrations are numbered sequentially — coordinate migration files
5. Feature branches: `feat/ai-assistant`, `feat/living-messages`, `feat/games-engine`, `feat/gamification`, `feat/semantic-search`, `feat/voice-messages`

## Verification

- **Unit tests**: Vitest for services and validators
- **Integration tests**: tRPC procedures against test database
- **E2E tests**: Playwright for critical user flows
- **Load testing**: k6 scripts for WebSocket connections and message throughput
