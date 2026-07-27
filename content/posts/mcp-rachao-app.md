---
title: "MCP em produção no rachao.app: expondo a API do rachão para agentes de IA"
date: 2026-07-27
tags:
  - rachao.app
  - mcp
  - ia
  - claude
  - python
  - fastmcp
---

*Parte da série sobre a arquitetura do [rachao.app](https://rachao.app)*

Quando o [Model Context Protocol](https://modelcontextprotocol.io) foi anunciado pela Anthropic no final de 2024, a ideia parecia simples até demais: um protocolo padronizado para que agentes de IA conversem com ferramentas externas. USB-C para a integração entre LLMs e APIs, na analogia que já virou clichê. Mas o que me intrigou foi uma pergunta mais prática: **como fica quando você bota isso pra rodar de verdade, em produção, num app real com usuários reais?**

O rachao.app já tinha uma API REST madura (FastAPI + PostgreSQL, com JWT, planos, Stripe — o pacote completo). Adicionar um servidor MCP parecia o experimento perfeito pra entender a tecnologia ponta a ponta: não um toy example com duas funções de demonstração, mas um servidor real que expõe 14 operações sobre grupos, partidas, jogadores e times — com autenticação, guardrails, testes e deploy automatizado.

O resultado é o `football-mcp`, um servidor MCP que roda em produção em `mcp.rachao.app` e permite que agentes como o Claude interajam com o rachao.app de forma natural. Este post é um walkthrough da arquitetura, decisões de design, e como usar na prática.

---

## O que é o MCP (em 30 segundos)

O Model Context Protocol é um protocolo aberto que padroniza a comunicação entre aplicações (clientes MCP) e servidores que expõem ferramentas, recursos e prompts. Em vez de cada IA ter integrações proprietárias com cada API do mundo, o MCP define um formato comum: o servidor expõe *tools* (funções com schema JSON), e o cliente (Claude, Cursor, etc.) descobre e invoca essas tools automaticamente quando precisa.

A analogia com USB-C não é à toa. O MCP não é uma IA — é o conector.

---

## Arquitetura

O servidor MCP do rachao.app é um serviço Python independente que vive no mesmo repositório do app (`football-mcp/`), mas com seu próprio Dockerfile, dependências e pipeline de testes. Ele não acessa o banco diretamente — **todo acesso à API passa pela API REST**, via `httpx`. Isso foi uma decisão deliberada: o MCP é mais uma camada de cliente sobre a API, não um backdoor pro banco.

```
Agente de IA (Claude, Cursor, etc.)
    │ MCP (stdio ou HTTP/SSE)
    ▼
Servidor MCP (FastMCP + Python)     mcp.rachao.app
    │ HTTP/REST com Bearer JWT
    ▼
API rachao.app (FastAPI)             api.rachao.app
    │
    ▼
PostgreSQL (Supabase)
```

### Estrutura do módulo

```
football-mcp/
├── rachao_mcp/
│   ├── __main__.py      # entry point
│   ├── server.py        # monta o FastMCP, registra tools
│   ├── client.py        # cliente HTTP da API (httpx)
│   ├── auth.py          # resolution do token (env var ou ContextVar)
│   ├── middleware.py     # BearerTokenMiddleware (modo HTTP multi-tenant)
│   └── tools/
│       ├── groups.py     # tools de grupos
│       ├── matches.py    # tools de partidas
│       ├── players.py    # tools de jogadores
│       └── teams.py      # tools de times
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

### Os dois modos de transporte

O MCP suporta dois transportes principais, e o servidor do rachao.app implementa ambos:

**stdio (local, single-tenant):** o agente (Claude CLI, por exemplo) inicia o servidor como subprocesso e comunica via stdin/stdout. O token JWT é injetado via variável de ambiente (`RACHAO_TOKEN`). É o modo que você usa localmente, na sua máquina, com seu próprio token.

**HTTP/SSE (remoto, multi-tenant):** o servidor sobe como um app ASGI com `uvicorn`, atrás de Traefik, em `mcp.rachao.app`. Cada requisição traz seu próprio `Authorization: Bearer <jwt>` — não há token compartilhado. Um middleware extrai o token e o injeta num `ContextVar` por requisição. É o modo que roda em produção.

```python
# server.py — seleção de transporte
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

A beleza do design do FastMCP (a biblioteca de referência do SDK Python) é que as *tools* são as mesmas independente do transporte. O mesmo `list_groups()` que roda via stdio na sua máquina roda via HTTP/SSE em produção. A única diferença é como o token chega.

---

## Auth: dois caminhos, um ContextVar

O detalhe mais interessante da arquitetura de auth é como o mesmo servidor resolve o token em dois modos completamente diferentes:

No modo **stdio**, o token é uma variável de ambiente (`RACHAO_TOKEN`). Simples: um servidor, um usuário.

No modo **HTTP/SSE**, cada requisição traz seu próprio Bearer token. O `BearerTokenMiddleware` extrai o token do header `Authorization`, injeta num `ContextVar`, e o reseta ao final da requisição. Isso garante isolamento entre requisições concorrentes — cada uma vê apenas o seu token.

```python
# auth.py
_request_token: ContextVar[str | None] = ContextVar("request_token", default=None)

def get_token() -> str:
    token = _request_token.get()         # prioridade: token da requisição
    if token:
        return token
    token = os.getenv("RACHAO_TOKEN")    # fallback: env var (stdio)
    if not token:
        raise RuntimeError("RACHAO_TOKEN não definido")
    return token
```

O `ContextVar` é o mecanismo que torna o multi-tenant possível sem estado compartilhado. Cada requisição tem seu próprio contexto, e o `get_token()` resolve a fonte certa de forma transparente para as tools.

---

## As 14 tools

O servidor expõe 14 tools organizadas em 4 domínios. As tools de leitura são sempre registradas; as de escrita só aparecem se o modo não for read-only.

### Grupos

| Tool | Tipo | Descrição |
|------|------|-----------|
| `list_groups` | read | Lista todos os grupos do jogador autenticado |
| `get_group` | read | Detalhes de um grupo: membros, stats e slots de times |
| `get_group_stats` | read | Artilheiros, assistências e presença por jogador |

### Partidas

| Tool | Tipo | Descrição |
|------|------|-----------|
| `list_my_matches` | read | Partidas do usuário em todos os grupos, ordenadas por data |
| `list_matches` | read | Partidas de um grupo específico |
| `get_match` | read | Detalhe de uma partida pelo hash público |
| `discover_matches` | read | Partidas públicas abertas na plataforma |
| `create_match` | write | Cria uma nova partida |
| `update_match` | write | Atualiza dados de uma partida |
| `set_attendance` | write | Confirma ou recusa presença |

### Jogadores

| Tool | Tipo | Descrição |
|------|------|-----------|
| `list_players` | read | Membros de um grupo |
| `get_my_stats` | read | Estatísticas pessoais completas |
| `get_ranking` | read | Ranking geral da plataforma |

### Times

| Tool | Tipo | Descrição |
|------|------|-----------|
| `get_teams` | read | Times já sorteados de uma partida |
| `draw_teams` | write | Sorteia times equilibrados |

Um detalhe que vale destacar: `list_my_matches` é uma tool *agregadora*. Ela busca todos os grupos do usuário e depois as partidas de cada grupo em paralelo (`asyncio.gather`), devolvendo uma lista única ordenada por data. Isso é o tipo de composição que faz sentido no nível do MCP — o agente não precisa saber que partidas estão em qual grupo; ele só quer "minhas próximas partidas".

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

Quando você expõe operações de escrita para um agente de IA, a primeira pergunta que aparece é: **e se o agente fizer algo que não deveria?** O servidor tem quatro camadas de proteção.

### 1. Read-only mode

Com `RACHAO_MCP_READ_ONLY=true`, nenhuma tool de escrita é registrada. O agente pode listar, consultar e ver stats, mas não pode criar partidas, alterar presença ou sortear times. Útil para ambientes de demonstração ou quando você quer apenas expor dados.

```python
read_only = os.getenv("RACHAO_MCP_READ_ONLY", "false").lower() == "true"

if not read_only:
    register(matches.WRITE_TOOLS)
    register(teams.WRITE_TOOLS)
```

### 2. Allowed tools (allowlist explícita)

Com `RACHAO_MCP_ALLOWED_TOOLS=list_groups,list_matches`, apenas as tools listadas são registradas. É granular: você pode permitir `list_matches` sem permitir `create_match`, ou permitir tudo exceto `draw_teams`.

### 3. Group allowlist

O `RachaoClient` tem uma camada de proteção que restringe quais grupos o servidor pode acessar, via `RACHAO_MCP_GROUP_ALLOWLIST`. Se configurada, qualquer path que contenha `/groups/{id}/` é validado contra a allowlist antes da requisição sair.

```python
group_allowlist_raw = os.getenv("RACHAO_MCP_GROUP_ALLOWLIST", "")
group_allowlist = set(group_allowlist_raw.split(",")) if group_allowlist_raw else None

if group_allowlist and "/groups/" in path:
    gid = path.split("/groups/")[1].split("/")[0]
    if gid not in group_allowlist:
        raise PermissionError(f"Grupo {gid} não está na allowlist do MCP")
```

Isso é útil quando você quer expor apenas um grupo específico para um agente externo, sem dar acesso ao resto dos dados.

### 4. Transport security (allowed hosts)

O FastMCP suporta `TransportSecuritySettings`, que valida o header `Host` das requisições contra uma lista de hosts permitidos. Configurado via `MCP_ALLOWED_HOSTS`, previne DNS rebinding attacks no modo HTTP.

---

## Testes

Um servidor MCP em produção precisa de testes. O `football-mcp` tem cobertura em quatro frentes:

| Suíte | O que cobre |
|-------|-------------|
| `test_auth.py` | Resolution de token: env var, ContextVar, fallback, erro quando ausente |
| `test_client.py` | Cliente HTTP: headers, parsing, erros (401, 404, 503, ConnectError) |
| `test_guardrails.py` | Read-only mode, allowed tools, group allowlist |
| `test_middleware.py` | BearerTokenMiddleware: set/reset do ContextVar, pass-through |
| `test_groups/matches/players/teams` | Cada tool: mockando a API com `respx`, verificando body e responses |

Os testes usam `respx` para mockar as respostas da API HTTP, então rodam sem banco de dados e sem servidor real — rápidos e determinísticos. O `conftest.py` configura o ambiente de teste com um token dummy e limpa as env vars de guardrails entre cada teste.

---

## Deploy em produção

O servidor MCP é deployado como um container Docker separado, no mesmo VPS do rachao.app. O pipeline de CI/CD (GitHub Actions) tem um job dedicado (`mcp-tests`) que roda a suite de testes antes do build:

```
GitHub Actions pipeline
    │
    ├─ Job: mcp-tests        (pytest no football-mcp/)
    │
    ├─ Job: build
    │   └─ Build & push MCP image → ghcr.io/thiagotn/football-manager-mcp:latest
    │
    └─ Job: deploy
        └─ docker compose pull → up -d
```

Em produção, o Traefik roteia `mcp.rachao.app` para o container do MCP na porta 8080, com TLS automático via Let's Encrypt. As variáveis `MCP_RACHAO_TOKEN` e `MCP_SECRET_KEY` são GitHub Secrets injetados no deploy.

| Serviço | URL |
|---------|-----|
| App | https://rachao.app |
| API | https://api.rachao.app |
| MCP | https://mcp.rachao.app |

---

## Casos de uso

Aqui é onde a teoria vira prática. Estas são situações reais onde ter o rachao.app exposto via MCP muda a experiência.

### 1. "Qual o status do rachão de hoje?"

Você abre o Claude e pergunta: *"Tenho rachão hoje?"*

O agente invoca `list_my_matches`, que busca todos os seus grupos e suas partidas em paralelo, filtra as de hoje, e te responde — com local, horário e status das confirmações. Sem abrir o app, sem navegar menus.

### 2. Confirmar presença por linguagem natural

*"Bota eu como confirmado no rachão de quinta."*

O agente encontra a partida (via `list_my_matches`), identifica o `group_id` e `match_id`, e invoca `set_attendance` com `status: "confirmed"`. O `player_id` é resolto automaticamente a partir do token — você não precisa saber nem qual é o seu ID no sistema.

### 3. Criar e gerenciar partidas

*"Cria um rachão sexta às 20h no Campo do Zé, com a observação 'levar colete'."*

O agente chama `list_groups` para descobrir o grupo, depois `create_match` com os parâmetros estruturados. A tool valida o formato (`match_date` como YYYY-MM-DD, `start_time` como HH:MM) e retorna o match criado.

### 4. Sortear times

*"Sorteia os times do último rachão."*

O agente encontra a partida, invoca `draw_teams`, e o servidor faz o sorteio equilibrado na API. O agente recebe os times sorteados e pode te apresentar o resultado formatado.

### 5. Consultar ranking e estatísticas

*"Quem é o artilheiro do grupo esse mês?"*

`get_ranking` retorna o ranking geral. `get_group_stats` traz artilheiros, assistências e presença por grupo. `get_my_stats` traz suas estatísticas pessoais completas.

### 6. Descobrir partidas abertas

*"Tem rachão aberto pra eu entrar essa semana?"*

`discover_matches` lista todas as partidas públicas disponíveis na plataforma — não só dos seus grupos, mas de qualquer grupo com partidas abertas.

---

## Como usar

### Local (Claude CLI)

Se você usa o Claude Code CLI e tem uma conta no rachao.app:

```bash
cd football-mcp

# 1. Instalar
make install   # ou: uv pip install -e ".[dev]"

# 2. Registrar no Claude
make register RACHAO_TOKEN=seu_jwt_aqui

# 3. Verificar
make list
```

Ou manualmente:

```bash
claude mcp add rachao \
  -e RACHAO_TOKEN="seu_jwt_aqui" \
  -e RACHAO_API_URL="https://api.rachao.app/api/v1" \
  -- /caminho/football-mcp/.venv/bin/python -m rachao_mcp
```

A partir desse momento, o Claude tem acesso a todos os dados e ações do rachao.app diretamente na conversa.

### Remoto (HTTP/SSE)

Para conectar um cliente MCP que suporta servidores remotos, a URL é:

```
https://mcp.rachao.app
```

Autenticação via Bearer token (JWT obtido no login do rachao.app).

### Modo read-only

Se você quer apenas consultar dados sem risco de escrita:

```bash
RACHAO_MCP_READ_ONLY=true make dev RACHAO_TOKEN=seu_jwt
```

---

## O que aprendi

Construir um servidor MCP ponta a ponta ensina algumas coisas que não ficam óbvias lendo a spec.

**O protocolo é a parte fácil.** O FastMCP abstrai tudo: você escreve funções async Python, decora com `server.tool()`, e pronto. O SDK resolve o JSON-RPC, o schema, o discovery. A parte difícil é tudo o que vem depois: autenticação multi-tenant, guardrails, testes, deploy.

**Multi-tenant é o caso real.** Todo tutorial de MCP usa modo stdio com uma env var. Em produção, com múltiplos usuários, o token tem que vir por requisição. O padrão de `ContextVar` + middleware ASGI resolve isso elegantemente, mas não é algo que a documentação do MCP cobre.

**Guardrails importam desde o início.** Quando você dá a um agente a capacidade de criar partidas e sortear times, você precisa de read-only mode, allowlists e filtragem de tools desde o desenho — não como um retrofit.

**Testes de MCP são testes de integração.** O servidor não tem lógica de negócio — ele é um proxy sobre a API. Então os testes mockam a API (`respx`) e verificam se o servidor traduz corretamente: se os headers estão certos, se o body do POST está correto, se os erros são mapeados para as exceções certas.

---

O MCP ainda está no início da curva de adoção. A maioria dos servidores que existem hoje são demos ou exemplos de demonstração. Ter um rodando em produção, com 14 tools, testes e guardrails, foi a forma que encontrei de entender a tecnologia de verdade — não como leitor de spec, mas como quem deployou, debugou e escreveu testes pra isso.

Se você quiser ver o código completo, está no [repositório do rachao.app](https://github.com/thiagotn/football-manager/tree/main/football-mcp) no GitHub. E se tiver um agente compatível com MCP, pode conectar em `mcp.rachao.app` e testar.

A pergunta que fica é: quantos apps precisam de uma API REST *e* um servidor MCP? Hoje parece redundante. Mas se o MCP virar o padrão de fato para integração com IA, ter a camada pronta é a diferença entre "já funciona" e "precisamos construir isso".
