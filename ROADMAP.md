## Roadmap

### Overview
A Bun monorepo for real-time speech transcription and live coaching.
- `apps/server`: Express + Socket.IO + Google Cloud Speech-to-Text + Prisma/Postgres
- `apps/web`: Next.js 15 (React 19) client with mic/system-audio capture
- Runtime: Bun; Package manager: Bun workspaces

### Current architecture
- Monorepo
  - `package.json` (workspaces, scripts), `bunfig.toml`, `bun.lock`
- Server (`apps/server`)
  - HTTP: `GET /` health, `GET /api/transcripts`, `GET /api/transcripts/:id`, `GET /api/active-sessions`
  - WebSocket: manages per-socket live STT session lifecycle
  - Services:
    - `SpeechService` → Google STT streaming (`WEBM_OPUS`, interim results)
    - `TranscriptService` → Prisma CRUD and lifecycle
  - DB (Prisma/Postgres)
    - Model: `TranscriptSession { id, socketId, languageCode, transcriptInput?, transcriptOutput?, status, startedAt, endedAt?, updatedAt }`
  - Infra: `docker-compose.yml` for Postgres
- Web (`apps/web`)
  - Next.js app; Socket.IO client
  - Components: `speech-transcription`, `system-audio-recorder`, `ui/*`
- Env
  - Server: `PORT`, `CORS_ORIGIN`, `DATABASE_URL`, `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_SERVICE_ACCOUNT_KEY`
  - Web: `NEXT_PUBLIC_SERVER_URL`

### Near-term goals (1–2 sprints)
- Agent service (non-breaking)
  - Location: `apps/server/src/agent/`
    - `index.ts` (orchestrator), `runtime.ts` (Claude init), `types.ts`
    - `prompts/` → XML prompts: `system.xml.ts`, `pain_points.xml.ts`, `coach_sales.xml.ts`
    - `tools/` → `webSearch.ts`, `flagPainPoints.ts`, `coachSalesman.ts`
  - Dependencies: `langchain`, `@langchain/anthropic`, `zod` (optional: `@tavily/core`)
  - Env: `ANTHROPIC_API_KEY` (Claude with built-in web search)
- Keep transcripts separated by speaker
  - New socket channels: `audio-data:client`, `audio-data:salesman`
  - Maintain per-session buffers: `clientTranscript`, `salesmanTranscript`
- Agent outputs
  - New outbound event: `agent:insights`
    - Client chunk → type `pain_points`: `[ { painPoint, category, severity(1–5), confidence(0–1), quote } ]`
    - Salesman chunk → type `coach`: `{ warnings[], suggestions[], doSay[], dontSay[], citations?[] }`
- UI
  - Minimal `AgentPanel` in web app to render insights; subscribe to `agent:insights`
- Safety/perf
  - Run on final chunks; debounce interims; set timeouts/retries; rate limit per session

### Mid-term goals (3–6 sprints)
- Optional persistence (no breaking change)
  - `TranscriptMessage { id, sessionId, speaker, text, isFinal, createdAt }`
  - `AgentInsight { id, sessionId, speaker, type, payload, createdAt }`
- Better audio handling
  - Speaker separation via explicit channels (already) and/or diarization fallback
- Observability
  - Structured logs, request IDs, basic metrics; error reporting
- Deployment
  - Containerize server & web; env-injected secrets; health/readiness probes
- Product
  - Configurable coaching styles; vertical-specific templates; export/share insights

### Long-term goals
- Multi-tenant auth, orgs, roles
- CRM integrations (HubSpot/Salesforce) for notes and tasks
- Policy/compliance guardrails for regulated verticals
- Caching and retrieval augmentation for domain knowledge

### Milestones
- [ ] Agent skeleton under `src/agent/` with XML prompts and tools wired
- [ ] Socket wiring for dual channels and `agent:insights`
- [ ] Web `AgentPanel` displaying pain points and coaching
- [ ] Rate limiting, timeouts, error handling
- [ ] (Optional) Persist messages and insights
- [ ] Containerized deploy with basic observability

### Risks & mitigations
- STT/model cost spikes → analyze only final chunks; cap rate; cache results where possible
- Latency → parallel tool calls; concise prompts; small context windows
- Data privacy → avoid storing raw audio; redact PII in logs; scope secrets per env

### Quick commands
- Install: `bun install`
- DB: `bun db:start` → `bun db:push`
- Dev: server `bun run --filter server dev`, web `bun run --filter web dev`
