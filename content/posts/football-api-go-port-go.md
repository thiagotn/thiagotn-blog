---
title: "rachao.app — Aprendendo Go portando uma API de produção: arquitetura, stack e decisões técnicas"
date: 2026-07-09
tags:
  - rachao.app
  - go
  - golang
  - arquitetura
  - estudo
  - port
  - chi
  - sqlc
  - docker
---

No post anterior contei como o rachao.app nasceu — um projeto pessoal para organizar rachões entre amigos, desenvolvido com vibecoding supervisionado em ~15 dias. O backend rodava (e continua rodando) em Python/FastAPI. Agora vem a parte que talvez não seja óbvia: por que portar pra Go?

A resposta curta é simples: **estudo**. A resposta longa é o resto desse post.

## Por que aprender assim?

Existe uma diferença fundamental entre aprender uma linguagem com tutorial e aprender portando código que já está em produção. No tutorial, você constrói um TODO app e os edge cases são gentilmente omitidos. No mundo real, você tem requisitos reais, regras de negócio que já existem, e a pressão de não quebrar nada que funciona.

O rachao.app me deu exatamente isso: uma especificação viva. Cada endpoint, cada validação, cada fluxo já estava implementado em Python. O código Python virou o blueprint — eu não precisava decidir *o que* construir, só *como* expressar a mesma coisa em Go. E aí é que mora o aprendizado de verdade: traduzir decisões que você tomou num paradigma para outro completamente diferente.

As vantagens técnicas — performance, binário único, tipagem estática, footprint mínimo — vieram como consequência natural da escolha. Não foram a motivação. Se fossem, eu teria avaliado Rust, Elixir, ou ficado no Python que já funcionava. A escolha de Go foi deliberada: queria aprender a linguagem, e queria aprender com algo real.

## A stack

O port manteve paridade funcional com a API v1. Mesmo banco, mesma auth, mesmos endpoints — só a implementação mudou. A tabela abaixo mostra o mapeamento:

| Camada | v1 (Python) | v2 (Go) |
|---|---|---|
| Router | FastAPI | Chi v5 |
| DB | SQLAlchemy async | pgx/v5 + pgxpool |
| Queries | ORM | sqlc (type-safe, gerado de SQL) |
| Auth | JWT HS256 | JWT HS256 (mesma SECRET_KEY) |
| Streaming | — | SSE para `/chat` |
| Docs | Swagger auto | Mintlify + swaggo |
| Metrics | prometheus-fastapi | prometheus/client_golang |
| Scheduler | APScheduler | robfig/cron/v3 |
| Imagem | Python slim | scratch (~10MB) |

A versão Go expõe ~99 endpoints sob `/api/v2`, estruturalmente equivalentes aos da `football-api/` (Python) em `/api/v1`. As duas versões coexistem no mesmo domínio, roteadas pelo Traefik:

```
api.rachao.app/api/v2  →  api-go:8080   (Go)
api.rachao.app/api/v1  →  api:8000      (Python)
```

## Arquitetura do projeto

O projeto segue o standard Go project layout — `cmd/` para entrypoints, `internal/` para tudo o que não precisa ser importável externamente:

```
football-api-go/
├── cmd/
│   └── main.go                 # Entrypoint: config, pool, router, scheduler
├── internal/
│   ├── config/                 # Variáveis de ambiente (envconfig)
│   ├── db/                     # Queries geradas pelo sqlc + helpers
│   ├── handlers/               # HTTP handlers (19 arquivos de domínio)
│   ├── services/               # Lógica de negócio (auth, Stripe, storage, etc.)
│   ├── middleware/             # JWT, CORS, rate limit, recovery, Prometheus
│   ├── server/                 # Montagem do chi.Router
│   └── apierror/               # Errors tipados com HTTP status code
├── tests/
│   ├── unit/                   # Sem banco (nil pool seguro)
│   └── integration/            # Banco real (auth, groups, matches)
├── sql/queries/                # Arquivos .sql lidos pelo sqlc
├── mintlify/                   # Documentação (docs.rachao.app)
├── Dockerfile                  # Multi-stage → scratch (~10MB)
├── Makefile
└── sqlc.yaml
```

O fluxo de uma requisição é direto:

```
Request → Middleware (auth, CORS, metrics, recovery)
       → Handler (parse, validação, chamada de serviço)
       → Service (regra de negócio)
       → DB (pgxpool → queries sqlc)
       → Response
```

Cada camada tem responsabilidade clara. Handlers não acessam o banco diretamente — sempre passam por um service. Services não conhecem HTTP — recebem context e pool, retornam dados ou `*APIError`.

### APIError — tipagem de erros

Uma das primeiras coisas que precisei resolver: como representar erros HTTP de forma tipada em Go, sem a ergonomia de exceptions do Python. A solução foi um tipo simples:

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

Handlers retornam `error` e um middleware centralizado faz o type assertion, extrai o status code e serializa como JSON. Simples, explícito, sem magic.

## Decisões técnicas — o que aprendi escolhendo

### sqlc ao invés de ORM

Em Python, SQLAlchemy é praticamente padrão. Em Go, a comunidade é dividida entre ORMs (GORM, ent) e approaches mais próximos do SQL. Escolhi **sqlc** — você escreve queries SQL reais em arquivos `.sql` e ele gera código Go type-safe a partir delas.

```sql
-- sql/queries/groups.sql
-- name: GetGroup :one
SELECT * FROM groups WHERE id = $1;
```

Gera:

```go
func (q *Queries) GetGroup(ctx context.Context, id uuid.UUID) (Group, error) { ... }
```

O aprendizado aqui foi duplo: entender SQL de verdade em vez de depender de abstração, e entender como Go lida com geração de código (não tem macros como Rust, não tem decorators como Python — é codegen explícito no build).

### Docker multi-stage → scratch

A imagem final do serviço é `FROM scratch` — ~10MB com binário estático + certificados CA + timezone data. O Dockerfile tem três stages: dev (com air para live-reload), builder (compila o binário CGO_ENABLED=0), e production (scratch).

Aprender a fazer isso foi um exercício interessante: entender o que uma imagem mínima precisa pra funcionar, onde ficam os certificados CA no filesystem (`/etc/ssl/certs/`), como embutir timezone data (`/usr/share/zoneinfo/`). Coisas que em Python simplesmente não existem porque o runtime já traz tudo.

### Paridade de métricas

Uma decisão consciente: o histograma de Prometheus em Go usa o mesmo nome (`http_request_duration_seconds`) e os mesmos labels (`method`, `handler`, `status_code`) que o `prometheus-fastapi-instrumentator` da v1. Isso significa que os mesmos painéis e alertas do Grafana cobrem as duas versões sem nenhuma mudança nas queries.

```go
var httpRequestDuration = promauto.NewHistogramVec(
    prometheus.HistogramOpts{
        Name:    "http_request_duration_seconds",
        Help:    "Duração das requisições HTTP em segundos.",
        Buckets: prometheus.DefBuckets,
    },
    []string{"method", "handler", "status_code"},
)
```

O aprendizado: observabilidade não é algo que você adiciona depois — é algo que você planeja pra que as duas versões coexistam sem fragmentar o dashboard.

### Scheduler embutido

Em Python, usava APScheduler. Em Go, usei `robfig/cron/v3` embutido no próprio binário. Três jobs:

- **Status sync** — horário (:30): fecha partidas passadas, marca as de hoje como em progresso
- **Recorrência** — diário (07:00): cria próxima partida pra grupos com recorrência ativada
- **Lembrete de votação** — a cada 5min: notifica jogadores que ainda não votaram

O scheduler roda em goroutines, e o `main.go` faz graceful shutdown com `signal.Notify` e `srv.Shutdown(ctx)`. Aprender concurrency na prática — não com exemplos artificiais, mas com jobs reais que rodam em produção.

### Banco compartilhado

Decisão pragmática: as migrations ficam no repo Python. Go usa as mesmas tabelas, as mesmas colunas. Não há migrator próprio no binário Go. Isso significa que qualquer mudança de schema acontece uma vez, no repo Python, e ambas as versões se adaptam.

Aprendi que nem toda decisão técnica precisa ser "a mais correta arquiteturalmente" — às vezes a mais correta é a que reduz fricção operacional.

### Chat IA com SSE

O endpoint `/api/v2/chat` implementa streaming via Server-Sent Events. A integração com a Anthropic é feita via HTTP direto — sem SDK, sem dependência externa. O handler lê o stream da API da Anthropic e faz flush incremental com `http.Flusher`.

O system prompt do assistente é extenso: define regras de comportamento, fluxos padrão (Descobrir → Apresentar → Agir), e um guia completo de ferramentas que o LLM pode usar (`list_groups`, `set_attendance`, `list_my_matches`, etc.). Aprender SSE em Go — `http.Flusher`, `bufio.Scanner`, context cancellation — foi um dos exercícios mais interessantes do port.

## O que muda quando você aprende portando código real

A maior diferença entre aprender com tutorial e aprender portando código de produção é a natureza do desafio.

Com tutorial, você decide *o que* construir. Com um port, você decide *como* traduzir decisões que já tomou. O código Python virou especificação: cada endpoint, cada regra de negócio, cada edge case já existe. O desafio não é arquitetura — é expressar a mesma coisa numa linguagem com paradigma diferente.

Go tem **interfaces implícitas** — não há `implements`, você não declara que um tipo satisfaz uma interface. Tem **error handling explícito** — não há exceptions, erros são valores retornados. Não há **herança** — composição é o caminho. Não há **generics restritos** como em Rust — são mais flexíveis, mas menos expressivos. Cada uma dessas diferenças aparece quando você tenta portar um padrão que era natural em Python e descobre que em Go a solução é outra.

E tem a pressão real: nada pode quebrar o que já funciona em produção. As duas versões coexistem no mesmo domínio, usando o mesmo banco. Se a v2 retornar uma resposta diferente da v1 para o mesmo endpoint, é um bug — não um detalhe.

## Dev experience

O setup de desenvolvimento é bem polido:

- **`air`** para live-reload — qualquer alteração em arquivo `.go` dispara rebuild automático
- **`Makefile`** com targets completos: `make test`, `make test-race`, `make test-integration`, `make generate` (sqlc), `make lint`, `make docs` (swaggo), `make coverage`
- **`golangci-lint`** configurado com gosec, exhaustive, bodyclose, e outros linters
- **Testes unitários** sem banco (`nil` pool é seguro pra caminhos que retornam antes de qualquer query — validação de UUID, autorização, parsing de corpo)
- **Testes de integração** com banco real — cobrem fluxos end-to-end: registro → login → criação de grupo → criação de partida
- **CI no GitHub Actions**: `push → lint → unit-tests → integration-tests → build & push GHCR`

## O que mudou na operação

Em produção, a diferença é visível:

- **Imagem**: ~10MB (scratch) vs ~200MB+ (Python slim)
- **Startup**: instantâneo — sem interpreter, sem import resolution, sem GIL
- **Deploy**: mesma VPS, mesmo Traefik, mesmo banco — só um novo container roteado em `/api/v2`

## Considerações finais

Port não significa abandono do Python. As duas versões coexistem e a migração é gradual — endpoints novos são implementados em Go, endpoints antigos são migrados conforme faz sentido. O Python continua sendo a fonte de verdade pra migrations de schema.

Aprender uma linguagem nova com um projeto real de produção é um exercício diferente — e muito mais rico — do que qualquer tutorial. Você não está construindo um TODO app. Você está traduzindo decisões reais, lidando com edge cases reais, sob a pressão de não quebrar algo que já funciona. É o tipo de aprendizado que fica.

E o vibecoding continua: Claude Code conduziu boa parte do port, com supervisão de arquitetura. O modelo escreve; eu reviso, valido e decido os próximos passos com critério técnico. A diferença é que agora, quando ele sugere algo que não parece certo, eu tenho contexto suficiente pra questionar — porque já implementei aquilo em Python e sei como deveria se comportar.

Se você tem um projeto em produção e está querendo aprender uma linguagem nova: considere portar parte dele. É o melhor laboratório que você vai ter.

---

E se você curte futebol e está cansado de organizar tudo no WhatsApp: [rachao.app](https://rachao.app) — testa e manda o feedback.
