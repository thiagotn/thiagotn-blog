---
title: "Resumo: SimulationMaxxing — como a Nubank publica agentes 20× mais rápido com simulação (AI Engineer — Aman Gupta e Shreya Rajpal)"
date: 2026-11-17
description: "Resumo da palestra de Aman Gupta (Nubank) e Shreya Rajpal (Snowglobe) sobre como simulação de dados de avaliação acelera em 20× o ciclo de deploy de agentes de IA — resultados em produção, mecânica da simulação e takeaways práticos."
tags: ["agentes", "ia", "engenharia", "nubank", "avaliação"]
---

> Resumo detalhado da palestra ["SimulationMaxxing: How we ship agents 20× faster"](https://www.youtube.com/watch?v=KMR_RBoCa4M) de **Aman Gupta** (Principal ML Engineer, Nubank) e **Shreya Rajpal** (CEO, Snowglobe), publicada pelo canal **AI Engineer** em 29 de julho de 2026.

A tese central da palestra é uma só: **se você gera seus dados de avaliação em simulação em vez de esperar por dados de produção, você publica agentes 20× mais rápido.** E a Nubank tem provas em produção disso.

A Nubank é o maior banco digital da América Latina, com 135 milhões de clientes no Brasil, México e Colômbia, e lançamento nos EUA iminente. A receita trimestral ultrapassou US$ 5 bilhões no Q1 2026, com NPS altíssimo. É o cenário perfeito para agentes de IA no atendimento: especialistas humanos fanáticos por cuidado ao cliente trabalham junto com agentes que resolvem problemas de forma rápida, empática e correta. A IA cuida de muita rotina end-to-end; humanos focam nos casos mais difíceis e de cauda longa.

Os resultados: o TNPS (uma medida de satisfação do cliente) de cinco agentes de IA em produção aumentou dramaticamente ao longo de poucos meses, com muitos se aproximando — e alguns superando — a qualidade humana. Há um paper do KDD sendo apresentado em agosto na Coreia.

---

## Por que avaliações importam (e por que são o gargalo)

Avaliações são sobre duas coisas: métricas e dados. Para métricas, existe um playbook consolidado — classificadores estilo "LLM como juiz" alinhados com julgamento humano, otimização automática de prompts, técnicas de autoprompt tuning. O que continua desafiador e não resolvido é: **qual é o dado que você está computando essas métricas em cima?**

Para agentes, isso é muito mais caro do que para ML tradicional ou mesmo para chatbots de turno único. Cada ponto de dado de um agente multi-turn é uma **trajetória** com múltiplas chamadas internas de ferramentas, estado que precisa permanecer consistente entre chamadas — só um ponto de dado já é caro de gerar e anotar, e escalar isso é ainda mais difícil.

Hoje, equipes conseguem dados de avaliação de duas formas:

1. **Criação manual** — extremamente demorada. Você precisa planejar manualmente as atualizações de estado, a trajetória que o agente deve seguir, e manter consistência entre todas as chamadas de ferramenta.
2. **Rastros de produção** — quase de graça, você já os obtém de qualquer jeito. Mas o custo é que você está testando em usuários reais a cada experimento, e fica muito difícil rodar muitos experimentos paralelos em escala.

---

## Como simulação encurta o ciclo de release

Mudar o harness do agente (prompt, ferramentas, LLM) leva algumas horas no melhor caso. Rodar avaliações offline em dados curados à mão leva alguns dias. Já um teste A/B em produção monitorando regressões com feedback de cliente pode levar uma eternidade — o feedback é esparso, ruidoso, e demora para saber se você está indo na direção certa.

A Nubank verificou em produção que **simulação curto-circuita essa linha do tempo**: de semanas para menos de um dia, às vezes poucas horas ou minutos. Com simulação, mudar o harness ainda leva algumas horas, mas rodar avaliações offline fica muito mais fácil porque você tem um usuário simulado para recorrer — não está esperando por dados curados à mão nem por pessoas criando dados para você. E a melhor parte: saber se a versão vai bem em produção leva apenas algumas horas.

### O que é mecanicamente uma simulação

Simulações existem há muito tempo em robótica e outros domínios, mas para avaliação de agentes significam uma coisa específica. É aqui que o Snowglobe entra e provisiona a infraestrutura central. O processo:

1. **Wrap do agente** — o SDK do Snowglobe aponta para o seu agente sem exigir mudanças de código. Você declara quais ferramentas precisam ser mockadas para a simulação funcionar.
2. **Steering** — quem são as personas, quais são os casos de uso, quais os pontos de dados que você quer simular.
3. **Execução** — o Snowglobe roda a simulação e gera na saída:
   - Um dataset de milhares de conversas multi-turn contra seus agentes reais, com ferramentas mockadas e tudo o que precisa para ser útil na avaliação.
   - Judges rodando em cima do dataset, gerando informação por turno sobre como o agente está se comportando.
   - Tudo isso pipado direto para o seu pipeline de avaliação — dados sob demanda.

### Exemplo concreto de uma persona simulada

Uma persona simulada: "Maria Souza", 34 anos, designer, cliente de cartão de crédito pela primeira vez. Além dessa informação básica, a simulação também gera dados de grounding essenciais — um endereço falso, um cartão de crédito falso — que permanecem consistentes ao longo da execução do agente. O agente consegue identificar quem é a usuária, verificar o endereço, e tudo é ancorado em dados de conta consistentes. O tom e a voz da persona também são definidos: essa usuária interage com mensagens curtas e diretas, por exemplo, porque foi assim que a persona foi configurada.

---

## O loop de auto-melhoria

O tema da conferência deste ano era agentes que se auto-melhoram. O loop da Nubank:

1. **Publique** o agente
2. **Observe** em produção
3. **Crie avaliações robustas** usando otimização automática de prompts com algoritmos como DAPA
4. **Rode simulação** e pipe dados simulados e reais através das avaliações
5. **Otimize o harness** do agente com o sinal rico das avaliações
6. **Verifique** e **publique** novamente

Isso permitiu muitos testes A/B por agente, e a Nubank tem muitos agentes em toda a empresa.

---

## Resultados e findings

**Correlação sim vs. real**: a qualidade medida por avaliações em simulação e em dados reais tem correlação alta. 80% dos rótulos de especialistas de domínio confirmaram que simulações geram dados utilizáveis — não apenas para agentes maduros, mas também para agentes greenfield (novos do zero).

**Derisking**: a simulação pegou regressões que teriam ido para produção. Em outro caso, pegou um problema que teria reduzido a taxa de autoatendimento. Um agente teve o TNPS **dobrado** graças à simulação combinada com avaliações robustas.

**Eficiência**: a equipe usa o Snowglobe para testar diferentes ideias antes de lançar testes A/B. Em vez de 10 testes A/B por trimestre por agente, roda várias configurações na simulação e lança apenas um teste A/B — curto-circuitando os primeiros cinco ou seis. A taxa de autoatendimento não foi comprometida — melhorou em todos os agentes, num caso específico em 4%.

**Teste de modelos open source**: com a quantidade de modelos open source sendo lançados, a Nubank usa simulação para testar múltiplos modelos no harness do agente e no setup de avaliação para ver quais funcionam melhor. Isso economizou múltiplas semanas de esforço. Testes A/B estão rodando para verificar se esses modelos são tão bons quanto os modelos de fronteira.

---

## Três takeaways

1. **Gere dados de avaliação em simulação** em vez de depender apenas de produção. Isso curto-circuita o gargalo de release de versões de agentes.
2. **Feche o gap sim-vs-real**. Monte métricas de revisão offline/online/humana para entender como a simulação se compara a dados reais de produção, para confiar nos resultados.
3. **Dados e métricas alinhadas**. Se você tem métricas alinhadas que capturam os sinais que importam e uma forma confiável de gerar dados para essas métricas, é fácil montar um loop de auto-melhoria — que é para onde o campo está indo.

---

*Palestra de Aman Gupta (Nubank) e Shreya Rajpal (Snowglobe), publicada pelo canal AI Engineer em 29 de julho de 2026. Duração: 16 min 29 s. [Assistir no YouTube](https://www.youtube.com/watch?v=KMR_RBoCa4M).*