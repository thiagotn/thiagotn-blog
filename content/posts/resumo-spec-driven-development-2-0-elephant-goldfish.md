---
title: "Resumo: Spec Driven Development 2.0 — o método do Google para engenharia com agentes de IA (IA em 6 minutos)"
date: 2026-10-30
description: "Resumo do vídeo do canal IA em 6 minutos sobre o Elephant Goldfish Model, a versão 2.0 do Spec Driven Development criada por engenheiros do Google: contexto profundo para criar, contexto zero para criticar."
tags: ["agentes", "ia", "engenharia", "especificação"]
---

> Resumo detalhado do vídeo ["Spec Driven Development 2.0: O método do Google para engenharia com Agentes de IA"](https://youtu.be/xJwegOxj2sc) do canal **IA em 6 minutos**, publicado em outubro de 2026.

O Spec Driven Development que você usa tem um defeito escondido. Engenheiros do Google acabaram de lançar a versão 2.0 e ela tem um elefante e um peixinho dourado. Parece piada, mas milhares de engenheiros do Google já trabalham assim — e é código aberto. Nos próximos minutos, o vídeo explica o que é o Elephant Goldfish Model, por que ele resolve o maior defeito do Spec Driven Development e como usar hoje no Cloud Code ou no Codex.

---

## O defeito escondido do Spec Driven Development 1.0

A versão 1.0 é simples: antes de pedir código, você escreve a especificação — o que construir, as regras, os critérios de aceite — e o agente implementa seguindo esse plano. Já é muito melhor do que sair pedindo código no improviso. Mas tem um problema escondido.

Quem escreve a especificação? O agente, conversando com você. E quem revisa? O mesmo agente, na mesma conversa. Ele já sabe tudo que vocês combinaram. Então, quando revisa, concorda consigo mesmo e concorda com você. Modelos de linguagem têm essa mania: se apegam às próprias ideias erradas e preferem te agradar do que te contradizer. A especificação sai bonita, completa e cheia de buracos que ninguém viu. Você só descobre depois, quando o código já está pronto.

---

## O Elephant Goldfish Model: a versão 2.0

O modelo tem dois papéis — e o nome já explica tudo.

### O elefante nunca esquece

É o agente com contexto total: a história do projeto, a arquitetura, quem usa o sistema e para quê. Ele discute a ideia com você, explora os ângulos, procura onde pode falhar e escreve a especificação.

### O peixinho dourado não lembra de nada

São subagentes com contexto zero. Eles leem só a especificação e o código. Nunca viram a sua conversa. Então, nada do que você disse pode convencer eles. Cada peixinho olha por um ângulo:

- Um pergunta: "Existe um jeito mais simples ou o sistema já faz isso?"
- Outro lê como alguém que nunca viu o projeto
- Outro procura o que quebra quando milhares de pessoas usam ao mesmo tempo
- E outro checa se a especificação está clara o suficiente para o modelo implementar sem chutar nada

O lema é: **desenhe como um elefante, revise como um peixinho dourado**.

### E tem um terceiro papel: você

Os peixinhos geram muitas notas de propósito. Você decide o que entra, resolve os trade-offs e aprova a especificação. A IA desenha e critica. A decisão continua sendo do engenheiro.

---

## Por que o plan mode não resolve isso

Você pode pensar: "Mas o meu agente já tem plan mode". Tem. E funciona assim: você explica a ideia, ele faz duas ou três perguntas e escreve o plano. Tudo na mesma conversa. O plano parece completo, até a hora de implementar. Aí aparecem os casos de borda, você volta, corrige e implementa de novo.

O Elephant Goldfish troca esse ciclo de corrigir depois por uma revisão que acontece antes — feita por quem não tem motivo nenhum para concordar com você.

---

## O fluxo na prática: cinco comandos

1. **Bootstrap**: o elefante mapeia o seu código, pasta por pasta, e documenta o que cada parte faz e quais regras nunca podem ser quebradas
2. **Brainstorm**: ele te faz pergunta atrás de pergunta até a ideia ficar clara. Seis peixinhos atacam a proposta antes dela virar o resumo do conceito
3. **Draft**: a especificação é escrita uma sessão por vez e ele para para você aprovar cada uma. Jornadas críticas do usuário, plano técnico, alternativas consideradas e o passo a passo da implementação
4. **Review**: cinco rodadas de peixinhos. Um único agente consolida os relatórios para não poluir o contexto principal
5. **Implementação**: só depois de a especificação ser aprovada, o agente implementa

---

## Drift Report: a especificação continua sendo verificada depois

A parte que mais impressiona vem depois. O código muda, a especificação fica parada. O drift report compara os dois e aponta onde não batem mais.

Num teste do canal iLabs, ele achou um bug real: lojistas conseguiam apagar produtos que já tinham sido vendidos. A regra dizia que produto vendido só pode ser escondido. A revisão normal não pegou. O peixinho pegou.

Por isso o vídeo chama de Spec Driven Development 2.0: na versão 1.0 a especificação é um documento. Na 2.0 a especificação é testada antes de existir uma linha de código e continua sendo verificada depois. Não é mais um documento que o agente segue — é um contrato que já sobreviveu a um ataque.

> Contexto profundo para criar. Contexto zero para criticar.

---

## Quando NÃO usar

Mas não é para tudo. O próprio Google diz: para um bug pequeno e claro que o agente resolve de uma vez, isso só te deixa mais lento. O lugar dele é na funcionalidade grande — aquela que se der errado custa caro.

---

## Como começar

São dois comandos para começar:

- No **Cloud Code**, você adiciona o marketplace do Google, Elephant Goldfish Model, e instala o plugin EGM
- No **Codex** é parecido: abre uma sessão nova. Se o projeto já existe, roda o bootstrap primeiro para o elefante conhecer o seu código. Depois escolhe uma funcionalidade que precisa de decisão de design e roda o brainstorm

O link está na descrição do vídeo.

---

*Fonte: ["Spec Driven Development 2.0: O método do Google para engenharia com Agentes de IA"](https://youtu.be/xJwegOxj2sc) — IA em 6 minutos, outubro de 2026.*