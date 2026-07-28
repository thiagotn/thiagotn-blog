---
title: "MCP in production at rachao.app: exposing the pickup-football API to AI agents"
date: 2026-07-27
tags:
  - rachao.app
  - mcp
  - ai
  - claude
  - python
  - fastmcp
---

*Part of the series on the architecture of [rachao.app](https://rachao.app)*

When the [Model Context Protocol](https://modelcontextprotocol.io) was announced by Anthropic in late 2024, the idea sounded almost too simple: a standardized protocol for AI agents to talk to external tools. USB-C for LLM-to-API integration, in the analogy that has already become a cliché. What intrigued me was a more practical question: **what does it look like when you actually run this for real, in production, in a real app with real users?**

rachao.app already had a mature REST API (FastAPI + PostgreSQL, with JWT, plans, Stripe — the full package). Adding an MCP server seemed like the perfect experiment to understand the technology end to end: not a toy example with two demo functions, but a real server exposing 14 operations over groups, matches, players and teams — with authentication, guardrails, tests and automated deployment.

The result is `football-mcp`, an MCP server running in production at `mcp.rachao.app` that lets agents like Claude interact with rachao.app naturally. (A "rachão", by the way, is Brazilian slang for a casual pickup football game — the thing the app manages.) This post is a walkthrough of the architecture, the design decisions, and how to use it in practice.

---

## What MCP is (in 30 seconds)

The Model Context Protocol is an open protocol that standardizes communication between applications (MCP clients) and servers that expose tools, resources and prompts. Instead of every AI having proprietary integrations with every API in the world, MCP defines a common format: the server exposes *tools* (functions with a JSON schema), and the client (Claude, Cursor, etc.) discovers and invokes those tools automatically when it needs them.

The USB-C analogy is no accident. MCP is not an AI — it's the connector.

---

## Architecture

The rachao.app MCP server is an independent Python service that lives in the same repository as the app (`football-mcp/`), but with its own Dockerfile, dependencies and test pipeline. It does not touch the database directly — **all access goes through the REST API**, via `httpx`. That was a deliberate decision: the MCP server is just another client layer on top of the API, not a backdoor into the database.

```
AI agent (Claude, Cursor, etc.)
    │ MCP (stdio or HTTP/SSE)
    ▼
MCP server (FastMCP + Python)       mcp.rachao.app
    │ HTTP/REST with Bearer JWT
    ▼
rachao.app API (FastAPI)             api.rachao.app
    │
    ▼
PostgreSQL (Supabase)
```

### Module structure

```
football-mcp/
├── rachao_mcp/
│   ├── __main__.py      # entry point
│   ├── server.py        # builds the FastMCP app, registers tools
│   ├── client.py        # HTTP client for the API (httpx)
│   ├── auth.py          # token resolution (env var or ContextVar)
│   ├── middleware.py     # BearerTokenMiddleware (multi-tenant HTTP mode)
│   └── tools/
│       ├── groups.py     # group tools
│       ├── matches.py    # match tools
│       ├── players.py    # player tools
│       └── teams.py      # team tools
├── tests/
│   ├── conftest.py
│   ├── test_auth.py
│   ├── test_client.py
│   ├── test_guardrails.py
│   ├── test_middleware.py
│   └── tools/
│       ├── test_groups.py
│       ├── test_matches.py
│       ├── test_players.py
│       └── test_teams.py
├── Dockerfile
├── Makefile
└── pyproject.toml
```

### The two transport modes

MCP supports two main transports, and the rachao.app server implements both:

**stdio (local, single-tenant):** the agent (the Claude CLI, for example) starts the server as a subprocess and communicates over stdin/stdout. The JWT is injected through an environment variable (`RACHAO_TOKEN`). This is the mode you use locally, on your own machine, with your own token.

**HTTP/SSE (remote, multi-tenant):** the server runs as an ASGI app under `uvicorn`, behind Traefik, at `mcp.rachao.app`. Each request carries its own `Authorization: Bearer <jwt>` — there is no shared token. A middleware extracts the token and injects it into a per-request `ContextVar`. This is the mode that runs in production.

```python
# server.py — transport selection
def main() -> None:
    transport = os.getenv("MCP_TRANSPORT", "stdio")

    if transport in ("sse", "http"):
        mcp = _build_mcp_server()
        raw_app = mcp.streamable_http_app() if transport == "http" else mcp.sse_app()
        app = BearerTokenMiddleware(raw_app)
        uvicorn.run(app, host=host, port=port)
    else:
        mcp = create_server()
        mcp.run()
```

The beauty of FastMCP's design (the reference library in the Python SDK) is that the *tools* are the same regardless of transport. The same `list_groups()` that runs over stdio on your machine runs over HTTP/SSE in production. The only difference is how the token arrives.

---

## Auth: two paths, one ContextVar

The most interesting detail of the auth architecture is how the same server resolves the token in two completely different modes:

In **stdio** mode, the token is an environment variable (`RACHAO_TOKEN`). Simple: one server, one user.

In **HTTP/SSE** mode, each request carries its own Bearer token. The `BearerTokenMiddleware` extracts the token from the `Authorization` header, injects it into a `ContextVar`, and resets it at the end of the request. That guarantees isolation between concurrent requests — each one sees only its own token.

```python
# auth.py
_request_token: ContextVar[str | None] = ContextVar("request_token", default=None)

def get_token() -> str:
    token = _request_token.get()         # priority: the request's token
    if token:
        return token
    token = os.getenv("RACHAO_TOKEN")    # fallback: env var (stdio)
    if not token:
        raise RuntimeError("RACHAO_TOKEN não definido")
    return token
```

The `ContextVar` is the mechanism that makes multi-tenant possible without shared state. Each request has its own context, and `get_token()` resolves the right source transparently for the tools.

---

## The 14 tools

The server exposes 14 tools organized into 4 domains. Read tools are always registered; write tools only show up when the server is not in read-only mode.

### Groups

| Tool | Type | Description |
|------|------|-------------|
| `list_groups` | read | Lists all groups of the authenticated player |
| `get_group` | read | Group details: members, stats and team slots |
| `get_group_stats` | read | Top scorers, assists and attendance per player |

### Matches

| Tool | Type | Description |
|------|------|-------------|
| `list_my_matches` | read | The user's matches across all groups, sorted by date |
| `list_matches` | read | Matches of a specific group |
| `get_match` | read | Details of a match by its public hash |
| `discover_matches` | read | Open public matches across the platform |
| `create_match` | write | Creates a new match |
| `update_match` | write | Updates a match's data |
| `set_attendance` | write | Confirms or declines attendance |

### Players

| Tool | Type | Description |
|------|------|-------------|
| `list_players` | read | Members of a group |
| `get_my_stats` | read | Full personal statistics |
| `get_ranking` | read | Platform-wide ranking |

### Teams

| Tool | Type | Description |
|------|------|-------------|
| `get_teams` | read | Teams already drawn for a match |
| `draw_teams` | write | Draws balanced teams |

One detail worth highlighting: `list_my_matches` is an *aggregator* tool. It fetches all of the user's groups and then each group's matches in parallel (`asyncio.gather`), returning a single list sorted by date. This is the kind of composition that makes sense at the MCP level — the agent doesn't need to know which match belongs to which group; it just wants "my upcoming matches".

```python
async def list_my_matches() -> list[dict]:
    """Lista todos os rachões do usuário em todos os seus grupos."""
    groups = await api.get("/groups")
    if not groups:
        return []
    results = await asyncio.gather(
        *[api.get(f"/groups/{g['id']}/matches") for g in groups],
        return_exceptions=True,
    )
    out = []
    for group, group_matches in zip(groups, results):
        if isinstance(group_matches, Exception):
            continue
        for match in group_matches:
            out.append({**match, "group_name": group.get("name", ""), "group_id": group["id"]})
    out.sort(key=lambda m: (m.get("match_date", ""), m.get("start_time", "")))
    return out
```

---

## Guardrails

When you expose write operations to an AI agent, the first question that comes up is: **what if the agent does something it shouldn't?** The server has four layers of protection.

### 1. Read-only mode

With `RACHAO_MCP_READ_ONLY=true`, no write tool is registered. The agent can list, query and view stats, but cannot create matches, change attendance or draw teams. Useful for demo environments or when you only want to expose data.

```python
read_only = os.getenv("RACHAO_MCP_READ_ONLY", "false").lower() == "true"

if not read_only:
    register(matches.WRITE_TOOLS)
    register(teams.WRITE_TOOLS)
```

### 2. Allowed tools (explicit allowlist)

With `RACHAO_MCP_ALLOWED_TOOLS=list_groups,list_matches`, only the listed tools are registered. It's granular: you can allow `list_matches` without allowing `create_match`, or allow everything except `draw_teams`.

### 3. Group allowlist

The `RachaoClient` has a protection layer that restricts which groups the server can access, via `RACHAO_MCP_GROUP_ALLOWLIST`. When configured, any path containing `/groups/{id}/` is validated against the allowlist before the request goes out.

```python
group_allowlist_raw = os.getenv("RACHAO_MCP_GROUP_ALLOWLIST", "")
group_allowlist = set(group_allowlist_raw.split(",")) if group_allowlist_raw else None

if group_allowlist and "/groups/" in path:
    gid = path.split("/groups/")[1].split("/")[0]
    if gid not in group_allowlist:
        raise PermissionError(f"Grupo {gid} não está na allowlist do MCP")
```

This is useful when you want to expose a single specific group to an external agent without granting access to the rest of the data.

### 4. Transport security (allowed hosts)

FastMCP supports `TransportSecuritySettings`, which validates the `Host` header of incoming requests against a list of allowed hosts. Configured via `MCP_ALLOWED_HOSTS`, it prevents DNS rebinding attacks in HTTP mode.

---

## Tests

An MCP server in production needs tests. `football-mcp` has coverage on four fronts:

| Suite | What it covers |
|-------|----------------|
| `test_auth.py` | Token resolution: env var, ContextVar, fallback, error when missing |
| `test_client.py` | HTTP client: headers, parsing, errors (401, 404, 503, ConnectError) |
| `test_guardrails.py` | Read-only mode, allowed tools, group allowlist |
| `test_middleware.py` | BearerTokenMiddleware: ContextVar set/reset, pass-through |
| `test_groups/matches/players/teams` | Each tool: mocking the API with `respx`, verifying bodies and responses |

The tests use `respx` to mock the HTTP API responses, so they run without a database and without a real server — fast and deterministic. The `conftest.py` sets up the test environment with a dummy token and clears the guardrail env vars between tests.

---

## Production deployment

The MCP server is deployed as a separate Docker container on the same VPS as rachao.app. The CI/CD pipeline (GitHub Actions) has a dedicated job (`mcp-tests`) that runs the test suite before the build:

```
GitHub Actions pipeline
    │
    ├─ Job: mcp-tests        (pytest on football-mcp/)
    │
    ├─ Job: build
    │   └─ Build & push MCP image → ghcr.io/thiagotn/football-manager-mcp:latest
    │
    └─ Job: deploy
        └─ docker compose pull → up -d
```

In production, Traefik routes `mcp.rachao.app` to the MCP container on port 8080, with automatic TLS via Let's Encrypt. The `MCP_RACHAO_TOKEN` and `MCP_SECRET_KEY` variables are GitHub Secrets injected at deploy time.

| Service | URL |
|---------|-----|
| App | https://rachao.app |
| API | https://api.rachao.app |
| MCP | https://mcp.rachao.app |

---

## Use cases

This is where theory meets practice. These are real situations where having rachao.app exposed over MCP changes the experience.

### 1. "What's the status of today's game?"

You open Claude and ask: *"Do I have a game today?"*

The agent invokes `list_my_matches`, which fetches all your groups and their matches in parallel, filters today's, and answers — with venue, time and attendance status. No opening the app, no navigating menus.

### 2. Confirming attendance in natural language

*"Mark me as confirmed for Thursday's game."*

The agent finds the match (via `list_my_matches`), identifies the `group_id` and `match_id`, and invokes `set_attendance` with `status: "confirmed"`. The `player_id` is resolved automatically from the token — you don't even need to know your ID in the system.

### 3. Creating and managing matches

*"Create a game Friday at 8pm at Campo do Zé, with the note 'bring bibs'."*

The agent calls `list_groups` to find the group, then `create_match` with the structured parameters. The tool validates the format (`match_date` as YYYY-MM-DD, `start_time` as HH:MM) and returns the created match.

### 4. Drawing teams

*"Draw the teams for the last game."*

The agent finds the match, invokes `draw_teams`, and the server performs the balanced draw through the API. The agent receives the drawn teams and can present the result nicely formatted.

### 5. Checking rankings and statistics

*"Who's the group's top scorer this month?"*

`get_ranking` returns the overall ranking. `get_group_stats` brings top scorers, assists and attendance per group. `get_my_stats` brings your full personal statistics.

### 6. Discovering open matches

*"Any open game I can join this week?"*

`discover_matches` lists all public matches available on the platform — not just from your groups, but from any group with open matches.

---

## How to use it

### Local (Claude CLI)

If you use the Claude Code CLI and have a rachao.app account:

```bash
cd football-mcp

# 1. Install
make install   # or: uv pip install -e ".[dev]"

# 2. Register with Claude
make register RACHAO_TOKEN=your_jwt_here

# 3. Verify
make list
```

Or manually:

```bash
claude mcp add rachao \
  -e RACHAO_TOKEN="your_jwt_here" \
  -e RACHAO_API_URL="https://api.rachao.app/api/v1" \
  -- /path/to/football-mcp/.venv/bin/python -m rachao_mcp
```

From that moment on, Claude has access to all of rachao.app's data and actions right in the conversation.

### Remote (HTTP/SSE)

To connect an MCP client that supports remote servers, the URL is:

```
https://mcp.rachao.app
```

Authentication via Bearer token (the JWT obtained when logging into rachao.app).

### Read-only mode

If you only want to query data with no risk of writes:

```bash
RACHAO_MCP_READ_ONLY=true make dev RACHAO_TOKEN=your_jwt
```

---

## What I learned

Building an MCP server end to end teaches a few things that aren't obvious from reading the spec.

**The protocol is the easy part.** FastMCP abstracts everything: you write async Python functions, decorate them with `server.tool()`, and you're done. The SDK handles the JSON-RPC, the schema, the discovery. The hard part is everything that comes after: multi-tenant authentication, guardrails, tests, deployment.

**Multi-tenant is the real-world case.** Every MCP tutorial uses stdio mode with an env var. In production, with multiple users, the token has to come per request. The `ContextVar` + ASGI middleware pattern solves this elegantly, but it's not something the MCP documentation covers.

**Guardrails matter from day one.** When you give an agent the ability to create matches and draw teams, you need read-only mode, allowlists and tool filtering designed in from the start — not as a retrofit.

**MCP tests are integration tests.** The server has no business logic — it's a proxy over the API. So the tests mock the API (`respx`) and verify that the server translates correctly: that the headers are right, that the POST body is correct, that errors map to the right exceptions.

---

MCP is still early in its adoption curve. Most servers out there today are demos or showcase examples. Having one running in production, with 14 tools, tests and guardrails, was the way I found to truly understand the technology — not as a spec reader, but as someone who deployed it, debugged it and wrote tests for it.

If you want to see the full code, it's in the [rachao.app repository](https://github.com/thiagotn/football-manager/tree/main/football-mcp) on GitHub. And if you have an MCP-compatible agent, you can connect to `mcp.rachao.app` and try it out.

The question that remains is: how many apps need a REST API *and* an MCP server? Today it feels redundant. But if MCP becomes the de facto standard for AI integration, having the layer ready is the difference between "it already works" and "we need to build that".
