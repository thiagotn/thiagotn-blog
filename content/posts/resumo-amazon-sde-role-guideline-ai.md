---
title: "Resumo: O papel do desenvolvedor na era da IA — atualização da liderança de engenharia da Amazon (Terk Terkowitz)"
date: 2026-10-28
description: "Resumo do memo interno da Amazon: a liderança de engenharia revisou a diretriz do papel de SDE para a era da IA, focando no que não muda — outcomes para clientes, negócios e times — e não em quais ferramentas são usadas."
tags: ["engenharia", "ia", "gestão", "carreira"]
---

> *Resumo do memo publicado por Terk Terkowitz, VP/Distinguished Engineer da Worldwide Amazon Stores, em 27 de outubro de 2026, compartilhado com todos os engenheiros de software (SDEs) e gerentes de engenharia (SDMs) da Amazon. O texto original está disponível em [aboutamazon.com](https://www.aboutamazon.com/news/company-news/amazon-software-engineer-role-guideline-ai).*

---

A liderança de engenharia da Amazon — incluindo Distinguished e Senior Principal Engineers de toda a empresa — se reuniu para revisar e atualizar a **diretriz do papel de Software Development Engineer (SDE)**. A constatação central é direta: o que importa é o **outcome**, não quais ferramentas são usadas. Os engenheiros mais prolíficos da empresa demonstraram que nem o papel do desenvolvedor nem o seu output são definidos pelo uso de IA. Estamos na era do **"Renaissance Developer"** — misturando ferramentas de IA com julgamento humano e expertise de domínio para construir coisas inteiramente novas.

## A pergunta central: quanto focar em IA?

Ao desenvolver a nova versão da diretriz do papel de SDE, a liderança enfrentou uma pergunta importante: **quanto devemos focar em IA?** Historicamente, a Amazon tentou evitar que as diretrizes do papel de SDE fossem explícitas sobre tecnologia, refletindo a diversidade dos negócios em que a empresa opera e do trabalho que seus SDEs fazem. Essa abordagem foi mantida por duas décadas, enquanto tendências tecnológicas (nuvem, microsserviços, serverless, etc.) remodelavam o trabalho dos engenheiros.

Dentro das comunidades de Senior Principal e Distinguished Engineer, houve um debate profundo sobre se **desta vez é diferente**. A conclusão: a IA está mudando o trabalho de engenharia de software de forma **mais rápida e mais fundamental** do que essas tendências anteriores. O que significa ser um engenheiro de software — e o que é engenharia de software — está mudando de forma rápida e duradoura.

Ainda assim, a liderança acredita que ainda é cedo. É preciso abraçar a mudança e dedicar tempo para aprender, ou há risco de ficar para trás. A IA estará no centro da prática de engenharia de software, qualquer que seja a melhor prática do futuro.

## Focar no que não muda

A dificuldade de definir, de forma que resista ao teste do tempo, o que são boas práticas de engenharia com IA é real. Qualquer definição escrita agora provavelmente vai parecer antiquada no ano que vem. Definições antiquadas correm o risco de travar o progresso, congelando as práticas de engenharia enquanto o mundo segue sem você.

Para resolver esse problema, a Amazon decidiu focar no **que não está mudando** ao evoluir os papéis de SDE. Especificamente: impacto nos clientes, nos negócios e nos times. Os outcomes que importam não estão mudando, mesmo que as entradas, ferramentas e técnicas estejam mudando mais rápido do que nunca.

> "What's going to change in the next five to ten years? But I very rarely get asked What's not going to change in the next five to ten years? That second question is actually the more important of the two."
>
> — **Jeff Bezos**, entrevista de 2012 com Werner Vogels

## Como medir o uso de IA — e os problemas das métricas de input

A conclusão de focar em outcomes facilitou a escrita da diretriz, mas deixa uma pergunta importante para SDEs e SDMs: como usar IA e como medir o uso de IA nos times e organizações?

A Amazon acredita que o ideal é medir — e ser medido por — **outcomes de longo prazo**. Mas esses outcomes podem ser demorados, difíceis de medir e duros de isolar de outras tendências. Em alguns casos, a empresa usou **métricas de input** como alternativa: uso de tokens, adoção de ferramentas de IA, ou **métricas de throughput** como mudanças de código e revisões.

A liderança reconhece o quanto essas métricas são **falhas**, principalmente porque são desconectadas do que importa. Usar essas métricas como meta (em vez de medida) pode gerar outcomes negativos:

- **Aumentar custos**: "tokenmaxxing" vai contra o princípio de frugalidade
- **Aumentar complexidade**: medir linhas de código (LOC) vai contra o princípio de "inventar e simplificar"

Por outro lado, a Amazon constatou que essas métricas de input **correlacionam bem** com os outputs que importam e espera que continuem assim por algum tempo. Esse efeito é impulsionado tanto pelo aumento de produtividade e entrega nos times que mais abraçaram a IA (chamados de **frontier teams**) quanto pelo fato de que times e indivíduos que não estão adotando IA ou aumentando seus outputs estão ficando para trás.

A recomendação é prestar atenção especial ao **percentil 10** (encontrar os times que não estão abraçando a IA efetivamente e entender por quê) e ao **percentil 90** (encontrar os times que usam IA pesadamente e entender se estão vendo aumentos de entrega compatíveis). Com o tempo, trabalhando juntos, melhores métricas e metas mais inteligentes vão surgir.

> "Good inventors and designers deeply understand their customer. They spend tremendous energy developing that intuition. They study and understand many anecdotes rather than only the averages you'll find on surveys."
>
> — **Jeff Bezos**, carta aos acionistas de 2016

Parafraseando: bons líderes entendem profundamente o trabalho do seu time. Gastam energia tremenda desenvolvendo essa intuição. Estudam e entendem muitas anedotas, e acompanham cuidadosamente os outputs — em vez de apenas métricas superficiais.

## Se a IA não ajuda no seu trabalho, isso é uma descoberta — não uma falha

Um ponto crucial do memo: **se o seu trabalho não se beneficia das ferramentas de IA atuais, isso é um achado, não uma falha**. Documente o porquê, compartilhe com sua comunidade de pares, leve para o seu gerente, e trabalhe para encontrar soluções. Um engenheiro que consegue explicar onde a IA ainda não ajuda no seu trabalho está demonstrando o julgamento que a Amazon espera.

## O papel dos líderes técnicos e organizacionais

Como líder técnico ou organizacional, parte do trabalho é garantir que o time ou organização esteja usando IA da melhor forma para melhorar a entrega para clientes e negócio. Isso exige:

- **Entender profundamente as tecnologias** — trabalhando com elas na prática, não confiando no que se ouve
- **Uso em produção** — ter usado as ferramentas no próprio trabalho, saber descrever uma tarefa onde ajudaram e uma onde não ajudaram, e explicar esse julgamento ao time
- **Equilíbrio cuidadoso** entre explorar novas e melhores formas de fazer as coisas e investir em consolidar as que já funcionam

Os líderes que estão tendo mais impacto são aqueles que **dobram a aposta em "learn and be curious"** — dedicando tempo para aprender IA e abrindo espaço para que as pessoas que lideram façam o mesmo. Os retornos sobre esse investimento são **desproporcionalmente grandes**, com os times que seguiram sua curiosidade (devidamente equilibrada com "entregar resultados" e "insistir nos mais altos padrões") vendo o maior impacto positivo da adoção de IA.

## Proximidade com produto e negócio

A Amazon observou que SDEs e SDMs **mais próximos dos seus produtos e negócios** conseguem aproveitar mais a IA e o desenvolvimento de software agentic. À medida que a Amazon cresceu, alguns ICs e SDMs se tornaram menos conectados aos seus clientes e negócio. A empresa quer **reverter essa tendência**.

A recomendação é que ICs de todos os níveis encontrem formas de se conectar profundamente aos clientes e à direção de produto do seu time ou organização. Para SDMs, além disso, garantir que estão próximos dos clientes e negócio e ajudando os ICs da sua organização a fazer o mesmo. Como sempre, o escopo e a profundidade desseownership aumentam conforme você se torna mais sênior.

## O que realmente importa

A oportunidade para software e engenheiros de software **nunca foi tão grande**, segundo o memo. A Amazon continuará a evoluir o papel de SDE nos próximos anos, conforme o efeito da IA se torna mais claro. Mas o que realmente importa é improvável de mudar: **obsessão pelos clientes** e **foco de longo prazo em entregar resultados**.

---

*Fonte: [aboutamazon.com](https://www.aboutamazon.com/news/company-news/amazon-software-engineer-role-guideline-ai) — "An update from Amazon engineering leadership on the role of the developer in the age of AI", por Terk Terkowitz, VP/Distinguished Engineer, Worldwide Amazon Stores. Publicado em 27 de outubro de 2026.*