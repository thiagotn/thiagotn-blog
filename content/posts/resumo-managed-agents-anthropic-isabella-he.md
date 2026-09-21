---
title: "Resumo: Como construir e publicar seu primeiro Managed Agent (Anthropic — Isabella He)"
date: 2026-09-20
description: "Resumo do workshop de 45 minutos da engenheira da Anthropic Isabella He sobre Claude Managed Agents — da arquitetura interna ao deploy de um agente SRE de incident response."
tags: ["agentes", "ia", "engenharia", "anthropic"]
---

> Resumo detalhado do vídeo ["Anthropic engineer Isabella He"](https://x.com/ZabihullahAtal/status/2074943938805273057) postado por **Atal** (@ZabihullahAtal), publicado em julho de 2026. O vídeo é um workshop prático de ~37 minutos conduzido por **Isabella He**, engenheira de staff na equipe de AI Aplicada da Anthropic.

Se você trabalha com engenharia de agentes de IA, este é um dos workshops práticos mais úteis que você vai ver este ano. Em 45 minutos, Isabella He mostra como construir e publicar seu primeiro Managed Agent na Anthropic — desde a definição de Agentes, Ambientes e Sessões até streaming de eventos e integração de ferramentas customizadas. O melhor: ela constrói um agente SRE de incident response ao vivo, que diagnose problemas sozinho e poupa desenvolvedores de serem acordados às 3h da manhã.

---

## A evolução dos agentes na Anthropic

Para entender o valor do Managed Agents, Isabella percorre a evolução cronológica:

| Fase | O que era | Problema |
|---|---|---|
| **Messages API** (2023) | Acesso cru ao modelo, tokens in/out | Você implementava tudo: gerenciamento de contexto, loop do agente, compaction |
| **Agent SDK** | Harness programático com poder do Claude Code | Você ainda gerenciava hosting, scaling e segurança dos containers |
| **Claude Managed Agents** (atual) | Harness purpose-built, sandboxing, observabilidade — tudo gerenciado pela Anthropic | Foco no que importa: task, tools e domínio |

> Relatos de clientes: **10 a 15 vezes mais rápido para produção** com Managed Agents.

Um ponto interessante que Isabella levanta: harnesses precisam evoluir junto com os modelos. Com o Sonnet 4.5, a Anthropic observou um comportamento chamado **"context anxiety"** — o Claude encerrava tarefas antes do necessário, mesmo com espaço sobrando no context window. A equipe adicionou mitigações no harness para combater isso. Quando o Opus 4.5 saiu, esse comportamento desapareceu, tornando todo o trabalho de mitigação obsoleto. A lição: manter um harness é muito trabalho, e é exatamente isso que o Managed Agents abstrai para você.

---

## Conceito central: separar o "cérebro" das "mãos"

A decisão arquitetural mais importante do Claude Managed Agents é **desacoplar o loop do agente (cérebro) da execução de ferramentas (mãos)**. Antes, o loop e as ferramentas rodavam juntos no mesmo container — o que fazia sentido para agentes como o Claude Code, que precisa acessar o filesystem local. Mas isso trazia problemas:

- **Segurança**: com o agente e as ferramentas no mesmo container, o agente conseguia acessar credenciais diretamente. Desacoplando, as credenciais ficam isoladas e encriptadas
- **Latência**: antes, era preciso subir um container novo para cada sessão, o que aumentava o tempo até o primeiro token. Com a separação, a Anthropic viu **mais de 90% de redução no Time-to-First-Token (P95)**
- **Resiliência**: se um container cai, basta subir outro — não é preciso reiniciar o loop do agente

---

## Os três primitivos do Managed Agents

Tudo que você constrói em Managed Agents se apoia em três conceitos:

1. **Agent** = o *cérebro*. Define modelo, system prompt, tools, MCP servers e skills. É a persona e as capacidades do agente.
2. **Environment** = as *mãos*. É o container/infraestrutura onde as ferramentas executam. Agora suporta **bring your own compute** (anunciado no Code with Claude London) — você pode rodar no seu próprio infrastructure em vez do gerenciado pela Anthropic.
3. **Session** = a *amarração*. Conecta um Agent a um Environment, monta recursos (arquivos, dados) e permite streaming de eventos para o usuário.

Uma característica chave: o loop do agente roda **server-side**. Quando você fecha o laptop ou dá um hard refresh, tudo se mantém. Durabilidade e confiabilidade vêm de fábrica — sem configurar database ou deployment.

---

## Workshop prático: agente SRE de incident response

A parte mais legal do workshop é a construção ao vivo de um **Site Reliability Agent** num app Streamlit. O cenário é familiar para qualquer engenheira de software: você está de plantão e é acordada às 3h da manhã porque algo quebrou. O agente faz o trabalho de diagnóstico por você.

### Configuração do agente

- Modelo: **Claude Opus 4.7**
- System prompt extremamente simples: "você é um SRE agent, responsável por debugar incidentes, tem acesso a métricas, deploys recentes, diffs e logs"
- Ferramentas locais: `get_metrics`, `get_recent_deploys`, `get_diff`, além de sandboxing e bash

### O incidente

O agente recebe um cenário simulado: a latência P99 está 10 vezes acima do baseline. Ele então:

1. Roda comandos no sandbox para inspecionar os logs
2. Chama `get_recent_deploys` para ver o que mudou recentemente
3. Analisa as métricas e o diff do commit suspeito
4. **Identifica a causa raiz**: um commit da desenvolvedora Alice, que refatorou o order summary builder, introduziu uma query que causou esgotamento do pool de conexões do banco de dados
5. Retorna causa raiz + ações recomendadas

> Visualize: em vez de ser acordada às 3h da manhã para investigar logs e métricas manualmente, você simplesmente entrega o incidente ao agente e ele já fez todo o diagnóstico.

Isabella destaca que, para um agente SRE real, você também daria acesso a **runbooks** — documentação que equipes criam sobre como debugar incidentes específicos — para que o agente tenha os mesmos materiais que uma desenvolvedora humana teria.

---

## Sessões falam em eventos, não tokens

Uma diferença fundamental do Managed Agents em relação à Messages API: em vez de request/response (tokens in/out), as sessões trabalham com **events**:

- `user_message`, `tool_call`, `agent_response`...
- Cada evento é **logado** (observabilidade nativa no console) e **streamado** para o usuário em tempo real
- Sessões têm estados: `idle → running → rescheduling → terminated`
- **Webhooks** podem disparar ou resumir sessões com base em eventos externos
- **Persistência total**: hard refresh? Tudo continua lá. Sem configurar database.

Isso é crucial tanto para a experiência do usuário (vê coisas acontecendo em tempo real, em vez de esperar o agente terminar tudo) quanto para observabilidade (tudo é loggado no console da Anthropic).

---

## Além do básico: recursos avançados

O workshop cobre o básico, mas Isabella lista o que mais está disponível no Managed Agents:

| Recurso | O que faz |
|---|---|
| **Sub-agentes** | Um agente orquestrador delega tarefas a agentes filhos com context windows próprios (paralelização e gerenciamento de contexto) |
| **Memory + Dreaming** | O agente aprende com correções e memoriza preferências do usuário entre sessões. O "dreaming" é o Claude revisando seus próprios logs de memória para decidir o que manter |
| **Outcomes** | Você define um rubric do resultado desejado; o agente planeja os tool calls necessários para chegar lá |
| **Vaults** | Credenciais encriptadas por usuário/sessão, isoladas do agente — sem precisar montar seu próprio secret store |
| **Webhooks** | O agente reage a eventos externos e resume sessões automaticamente |
| **MCP Servers** | Controles novos de MCP, incluindo Cloud MCP Tunnels para redes privadas |
| **Console Agent Builder** | Dashboard de observabilidade nativo no developer console |

---

## Reflexão final

O que mais impressiona não é a demo em si — é a **decisão arquitetural de separar cérebro e mãos**. Isso resolve simultaneamente segurança (credenciais isoladas), performance (90% menos TTFT) e resiliência (containers são descartáveis). É o tipo de design que só emerge quando você mantém um harness por anos e vê os modelos evoluírem — o episódio do Sonnet 4.5 e sua "context anxiety" é o exemplo perfeito.

A promessa é clara: **deixe a Anthropic cuidar de compaction, caching, gerenciamento de contexto e infraestrutura — foque no domínio e nas ferramentas do seu agente.** E o workshop prova que isso não é só discurso: em 45 minutos, você sai com um agente SRE funcional e pronto para iterar.

Para quem quiser ir além, Isabella menciona que há sessões subsequentes, incluindo uma sobre **dreaming** — o serviço de memória e autoaprimoramento de agentes.

---

*Post original: [Atal (@ZabihullahAtal) no X](https://x.com/ZabihullahAtal/status/2074943938805273057) · Vídeo de ~37 min · Workshop conduzido por Isabella He (Anthropic)*
