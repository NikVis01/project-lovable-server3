## Roadmap

### Overview
A Bun monorepo for real-time speech transcription and live coaching.
- `apps/server`: Express + Socket.IO + Google Cloud Speech-to-Text + Prisma/Postgres + Anthropic agent
- `apps/web`: Next.js 15 (React 19) client with mic/system-audio capture + Agent feed
- Runtime: Bun; Package manager: Bun workspaces

### Current architecture
- Monorepo
  - `package.json` (workspaces, scripts), `bunfig.toml`, `bun.lock`
- Server (`apps/server`)
  - HTTP:
    - `GET /` health
    - `GET /api/transcripts` (recent)
    - `GET /api/transcripts/:id` (by id)
    - `GET /api/active-sessions` (active)
    - `POST /api/analyze/:sessionId` (agent; reads transcripts from DB and returns a thin, one-of result)
  - WebSocket: manages per-socket live STT session lifecycle
  - Services:
    - `SpeechService` → Google STT streaming (`WEBM_OPUS`, interim results)
    - `TranscriptService` → Prisma CRUD and lifecycle
    - `services/agent/` → single agent via Anthropic SDK with optional web search, returns exactly one of: `web_search` | `coach` | `pain_points`
  - DB (Prisma/Postgres)
    - Model: `TranscriptSession { id, socketId, languageCode, transcriptInput?, transcriptOutput?, status, startedAt, endedAt?, updatedAt }`
  - Infra: `docker-compose.yml` for Postgres
- Web (`apps/web`)
  - Next.js app; Socket.IO client
  - Components: `speech-transcription`, `system-audio-recorder`, `ui/*`, `agent-feed`
  - `AgentFeed` auto-runs every ~20s: resolves latest session → `POST /api/analyze/:sessionId` → renders one-of result
- Env
  - Server: `PORT`, `CORS_ORIGIN`, `DATABASE_URL`, `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_SERVICE_ACCOUNT_KEY`, `ANTHROPIC_API_KEY` (required), `TAVILY_API_KEY` (optional)
  - Web: `NEXT_PUBLIC_SERVER_URL`

### Near-term goals (1–2 sprints)
- Agent (done)
  - Location: `apps/server/src/services/agent/`
  - Orchestrator `index.ts`, runtime `runtime.ts` (Anthropic SDK), schemas `types.ts`, prompt in `prompts/system.xml.ts`
  - Output is thin and selective: exactly one of `web_search` | `coach` | `pain_points`
- Frontend (done)
  - `AgentFeed` component added; non-intrusive, polls every ~20s and displays a minimal feed
- Server route (done)
  - `POST /api/analyze/:sessionId` under `routers/agent.router.ts`
- Safety/perf
  - Analyze on demand (poll) not per-interim; early return when no transcripts; placeholders only when one side is missing

### Mid-term goals (3–6 sprints)
- Optional persistence for agent outputs (history)
  - `AgentInsight { id, sessionId, kind: 'web_search'|'coach'|'pain_points', payload, createdAt }`
- Better audio handling
  - Speaker separation (already tracked via input/output) and diarization options
- Observability
  - Structured logs for agent calls, latency and error tracking
- Deployment
  - Containerize server & web; env-injected secrets; health/readiness probes

### Long-term goals
- Multi-tenant auth, orgs, roles
- CRM integrations (HubSpot/Salesforce) for notes/tasks
- Policy/compliance guardrails for regulated verticals
- Retrieval/caching for domain knowledge

### Milestones
- [x] Agent under `services/agent/` with thin one-of output
- [x] `POST /api/analyze/:sessionId` route mounted
- [x] Web `AgentFeed` showing web_search/coach/pain_points
- [ ] Persist insights (optional)
- [ ] Containerized deploy + basic observability

### Risks & mitigations
- STT/model cost spikes → analyze on a timed cadence; short prompt; skip when transcripts empty
- Latency → selective one-of outputs; avoid heavy tooling unless needed
- Data privacy → avoid storing raw audio; redact PII in logs; scope secrets per env

### Quick commands
- Install: `bun install`
- DB: `bun db:start` → `bun db:push`
- Dev: server `bun run --filter server dev`, web `bun run --filter web dev`
