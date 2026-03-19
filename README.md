# SuperChat

A production-grade real-time chat application with AI agents, games, living messages, and collaborative features. Built as a deep technical showcase of modern full-stack engineering.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Zustand, TanStack Query |
| **Backend** | Fastify, tRPC v11, Socket.IO, BullMQ workers |
| **AI** | Vercel AI SDK v6, OpenAI/Anthropic/Gemini (multi-provider fallback), pgvector RAG |
| **Database** | PostgreSQL 16 + Drizzle ORM + pgvector (HNSW), Redis 7 |
| **Auth** | Better Auth (session-based, WebSocket-compatible) |
| **Infra** | Docker Compose, OpenTelemetry, Turborepo monorepo |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Clients                        │
│            Next.js (SSR + SPA)                   │
└──────────┬──────────────────┬───────────────────┘
           │ HTTPS (tRPC)     │ WSS (Socket.IO)
┌──────────▼──────────────────▼───────────────────┐
│               Fastify Server                     │
│  ┌──────────┐  ┌─────────────┐  ┌────────────┐  │
│  │  tRPC    │  │  Socket.IO  │  │  Webhooks  │  │
│  │  Router  │  │  Handlers   │  │  Receiver  │  │
│  └────┬─────┘  └──────┬──────┘  └─────┬──────┘  │
│       └────────┬───────┘              │          │
│          Service Layer ◄──────────────┘          │
└──────────┬─────────────────┬────────────────────┘
           │                 │
  ┌────────▼───┐  ┌──────────▼──────┐  ┌─────────┐
  │ PostgreSQL │  │     Redis       │  │   R2    │
  │ + pgvector │  │ Cache / PubSub  │  │ (media) │
  └────────────┘  └───────┬─────────┘  └─────────┘
                          │
                  ┌───────▼─────────┐
                  │  BullMQ Workers │
                  │  (8 queues)     │
                  └─────────────────┘
```

**tRPC** handles request/response (CRUD, auth, search). **Socket.IO** handles real-time (messages, presence, typing, games, living updates). **BullMQ** handles async jobs (embeddings, AI memory, notifications, scheduled messages, game timeouts).

## Features

### Core Chat
- Real-time messaging with threading, reactions, and typing indicators
- File uploads (R2 storage), voice messages with waveform playback
- Message bookmarks, pinned messages panel
- Scheduled messages with BullMQ delayed jobs
- Syntax-highlighted code blocks (shiki) with copy button and language auto-detection
- Full-text + semantic hybrid search with Reciprocal Rank Fusion

### AI (@SuperBot)
- **Multi-step agent** (maxSteps: 5) that chains tools autonomously — search messages, create reminders, generate polls, start games, generate images (DALL-E)
- **Hybrid RAG pipeline**: pgvector semantic search + tsvector keyword search, fused with RRF, optional LLM re-ranking
- **Channel personas**: per-channel AI personality (Professional, Casual, Sarcastic, Mentor, Creative)
- **Streaming responses** with step-by-step progress indicator
- Smart reply suggestions, channel summarization, thread auto-summaries
- Slash commands: `/poll`, `/remind`, `/summarize`, `/translate`, `/weather`, `/whiteboard`
- AI-powered content moderation pipeline
- Per-user conversation memory (auto-extracted facts)

### Games
- Pluggable game engine with 4 games: Trivia, Wordle, Tic-Tac-Toe, Cards
- Real-time multiplayer via Socket.IO rooms
- Turn timeouts via BullMQ delayed jobs

### Living Messages
- Interactive messages that update in real-time: polls, countdowns, self-destruct, dynamic cards, live scores
- **Collaborative whiteboard** (tldraw) embedded in message stream
- Optimistic locking via payload versioning

### Gamification
- XP & leveling system with level badges
- Daily streak tracking
- Workspace leaderboard (XP, messages, streaks, game wins)
- Full emoji picker with reaction animations

### Observability
- OpenTelemetry distributed tracing (opt-in) across tRPC, services, workers, DB
- Prometheus-style metrics (HTTP, WebSocket, BullMQ, AI)
- Health check endpoint with DB/Redis/queue status
- Structured logging with pino (trace ID correlation)
- Workspace analytics dashboard (messages/day, active users, top channels, AI/game stats)

### Integrations
- Incoming webhooks per channel (POST JSON to webhook URL)
- GitHub integration (push, PR, issue, release event formatting)
- Webhook management UI with token rotation

## Project Structure

```
superchat/
├── apps/
│   ├── web/                    # Next.js 16 frontend
│   │   ├── src/app/            # App Router pages
│   │   ├── src/components/     # UI components (chat, games, living, analytics)
│   │   ├── src/hooks/          # Socket, AI, game, theme hooks
│   │   ├── src/stores/         # Zustand stores (8 stores)
│   │   └── src/lib/            # tRPC client, socket, auth, utils
│   └── server/                 # Fastify backend
│       ├── src/db/schema/      # Drizzle ORM schemas
│       ├── src/trpc/routers/   # 14 tRPC routers
│       ├── src/socket/handlers/# Socket.IO event handlers
│       ├── src/services/       # Business logic (AI, XP, search, etc.)
│       ├── src/workers/        # BullMQ processors (8 queues)
│       └── src/lib/            # Redis, AI providers, telemetry, rate limiting
├── packages/
│   └── shared/                 # Types, Zod validators, constants
├── docker-compose.yml          # PostgreSQL + Redis + Server + Worker
└── turbo.json                  # Turborepo configuration
```

## Getting Started

### Prerequisites
- Node.js 22+
- pnpm 9+
- PostgreSQL 16 with pgvector extension
- Redis 7

### Development

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env.local

# Run database migrations
pnpm --filter @superchat/server db:migrate

# Start all apps (Turborepo)
pnpm dev
```

### Docker

```bash
# Copy and configure environment
cp .env.example .env

# Start everything
docker compose up --build
```

### Testing

```bash
# Run all tests
pnpm test

# Run server tests only
pnpm --filter @superchat/server test

# Run shared package tests only
pnpm --filter @superchat/shared test
```

## Key Technical Decisions

- **tRPC over REST/GraphQL**: Zero-codegen type safety across the full stack. Types flow from Drizzle schema to tRPC router to React Query hooks without a build step.
- **Socket.IO over raw WebSockets**: Redis adapter for horizontal scaling, room-based broadcasting, automatic reconnection, and structured event typing via shared types.
- **pgvector over Pinecone/Weaviate**: Keeps the vector store in PostgreSQL alongside relational data. HNSW index for fast similarity search. No external vector DB to manage.
- **BullMQ over cron/setTimeout**: Redis-backed job queue with delayed jobs, retries, repeatable schedules, and dead-letter handling. Used for AI embeddings, scheduled messages, game timeouts, and notification delivery.
- **Vercel AI SDK over raw API calls**: Multi-provider streaming with automatic tool use loops, structured output generation, and maxSteps-based agent orchestration.
- **Drizzle over Prisma**: Lighter, faster, SQL-like query builder with zero runtime overhead. Direct control over migrations and schema.

## License

MIT
