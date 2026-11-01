---
title: "Ondas: o player de áudio sem biblioteca — só o elemento que todo navegador já tem"
date: 2026-11-01
description: "O player do Ondas não usa Howler, não usa Web Audio API, não usa nada — é um HTMLAudioElement cru atrás de um port. O streaming vem do R2 por 302, o offline é blob: da Cache API, e o modo demo é um setInterval que avança tempo sem áudio."
slug: "ondas-playback-html-audio"
tags:
  - audio
  - arquitetura
  - frontend
---

*Parte da série [Ondas, decisão por decisão](/posts/ondas-serie-engenharia/). O código é público: [github.com/thiagotn/ondas](https://github.com/thiagotn/ondas).*

Qual o player utilizado para tocar as mídias do acervo? A pergunta parece simples, e a resposta é
ainda mais simples do que parece: nenhum. Não há biblioteca de áudio no Ondas. É o `<audio>` do
próprio navegador — um único `HTMLAudioElement` criado com `new Audio()`
(`packages/web/src/platform/WebPlayerEngine.ts:27`).

Mas a forma importa mais que a resposta. O interessante não é que eu escolhi o elemento nativo;
é como ele foi isolado para que a escolha possa ser trocada sem mexer na interface.

## O motor atrás de um port

O player está atrás de um port, `PlayerEngine` (`packages/core/src/ports/player-engine.ts:25`),
e o core não conhece implementação nenhuma. O `WebPlayerEngine` é a única coisa no repositório
que toca áudio de verdade, e traduz os eventos do elemento HTML (`timeupdate`, `progress`,
`waiting`, `ended`) para os sete eventos do port.

O comentário do port diz em uma linha por que ele existe:

> *"Na web é um `HTMLAudioElement`; no nativo será `react-native-track-player`."*

Trocar de motor é escrever uma segunda classe, não reescrever a UI. Toda a interface — controles,
barra de progresso, estado de buffering — fala com o port, não com o elemento. Se um dia o Ondas
for nativo, o `WebPlayerEngine` fica onde está e nasce um `NativePlayerEngine` ao lado.

## Como o acervo chega ao elemento

`Track.stream` da faixa de acervo é `/api/acervo/<id>/audio`
(`api/internal/httpapi/acervo.go:53`). Esse endpoint não serve os bytes — ele responde **302**
para uma URL assinada do R2 (`acervo.go:165,208`). O streaming e o suporte a `Range` são do R2 e
do navegador, não da nossa API.

A API não é um proxy de mídia. Ela é uma **negociadora de acesso**: autentica a requisição,
gera a URL assinada e devolve um redirecionamento. O navegador faz o resto — conecta direto ao
R2, pede os pedaços que faltam, gerencia o buffer. O custo de CPU da API para tocar uma faixa é
zero.

## Três modos de `src`

O `src` do elemento de áudio é escolhido em `controller.ts:105-113`, e há três caminhos —
cada um é uma decisão de produto:

| Modo | `src` | Quando |
|---|---|---|
| Streaming | URL do R2 (via 302) | faixa não baixada, com rede |
| Offline | `blob:` da Cache API | faixa baixada, sem ou com rede |
| Simulado | `''` (vazio) | faixa baixada, mas o blob não abriu e não há rede |

### Streaming

O caminho padrão. O navegador recebe o 302, segue para o R2 e toca. Simples.

### Offline

Se a faixa está baixada, o `src` vira um `blob:` do `CacheOfflineStore`
(`createObjectURL` sobre o que está na Cache API,
`CacheOfflineStore.ts:57`). O elemento de áudio não sabe que é offline — ele lê um blob local
como leria qualquer arquivo. Não há código de playback offline; há código de **cache** que
produz uma URL que o elemento aceita.

### Simulado — o modo que parece bug mas é propósito

`src` vazio é um terceiro modo, de propósito: **playback simulado**. Um `setInterval` de 250 ms
avança tempo e buffer sem áudio (`WebPlayerEngine.ts:159-176`). É o que faz o catálogo demo ser
demonstrável sem rede e sem API.

Quando alguém abre o app pela primeira vez, sem conta e sem conexão, o catálogo demo aparece e
funciona: o tempo avança, a barra se move, a próxima faixa é selecionada. Não sai som — mas a
interface inteira é exercitada. Para quem está avaliando o produto, isso é a diferença entre
"parece quebrado" e "parece funcionando".

## Media Session API

Fora o elemento de áudio, a única outra API de mídia que o Ondas usa é a **Media Session API**
(`platform/mediaSession.ts`), que liga a tela de bloqueio e os botões do fone aos mesmos
comandos da UI. Play, pause, próxima faixa e anterior aparecem no controle do sistema operacional
sem código extra de UI — é o navegador traduzindo o estado do `<audio>` para o SO.

## O que aprendi

**A abstração vale mais que a escolha.** Poderia ter usado Howler ou Web Audio API e estaria
bem. Mas o valor não está em qual motor escolhi — está em que a UI não sabe qual motor está
rodando. O port custa uma interface de sete eventos e uma classe que traduz. Se um dia houver
necessidade de equalizador, crossfade ou análise em tempo real, o Web Audio API entra como
uma nova implementação do mesmo port, e a UI não muda.

**O 302 é mais elegante do que um proxy.** Servir os bytes pela API seria o caminho óbvio: mais
simples de raciocinar, uma URL só. Mas cada faixa tocada passaria pela API, consumindo CPU e
memória para copiar bytes que o R2 já serve direto. O 302 é uma linha de código que remove um
gargalo inteiro.

**O modo simulado foi a coisa mais difícil de explicar para mim mesmo.** A tentação é tratar
"sem áudio" como um estado de erro. Mas o catálogo demo não é um erro — é uma função do produto.
Fazer dele um modo explícito, com seu próprio código e seu próprio nome, foi mais honesto do
que deixar a UI se arrastar quando o áudio não chega.

## Numa entrevista

**"Qual biblioteca de áudio você usa?"** Nenhuma. É o `HTMLAudioElement` do navegador, criado com
`new Audio()`. A decisão não é qual biblioteca, mas como isolar a escolha: o motor está atrás de
um port com sete eventos, e o core não conhece implementação nenhuma. Se amanhã o app for
nativo, o `react-native-track-player` entra como uma segunda implementação do mesmo port.

**"Como faz streaming sem servir os bytes?"** A API responde 302 para uma URL assinada do R2. O
navegador segue o redirecionamento e faz Range requests direto ao bucket. A API não é um proxy de
mídia — é uma negociadora de acesso que autentica e devolve um redirecionamento. O custo de CPU
para tocar uma faixa é zero.

**"E offline?"** Se a faixa está baixada, o `src` vira um `blob:` da Cache API. O elemento de
áudio lê um blob local como leria qualquer URL. Não há código de playback offline — há código de
cache que produz uma URL que o elemento aceita.

**"O que acontece sem rede e sem áudio baixado?"** O `src` fica vazio de propósito. Um
`setInterval` de 250 ms avança tempo e buffer simulados. É o que faz o catálogo demo ser
demonstrável sem backend. A tentação é tratar "sem áudio" como erro, mas o demo é uma função do
produto, não um estado de falha.
