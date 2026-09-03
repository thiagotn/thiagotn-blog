---
title: "Resumo: Como confiar em agents de IA para escrever código — a analogia com gestão de pessoas (Lauren Tan / Cursor)"
date: 2026-09-02
tags: ["engenharia", "ia", "agentes", "gestão"]
---

> *Resumo da apresentação de Lauren Tan (conhecida como @poteto no Twitter), engenheira do Cursor (ex-Meta/React, ex-Netflix), em sessão ao vivo sobre como escalar o uso de agents de IA para escrever código — da desconfiança total ao auto-merge de 20 PRs por dia. A apresentação foi realizada em 12 de setembro de 2026.*

---

Lauren Tan abriu a apresentação com uma observação pessoal: depois de anos alternando entre IC (individual contributor) e engineering manager na Netflix e no Meta (onde trabalhou no React Compiler), ela percebeu que **gerenciar agents de IA tem paralelos profundos com gerenciar pessoas**. A questão central que norteia todo o raciocínio é simples: *como você confiar em um agent para escrever código?*

## A curva de confiança

Lauren descreve sua jornada pessoal em um gráfico que ela mesma admite não ser científico, mas que captura bem a experiência. Há cerca de um ano, quase ninguém usava agents para codar. Quando você começava, entrava num modo de **micromanagement**: supervisionando cada output, promptando constantemente, incapaz de paralelizar além de um ou dois agents porque mal conseguia confiar no output de um.

> "Você não consegue spawnar cem agents quando não confia nem no output de um."

Ao longo de cinco meses no Cursor, Lauren ascendeu essa curva de confiança. Hoje, ela tem agents fazendo **auto-merge de PRs** — acordou um dia com 20 PRs já merged em main, todos revisados depois do fato. Em agosto de 2026, shipou 1.000 PRs. Em setembro (dia 12), já estava em quase 800. A velocidade é absurda, e ela reconhece que é justo questionar a qualidade — mas defende que, com a configuração certa, dá para chegar lá.

## Verificação: a skill mais importante

Para Lauren, a habilidade mais importante no seu arsenal com agents é **verificação** — a capacidade de um agent executar o código de verdade, tomar CPU traces, heap snapshots, abrir um simulador iOS, ou seja lá como sua aplicação for exposta ao usuário. O agent precisa poder rodar e testar o código que escreveu.

Sem verificação, **você é o gargalo**. O agent escreve código, você abre o dev build, descobre que não funciona, copia e cola screenshots e erros de console de volta para o agent, e fica nesse loop lento e impossível de paralelizar.

### O caso do Agent Window (Glass)

Quando Lauren entrou no Cursor, foi designada para ajudar no Agent Window (codinome interno: "Glass"), uma aplicação React com prazo de lançamento de uma semana. Ela tentava tomar traces de performance no Chrome DevTools e mandar screenshots para o agent, mas o agent não tinha contexto nenhum do que estava vendo — afirmava com confiança ter encontrado o problema, e estava sempre errado.

A solução foi construir uma **skill de verificação** (chamada "Control Glass") que ensina o agent a:

- Abrir a aplicação localmente via Chrome DevTools Protocol (CDP)
- Tomar traces de performance
- Interagir com a UI programaticamente

Mas só isso não bastava. O agent sabia rodar a aplicação, mas não sabia **navegar** — quando alguém reportava "a sidebar está travando", o agent não sabia o que era a sidebar nem como chegar lá. Foi preciso criar um **feature map**: um arquivo que descreve todas as features da UI, como acessá-las (atalhos de teclado, seletores DOM, atributos para CDP), e o mapeamento entre conceitos de usuário e código.

Com o feature map, até relatórios vagos ou screenshots sem descrição passam a ser úteis. Internamente no Cursor há um canal do Slack onde pessoas mandam screenshots com "???" — o agent consegue interpretar e reproduzir o problema porque tem contexto de navegação.

## P-Stack: o plugin que começou como observação

Lauren criou o **P-Stack** (a sigla é de "Potato Stack" — uma brincadeira com Gary Tan, CEO da YC, que tem o "G-Stack"). O P-Stack é um plugin para Cursor que agrega um conjunto de skills e práticas de engenharia que ela desenvolveu observando agentes falharem.

Ela nunca planejou construir o P-Stack. Tudo começou com a skill do Control Glass, e a partir daí foi incremental: toda vez que observava um agent falhando de um jeito específico, criava uma skill para corrigir aquele comportamento. Um exemplo: o agent afirmava com confiança que um bug era causado por X, mas quando ela olhava as tool calls, percebia que o agent nem estava lendo o código relevante. A skill "how" foi criada para forçar o agent a pesquisar e ler código antes de conclusões.

A analogia com gestão: se você tem um engenheiro brilhante em codificação mas sem contexto de negócio nenhum (acabou de ser contratado), você precisa dar contexto, documentação, instruções. Skills são isso — **markdown que codifica conhecimento** e "puxa o agent para um espaço latente mais inteligente" (como alguns descrevem no Twitter).

## Evals: testes de unidade para skills

Manter skills é difícil. Requer "gosto e observação" — ser um bom backseat driver, como em pair programming. Você abre os tool calls, lê os blocos de thinking do agent, observa onde ele falha e constrói uma skill para aquilo.

Para validar mudanças em skills, Lauren usa **evals** — essencialmente testes de unidade para agents. O processo:

1. Um agent coordenador cria um **rubric** (critério de avaliação) para o que a skill deve fazer
2. Ele spawn vários **subagents** em diretórios individuais (com nomes que não indicam que estão sendo avaliados — agents mudam de comportamento quando sabem que estão sob teste)
3. Um **agent judge** de um modelo diferente cruza os resultados para evitar viés
4. O eval produz um **score** que pode ser "hill climbed" — no Cursor, você pode usar `/loop` para iterar até que tudo esteja 10/10

Ela fez o mesmo com a skill de verificação: hill climbing até que a CLI ficasse boa. O Cursor suporta múltiplos modelos, então você pode avaliar uma skill em uma matriz de modelos diferentes.

## Cloud agents: o multiplicador

Depois de confiar localmente, o próximo salto é **cloud agents**. Aí está o verdadeiro poder: você configura verification skills uma vez e elas nivelam não só você, mas toda a equipe e a empresa inteira.

O exemplo: **Benny**, um agent que pega bug reports automaticamente, abre uma instância do Cursor na cloud, usa as mesmas control skills para interagir com a aplicação e tentar reproduzir o bug. Em um dos exemplos mostrados, Benny reproduziu o bug — mas descobriu que já estava fixed em main. Tudo que Lauren precisou fazer foi release outro build. Informação de horas de trabalho obtida em segundos, sem intervenção humana.

> "Não tente pular de 'não confio em um agent' para 'vou spawnar mil cloud agents'. Você vai desperdiçar muitos tokens e vai ser muito caro."

## Refactoring e rewrite: o caso a favor

Lauren faz um caso contraintuitivo para **rewrites**, especialmente em aplicações greenfield. O argumento:

- **Aplicações brownfield** (grandes codebases com guardrails já estabelecidos, como Meta e Google) estão em boa posição. Essas empresas já projetam tudo para o engenheiro menos capaz — frameworks, convenções, guardrails, restrições de credenciais. Antes do "AI slop" já existia o "human slop". Esses guardrails servem perfeitamente para agents.

- **Aplicações greenfield** são o maior risco e a maior oportunidade. Quando você vibe-coda um protótipo (como o Grokbot, lançado no dia anterior à apresentação), humanos não leem o código. Sem guardrails, agents resolvem cada task da forma mais conveniente, e o codebase perde o controle completamente.

O Grokbot foi vibe-coded muito rápido. Lauren passou **mais de 600 PRs** refatorando o Grokbot para uma nova arquitetura (codinome "Dune"). Agora ela não olha mais o código — e diz isso não para vender tokens, mas porque investiu muito para chegar nesse ponto.

## Dune: a arquitetura para agents

Dune é descrito como "Next.js para apps Electron", projetado para agents escreverem código. Os princípios:

### Constraints no codebase

- **Features co-localizadas**: cada feature vive em um único diretório. O agent não precisa procurar onde as coisas estão — abre o diretório da feature e 80% do trabalho está lá.
- **Import blocking**: diretórios `electron-main` e `electron-renderer` têm checks de CI que verificam o dependency graph para impedir imports acidentais entre eles (prevenindo jank de UI por código pesado rodando no renderer).
- **Princípio do caminho mais curto**: agents adoram atalhos. Se o caminho mais curto for o melhor caminho, eles naturalmente farão a coisa certa.

### Constraints no CI

- **`useEffect` banido** em React — CI falha se você usar.
- **Comentários de código banidos** — 99% das vezes, agents escrevem comentários irrelevantes (tipo "Lauren disse para nunca fazer isso" num comentário permanente). Banido tudo.
- **Linters para padrões ruins** observados.
- **Compiler diagnostics** como primeira camada.
- **BugBot** (ferramenta de code review do Cursor) rodando em CI.

### A pirâmide de enforcement

Lauren descreve camadas de enforcement, do mais forte ao mais fraco:

| Nível | Mecanismo | Dureza |
|---|---|---|
| 1 | Arquitetura do codebase (convenção de diretórios, features co-localizadas) | Máxima — agents copiam padrões existentes |
| 2 | Import blocking / dependency graph checks (CI) | Hard fail |
| 3 | Linters / compiler diagnostics (CI) | Hard fail |
| 4 | BugBot (code review automatizado) | Soft — pode esquecer |
| 5 | Rules / skills / style guide | Soft — nem sempre aplicado |

> "Se você confia apenas em rules, skills e style guide, é só uma questão de tempo até seu codebase virar lixo."

O pior lugar para estar é **code review land** — onde você, humano, enforce todas as invariantes lendo código e comentando no PR. Cada vez que você faz isso, deveria pensar: *como transformo isso em uma regra hard, um lint, ou uma falha de CI?*

### Por que Rust é uma vantagem

Lauren nota que Rust está ganhando popularidade novamente justamente porque o compilador é extremamente strict — borrow checker, regras de ownership. Se você proibir `unsafe` blocks, pode ter confiança razoável de que se compila, provavelmente funciona. O compilador faz o trabalho de verificação que um humano teria que fazer manualmente.

## ROI: vale o investimento em tokens?

Lauren reconhece que trabalha num AI lab com tokens ilimitados, e que nem todo mundo está nessa situação. Mas argumenta que é uma questão de ROI:

- Sim, refatorar um codebase custa muitos tokens no início.
- Mas se estamos indo para um mundo onde agents escrevem todo o código, você quer ser enxuto e ágil, não virar uma org de 10.000 engenheiros.
- O valor dos agents não é apenas economizar tokens em cada task — é permitir fazer coisas que você não poderia fazer antes. Lauren, como única pessoa, construiu uma framework que teria levado anos.
- Mesmo agents que não são front-tier passam a escrever código excelente quando o codebase tem constraints fortes.

O ROI se estende: a arquitetura Dune permite que PMs, designers e pessoas de GTM contribuam código diretamente no Grokbot. Um PM pode reportar um bug, fix it, mandar para Lauren revisar — e ela só dá stamp de aprovação.

## Grokbot: o "momento Cursor" para não-tecnicos

Grokbot foi lançado no dia anterior à apresentação (11 de setembro de 2026). É uma aplicação que permite criar agents com identidades próprias e orquestrá-los — numa interface que parece iMessage, muito acessível.

Para Lauren, Grokbot é o "momento Cursor" para pessoas que não são técnicas: PMs usam para resumir o trabalho de engenharia, designers shipam features, e tudo funciona porque a arquitetura Dune tem constraints fortes o suficiente para que contribuições não-especialistas não quebrem nada.

## Síntese: a jornada em 5 passos

| Etapa | O que acontece | Nível de confiança |
|---|---|---|
| 1. Micromanagement | 1-2 agents, você observa tudo, é o gargalo | Zero |
| 2. Skills de verificação | Agent executa código, toma traces, você observa | Baixo-médio |
| 3. Skills de comportamento | Corrige hallucination, força leitura de código, evals | Médio |
| 4. Cloud agents | Benny reproduz bugs, levels up toda a equipe | Alto |
| 5. Auto-merge | 20 PRs merged overnight, você revisa em main | Máximo |

A mensagem central: não há atalho. Você sobe a curva construindo trust incrementalmente, através de skills, evals, verification e constraints. E quando chega no topo, o ganho não é só seu — é de toda a empresa.

---

*Apresentação de Lauren Tan (@poteto), engenheira do Cursor, em sessão ao vivo em 12 de setembro de 2026. Para mais detalhes sobre o P-Stack, procure "pstack cursor" no Google. Para perguntas, Lauren abre DMs no Twitter.*
