---
title: "Resumo: Nativo é agora o futuro do mobile na Shopify (Shopify Engineering)"
date: 2026-09-13
description: "Resumo do post da Shopify Engineering: depois de cinco anos apostando em React Native, o futuro do mobile na Shopify volta a ser nativo — e a IA explica boa parte disso."
tags: ["engenharia", "mobile", "ia", "agentes"]
---

> *Resumo do artigo "Native is now the future of mobile at Shopify", publicado por Mustafa Ali no Shopify Engineering Blog em 10 de setembro de 2026. [Leia o original](https://shopify.engineering/back-to-native).*

---

A Shopify decidiu apostar tudo em React Native em 2020, e essa aposta foi extremamente bem-sucedida. Economizaram tempo construindo funcionalidades apenas uma vez, permitiram que desenvolvedores sem experiência em mobile contribuíssem para os apps, e se livraram de perseguir paridade de funcionalidades entre iOS e Android.

Em janeiro de 2025, o próprio Mustafa Ali escreveu que o futuro do React Native era brilhante e que a Shopify planejava continuar investindo. Era verdade na época. Mas desde então, modelos de código melhoraram drasticamente — e para os apps e o time da Shopify, construir a mesma funcionalidade em Swift e Kotlin deixou de ter o custo que tinha antes.

> "We don't hold on to a decision just because it was successful at the time. When a core assumption changes, we're willing to go back and ask whether it's still the right call."

A premissa central mudou. LLMs mudaram uma das hipóteses fundamentais da decisão de 2020 — então eles reavaliaram a stack mobile do zero. E o que encontraram os levou de volta ao nativo.

## Por que voltar para nativo

A decisão de migrar para React Native em 2020 se baseou em três razões:

1. Parar de construir as mesmas funcionalidades duas vezes
2. Permitir que desenvolvedores trabalhassem em toda a stack
3. Gastar menos tempo perseguindo paridade de funcionalidades e mais tempo entregando valor

React Native entregou consistentemente esses benefícios. Havia custos — otimização de performance, manutenção de áreas fundamentais do framework, atualizações de dependências — mas os benefícios compensavam largamente os investimentos.

A Shopify usa LLMs para construir software desde 2021 (um ano antes do ChatGPT). Inicialmente para implementar funcionalidades, investigar bugs e revisar código. Conforme os modelos melhoraram, a complexidade do trabalho delegado aumentou. Em meados de 2025, os modelos já não estavam apenas ajudando a escrever código mais rápido — estavam fazendo a Shopify questionar se construir software duas vezes ainda significava fazer o dobro do trabalho.

Eles reavaliaram a stack mobile e reconstruíram partes centrais dos maiores apps em Swift e Kotlin usando LLMs. Os resultados foram surpreendentes:

- Agentes conseguiam implementar uma funcionalidade no Android usando a versão iOS como referência, e vice-versa
- Ajudaram desenvolvedores a subir rapidamente e contribuir efetivamente fora da sua stack principal
- Reduziram drasticamente o custo de manter paridade entre plataformas através de especificações, testes e pontos de verificação compartilhados

> "Native still means building and maintaining software on two platforms, that cost has not disappeared. What changed is that agents can now do enough of the implementation, translation, testing, and review work that it's no longer the deciding factor it was in 2020."

Nativo mantém a Shopify mais próxima das capacidades da plataforma e das ferramentas de primeira parte, com menos camadas de framework e dependências entre o código e o sistema operacional. Apps em React Native podem ser rápidos — os da Shopify são — mas os agentes reduziram a vantagem de compartilhar implementação, enquanto as vantagens de construir para cada plataforma permanecem.

## O futuro das bibliotecas open-source em React Native

A Shopify publicou bibliotecas que se tornaram referência em suas categorias. A transição precisa ser limpa e sem surpresas.

### React Native Skia

A Shopify vai patrocinar até o final de 2026. William Candillon continuará trabalhando no projeto além disso — fará um fork do repositório nos próximos meses e publicará sob um novo nome. O repositório original será arquivado quando a transição for concluída.

### FlashList

Com ~2M downloads/semana, é a forma padrão de renderizar listas de alta performance em React Native. A Shopify continuará corrigindo problemas críticos de compatibilidade e está em discussões com várias empresas para assumir a administração de longo prazo.

### Restyle

Base de usuários menor — o repositório será arquivado. Vai continuar funcionando até o final de 2026, depois sem manutenção. Qualquer um pode forkar.

## Como está sendo a migração

A Shopify tem vários apps grandes (Shopify, Shop, Point of Sale, Inbox), com milhões de comerciantes e compradores dependendo deles diariamente.

O debate foi entre migração gradual (brownfield) versus reconstrução do zero (greenfield). Dessa vez, greenfield venceu por três razões:

- LLMs são bons em construir funcionalidades em Swift/Kotlin usando a versão React Native como referência
- Permite começar do zero, sem arrastar restrições anteriores
- Os protótipos mostraram que é possível reconstruir substancialmente mais rápido que antes dos coding agents

### O app Shop

O Shop — regularmente no topo da categoria shopping nas app stores — foi o primeiro a ser migrado. Com auxílio de IA, o time foi de prova de conceito a app nativo publicado nas lojas em apenas **12 semanas**.

### O app Shopify

O maior app da Shopify (300+ telas, widgets de home e lockscreen, app para Apple Watch, complicações, Siri Shortcuts) está em migração e será lançado ainda em 2026. Os demais apps seguirão.

## Evitando código ruim: o sistema Helix

Tentar pedir ao LLM que reconstrua o app inteiro de uma vez não funciona. Mesmo com especificações detalhadas, o resultado é uma quantidade enorme de código inmanutenível que não pode ser publicado.

Para resolver isso, a Shopify construiu um sistema chamado **Helix**. O Helix toma uma abordagem gradual:

1. O desenvolvedor aponta o Helix para uma tela
2. O Helix lê o código React Native e propõe uma sequência de **pontos de verificação** — fatias pequenas e ordenadas do trabalho, revisáveis em minutos
3. Ponto por ponto, ele constrói: cada um precisa provar seu comportamento com testes, passar por revisão visual contra o app rodando, sobreviver a dois revisores de código adversariais, e receber o OK humano antes de ser commitado
4. O feedback de cada revisão é lembrado, tornando o loop mais autônomo conforme a migração progride

> "It doesn't expect the first output to be correct, and builds a loop where an imperfect attempt simply cannot move forward until it becomes a good result."

## Ciclos de feedback rápidos: arquitetura para humanos e agentes

O controle de simuladores por agentes é um gargalo. Agentes podem fazer mudanças de código em segundos, mas levam vários minutos para testar o resultado — primariamente porque dependem da árvore de acessibilidade ou screenshots para entender o estado do app.

A solução: **desacoplar a lógica de negócio da UI** e fazê-la rodar sem interface em desktop. Os agentes acessam via um CLI que permite iterar em milissegundos em vez de minutos, sem envolver simuladores.

O CLI permite que agentes inspecionem o estado do app, naveguem entre seções e executem ações sem precisar tocar na UI. Quando interação com o simulador é necessária, o CLI pode conectá-lo via modo remoto e controlar a UI via comandos — sem precisar inspecionar o layout ou a árvore de acessibilidade. Isso habilita testes E2E extremamente rápidos e permite que agentes trabalhem autonomamente por horas.

## Próximos passos

A Shopify vai migrar todos os apps mobile para Swift e Kotlin usando IA em todo o processo. Não estão abaixando o padrão — cada reconstrução precisa igualar ou superar a performance, estabilidade, acessibilidade e qualidade de produto esperadas. Não são apenas os mesmos apps reescritos em linguagens diferentes — são apps reconstruídos para que tanto humanos quanto agentes consigam entender, testar e modificar rapidamente.

> "The migration isn't the finish line. Success means our teams can deliver better experiences for merchants and buyers faster than before."

Eles vão compartilhar o que aprenderem — incluindo análises profundas sobre o Helix, a arquitetura endereçável por agentes, e como estão construindo mobile apps com agentes.

---

*Artigo original por Mustafa Ali, publicado no [Shopify Engineering Blog](https://shopify.engineering/back-to-native) em 10 de setembro de 2026.*
