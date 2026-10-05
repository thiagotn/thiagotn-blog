---
title: "Resumo: O guia do Staff Engineer para inventar trabalho (Sujith Jayapal)"
date: 2026-10-04
description: "Resumo do artigo de Sujith Jayapal sobre como staff engineers em times de plataforma descobrem e inventam trabalho a partir de quatro tipos de sinais: sistemas, usuários, organização e indústria."
tags: ["engenharia", "gestão", "plataformas"]
---

> *Resumo do artigo "A Staff Engineer's Guide to Inventing Work", de Sujith Jayapal, publicado em 22 de setembro de 2026. O texto original está disponível [em inglês no blog do autor](https://sujithjay.com/inventing-work).*

---

Times de plataforma são guiados por engenharia, não por produto. Quase nunca há um gerente de produto te entregando um roadmap, nenhuma linha de receita para seguir, e nenhum mercado a perder. Isso significa que **o trabalho não existe a menos que um engenheiro o invente**. A luta contínua é encontrar formas de aumentar o valor que a plataforma fornece aos usuários do sistema. Grande parte do trabalho de um staff engineer num time de plataforma é descobrir o que o time deve construir a seguir — o autor chama isso de "inventar trabalho".

A boa notícia é que os sinais que ajudam a inventar trabalho já estão lá, e chegam de quatro direções: dos **sistemas**, dos **usuários**, da **organização** e da **indústria**. O que segue é um guia para ler cada um deles.

---

## Sinais que o sistema emite

### Descoberta orientada por crashes

Crashes e seus respectivos postmortems, quando bem feitos, são sinais claros que dizem o que corrigir ou o que substituir. É raro que postmortems apontem para algo novo a ser construído, mas às vezes isso acontece se você prestar atenção em como os usuários foram impactados pelos crashes, ou como eles improvisaram processos alternativos enquanto o time corrigia uma falha prolongada. Identificar padrões entre postmortems é algo que times raramente fazem como prática, porque é uma fonte esporádica de padrões — mas certifique-se de não estar perdendo a visão geral.

A descoberta orientada por crashes tem uma grande desvantagem: ela **viésa o time em direção às falhas mais barulhentas e recentes**, não às maiores oportunidades. Além disso, é um indicador maximamente defasado.

### Custo

Custo, em dólares, é um sinal óbvio. A conta da nuvem compensa a falta de uma estrela-guia de receita. Mas não pare por aí: vá além de otimizar queries de banco de dados ou investigar como cortar custos de tráfego entre VPCs. Verifique o P&L da sua unidade de negócio se estiver disponível, ou os contratos de fornecedores do seu time, ou os itens da conta de nuvem — ou pergunte a alguém que tenha acesso ou conhecimento dos centros de custo.

Para cada centro de custo, entenda como beneficia seu time "terceirizar" aquela função, e o que significaria puxá-la para o escopo do seu time. Essa investigação também funciona no sentido inverso: coisas no seu escopo que deveriam ser repassadas para um fornecedor, uma oferta de nuvem, ou outro time. A lição central é: **comprar versus construir NÃO é uma decisão única; você pode revisitá-la conforme escopo, composição do time, tecnologia e mercado mudam**.

### Seu próprio trabalho braçal técnico

Este é o outro custo — invisível para muitos, às vezes incluindo quem lida com o trabalho braçal técnico. Todo time tem trabalho braçal técnico, e quase nunca é priorizado. Mas você já sabia disso, então o autor não gasta mais palavras dizendo que trabalho braçal técnico é um sinal importante de que há trabalho esperando para ser descoberto. A armadilha: **seu trabalho braçal técnico não é o trabalho braçal técnico dos seus usuários; corrigir o primeiro melhora a economia unitária, enquanto corrigir o segundo melhora a experiência do usuário**.

---

## Sinais que os usuários emitem

### Descoberta contínua

O autor já argumentou no passado que usuários cativos "não têm a melhor visão do estado ideal das ferramentas", e que "excesso de confiança em entrevistas com usuários é uma maldição para a gestão de produto de plataforma". Essencialmente, se você perguntar às pessoas o que querem, elas vão pedir cavalos mais rápidos. Ele continua acreditando nisso, mas isso não é desculpa para não falar com seus usuários.

Descoberta contínua é ter uma conversa contínua com seus usuários:

- Fale com N usuários por semana/mês/trimestre. Pergunte versões do seguinte:
  - você pode me mostrar como fez a tarefa mais recente que envolveu a plataforma?
  - quais foram suas três maiores dores ao usar a plataforma?
  - o que significaria para você se resolvêssemos essas dores?
  - quem mais tem o mesmo problema?
- **Interrogue as dores.** Entenda que quase todo problema real já tem um workaround. Se não há workaround, a dor não é aguda o suficiente.
- **Questione as soluções sugeridas.** Entenda por que querem aquelas soluções, e se elas estão limitadas pelo seu design atual.
- **Documente as dores.** Indexe-as por frequência de menções.

Em resumo, entrevistas com usuários devem se manter comprometidas em entender conjuntamente o espaço do problema. O design do espaço de solução é assunto para outro fórum.

### Casos de uso sobrecarregados

Este é o heurístico favorito do autor, do qual ele já falou [em outras oportunidades](https://sujithjay.com/not-aws). Há uma propriedade acidental que algumas plataformas possuem: usuários as pressionam para casos de uso para as quais nunca foram projetadas. Você deve investir tempo para entender por que os usuários prefeririam usar sua plataforma para resolver o problema em vez de alternativas (se houver), mesmo que ela nunca tenha sido projetada para isso.

**Trate casos de uso sobrecarregados como protótipos que seus usuários construíram para você**, e descubra quais valem a pena absorver. O teste de validação para absorção é simples: quem mais entre seus usuários tem o mesmo problema?

### De parceiro para protótipo

Casos de uso sobrecarregados são descobertos depois do fato. De parceiro para protótipo é a mesma coisa organizada deliberadamente: seu time e os usuários trabalham juntos para prototipar algo na sua plataforma que poderia resolver o problema deles. Um protótipo não é uma promessa de que a funcionalidade fará parte da plataforma; é simplesmente uma exploração conjunta. O teste de validação permanece o mesmo: quem mais entre seus usuários tem o mesmo problema?

---

## Sinais que a organização emite

### OKRs

Mais um óbvio, listado por completude. Se seu time definiu um OKR (ou recebeu um de cima), você já inventou esse item de trabalho. Parabéns! Para o próximo.

### O heurístico da repetição do gestor

Simples e às vezes eficaz: se você ouvir seu gestor (ou o gestor dele, ou mais acima) falar sobre algo **duas vezes numa semana**, há provavelmente uma preocupação não endereçada por trás disso. Boa razão para fazer anotações nas suas 1:1s, ou ler aquelas geradas por LLM.

Este heurístico é, na opinião do autor, a mais fraca das muitas formas de inventar trabalho. O motivo: quanto mais alto na hierarquia, mais longe dos usuários, e maior a probabilidade de construir sobre a opinião da pessoa mais bem paga (HiPPO — *Highest Paid Person's Opinion*).

### Detritos de migração

Toda mudança importante na plataforma precisa de uma migração, e quem já liderou uma migração crítica sabe que a adoção tem uma cauda gorda — parece a curva famosa de *Atravessando o Abismo* (*Crossing the Chasm*). Você terá seus inovadores, seus primeiros adotantes, sua maioria inicial e tardia, e finalmente os retardatários.

Os times retardatários que arrastam os pés ou que nunca embarcam na nova oferta são um sinal importante: **eles dizem por que sua oferta está incompleta, e por que há mais trabalho a ser feito**.

O autor já argumentou que plataformas internas precisam atender a uma audiência mais ampla do que apenas o usuário mediano. Os detritos de uma migração apontam para usuários que sua solução "mediana" não atende.

---

## Sinais que a indústria emite

### Escrita descritiva leva a escrita prescritiva

Ideação é difícil, mas é seu trabalho ter ideias frescas sobre como melhorar um sistema existente (e propor essas melhorias de forma prescritiva, digamos, um RFC). O favorito do autor para gerar ideias é **descrever sistemas existentes** — para seus pares, para usuários, para novas contratações; você escolhe sua audiência.

Escreva um documento de design para o sistema que já existe, e compare com sistemas state-of-the-art que fazem um trabalho similar ou adjacente. Esse ato de descrever revela decisões que não fazem mais sentido. É escrita-como-pensamento no seu melhor.

### Defasagem é sua vantagem

Há valor genuíno em se manter educado sobre tendências da indústria — releases open-source, blogs de outras empresas, papers de pesquisa e palestras de conferências — mas há uma forma mais afiada de lê-los para inventar trabalho.

O autor acredita que qualquer domínio único de computação oscila entre fases seculares de **agrupamento e desagrupamento** (*bundling* e *unbundling*). Nós agrupamos compute e storage em data warehouses, depois separamos em data lakes, e agora estamos agrupando novamente em engines de lakehouse. O movimento de monólito para microsserviços agora dá lugar ao monólito modular. Plataformas internas têm a mesma oscilação, na mesma direção, mas com **um atraso**, pois ideias levam tempo para permear.

Essa defasagem não é um bug; ela permite importar tanto o raciocínio por trás da convergência da indústria quanto a evidência para ela — postmortems públicos, sucessos de migração, benchmarks comparativos, posições abandonadas por outras empresas. Você obtém a evidência sem pagar para gerá-la, e pode pular as posições que a indústria já abandonou. O caso de falha é demasiado atraso: você não quer estar no conjunto de times retardatários adotando a tendência.

---

## Qual sinal, quando

Onze sinais é demais para rodar de uma vez. O autor os classifica em dois eixos: **quanto do argumento o sinal te entrega de graça**, e **se é proativo ou reativo** (*leading* ou *lagging*).

Num extremo estão os sinais que chegam pré-argumentados. Uma análise post-mortem já tem audiência e conclusão. Um centro de custo já está denominado em dólares. Um OKR rastreia trabalho que já foi inventado. Estes são baratos de agir, mas defasam em graus variados.

No outro extremo estão sinais para os quais você precisa construir um argumento. A vantagem da defasagem dá o raciocínio mais forte e a menor legitimidade, porque a evidência vem de fora da sua empresa. O heurístico da repetição do gestor dá evidência zero, mas vem com alguma legitimidade. A descoberta contínua dá dores dos usuários, mas transformá-las em especificações é com você.

Casos de uso sobrecarregados ficam no meio, e é por isso que são o favorito do autor. O sinal é proativo e o argumento já está construído e rodando em produção. De parceiro para protótipo compra a mesma evidência ao custo de construí-la você mesmo. Detritos de migração são a mesma troca, uma migração depois: os retardatários são um sinal defasado sobre a migração que você acabou de rodar, e proativo para a próxima. Escrita descritiva não te entrega argumento nem urgência, mas tem as melhores chances de notar decisões que silenciosamente expiraram.

---

## Nota final

> "Nenhum disso é um problema de escassez. Os sinais estão sempre ligados e a lista acima não é exaustiva. O modo de falha de um time de plataforma guiado por engenharia não é um backlog vazio; é um backlog montado a partir dos sinais mais barulhentos — geralmente o crash, às vezes o comentário de um gestor dois níveis acima. Inventar trabalho é menos sobre encontrar um sinal do que ser capaz de dizer por que este e não os outros dez."

---

*Artigo original de Sujith Jayapal, publicado em 22 de setembro de 2026 em [sujithjay.com/inventing-work](https://sujithjay.com/inventing-work).*