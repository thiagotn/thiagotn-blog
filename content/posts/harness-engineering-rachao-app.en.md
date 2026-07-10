---
title: "Harness Engineering at rachao.app: Building the Scaffold That Makes AI Predictable"
date: 2026-05-29
tags:
  - rachao.app
  - vibecoding
  - ai
  - harness-engineering
  - claude-code
  - anthropic
---

*Part of the series on the architecture of [rachao.app](https://rachao.app)*

In a [previous post](/posts/rachao-app-vibecoding-en/) I wrote about supervised vibecoding — the practice of delegating code generation to an AI while the engineer retains architectural decisions. But posture without structure doesn't scale. That's where **harness engineering** comes in.

A harness is the set of infrastructure, conventions, and tooling you build *around* the AI to make its output verifiable, constrained, and reliable — regardless of who is operating it. If supervised vibecoding answers "how you behave with the AI," harness answers "what you build so the AI behaves predictably."

rachao.app has six harness layers, implemented throughout the project. Here's each one in detail.

![diagram of the 6 harness layers](/images/harness-engineering-layers.png "harness engineering — the 6 layers")

### Layer 1 — Context harness: the CLAUDE.md files

The most common problem when using AI on any project with a history is context loss between sessions. The model doesn't know which migration was last created, which repositories already exist, or what naming conventions the project follows.

The solution is injecting that context in a structured way at the start of each session. In rachao.app this is done with three CLAUDE.md files:

**CLAUDE.md (root)** — cross-cutting standards: the default page header pattern in the frontend, the mandatory i18n flow, router import patterns, error taxonomy, migration rules, and test structure. It's the contract every contribution must respect.

**football-api/CLAUDE.md** — the current state of the backend. Updated every time a new entity is created. It lists all existing routers, repositories, models, schemas, and services — and, critically, **the next migration number**:

```
The last migration created is 045_drop_api_v2_enabled.sql.
The next one must be numbered 046_.
```

That single line eliminates an entire class of error: the model will never create a 046_ when 045_ already exists, nor accidentally jump to 050_.

**football-frontend/CLAUDE.md** — the frontend equivalent: existing components, implemented routes, Svelte 5 patterns ($effect vs onMount), responsiveness rules.

The combined effect of these three files is that every Claude Code session starts with the actual state of the project — not model assumptions based on training data.

### Layer 2 — Constraint harness: conventions that bound the output

Well-defined constraints are guardrails the model respects without needing to be reminded every session. rachao.app has several.

**Standardized error taxonomy.** The backend defines a fixed set of exceptions:

| Exception | HTTP | When to use |
|-----------|------|-------------|
| `NotFoundError` | 404 | Resource not found |
| `ForbiddenError` | 403 | No permission |
| `ConflictError` | 409 | Uniqueness conflict |
| `PlanLimitError` | 403 | Plan limit reached |
| `ValidationError` | 422 | Business validation |

The model can't invent a ResourceUnavailableError or return a generic 500 — the constraint is documented in CLAUDE.md and reinforced by existing unit tests that serve as examples.

**Mandatory i18n for all visible text.** A simple but powerful rule: no string literals in templates. All text goes through $t('key'). And every new key must appear in all three message files simultaneously:

```
football-frontend/messages/pt-BR.json
football-frontend/messages/en.json
football-frontend/messages/es.json
```

Claude Code respects this because it's in CLAUDE.md and because the existing files establish the pattern to follow. The constraint turns a hard-to-detect problem (hardcoded strings that break internationalization) into something auditable with grep.

**Payment gateway isolation.** Product code never calls the Stripe SDK directly. All payment interactions go through billing.py, with the concrete Stripe implementation isolated in billing_stripe.py. This is a documented architectural constraint — and the model respects it because the pattern is already established in the existing code it sees as reference.

**Sequential migration numbering.** Every migration has a number (NNN_description.sql), and the backend CLAUDE.md always states which comes next. This guarantees idempotency and application order. The model never generates a migration without a number, nor reuses one that already exists.

**Commits are never automatic.** A process constraint: "never commit or push automatically. Implement, report, and wait for user validation." This guarantees no session will push code to production without human review — no matter how confident the model is.

### Layer 3 — Validation harness: test suites as automatic verifiers

Tests are the most direct form of harness: a deterministic verifier that checks whether the AI's output is correct. rachao.app has four validation layers.

**Python unit tests** — run without a database by mocking repositories. This is a direct consequence of the Repository Pattern: because the model follows the convention of separating data access from business logic, each layer is independently testable. The suite runs in seconds:

```bash
docker compose run --rm api poetry run pytest tests/unit/ -q
```

The CLAUDE.md is explicit: "every new endpoint must have at least 1 happy-path test + tests for expected errors. Always run before committing."

**Go unit tests** — the v2 Go API has 237+ unit tests covering authentication, middleware, pure business logic, and the team-drawing algorithm. They run without a database in ~3 seconds:

```bash
cd football-api-go && make test
```

**Go integration tests** — 17+ test files covering complete flows with a real database: auth (signup, login, OTP, password reset), groups, matches, players, finance, votes, ranking, subscriptions. Tests create and destroy their own data through the API — no preloaded fixtures, no shared state between tests. The OTP bypass (123456) works without Twilio configured, solving the external-dependency problem in automated testing.

**Playwright E2E tests** — end-to-end tests that spin up the full Docker stack and exercise the main scenarios through a real browser. They run in CI on every push, before production images are built. No image gets built if E2E breaks.

Codecov tracks coverage for both suites (Python and Go) with badges in the README. It's not just vanity: visible coverage creates pressure to maintain the baseline.

### Layer 4 — Process harness: PRDs as structured briefings

Every feature in rachao.app starts with a PRD (Product Requirements Document) before a single line of code. The index has 48 documents with tracked status:

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented and in production |
| 🚧 | Partially implemented |
| ⏸ | Blocked by external dependency |
| 📋 | Proposed — awaiting decision |
| ❌ | Cancelled |

This is process harness: the PRD replaces "build me a WhatsApp verification feature" with a document that specifies the flow, edge cases, dependencies, acceptance criteria, and blockers. When that document is passed as context to a Claude Code session, the output is dramatically more precise — and easier to review, because you have a document to compare against.

PRD 025-otp-bypass-local.md (✅) documents the OTP_BYPASS_CODE in .env.docker. PRD 026-otp-leitura-automatica-sms.md (⏸) documents exactly why the $effect was reverted — it was interfering with input focus. That level of traceability is hard to maintain without a deliberate process.

### Layer 5 — Tooling harness: tools that automate verification

**/api-compare — a custom Claude Code skill.** With two stacks running in parallel (Python v1 and Go v2), maintaining behavioral parity is a non-trivial problem. The solution was a custom Claude Code skill that, given an endpoint, reads the implementations in both languages and generates a structured gap report:

```
/api-compare /matches/{matchID}/teams
```

Output:

| # | Category | Python v1 | Go v2 | Impact |
|---|----------|-----------|-------|--------|
| 1 | Validation | Checks minimum players before draw | Fails in service with generic error | High |
| 2 | JOIN | INNER JOIN (excludes non-members) | LEFT JOIN (includes with defaults) | Medium |
| 3 | Response | Group nickname in POST | Global nickname only | Medium |
| 4 | 404 | Returns 404 if match doesn't exist | Returns 200 with empty arrays | Medium |

The skill lives at .claude/skills/api-compare/SKILL.md and follows a fixed 6-step process: parse input, locate files, read code, analyze across 6 dimensions (auth, validation, logic, queries, response, errors), generate report, summarize fixes with priority classification.

**sqlc in the Go API.** sqlc compiles type-safe SQL queries into Go — the model can't write a query that returns interface{} where the schema expects a concrete type. Any generated query that doesn't match the schema fails at make generate, before it even reaches the compiler. It's an automated data-quality constraint.

**CI/CD with sequential gates.** The GitHub Actions pipeline is itself a harness:

```
Run workflow (manual)
       │
       ▼
  changes detection     ← skips unnecessary jobs
       │
       ├── unit-tests (Python API)
       ├── mcp-tests
       └── npm-audit (frontend)
       │
       ▼
  e2e (Playwright — full Docker stack)
       │
       ▼
  build (Docker images → GHCR)
       │
       ▼
  deploy (SSH → VPS)
```

No deploy without passing unit tests, E2E, and build. No build without passing tests. The pipeline has no bypass — and that's intentional.

### Layer 6 — Runtime harness: constraints at execution time

**Fixed OTP bypass code.** In any non-production environment, the code 123456 works for OTP without Twilio configured. This eliminates an external dependency from integration tests and local development — and is documented in PRD 025-otp-bypass-local.md.

**RACHAO_MCP_READ_ONLY** — the MCP server exposes 14 tools to Claude, split between read and write. The environment variable RACHAO_MCP_READ_ONLY=true disables all write tools at runtime. It's a security constraint for environments where you want the agent to observe without acting.

**Isolated environments with separate ports.** The Python stack (v1) and the Go stack (v2) use different ports and databases:

| | Python v1 | Go v2 |
|---|-----------|-------|
| API port | 8000 | 8080 |
| Database | football (port 5432) | football_dev (port 5433) |
| Prefix | /api/v1 | /api/v2 |

The isolation prevents tests from one stack from contaminating the other — and allows both to run simultaneously without conflict.

**Production reset script.** scripts/reset_to_production.sql runs inside a single transaction: identifies the oldest super admin, deletes all groups and dependent data via CASCADE, resets sequences. If any step fails, nothing is changed. It's a safety constraint for destructive operations — there's no partial execution.

### What harness doesn't solve

Worth being honest: harness reduces the problem, it doesn't eliminate it.

An outdated CLAUDE.md is worse than none — the model will trust wrong information. Unit tests cover the paths you thought to cover, not the ones you didn't. A poorly specified PRD produces a correct implementation of the wrong problem. And no harness replaces review by someone who understands the system.

Harness is what makes supervision efficient — not what makes it optional.

### Why document this

Because most "building with AI" content shows the generation moment — the prompt, the output — and not the scaffolding that makes that output trustworthy. That scaffolding is real engineering work, and it determines product quality as much as any stack decision.

The code is at [github.com/thiagotn/football-manager](https://github.com/thiagotn/football-manager). The CLAUDE.md files are in the root and each subproject. PRDs are in docs/prd/. The /api-compare skill is documented in docs/API_COMPARISON_SKILL.md.

---

*This post was originally published on [Medium](https://thiagotn.medium.com/harness-engineering-at-rachao-app-building-the-scaffold-that-makes-ai-predictable-ca75fe3ca5f5).*
