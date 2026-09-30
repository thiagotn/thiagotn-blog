---
title: "Resumo: Consertando o gargalo dos PRs — freios, não só aceleradores (Matt Pocock / AI Engineer)"
date: 2026-09-30
description: "Resumo da palestra de Matt Pocock no AI Engineer: como layered checks, code review com agents e retrosativas transformam o gargalo de PRs em um sistema que acelera sem virar uma máquina de código ruim."
tags: ["engenharia", "ia", "agentes", "code-review", "pr"]
---

> *Resumo da apresentação de Matt Pocock no canal AI Engineer, sobre como consertar o gargalo dos pull requests na era dos agents de IA. A palestra foi publicada em 25 de setembro de 2026.*

---

Matt Pocock abre a palestra com uma constatação que qualquer engenheiro reconhece: **pull requests sempre foram o gargalo**. Historicamente, já existiam pilhas de PRs esperando revisão que ninguém olhava. Com a chegada dos agents de IA, o problema se agravou drasticamente — mais PRs, mais código, mais pressão para fazer mais com menos. A promessa central da IA é escalar pessoas para produzir mais, mas sem os mecanismos certos, isso vira uma máquina de código ruim ("slop cannon").

## Software factory: aceleradores e freios

Matt descreve o conceito de "software factory" — a palavra da moda do momento. A ideia central é que, em vez de humanos iniciando todo o trabalho, **agents iniciam parte dele**: um classificador recebe um bug report, cria uma reprodução, dispara um fix. Query reports de banco de dados lentos acionam mudanças. Tudo isso é código determinístico acionando mais código — não humanos.

Mas acelerar sem freios é receita para desastre. Se você só empurra código pela factory, termina com um monte de PRs ruins que ninguém consegue revisar. Os **freios** são mecanismos que aumentam a qualidade e evitam que a codebase vire uma bomba de entropia — porque o código é o ambiente onde o agent opera, e código ruim gera mais código ruim.

Matt identifica **três camadas de freios**, formando um bolo:

1. **Checks automatizados** — linters, testes, type checking, métricas de qualidade. Determinísticos, baratos (custam ciclos de CPU, não tokens nem esforço humano).
2. **Revisão automatizada** — agents que analisam o código em busca do que os testes não capturam.
3. **Revisão humana** — pessoas olhando o PR.

O objetivo é tornar a revisão humana mais rápida apoiando-se nas duas primeiras camadas. Menos código ruim chega ao humano, menos intervenção é necessária.

---

## Checks automatizados podem mentir

A primeira grande lição: **CI verde não significa que o código está pronto para merge**. Matt mostra três tipos de testes que parecem úteis mas são na verdade mentiras:

### Testes tautológicos

Um teste que apenas reafirma a implementação. Exemplo real: uma constante `X_POST_CHARACTER_LIMIT = 280`. O teste escrito pelo agent era simplesmente `expect(X_POST_CHARACTER_LIMIT).toBe(280)` — ou seja, se você mudar a constante, o teste falha, mas o teste não está verificando comportamento nenhum, está apenas reafirmando o que o código já diz. Esses testes são extremamente sensíveis à estrutura: você não pode renomear a constante nem refatorar sem quebrar o teste, mas ele não captura bugs reais.

### Testes sensíveis à estrutura

Um caso ainda pior: um teste que verificava se duas seções da UI apareciam na ordem correta (seção de vídeos depois do content plan). Em vez de renderizar a UI, o teste **lia o arquivo do módulo na memória**, procurava as strings "content plan" e "videos" e verificava se a segunda aparecia depois da primeira no código-fonte. Se você mudar a aparência do código-fonte — formatar, reorganizar imports, qualquer coisa — o teste quebra. É um teste que não testa nada real.

### Testes que não podem falhar

Um teste com tanto mocking que se torna impossível de falhar. O exemplo: um hook `useAudioBoost` que usa a Audio Context API do DOM, que tem modos de erro complicados. O teste stubava tudo com métodos fake, e nenhum desses modos de erro era exercitado. Resultado: estranhos erros em produção que os testes nunca capturam.

---

## Como tornar os checks mais difíceis de enganar

### Design da codebase: módulos profundos

Matt defende a ideia de John Ousterhout (do livro *Philosophy of Software Design*): **deep modules** — módulos que escondem comportamento complexo atrás de uma interface simples. Um módulo profundo tem uma interface pequena e uma implementação grande. Um módulo raso tem uma interface grande com funções que não fazem muito individualmente.

Com módulos profundos, os testes naturally ficam menos sensíveis à estrutura — você testa pela interface, não alcançando detalhes internos. O trabalho do engenheiro é forçar os agents a usar essa interface em vez de mergulhar na implementação.

Matt menciona uma skill sua que analisa a codebase e sugere oportunidades de aprofundar módulos — reduzindo duplicação, criando módulos testáveis. Ele também define um vocabulário para descrever codebases: **locality** (quão bem localizado o código está — uma mudança pequena em um módulo se propaga?), **leverage** (o valor que quem chama um módulo profundo recebe de uma interface simples) e **seams** (pontos de separação).

### Não coloque coding standards no agent implementador

Aqui Matt é categórico: a maioria das pessoas erra isso. O agent implementador já está sobrecarregado — precisa explorar a codebase, implementar a mudança, e debugar verificando os checks. Se você também jogar os coding standards nele, o desempenho piora.

A solução é um **agent de code review** separado, rodando em um sub-agent com seu próprio contexto e orçamento. Ele recebe o diff, lê um arquivo `coding-standards.md` customizável, e verifica conformidade. Esse agent está **sub-carregado**: só precisa fazer um pouco de exploração e revisão — não implementa nem debuga. Dá para empilhar muitos coding standards nele sem degradar a performance.

Matt formula isso como um processo de duas partes para escrever bom código:

1. **Implementar** — fazer funcionar (red-green)
2. **Code review** — fazer ficar bom (refactor)

Para devs com background TDD, é o clássico red-green-refactor, mas em **duas janelas de contexto separadas** — uma para implementar, outra para revisar e refatorar.

### O reviewer deve commitar, não só comentar

A tendência natural é fazer o agent de revisão comentar no PR. Mas isso só gera mais trabalho para o revisor humano, que precisa ler comentários verbosos e decidir o que implementar. O padrão deve ser: o **reviewer commitar correções** diretamente. Só comenta se tiver dúvidas genuínas. Quando o humano chega, revisa um artefato limpo.

### Não terceirize a revisão automatizada

Matt é cético sobre serviços de code review genéricos (CodeRabbit, Cursor Bug Bot). Tentou criar uma skill genérica que encontra bugs e faz security review — descobriu que é muito difícil: ou fica genérica demais (falsos positivos irrelevantes) ou específica demais (só funciona para TypeScript, por exemplo). A recomendação é construir o seu próprio, acumulando coding standards ao longo do tempo e compartilhando com o time.

---

## PRs amigáveis para humanos

Chegamos na terceira camada: revisão humana. Como maximizar a qualidade do PR para quem vai revisá-lo?

### One-way door vs two-way door

Usando terminologia da AWS: um **two-way door** é uma mudança reversível — você pode dar merge e reverter depois. A maioria dos PRs é assim. Um **one-way door** é irreversível: mandar um email para 60 mil pessoas por engano, migrations caras, perda de dados. Esses precisam de revisão cuidadosa.

### Blast radius e merge danger

Além de saber se é reversível, é preciso entender o **raio de explosão**: o que pode dar errado, e quão grave seria. Matt inclui um resumo de "merge danger" no final dos PRs: é two-way door? O blast radius é localizado? Se sim, o revisor pode relaxar — não precisa de atenção profunda.

### Pseudocódigo e diagramas

Para entender o que o PR faz, Matt usa pseudocódigo e diagramas. Ele credita a skill "show me" do repositório Human Layer Skills (por Dex Hadley) — que dispensa texto e mostra mudanças em imagens e diagramas. Diagramas mermaid, UML de sequência, e diagramas simples de CLI com flags novas — fazer o entendimento do "porquê" ser o mais rápido possível.

---

## Retro: a revisão que compõe

O último insight é o mais profundo: **o processo que produz o código é tão importante quanto o código em si**. Quando você faz revisão humana, não está apenas revisando o código — está revisando o sistema que o cria.

O princípio: você nunca quer escrever o mesmo comentário duas vezes. Nunca quer pegar o agent fazendo o mesmo erro em PRs diferentes.

Matt anuncia a skill **Retro** (de retrospectiva). Ela pega uma sessão de agent, um PR, ou um conjunto de PRs e reviews de uma semana inteira, e faz uma retrospectiva. O Retro sugere:

- Novos **checks automatizados** para capturar problemas recorrentes
- Atualizações para o **coding-standards.md**
- Ponteiros de navegação no **agents.md** — facilitou para o agent encontrar informação?
- Economia de ferramentas — há tools que poderiam ser mais eficientes em tokens?
- Bloat — steering files ou skills inchados que contribuem para resultados ruins?

O efeito é **composto**: cada revisão humana melhora a qualidade da próxima. Menos trabalho futuro para você.

---

## Conclusão

Matt fecha com o resumo do sistema: três camadas de freios. Checks automatizados baratos e abundantes. Revisão automatizada com coding standards próprios, onde o agent commita correções. Revisão humana focada nos one-way doors, com PRs que incluem merge danger e diagramas. E Retro fechando o ciclo — transformando cada revisão em melhoria do sistema.

A mensagem central é contraintuitiva: para ir mais rápido, você precisa de melhores freios. Não se trata de reduzir a revisão, mas de **investir na revisão certa** e fazer cada uma delas contar para a próxima.

---

*Palestra de Matt Pocock no canal [AI Engineer](https://www.youtube.com/@AIEngineer), publicada em 25 de setembro de 2026. Duração: 22min35s. [Vídeo original](https://youtu.be/LlgiOCmFG_w).*
