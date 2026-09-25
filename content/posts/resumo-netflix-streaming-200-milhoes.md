---
title: "Resumo: Projetando uma Plataforma de Streaming Escalável para 200 Milhões de Usuários (LinkedIn)"
date: 2026-09-25
tags: ["arquitetura", "escalabilidade", "streaming", "sistemas distribuídos"]
---

> Este post é um resumo do [post original de Sumit Kumar no LinkedIn](https://www.linkedin.com/posts/sumit-kumar-0ba08a189_netflix-asks-this-question-to-challenge-share-7507677815383801856-ah-9/), publicado em setembro de 2026.

## O desafio

A Netflix faz a seguinte pergunta para desafiar engenheiros sênior em entrevistas de system design:

> Projete uma plataforma de streaming de vídeo. 200 milhões de usuários. A nova temporada estreia hoje à noite. Todos clicam em Play às 20h. Seu serviço de streaming cai.

A pergunta traz dois cenários concretos:

- Seu servidor único de vídeo acabou de receber 200 milhões de requisições em 60 segundos. O que acontece?
- Um usuário em Mumbai e outro em Nova York clicam em Play no mesmo vídeo. Seu servidor está na Califórnia. Ambos ficam em buffering. Por quê?

## A resposta ingênua

A abordagem mais simples funciona em uma demo, mas colapsa em escala:

- Um servidor grande armazena os vídeos
- Usuário clica em Play, servidor faz stream do arquivo
- Funciona em demo, despenca às 20h

## Os desafios reais em escala

### 1. 200 milhões de requisições em segundos

Quando 200 milhões de requisições atingem um único servidor em questão de segundos, a banda é esgotada instantaneamente. Todos os usuários ficam em buffering.

**Solução: CDN.** Conteúdo popular é pré-posicionado em milhares de servidores de borda globalmente. O usuário em Mumbai é atendido por um servidor de borda próximo, enquanto a origem permanece praticamente inafetada.

### 2. Arquivo de vídeo de 4GB com conexão lenta

Não é possível entregar 4GB de uma vez. Buffering contínuo destrói a experiência do usuário.

**Solução: streaming com bitrate adaptativo.** Cada vídeo é codificado em múltiplos níveis de qualidade, de 360p a 4K. O cliente avalia continuamente a largura de banda disponível e alterna dinamicamente a qualidade. Se a velocidade cai, a qualidade cai. Se a velocidade recupera, a qualidade melhora.

### 3. Milhões de usuários solicitando o mesmo vídeo simultaneamente

Enviar cada requisição para a origem cria uma carga redundante massiva.

**Solução: pré-aquecer o CDN antes do lançamento.** O conteúdo é cacheado na borda antes do pico de tráfego, permitindo que requisições subsequentes sejam atendidas diretamente da borda, minimizando a carga na origem.

### 4. O serviço cai 40 minutos dentro de um episódio

O serviço recupera, mas o usuário é enviado de volta ao início. Frustrante.

**Solução: armazenar a posição de reprodução no Redis**, por usuário e por vídeo. Após a recuperação, a última posição é recuperada para que a reprodução continue de onde parou.

## A arquitetura que sobrevive às 20h

O fluxo é:

```
Usuário → Gateway de API → Balanceador de Carga → Serviço de Streaming
                                                         ↓
                                           CDN (entrega de vídeo) + Redis (posição de reprodução)
```

Os pontos-chave dessa arquitetura:

- O CDN lida com quase todo o tráfego de vídeo. A origem permanece praticamente intocada
- Bitrate adaptativo mantém a reprodução estável em condições de rede variáveis
- Redis garante que a posição de reprodução sobreviva a falhas do serviço
- Pré-aquecimento prepara a infraestrutura antes do pico de tráfego, em vez de reagir a ele

## Chaos Monkey

A Netflix também roda o Chaos Monkey, que introduz falhas intencionalmente em ambientes de produção para validar a resiliência do sistema antes que falhas reais ocorram.

## Conclusão

A Netflix não está testando se você consegue fazer stream de um vídeo. Está testando se você entende o que acontece quando 200 milhões de usuários pressionam Play dentro do mesmo minuto.

---

*Resumo baseado no [post original de Sumit Kumar no LinkedIn](https://www.linkedin.com/posts/sumit-kumar-0ba08a189_netflix-asks-this-question-to-challenge-share-7507677815383801856-ah-9/).*
