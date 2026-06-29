---
title: "rachao.app — Um problema real, resolvido ponta a ponta com IA/Vibecoding supervisionado (sabor SaaS)"
date: 2026-03-16
tags:
  - rachao.app
  - vibecoding
  - ia
  - saas
  - svelte
  - fastapi
  - python
---

Tem ideias que ficam na gaveta por tempo demais. Essa ficou um bom tempo lá, esperando uma janela que nunca chegava — até que uma mudança de rotina abriu espaço pra tirar do papel.

Vale deixar claro desde o início: esse é um **projeto pessoal**, desenvolvido nos horários vagos, sem qualquer relação com meu trabalho. Cerca de 3 horas por dia, em média, ao longo de **15 dias**.

## O contexto

Jogo futebol com os amigos de infância há anos. Aquele rachão sagrado que a vida vai tornando cada vez mais difícil de manter. Recentemente, com a chegada do Gabriel (meu filho mais novo), o tempo ficou ainda mais disputado. Mas o futebol sempre foi mais do que só jogar — é o pretexto pra manter contato com uma galera que, sem isso, provavelmente se veria muito menos.

Por anos, usamos um app pra organizar as partidas. Funcionou bem, mas com o tempo foi perdendo manutenção. Bugs foram surgindo, funcionalidades pararam de funcionar e reclamar do app virou parte da rotina do rachão. E com toda reclamação, vinha a lista de "seria muito melhor se fosse assim": sorteio de times mais justo, votação dos melhores, controle financeiro, presença via QRCode… A lista existia. O app pra resolver não.

## O problema

Um grupo que joga futebol com frequência tem algumas dores recorrentes: confirmar presença sem virar thread caótica no WhatsApp, sortear times sem polêmica, controlar quem deve pro grupo, votar no melhor e na decepção da rodada, e ter algum histórico e ranking que faça sentido ao longo do tempo.

Problema bem mapeado. Faltava executar.

## Vibecoding — mas supervisionado

O termo **vibecoding** foi cunhado por Andrej Karpathy no início de 2025: você descreve o que quer construir e delega a escrita do código pra um modelo de linguagem. Faz sentido pra prototipagem rápida, pra validar uma ideia sem investir semanas de desenvolvimento.

Foi esse o espírito aqui — mas com um adjetivo importante: **supervisionado**.

Na prática, o desenvolvimento foi conduzido com o **Claude Code** (o CLI da Anthropic), usando o modelo **claude-sonnet-4-6** com o plano **Pro** — que cobre o uso do Claude Code sem cobrança por token. O custo fixo eliminou a fricção de pensar duas vezes antes de iterar mais agressivamente. E foi exatamente esse modelo que permitiu ir de zero a produto funcional em 15 dias, com ~3h diárias.

A ideia é simples: deixar o modelo conduzir a maior parte da geração de código, mas manter a responsabilidade técnica nas decisões de arquitetura, stack e direção. O modelo escreve; você revisa, valida e decide os próximos passos com critério técnico. Sem isso, é fácil acumular dívida técnica invisível — código que funciona na superfície mas que não escala e vira problema na primeira mudança estrutural.

> O vibecoding não substitui o engenheiro — ele muda o trabalho do engenheiro.

## Stack

O rachao.app é um **PWA**: uma única base de código entrega a experiência de app no celular — instalável, com suporte a offline e notificações push — sem manter iOS e Android em paralelo.

| Camada | Tecnologia |
|---|---|
| Frontend | SvelteKit 5 + Tailwind CSS |
| Backend | FastAPI + SQLAlchemy (async) |
| Banco | Supabase PostgreSQL — sa-east-1 (SP) |
| Infra | VPS Hostinger + Traefik v3 |
| CI/CD | GitHub Actions → GHCR → SSH deploy |
| Testes E2E | Playwright + pytest |

A escolha de SvelteKit no frontend e Python/FastAPI no backend foi **pessoal** — familiaridade, preferência, o que fazia sentido pra mim naquele momento. Mas vale ressaltar: a arquitetura do projeto é suficientemente desacoplada para que qualquer parte seja reescrita de forma independente. O frontend poderia ser React, Vue, ou qualquer outro framework. O backend poderia ser Rust, Go, Node.js, ou até uma abordagem mais exótica com Datomic ou um banco orientado a documentos. Nada impede que alguém siga os mesmos passos e chegue no mesmo resultado com uma stack completamente diferente — e seria um exercício interessante.

O FastAPI entrega performance assíncrona real e Swagger automático sem esforço extra. O Supabase é usado estritamente como banco gerenciado — a aplicação conversa diretamente com o Postgres via SQLAlchemy.

## Verificação de número — uma decisão que parece simples

O login usa o número de WhatsApp como identificador único. Mas sem validação, qualquer um pode se cadastrar com o número de outra pessoa — o que num app de grupos fechados quebra a confiança no produto antes mesmo de crescer.

A solução é OTP (**One-Time Password**). As opções eram Twilio Verify, Meta Cloud API, SMS puro ou gateways não-oficiais como Z-API — descartado imediatamente por violar os ToS do WhatsApp.

A escolha foi o **Twilio Verify**: sem tabela local, sem TTL manual, sem rate limiting do zero — tudo gerenciado pela Twilio — e com fallback automático WhatsApp → SMS. O canal atual ainda é SMS enquanto a aprovação do template WhatsApp pela Meta está pendente. Quando aprovado, a mudança é de uma linha de código.

## Planos de assinatura — fluxo ponta a ponta em produção (sabor SaaS)

*Sabor SaaS* é uma piada bem ruim, eu sei, mas foi um jeito de chamar atenção para o assunto. Entenda, ou não, rs.

A motivação principal pra implementar planos de assinatura foi, honestamente, **explorar esse fluxo completo em produção**: checkout, webhooks, ciclo de vida de assinatura, período de graça, idempotência. São coisas que qualquer produto SaaS vai precisar em algum momento, e não tem substituto pra fazer de verdade, com dinheiro real.

Dito isso, não é difícil encontrar amigos que jogam com outras galeras e passam pelo mesmo problema de organização. A necessidade existe além da minha bolha. E caso isso venha a monetizar algum dia… não seria ruim, né? Afinal, uma assinatura do Claude, VPS, Twilio, registro de domínio — os custos vão aparecendo. 🙂

O modelo é freemium: **Free** (1 grupo, 30 membros, 3 partidas abertas), **Básico** (3 grupos, 50 membros, partidas ilimitadas) e **Pro** (10 grupos, tudo ilimitado). Preços dos planos pagos ainda sendo definidos.

Para o gateway, o comparativo foi entre Stripe, Pagar.me e Asaas. Ganhou o **Stripe** — pro-rata automático em upgrades, dunning management nativo, Customer Portal hosted e SDK Python maduro. O Pagar.me teria taxas menores, mas tudo isso exigiria implementação manual: facilmente 2 a 3 semanas a mais. No estágio atual, não compensa.

Uma decisão que considero importante: o código de negócio nunca chama a SDK do Stripe diretamente. Toda interação passa por `app/services/billing.py`, com a implementação concreta isolada em `billing_stripe.py`. Se um dia o volume justificar migrar de gateway, a troca é criar um novo arquivo e mudar uma variável de ambiente.

O fluxo já está em produção: checkout com cartão, PIX e boleto; webhooks com verificação HMAC-SHA256 e idempotência garantida; ativação do plano em menos de 30 segundos após o pagamento.

## O que o rachao.app faz hoje

- **Gestão de grupos e jogadores** — cada galera é um grupo; múltiplos grupos suportados
- **Presença via QRCode** — sem thread no WhatsApp pra confirmar quem vai
- **Sorteio de times equilibrado** — baseado no Rachão Score de cada jogador
- **Votação pós-partida** — melhor e decepção da rodada, com ranking do grupo
- **Gestão financeira** — mensalidades, pagamentos, saldo do grupo
- **Planos de assinatura** — Free, Básico e Pro, com checkout via Stripe

## O que aprendi

15 dias, ~3h por dia, um produto funcional em produção. O ganho de produtividade com IA é real. Mas o modelo não tem contexto de produto — ele não sabe o que pode ser cortado do MVP nem o que vai causar problema daqui a três meses. A qualidade do output é diretamente proporcional à clareza do input, e a supervisão técnica não é opcional. Aceitar código sem revisão crítica é acumular problemas que você paga com juros.

## Próximos passos — e uma pergunta pra você

Esse post é só o começo. A ideia é documentar o andamento do projeto em posts futuros — decisões de produto, escolhas técnicas que deram certo e as que não deram. Se quiser acompanhar, vale seguir por aqui.

Antes de encerrar, uma provocação: **como você resolveria esse problema?** Gateway diferente? Stack diferente — React, Rust, NoSQL? Abordaria o vibecoding de outra forma — ou nem usaria? Curioso pra saber se alguém chegaria nas mesmas decisões ou tomaria caminhos bem diferentes. Comenta aí.

E se você tem uma galera que joga regularmente e está cansado de organizar tudo no WhatsApp: [rachao.app](https://rachao.app) — testa e manda o feedback.

---

*Este post foi originalmente publicado no [Medium](https://thiagotn.medium.com/rachao-app-um-problema-real-resolvido-ponta-a-ponta-com-vibecoding-supervisionado-sabor-saas-b8e7bc87cc41).*
