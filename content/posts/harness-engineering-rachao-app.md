---
title: "Harness Engineering no rachao.app: como construir o andaime que torna a IA previsível"
date: 2026-05-29
tags:
  - rachao.app
  - vibecoding
  - ia
  - harness-engineering
  - claude-code
  - anthropic
---

*Parte da série sobre a arquitetura do [rachao.app](https://rachao.app)*

No [post anterior](/posts/rachao-app-vibecoding/) falei sobre vibecoding supervisionado — a postura de delegar a geração de código à IA enquanto o engenheiro retém as decisões arquiteturais. Mas postura sem estrutura não escala. É aí que entra o **harness engineering**.

Harness é o conjunto de infraestruturas, convenções e ferramentas que você constrói *ao redor* da IA para tornar o output dela verificável, constrangido e confiável — independentemente de quem está operando. Se vibecoding supervisionado responde "como você se comporta com a IA", harness responde "o que você monta para que a IA se comporte de forma previsível".

O rachao.app tem seis camadas de harness, implementadas ao longo do projeto. Vou detalhar cada uma.

![diagrama das 6 camadas de harness](/images/harness-engineering-layers.png "harness engineering — as 6 camadas")

### Camada 1 — Context harness: os arquivos CLAUDE.md

O problema mais comum ao usar IA em projetos com algum histórico é a perda de contexto entre sessões. O modelo não sabe qual foi a última migration criada, quais repositórios já existem, quais padrões de nomenclatura o projeto adota.

A solução é injetar esse contexto de forma estruturada em cada sessão. No rachao.app isso é feito com três arquivos CLAUDE.md:

**CLAUDE.md (raiz)** — padrões transversais: cabeçalho padrão de página no frontend, fluxo obrigatório de i18n, padrão de imports em routers, taxonomia de erros, regras de migrations, estrutura de testes. É o contrato que qualquer contribuição deve respeitar.

**football-api/CLAUDE.md** — estado corrente do backend. Atualizado a cada nova entidade criada. Contém a lista de todos os routers, repositories, models, schemas e services existentes — e, criticamente, **o número da próxima migration**:

```
A última migration criada é 045_drop_api_v2_enabled.sql.
A próxima deve ser numerada 046_.
```

Essa linha elimina uma categoria inteira de erro: o modelo nunca vai criar uma 046_ quando a 045_ já existe, nem pular para 050_ por engano.

**football-frontend/CLAUDE.md** — equivalente para o frontend: componentes existentes, rotas implementadas, padrões de Svelte 5 ($effect vs onMount), regras de responsividade.

O efeito combinado desses três arquivos é que cada sessão do Claude Code começa com o estado real do projeto — não com suposições do modelo baseadas em treinamento.

### Camada 2 — Constraint harness: convenções que constrangem o output

Constraints bem definidas são guardrails que o modelo respeita sem precisar ser lembrado toda hora. O rachao.app tem várias.

**Taxonomia de erros padronizada.** O backend define um conjunto fixo de exceções:

| Exceção | HTTP | Quando usar |
|---------|------|-------------|
| `NotFoundError` | 404 | Recurso não encontrado |
| `ForbiddenError` | 403 | Sem permissão |
| `ConflictError` | 409 | Conflito de unicidade |
| `PlanLimitError` | 403 | Limite do plano atingido |
| `ValidationError` | 422 | Validação de negócio |

O modelo não pode inventar um ResourceUnavailableError ou retornar um 500 com mensagem genérica — a constraint está documentada no CLAUDE.md e reforçada pelos testes unitários existentes que servem de exemplo.

**i18n obrigatório para todo texto visível.** Uma regra simples, mas poderosa: nenhuma string literal no template. Todo texto passa por $t('chave'). E toda chave nova deve aparecer nos três arquivos de mensagens simultaneamente:

```
football-frontend/messages/pt-BR.json
football-frontend/messages/en.json
football-frontend/messages/es.json
```

O Claude Code respeita isso porque está no CLAUDE.md e porque os arquivos existentes servem de padrão a ser seguido. A constraint transforma um problema difícil de detectar (texto hardcoded que quebra internacionalização) em algo auditável por grep.

**Isolamento de gateway de pagamento.** O código de produto nunca chama o SDK do Stripe diretamente. Toda interação passa por billing.py, com a implementação concreta isolada em billing_stripe.py. Isso é uma constraint arquitetural documentada — e o modelo a respeita porque o padrão já está estabelecido no código existente que ele vê como exemplo.

**Numeração sequencial de migrations.** Cada migration tem um número (NNN_descricao.sql), e o CLAUDE.md do backend sempre informa qual é o próximo. Isso garante idempotência e ordem de aplicação. O modelo nunca gera uma migration sem número, nem reutiliza um número já existente.

**Commits nunca automáticos.** Uma constraint de processo: "nunca commitar/pushar automaticamente. Implementar, informar e aguardar validação do usuário." Isso garante que nenhuma sessão vai empurrar código para produção sem revisão humana — não importa quão confiante o modelo esteja.

### Camada 3 — Validation harness: as suites de teste como verificadores automáticos

Testes são a forma mais direta de harness: um verificador determinístico que avalia se o output da IA está correto. O rachao.app tem quatro camadas de validação.

**Testes unitários Python** — rodam sem banco de dados, mocando os repositórios. Isso é uma consequência direta do Repository Pattern: como o modelo segue a convenção de separar acesso a dados da lógica de negócio, cada camada é testável de forma isolada. A suite roda em segundos:

```bash
docker compose run --rm api poetry run pytest tests/unit/ -q
```

O CLAUDE.md é explícito: "todo novo endpoint deve ter ao menos 1 teste caminho feliz + testes dos erros esperados. Sempre rodar antes de commitar."

**Testes unitários Go** — a API v2 em Go tem 237+ testes unitários cobrindo autenticação, middleware, lógica pura de negócio e o algoritmo de sorteio de times. Rodam sem banco, em ~3 segundos:

```bash
cd football-api-go && make test
```

**Testes de integração Go** — 17+ arquivos cobrindo fluxos completos com banco real: auth (signup, login, OTP, reset de senha), grupos, partidas, jogadores, financeiro, votos, ranking, assinaturas. Os testes criam e destroem seus próprios dados via API — sem fixtures pré-carregadas, sem estado compartilhado entre testes. O OTP bypass (123456) funciona sem Twilio configurado, o que resolve o problema de dependências externas em testes automatizados.

**Testes E2E com Playwright** — testes de ponta a ponta que sobem a stack Docker completa e exercitam os cenários principais via browser. Rodam no CI a cada push, antes do build das imagens de produção. Nenhuma imagem é construída se os E2E quebrarem.

O Codecov rastreia a cobertura de ambas as suites (Python e Go) com badges no README. Não é só vaidade: cobertura visível cria pressão para manter o patamar.

### Camada 4 — Process harness: PRDs como briefings estruturados

Cada feature do rachao.app começa com um PRD (Product Requirements Document) antes de qualquer linha de código. O índice tem 48 documentos com status rastreado:

| Símbolo | Significado |
|---------|-------------|
| ✅ | Implementado e em produção |
| 🚧 | Parcialmente implementado |
| ⏸ | Bloqueado por dependência externa |
| 📋 | Proposto — aguardando decisão |
| ❌ | Cancelado |

Isso é harness de processo: o PRD substitui o "me faz uma feature de verificação de WhatsApp" por um documento que especifica o fluxo, os edge cases, as dependências, os critérios de aceitação e os bloqueadores. Quando esse documento é passado como contexto para uma sessão do Claude Code, o output é radicalmente mais preciso — e mais fácil de revisar, porque você tem um documento contra o qual comparar.

O PRD 025-otp-bypass-local.md (✅) documenta o OTP_BYPASS_CODE no .env.docker. O PRD 026-otp-leitura-automatica-sms.md (⏸) documenta exatamente por que o $effect foi revertido — interferência no foco dos inputs. Esse nível de rastreabilidade é difícil de manter sem um processo deliberado.

### Camada 5 — Tooling harness: ferramentas que automatizam verificação

**/api-compare — skill personalizada do Claude Code.** Com dois stacks em paralelo (Python v1 e Go v2), manter paridade comportamental é um problema não trivial. A solução foi criar uma skill personalizada para o Claude Code que, dado um endpoint, lê as implementações em ambas as linguagens e gera um relatório de gaps estruturado:

```
/api-compare /matches/{matchID}/teams
```

Saída:

| # | Categoria | Python v1 | Go v2 | Impacto |
|---|-----------|-----------|-------|---------|
| 1 | Validação | Verifica mínimo de jogadores antes do sorteio | Falha no service com erro genérico | Alto |
| 2 | JOIN | INNER JOIN (exclui não-membros) | LEFT JOIN (inclui com defaults) | Médio |
| 3 | Response | Apelido do grupo no POST | Apelido global apenas | Médio |
| 4 | 404 | Retorna 404 se partida não existe | Retorna 200 com arrays vazios | Médio |

A skill está em .claude/skills/api-compare/SKILL.md e segue um processo de 6 etapas fixas: parse do input, localização dos arquivos, leitura do código, análise em 6 dimensões (auth, validação, lógica, queries, response, erros), geração do relatório, sumário de fixes com prioridade.

**sqlc na API Go.** O sqlc compila queries SQL tipadas em Go — o modelo não pode escrever uma query que retorna interface{} onde o schema espera um tipo concreto. Qualquer query gerada que não case com o schema falha em make generate, antes mesmo de chegar no compilador. É uma constraint automatizada de qualidade de dados.

**CI/CD com gates sequenciais.** O pipeline do GitHub Actions é em si um harness:

```
Run workflow (manual)
       │
       ▼
  changes detection     ← pula jobs desnecessários
       │
       ├── unit-tests (API Python)
       ├── mcp-tests
       └── npm-audit (frontend)
       │
       ▼
  e2e (Playwright — stack Docker completa)
       │
       ▼
  build (imagens Docker → GHCR)
       │
       ▼
  deploy (SSH → VPS)
```

Não existe deploy sem passar pelos testes unitários, E2E e build. Não existe build sem passar pelos testes. O pipeline não tem bypass — e isso é intencional.

### Camada 6 — Runtime harness: constraints em execução

**OTP bypass com código fixo.** Em qualquer ambiente não-produtivo, o código 123456 funciona para OTP sem precisar de Twilio configurado. Isso elimina uma dependência externa dos testes de integração e do desenvolvimento local — e está documentado no PRD 025-otp-bypass-local.md.

**RACHAO_MCP_READ_ONLY** — o servidor MCP expõe 14 tools ao Claude, divididas em read e write. A variável de ambiente RACHAO_MCP_READ_ONLY=true desabilita todas as tools de escrita em tempo de execução. É uma constraint de segurança para ambientes onde você quer que o agente observe sem agir.

**Ambientes isolados com portas separadas.** A stack Python (v1) e a stack Go (v2) usam portas e bancos de dados diferentes:

| | Python v1 | Go v2 |
|---|-----------|-------|
| API | porta 8000 | porta 8080 |
| Banco | football (porta 5432) | football_dev (porta 5433) |
| Prefix | /api/v1 | /api/v2 |

O isolamento impede que testes de uma stack contaminem a outra — e permite rodar ambas simultaneamente sem conflito.

**Script de reset de produção.** O scripts/reset_to_production.sql roda dentro de uma transação única: identifica o super admin mais antigo, apaga todos os grupos e dados dependentes via CASCADE, reseta sequences. Se qualquer passo falhar, nada é alterado. É um constraint de segurança para operações destrutivas — não dá pra fazer pela metade.

### O que o harness não resolve

Vale ser honesto: harness reduz o problema, não o elimina.

Um CLAUDE.md desatualizado é pior do que nenhum — o modelo vai confiar numa informação errada. Os testes unitários cobrem os caminhos que você pensou em cobrir, não os que não pensou. Um PRD mal especificado gera uma implementação correta do problema errado. E nenhum harness substitui a revisão de quem entende o sistema.

O harness é o que torna a supervisão eficiente — não o que a dispensa.

### Por que documentar isso

Porque a maioria dos exemplos de "construir com IA" mostra o momento de geração — o prompt, o output — e não o scaffolding que torna aquele output confiável. Esse scaffolding é trabalho de engenharia real, e ele determina a qualidade do produto tanto quanto qualquer decisão de stack.

O código está em [github.com/thiagotn/football-manager](https://github.com/thiagotn/football-manager). Os CLAUDE.md estão na raiz e em cada subprojeto. Os PRDs estão em docs/prd/. A skill /api-compare está documentada em docs/API_COMPARISON_SKILL.md.

---

*Este post foi originalmente publicado no [Medium](https://thiagotn.medium.com/harness-engineering-no-rachao-app-como-construir-o-andaime-que-torna-a-ia-previs%C3%ADvel-cb9105d8497f).*
