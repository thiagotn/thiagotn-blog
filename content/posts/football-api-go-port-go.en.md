---
title: "rachao.app — Learning Go by Porting a Production API: Architecture, Stack and Technical Decisions"
date: 2026-07-09
tags:
  - rachao.app
  - go
  - golang
  - architecture
  - learning
  - port
  - chi
  - sqlc
  - docker
---

In my previous post I told the story of how rachao.app was born — a personal project to organize pickup soccer games among friends, built with supervised vibecoding in ~15 days. The backend ran (and still runs) on Python/FastAPI. Now comes the part that might not be obvious: why port it to Go?

The short answer is simple: **learning**. The long answer is the rest of this post.

## Why learn this way?

There's a fundamental difference between learning a language from a tutorial and learning by porting code that's already in production. In a tutorial, you build a TODO app and edge cases are politely omitted. In the real world, you have actual requirements, business rules that already exist, and the pressure of not breaking anything that works.

rachao.app gave me exactly that: a living specification. Every endpoint, every validation, every flow was already implemented in Python. The Python code became the blueprint — I didn't need to decide *what* to build, only *how* to express the same thing in Go. And that's where the real learning happens: translating decisions you made in one paradigm to a completely different one.

The technical benefits — performance, single binary, static typing, minimal footprint — came as a natural consequence of the choice. They weren't the motivation. If they were, I'd have evaluated Rust, Elixir, or just stayed in Python which already worked. Choosing Go was deliberate: I wanted to learn the language, and I wanted to learn it with something real.

## The stack

The port maintained functional parity with the v1 API. Same database, same auth, same endpoints — only the implementation changed. The table below shows the mapping:

| Layer | v1 (Python) | v2 (Go) |
|---|---|---|
| Router | FastAPI | Chi v5 |
| DB | SQLAlchemy async | pgx/v5 + pgxpool |
| Queries | ORM | sqlc (type-safe, generated from SQL) |
| Auth | JWT HS256 | JWT HS256 (same SECRET_KEY) |
| Streaming | — | SSE for `/chat` |
| Docs | Swagger auto | Mintlify + swaggo |
| Metrics | prometheus-fastapi | prometheus/client_golang |
| Scheduler | APScheduler | robfig/cron/v3 |
| Image | Python slim | scratch (~10MB) |

The Go version exposes ~99 endpoints under `/api/v2`, structurally equivalent to those in `football-api/` (Python) under `/api/v1`. Both versions coexist on the same domain, routed by Traefik:

```
api.rachao.app/api/v2  →  api-go:8080   (Go)
api.rachao.app/api/v1  →  api:8000      (Python)
```

## Project architecture

The project follows the standard Go project layout — `cmd/` for entrypoints, `internal/` for everything that doesn't need to be externally importable:

```
football-api-go/
├── cmd/
│   └── main.go                 # Entrypoint: config, pool, router, scheduler
├── internal/
│   ├── config/                 # Environment variables (envconfig)
│   ├── db/                     # sqlc-generated queries + helpers
│   ├── handlers/               # HTTP handlers (19 domain files)
│   ├── services/               # Business logic (auth, Stripe, storage, etc.)
│   ├── middleware/             # JWT, CORS, rate limit, recovery, Prometheus
│   ├── server/                 # chi.Router assembly
│   └── apierror/               # Typed errors with HTTP status codes
├── tests/
│   ├── unit/                   # No database (nil pool safe)
│   └── integration/            # Real database (auth, groups, matches)
├── sql/queries/                # .sql files read by sqlc
├── mintlify/                   # Documentation (docs.rachao.app)
├── Dockerfile                  # Multi-stage → scratch (~10MB)
├── Makefile
└── sqlc.yaml
```

The request flow is straightforward:

```
Request → Middleware (auth, CORS, metrics, recovery)
       → Handler (parse, validate, call service)
       → Service (business rule)
       → DB (pgxpool → sqlc queries)
       → Response
```

Each layer has clear responsibilities. Handlers don't access the database directly — they always go through a service. Services don't know about HTTP — they receive context and pool, return data or `*APIError`.

### APIError — typed errors

One of the first things I needed to solve: how to represent HTTP errors in a typed way in Go, without Python's exception ergonomics. The solution was a simple type:

```go
type APIError struct {
    Code   int    `json:"-"`
    Detail string `json:"detail"`
}

func BadRequest(msg string) error    { return &APIError{Code: 400, Detail: msg} }
func NotFound(msg string) error      { return &APIError{Code: 404, Detail: msg} }
func Unauthorized() error           { return &APIError{Code: 401, Detail: "not authenticated"} }
func Conflict(msg string) error     { return &APIError{Code: 409, Detail: msg} }
func PlanLimitExceeded() error      { return &APIError{Code: 403, Detail: "PLAN_LIMIT_EXCEEDED"} }
```

Handlers return `error` and a centralized middleware does the type assertion, extracts the status code, and serializes as JSON. Simple, explicit, no magic.

## Technical decisions — what I learned by choosing

### sqlc instead of an ORM

In Python, SQLAlchemy is practically the standard. In Go, the community is split between ORMs (GORM, ent) and approaches closer to raw SQL. I chose **sqlc** — you write real SQL queries in `.sql` files and it generates type-safe Go code from them.

```sql
-- sql/queries/groups.sql
-- name: GetGroup :one
SELECT * FROM groups WHERE id = $1;
```

Generates:

```go
func (q *Queries) GetGroup(ctx context.Context, id uuid.UUID) (Group, error) { ... }
```

The learning here was twofold: understanding real SQL instead of relying on abstractions, and understanding how Go handles code generation (no macros like Rust, no decorators like Python — it's explicit codegen in the build).

### Docker multi-stage → scratch

The final service image is `FROM scratch` — ~10MB with a static binary + CA certificates + timezone data. The Dockerfile has three stages: dev (with air for live-reload), builder (compiles the CGO_ENABLED=0 binary), and production (scratch).

Learning to do this was an interesting exercise: understanding what a minimal image needs to work, where CA certificates live on the filesystem (`/etc/ssl/certs/`), how to embed timezone data (`/usr/share/zoneinfo/`). Things that in Python simply don't exist because the runtime already brings everything.

### Metrics parity

A conscious decision: the Prometheus histogram in Go uses the same name (`http_request_duration_seconds`) and the same labels (`method`, `handler`, `status_code`) as the `prometheus-fastapi-instrumentator` in v1. This means the same Grafana dashboards and alerts cover both versions without any query changes.

```go
var httpRequestDuration = promauto.NewHistogramVec(
    prometheus.HistogramOpts{
        Name:    "http_request_duration_seconds",
        Help:    "HTTP request duration in seconds.",
        Buckets: prometheus.DefBuckets,
    },
    []string{"method", "handler", "status_code"},
)
```

The lesson: observability isn't something you add later — it's something you plan so both versions coexist without fragmenting the dashboard.

### Embedded scheduler

In Python, I used APScheduler. In Go, I used `robfig/cron/v3` embedded in the binary itself. Three jobs:

- **Status sync** — hourly (:30): closes past matches, marks today's as in_progress
- **Recurrence** — daily (07:00): creates next match for groups with recurrence enabled
- **Vote reminder** — every 5 minutes: notifies players who haven't voted yet

The scheduler runs in goroutines, and `main.go` does graceful shutdown with `signal.Notify` and `srv.Shutdown(ctx)`. Learning concurrency in practice — not with artificial examples, but with real jobs running in production.

### Shared database

A pragmatic decision: migrations stay in the Python repo. Go uses the same tables, the same columns. There's no migrator in the Go binary. This means any schema change happens once, in the Python repo, and both versions adapt.

I learned that not every technical decision needs to be "the most architecturally correct" — sometimes the most correct one is the one that reduces operational friction.

### AI chat with SSE

The `/api/v2/chat` endpoint implements streaming via Server-Sent Events. The Anthropic integration is done via direct HTTP — no SDK, no external dependency. The handler reads the stream from the Anthropic API and does incremental flushes with `http.Flusher`.

The assistant's system prompt is extensive: it defines behavior rules, standard flows (Discover → Present → Act), and a complete guide of tools the LLM can use (`list_groups`, `set_attendance`, `list_my_matches`, etc.). Learning SSE in Go — `http.Flusher`, `bufio.Scanner`, context cancellation — was one of the most interesting exercises of the port.

## What changes when you learn by porting real code

The biggest difference between learning from a tutorial and learning by porting production code is the nature of the challenge.

With a tutorial, you decide *what* to build. With a port, you decide *how* to translate decisions you already made. The Python code became the specification: every endpoint, every business rule, every edge case already exists. The challenge isn't architecture — it's expressing the same thing in a language with a different paradigm.

Go has **implicit interfaces** — there's no `implements`, you don't declare that a type satisfies an interface. It has **explicit error handling** — no exceptions, errors are returned values. There's no **inheritance** — composition is the way. There are no **constrained generics** like in Rust — they're more flexible, but less expressive. Each of these differences shows up when you try to port a pattern that was natural in Python and discover that in Go the solution is something else entirely.

And there's real pressure: nothing can break what already works in production. Both versions coexist on the same domain, using the same database. If v2 returns a different response than v1 for the same endpoint, that's a bug — not a detail.

## Dev experience

The development setup is well-polished:

- **`air`** for live-reload — any change to a `.go` file triggers an automatic rebuild
- **`Makefile`** with complete targets: `make test`, `make test-race`, `make test-integration`, `make generate` (sqlc), `make lint`, `make docs` (swaggo), `make coverage`
- **`golangci-lint`** configured with gosec, exhaustive, bodyclose, and other linters
- **Unit tests** without a database (`nil` pool is safe for paths that return before any query — UUID validation, authorization, body parsing)
- **Integration tests** with a real database — they cover end-to-end flows: register → login → group creation → match creation
- **CI on GitHub Actions**: `push → lint → unit-tests → integration-tests → build & push GHCR`

## What changed in operations

In production, the difference is visible:

- **Image**: ~10MB (scratch) vs ~200MB+ (Python slim)
- **Startup**: instant — no interpreter, no import resolution, no GIL
- **Deploy**: same VPS, same Traefik, same database — just a new container routed at `/api/v2`

## Final thoughts

Porting doesn't mean abandoning Python. Both versions coexist and migration is gradual — new endpoints are implemented in Go, old ones are migrated as it makes sense. Python remains the source of truth for schema migrations.

Learning a new language with a real production project is a different — and much richer — exercise than any tutorial. You're not building a TODO app. You're translating real decisions, dealing with real edge cases, under the pressure of not breaking something that already works. That's the kind of learning that sticks.

And the vibecoding continues: Claude Code drove most of the port, with architecture supervision. The model writes; I review, validate, and decide the next steps with technical judgment. The difference is that now, when it suggests something that doesn't seem right, I have enough context to question it — because I already implemented that in Python and I know how it should behave.

If you have a project in production and want to learn a new language: consider porting part of it. It's the best lab you'll ever have.

---

And if you enjoy soccer and are tired of organizing everything on WhatsApp: [rachao.app](https://rachao.app) — try it and send feedback.
