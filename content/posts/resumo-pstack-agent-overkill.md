---
title: "Resumo: Pstack é overkill para agentes. Use mesmo assim! (Rob Shocks)"
date: 2026-09-11
description: "Resumo do vídeo de Rob Shocks sobre o Pstack, o conjunto de skills de Lauren Tan: é overkill para a maioria dos agentes, e ainda assim vale a pena ler e usar."
tags: ["agentes", "ia", "engenharia", "produtividade"]
---

> Resumo detalhado do vídeo ["Pstack Is Agent Overkill. Use It Anyway!"](https://youtu.be/lUhXa8GiXns) do canal **Rob Shocks**, publicado em setembro de 2026.

Se você está construindo agentes de codificação ou usando qualquer tipo de fábrica de software, precisa conhecer o **Pstack** — um conjunto de skills criado por **Lauren Tan**, engenheira que passou por Netflix, core team do React, SpaceX e Cursor. É basicamente o cérebro de uma engenheira sênior extraído para dentro de uma stack. Como o próprio Rob Shocks diz: mesmo que você não use o Pstack, só de ler as skills já vale pelo aprendizado de como um praticante sério de agentes trabalha em escala.

---

## O que é o Pstack?

O Pstack é dividido em três camadas:

1. **Princípios e regras de engenharia** — a filosofia que guia o comportamento do agente
2. **Playbooks** — procedimentos operacionais que dizem ao agente o que fazer a seguir
3. **Skills e slash commands individuais** — que fazem o trabalho de fato

Você pode rodar o Pstack em qualquer agente: Cursor, Claude Code, Codex, OpenCode. No Cursor, é tão simples quanto digitar `/add plugin Pstack`. Para outros agentes, existe um port não-oficial feito por Michael Denier disponível nos marketplaces de plugins.

---

## Potato Mode: o roteador do Pstack

O coração do Pstack é o **potato mode** — essencialmente um roteador que ajuda a decidir qual das 20+ skills você deve usar primeiro. A árvore de skills contém 22 playbooks com exemplos para diferentes casos de uso.

Rob dá um prompt de teste ao potato mode e ele faz o roteamento para o playbook "figure it out". Vale destacar: o Pstack **não é feito para spec e planejamento**. É desenhado para operar em uma codebase estabelecida. A opinião pessoal de Lauren sobre isso é direta:

> "Eu não acredito em planning. A melhor spec é o código."

Então não há skill de planejamento embutida no Pstack — propositalmente.

---

## As skills mais notáveis

### Arena

Se você tem uma funcionalidade crítica para desenvolver e tokens não são um problema, pode rodar a skill **arena**. Ela coloca três ou quatro agentes diferentes (Claude, GPT, Grok, Claude Opus 5) para trabalhar no mesmo problema, pega as melhores partes de cada um e junta em um commit final. A ideia é fazer todos "lutarem" para chegar na melhor solução e depois escolher as melhores partes de cada design.

Com base no que cada sub-agente aprendeu trabalhando no problema, o arena decide se enxerta (graft) ou rejeita (reject) as contribuições.

### Swarm

Similar ao arena, mas com uma diferença: em vez de todos trabalharem no mesmo problema, no **swarm** você dá fatias diferentes do problema para workers paralelos e depois junta tudo em um relatório agregado. O Pstack é desenhado para garantir "paralelismo sem medo" — trabalhando em feature branches, work trees, etc., sempre agregando o trabalho sem sobreposições.

### TDD (Test-Driven Development)

A skill de TDD cria os testes unitários primeiro e só então faz eles passarem antes de prosseguir com a implementação.

### Why

A skill **why** é uma das mais interessantes. Em vez de apenas checar a transcrição do projeto, ela percorre todos os MCPs e CLIs relevantes ao projeto. Pode checar informações de produto no PostHog, ir numa conversa no Slack sobre por que uma funcionalidade foi implementada, puxar logs do Sentry para entender o contexto, e encontrar ADRs (Architecture Decision Records) sobre decisões tomadas. Rob diz: "definitivamente roubando essa."

### Recall

**Recall** é fantástica para quando você quer retomar um projeto que deixou parado há uma semana. Ela escaneia todas as transcrições e usa a skill **why** para checar seus MCPs (Notion, Linear, PostHog) e descobrir onde você parou e o que precisa fazer a seguir.

### Interrogate

Na fase de validação, a skill **interrogate** coloca dois ou três modelos diferentes para revisar o código contra seus padrões. Cada modelo retorna suas opiniões. Sim, você queima muitos tokens — mas se o que você busca é a mais alta e estrita qualidade de código, isso provavelmente não importa.

### Create Verification

Essa skill cria sua própria forma scriptada de provar o comportamento do app. Como o app tem uma grande área de superfície (múltiplos projetos, configurações, scanning contínuo), há muito espaço para parecer estar funcionando mas estar fundamentalmente quebrado ou devolvendo dados errados. A skill cria um conjunto de scripts de verificação e checagens cruzadas. Rob destaca:

> "Quando você está lidando com agentes não-determinísticos, esse tipo de passo de verificação é simplesmente valioso demais."

### Maintain Verification

Com o tempo, o verificador que você configurou vai divergir do desenvolvimento. Essa skill volta e garante que o verificador seja atualizado.

### Onslaught

A skill **onslaught** é um presente para quem usa agentes para qualquer tipo de escrita. O propósito é matar e remover todas aquelas frases irritantes como "pivotal moment", "crucial", "delve", "enduring" — e a controversa: eliminar completamente os em-dashes (travessões). Rob confessa que gosta de em-dashes e os usava muito antes da IA, mas reconhece que se tornaram um grande indicador de uso de IA.

### Brawl

Se você rodou muitos agentes em paralelo e seu cérebro está chegando ao limite, pode rodar a skill **brawl**, que reformula a última mensagem em linguagem humana simples, sem jargão. "Um presente absoluto para a clareza, particularmente quando seu cérebro está queimando em 10 agentes diferentes."

---

## Mostre seu trabalho: o trabalho de um engenheiro

A skill **show me your work** revela muito sobre como o Pstack opera. Rob rodou um único prompt e acompanhou todo o processo:

1. **Exploração** — um teste rápido para ver se o que queremos alcançar é sequer possível, sem construir o app inteiro
2. **Enquadramento** — entender os requisitos e restrições (ex.: quer rodar no Mac, mas eventualmente em outros sistemas)
3. **Scaffolding básico** — antes de entrar na fase de arena com 4 agentes paralelos
4. **Mudanças de design impostas pela realidade** — um ponto crucial. Quando o agente cria um plano detalhado de antemão, ainda não lidou com a realidade. É só durante a construção que as suposições são quebradas e é preciso refazer o plano em tempo real
5. **Testes de verificação** — fase de testes e verificação
6. **Auditoria** — auditoria final, onde o agente identificou que havia alucinado alguns detalhes e corrigiu 3 afirmações falsas

---

## Princípios-chave do Pstack

| Princípio | O que significa |
|---|---|
| **Laziness Protocol** | Ao refatorar, procure deletar código em vez de adicionar. Mire na menor mudança possível para fazer o trabalho — isso leva a código mais sustentável |
| **Redesigning from First Principles** | Ao adicionar uma funcionalidade, imagine como o código seria se ela existisse desde o dia 1. Pode envolver remover estruturas para chegar ao "estado ideal" |
| **Minimizing Reader Load** | Chega de PRs gigantes escritos por agentes com código desconexo em múltiplas abstrações. Mantenha simples com o mínimo de abstrações |
| **Exhaust the Design Space** | Use o arena: múltiplos modelos/agentes no mesmo problema, pegue o melhor de cada |
| **Build a Lever** | Se você faz algo à mão com o agente várias vezes, construa uma ferramenta para isso (CLI, script de verificação, etc.) |
| **Verification** | Compilar e passar nos testes não é o mesmo que provar que funciona. Verificação profunda (end-to-end, computer use) é central em toda a stack |
| **Guard the Context Window** | A janela de contexto central é chave. Descarregue fatias do trabalho para sub-agentes com suas próprias janelas de contexto |
| **Never Block the Human** | O humano nunca deve ficar esperando |

A filosofia de Lauren, que percorre toda a stack, é clara:

> "O objetivo não é mais código, é máximo impacto com a menor quantidade de código possível."

---

## Custo vs. benefício

Rob é transparente sobre o trade-off:

| Métrica | Fable 5.1 sem skills | Com Pstack |
|---|---|---|
| **Tempo** | ~30 minutos | ~1 hora |
| **Custo de tokens** | Baixo | Muito alto |
| **Qualidade do resultado** | Baseline | Substancialmente melhor |

O Pstack como conjunto de skills vai custar bem mais dinheiro. Toda essa validação, verificação e swarms significa muita queima de tokens. Você não precisa jogar a batata em todo projeto — mudanças pequenas de design ou trabalho de UI front-end provavelmente não precisam disso. Mas pelo menos agora você tem uma ideia do que ele é bom e onde pode ser usado.

---

## Conclusão

O Pstack é um case fascinante de como extrair a mentalidade de uma engenheira sênior para dentro de um conjunto de skills para agentes. Não é para todo projeto — é overkill por design. Mas a filosofia por trás (laziness protocol, verificação profunda, paralelismo sem medo, mínima carga para o leitor) é aplicável mesmo se você não usar a stack diretamente.

Se você quer entender como um praticante sério de agentes opera em escala, vale a pena pelo menos ler as skills. O repositório oficial fica em `plugins.pstack@cursor` (no Cursor) ou ports para Claude Code, Codex e OpenCode nos marketplaces.

---

*Fonte: ["Pstack Is Agent Overkill. Use It Anyway!"](https://youtu.be/lUhXa8GiXns) — Rob Shocks, setembro de 2026.*
