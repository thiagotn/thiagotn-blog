---
title: "Resumo: Quando dobrar subagentes no loop do agente principal (Anthropic — Diane Sarkis)"
date: 2026-10-22
description: "Resumo do artigo da Anthropic sobre quando consolidar subagentes no loop principal do agente — progressão de falhas comuns em empresas até o design de loop único com skills e tool search."
tags: ["agentes", "ia", "engenharia", "anthropic"]
---

> Resumo detalhado do artigo [“Building agents: When to fold subagents into your main agent loop”](https://claude.com/es/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop), publicado por **Diane Sarkis** (Applied AI team, Anthropic) em 22 de outubro de 2026 na Claude Platform.

Subagentes — agentes com seu próprio context window, ferramentas e instruções, orquestrados por um coordenador — são um componente central do design de agentes. Eles são eficazes em verificação, trabalho paralelo e permissões modulares. A Anthropic os usa em muitos de seus próprios agentes, como o sistema de pesquisa multi-agente.

No entanto, recentemente a equipe de AI Aplicada encontrou um padrão em deploys enterprise que se beneficia de **dobrar roteadores, planejadores e subagentes de domínio no loop principal do agente**. Em comparações entre vários deploys enterprise, um agente único com skills frequentemente superou tanto o design de um prompt para tudo quanto o design com subagentes em qualidade — e frequentemente com menor custo e latência por task.

O artigo explica quando considerar essa migração e as melhores práticas aprendidas com a construção de agentes em grandes organizações.

---

## Quando subagentes ainda fazem sentido

Subagentes ainda têm seu lugar, inclusive na fronteira de pesquisa. Use-os quando:

- Um loop de agente único atinge degradação mensurável de performance por excesso de contexto, ou
- Múltiplas tarefas precisam ser resolvidas em paralelo com context windows novas que podem ser descartadas após a conclusão, ou
- Um agente único tem dificuldade de selecionar ferramentas apropriadas ou há instruções conflitantes no system prompt.

Mas com muita frequência, empresas dão a cada equipe ou tipo de problema seu próprio subagent — e a arquitetura do agente vira uma cópia do organograma da empresa (a Lei de Conway em ação).

---

## Modos de falha na construção de agentes em grandes organizações

Empresas frequentemente querem construir um agente que una múltiplos produtos e capacidades numa única interface para o cliente. Tipicamente, cada capacidade pertence a uma equipe separada, então começam deixando cada equipe construir seu próprio agente, e uma equipe central de plataforma constrói um orquestrador por cima. Isso pode tomar várias estruturas: orquestrador-subagente ou um agente único com agentes específicos expostos como ferramentas MCP.

Isso parece a solução mais simples, mas introduz complexidade imediata em:

- **Gerenciamento de contexto**: você precisa decidir que contexto é trocado entre agentes e frequentemente perde detalhes no vai e volta.
- **Proliferação de subagentes**: cada equipe publica seu próprio subagente, então a empresa acaba com centenas de subagentes sobrepostos sem padrões enforcement e sem dono específico.
- **O Frankenprompt**: cada equipe adiciona uma frase ao system prompt, resultando em regras conflitantes e sem voz consistente.
- **Evals não auditados e excessivamente localizados**: cada um adiciona seus próprios evals, super-otimizados para sua subtarefa. Ninguém é dono ou mantém o conjunto inteiro, e a liderança toma decisões com base em scores diluídos e localizados demais.
- **Latência**: a complexidade da arquitetura multi-agente adiciona latência. Um cliente que avaliou seu harness multi-agente contra um loop de agente único viu ~2x mais rápido com o segundo.

---

## Usando um loop de agente com disclosure progressivo

O design orquestrador-subagente é uma abordagem razoável para coordenar especialistas construídos por equipes diferentes, mas frequentemente uma abordagem mais eficaz é **disclosure progressivo de contexto via skills** e **disclosure progressivo de ferramentas via tool search**. Em outras palavras: o agente vê descrições curtas das skills e ferramentas, que são carregadas por completo apenas quando necessário.

Há três razões para essa abordagem fazer sentido:

1. **Context compartilhado produz respostas melhores**: para agentes de longa duração, queremos que o contexto de várias tarefas diferentes fique no context window principal. Um agente que viu o resultado de cada passo anterior consegue conectá-los, o que leva a outputs mais ricos e insights melhores do que um conjunto de resumos entregues por subagentes. Também significa menos context windows e menos handoffs com perda de informação.

2. **Disclosure progressivo previne inchaço de contexto**: essa técnica permite que equipes construam agentes únicos que conseguem realizar uma ampla variedade de tarefas sem exigir que todo o contexto seja carregado imediatamente num system prompt longo. Isso elimina a principal razão pela qual equipes anteriormente dividiam trabalho em subagentes. De fato, a Anthropic reduziu o system prompt do Claude Code para modelos mais avançados em mais de 80% — incluindo cortes relacionados a disclosure progressivo de skills e ferramentas.

3. **Modelos são mais capazes**: a partir do Opus 4.5, modelos se tornaram capazes de gerenciar muito mais num loop único do que a maioria das equipes esperava. Não dá para desligar o thinking no Opus 5.5 e no Fable 5.1, e modelos recentes cada vez mais narram seu progresso e checam seu próprio trabalho conforme avançam — o que torna alguns elementos do harness redundantes. Cada novo modelo permite mover mais da tomada de decisão do harness para o próprio modelo. Um loop mais simples também é mais fácil de migrar para o próximo modelo; em migrações que a Anthropic ajudou clientes, estruturas multi-agente rígidas foram frequentemente o que impediu o novo modelo de fazer mais do trabalho.

O design de loop único exige disciplina: um system prompt cuidadosamente gerenciado, descrições de skills e ferramentas que disparam no momento certo, e tratamento deliberado de context windows, memória e anotações. Uma equipe central pequena deve ser dona da qualidade end-to-end e do system prompt, auditando cada nova ferramenta e eval antes de publicar. Manter essa equipe central pequena ajuda a iteração a se mover rápido e reduz o custo de coordenação numa organização grande.

Se você for pelo caminho multi-agente, comece com o padrão mais simples (gerador-verificador, orquestrador-subagente, ou outro) que possa funcionar. Divida os limites de forma eficaz dividindo por contexto: dê a cada subagente um pedaço de trabalho que precisa pouco do resto do sistema e que devolve um resultado compacto (bons candidatos são caminhos de pesquisa independentes, componentes separados com interfaces limpas, ou verificação black-box). Quando agentes são divididos por tipo de problema, eles se engajam num "telefone sem fio", passando informação de um lado pro outro com cada handoff degradando a fidelidade.

---

## Como dobrar subagentes no loop do agente principal

Muitas equipes já têm um orquestrador e um conjunto de agentes especialistas em produção. O design de loop único que a Anthropic sugere trabalhar em direção:

- **Um modelo e um context window** rodando um loop aberto de ferramentas, com limites (orçamentos de turn e custo, write gates) definidos no harness.
- **A cada turno**, o modelo emite um batch de tool calls. O harness executa em paralelo e retorna resultados crus para o mesmo modelo, que decide o próximo passo: outro batch, uma pergunta ao usuário, ou uma resposta.
- **O loop para** quando o modelo responde ou atinge um orçamento. Uma checagem de goal ou verificador pode rodar opcionalmente após a resposta.
- **O modelo escreve seu plano no contexto** no primeiro turno e o revisa conforme resultados chegam. Essa é a principal mudança do setup orquestrador e agentes especialistas: o modelo que escreve o plano é o mesmo que o executa, então pode mudar o plano no meio do turno.
- **Contexto continua sendo carregado**, mas é gerenciado pelo próprio agente:
  - Um passo de código que reescreve o plano a partir de um catálogo de regras não é mais necessário, já que o modelo decide cada passo.
  - Ordenação e procedimento de domínio vão para skills.
  - Limites rígidos (validação, approval gates) e qualquer outra coisa que surgir no meio da conversa (ex: busca em memória) vão para as ferramentas.
  - Código ainda pode ser usado para carregar qualquer coisa barata e quase sempre relevante (ex: um passo de resolução de entidade), e para lidar com partes mecânicas (construção de payload, parse de stream, retomar uma clarificação) dentro de ferramentas que o loop chama.

Esse design de loop único também ajuda com o estado final que muitas equipes buscam — um agente que entende os objetivos de alto nível do usuário e age em seu nome — porque mantém tudo que o agente aprendeu num contexto só.

---

## Evals de conclusão de tarefa

O primeiro passo é criar um conjunto de evals que ajude a determinar se você deve dobrar um subagente no loop principal. A estrutura de eval que funcionou: um conjunto end-to-end compartilhado, de dona de uma equipe central, com conjuntos menores de evals publicados com cada skill pela equipe que a mantém. Mesmo um conjunto de 10 exemplos dourados já é suficiente para começar.

Avaliar a mensagem final do agente contra um rubric é um bom ponto de partida para rastrear qualidade de resposta. Enquanto ainda há um orquestrador, rastreie também a precisão de roteamento (ele escolheu o subagente certo?). Uma vez que um subagente é dobrado, cheque em vez disso se o agente carregou a skill certa ou chamou a ferramenta certa. Trabalhar em direção a evals de conclusão de tarefa ao longo do tempo é útil porque é o que mais importa ao comparar arquiteturas.

Isso pode ser complexo em ambientes onde sistemas internos são difíceis de reproduzir e o engajamento do usuário é difícil de simular. Uma abordagem que funcionou internamente: registrar timestamps em eventos importantes, para que possam ser reproduzidos depois e rodados como evals direcionados.

---

## Reduzindo subagentes ao longo do tempo

Evoluir para um loop de agente único envolve dobrar os subagentes em ferramentas e skills. Isso pode ser feito mesclando subagentes de domínio, chamando-os como ferramentas, ou substituindo-os por skills e ferramentas.

### Combinando agentes de domínio

Construa um eval end-to-end pequeno antes da primeira fusão. Depois dobre por contexto compartilhado, começando pelos subagentes que mais são usados. Funde especialistas que encadeiam na saída um do outro, tocam os mesmos dados, ou são frequentemente chamados juntos. Por exemplo, se uma parcela significativa do tráfego de produção é um especialista seguido por um segundo, esse é um par fortemente acoplado — candidato a ser fundido num único agente de domínio.

### Subagentes chamados como ferramentas

Quando uma das três condições acima se aplica e você mantém um subagente, pode ser eficaz fazer o agente principal chamar subagentes como ferramentas, para que ele continue segurando a conversa com o usuário. A Anthropic só recomenda um handoff completo — onde o subagente assume a conversa — quando ele precisa falar com o usuário diretamente. Todo o resto pode ser skill mais ferramentas no loop principal.

Isso permite definir um schema de resposta compartilhado para subagentes, verificar a conclusão contra dados reais com o agente principal, e aparar a entrada para qualquer passo de síntese final. É um bom primeiro passo, já que não precisa reescrever os subagentes. Também dá uma baseline no eval de conclusão de tarefa antes de decidir dobrar qualquer subagente.

No entanto, alguns modos de falha permanecem:

- Cada especialista tem seu próprio prompt, contexto, equipe dona e evals.
- Cada chamada ainda devolve um resumo com perda de informação.
- Cada chamada é um loop de modelo aninhado que adiciona latência.

### Dobrando subagentes no agente principal via skills e ferramentas

Dobre subagentes no agente principal um de cada vez, transformando o prompt de cada um em skills e as chamadas de API em ferramentas MCP. Compare a performance do eval com e sem o subagente. Então decida quais manter.

Ao comparar, não examine só o score final — olhe quais tarefas fliparam. Quando a Anthropic testou isso num agente de suporte de exemplo, dobrar um subagente em outro baixou a latência, mas também quebrou um processo que estava passando. O agente principal estava segurando a ferramenta de lookup de pedidos e respondendo por conta própria, sem pedir ao especialista de envio a data de entrega.

Antes de cada mudança, garanta que o eval tenha uma tarefa para cada cadeia de agentes que roda junto em produção e para cada regra que o agente não pode quebrar. E rode cada tarefa mais de uma vez, já que uma quebra como essa só apareceu numa execução de cada duas.

---

## Como várias equipes podem contribuir para um único agente

Raciocínio de domínio pode ser obtido a partir de bases de conhecimento, skills e ferramentas MCP. Equipes individuais podem mudar sua propriedade de agentes para skills e ferramentas, com uma pequena equipe central mantendo propriedade do system prompt e qualidade end-to-end. Isso envolve auditar novas skills, ferramentas e evals antes de publicar.

### Ferramentas MCP

Ferramentas são o encaixe certo quando o agente precisa tomar uma ação, ler dados ao vivo de um sistema, ou retornar um resultado num formato fixo. Também dá para usar ferramentas como uma forma de continuar chamando subagentes durante a migração. A recomendação é agrupar ferramentas por intenção do usuário (não uma ferramenta por API), porque depois de exceder 30-50 definições de ferramentas no system prompt, a escolha de ferramenta tende a degradar.

Use tool search com carregamento diferido, limite pré-condições rígidas, e mova qualquer pré-condição necessária para dentro das ferramentas. Por exemplo, se Y precisa da saída de X, a ferramenta Y verifica isso e retorna uma instrução que o modelo pode agir. Permissões por usuário funcionam igual: cada ferramenta verifica o que o usuário chamador pode ver ou fazer e retorna uma recusa simples que o modelo lê, então um loop consegue servir usuários com acessos diferentes sem um agente separado por nível de permissão.

### Skills

Skills são o encaixe certo quando o agente precisa saber como uma equipe faz o trabalho — os passos, regras e julgamentos que o prompt de um subagente especialista costumava deter.

A abordagem da Anthropic para crescer bibliotecas de skills é dar o trabalho de manutenção de volta às pessoas que escrevem as skills. Claude pode fazer o trabalho pesado com skills que podem construir, testar e aparar outras skills.

Para prevenir proliferação de skills, equipes podem ter DRIs (directly responsible individuals) como donas de suas skills, garantindo que sejam bem-feitas, distintas e publicadas com evals apropriados.

- `/skill-creator` permite escrever novas skills que começam bem formadas, e auditar existentes para aparar, deduplicar e reestruturar.
- `/skill-doctor` permite ver quanto cada skill na sua biblioteca custa e com que frequência é realmente usada, e deletar peso morto.

### Bases de conhecimento

Bases de conhecimento são o encaixe certo para material de referência que o agente só precisa parte do tempo. Fatos e material de referência (políticas, definições de métricas, especificações de produto) podem ficar atrás de uma ferramenta de busca ou lookup que o modelo chama, ou virar arquivos de referência dentro de uma skill. Evitar que código recupere e cole esse contexto em prompts.

---

## Ferramentas para acelerar esse trabalho

A Anthropic lançou um conjunto de skills da Claude API que ajudam com a maior parte do trabalho mencionado. O migration kit encadeia essas skills num fluxo guiado para avaliar e mover sistemas multi-agente para um loop de agente único. Inclui uma demo para experimentar antes de rodar no sistema real:

- **`/claude-api build-eval`**: ajuda a criar um primeiro conjunto end-to-end de propriedade da equipe central, ou pequenos evals que cada equipe publica com sua skill.
- **`/claude-api prompt-audit`**: sinaliza instruções escritas para modelos mais antigos nos seus prompts, skills e descrições de ferramentas, e propõe correções como diff. Pode ser rodado nos system prompts para encontrar regras que foram adicionadas para um modelo anterior e agora estão deixando o agente mais lento ou rígido. O DRI de cada equipe também pode rodar nas suas próprias skills e descrições de ferramentas.
- **`/claude-api hillclimb`**: melhora iterativamente um app contra um eval existente. Pode ser usado para a comparação "dobrado vs mantido" — depois de dobrar um subagente em skill mais ferramentas, deixar iterar nas descrições de skill e ferramenta e ver se a versão dobrada iguala ou supera o subagente — bem como no system prompt.
- **`/claude-api cost-optimize`**: perfila por onde suas chamadas vão e propõe economias com opções como prompt caching, aparar tokens de entrada e saída desnecessários, effort e escolha de modelo — uma mudança de cada vez.

---

## Conclusão

Conforme modelos evoluem, a compreensão de como melhor usá-los e as melhores práticas evoluem também. Isso torna qualquer arquitetura individual menos importante que o princípio por trás dela: **meça, mude uma coisa de cada vez, e mantenha o que aguenta**.

Esse é um desses casos. Conforme modelos ficam mais capazes e agentes rodam por mais tempo, mais dos seus subagentes podem virar skills e ferramentas. Não precisa fazer essa mudança de uma vez. Construa um eval end-to-end pequeno, dobre um subagente, e só o mantenha como subagente se a versão dobrada pontuar pior — depois repita o processo.

---

*Post original: [“Building agents: When to fold subagents into your main agent loop”](https://claude.com/es/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop) · Diane Sarkis (Anthropic) · 22 de outubro de 2026*