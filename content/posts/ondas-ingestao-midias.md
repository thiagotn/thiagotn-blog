---
title: "Ondas: a ingestão que não cabe na API — por que o áudio é extraído no node, não no cluster"
date: 2026-11-01
description: "A ingestão do Ondas tem duas portas: a URL de mídia direta, que o worker do cluster baixa com trava de SSRF, e a URL de página (YouTube, SoundCloud), que é extraída no node porque o cluster não resolve página e seu IP é de datacenter. Os formatos passam pelo ffprobe e pela régua dos oito codecs que a tag `<audio>` toca em navegador atual."
slug: "ondas-ingestao-midias"
tags:
  - audio
  - arquitetura
  - backend
---

*Parte da série [Ondas, decisão por decisão](/posts/ondas-serie-engenharia/). O código é público: [github.com/thiagotn/ondas](https://github.com/thiagotn/ondas).*

Como uma URL vira uma faixa no acervo? A funcionalidade é simples de descrever: manda uma URL, o sistema baixa a música e
guarda. Mas a forma importa mais que a descrição — e a forma tem duas portas, não uma.

Há dois caminhos para uma mídia entrar no acervo, e a escolha entre eles não é de conveniência: é de segurança e de
produto. Um é a porta do cluster, com o worker que baixa da internet; o outro é a porta do node, onde a ferramenta certa
extrai o áudio da página certa. A diferença é o que protege o cluster e o que faz o YouTube funcionar.

## Duas portas, não uma

O acervo recebe mídia de duas formas (`POST /api/acervo/ingest` para URL, `POST /api/acervo/upload` + PUT assinado
para arquivo), e a escolha não é onde é mais conveniente — é onde cada parte consegue fazer o que precisa.

| Porta | O que chega | Quem baixa | Por quê |
|---|---|---|---|
| URL de mídia | `https://exemplo.com/musica.mp3` | worker do cluster | a URL é o arquivo; o worker tem a trava de SSRF |
| Arquivo local | `.mp3` / `.opus` / `.m4a` no disco do node | este node, sobe por PUT assinado | a URL era de página (YouTube, SoundCloud); o worker receberia HTML |

A primeira porta é a da API: o usuário manda uma URL, o worker do cluster baixa, valida, extrai metadados e guarda. A
trava de SSRF protege o cluster de si mesmo — está detalhada em [Ingestão e SSRF](/posts/ondas-ingestao-ssrf/).

A segunda porta é a que interessa aqui. Quando a URL não é de mídia direta — quando é uma página do YouTube ou do
SoundCloud —, quem baixa é este node, não o cluster. E isso não é uma contingência: é o desenho.

## Por que o trabalho é daqui, não do cluster

Duas razões, e nenhuma é de performance.

**O cluster não resolve página.** `POST /api/acervo/ingest` serve para URL de **mídia**: o worker baixa o que a URL
aponta e passa no `ffprobe`. Uma URL do YouTube é uma **página** — o worker receberia HTML, e o `ffprobe` recusaria. Quem
sabe extrair o áudio de um vídeo do YouTube é o `yt-dlp`; quem sabe de uma faixa do SoundCloud é o `scdl`. Essas
ferramentas rodam aqui, no node.

**O cluster sai por IP de datacenter.** O YouTube recusa requisições de faixas de IP de datacenter — é a defesa dele
contra coleta automatizada. O node sai por IP residencial e passa. Abrir a trava de SSRF do worker para um resolvedor
de páginas seria o avesso do desenho dela: a trava existe para o worker não ser um proxy para a rede interna, e um
resolvedor de páginas seria exatamente um proxy para a internet inteira.

O resultado: o áudio é extraído no node, processado aqui (metadados, capa, formato), e sobe **direto para o bucket**
por URL assinada de PUT — sem passar pela API. A API só reserva a vaga e, depois, confere e enfileira a ingestão. O
fluxo do envio está em [Acervo privado e R2](/posts/ondas-acervo-r2/).

## O pipeline daqui

O que o node faz com uma URL de página, em ordem:

1. **Sonda** — `yt-dlp --dump-single-json` ou `scdl --flat-playlist`: metadados **antes** de baixar. É aqui que o teto
   de 20 minutos do YouTube é conferido, não depois de baixar três horas de mix.
2. **Baixa** — `yt-dlp -f bestaudio -x` ou `scdl -l <url>`: o áudio, sem reconverter. O opus do YouTube sai como
   `.opus`, o aac como `.m4a`; o `scdl` traz o arquivo original quando o artista liberou download, ou o stream mp3
   quando não.
3. **Extrai metadados** — título, artista, álbum, ano, número de faixa. De onde vem cada campo é a parte mais
   interessante, e está abaixo.
4. **Embutir capa** — a thumbnail recortada em quadrado centrado, gravada no arquivo.
5. **Normaliza formato** — só quando preciso, e de maneiras diferentes para cada origem.
6. **Envia** — PUT assinado ao bucket; depois `POST /api/acervo/upload/{id}/finalizar`, que confere e enfileira.

Os passos 1 a 5 rodam aqui; o passo 6 é a API. A fronteira é exatamente onde o cluster consegue assumir: a partir de um
arquivo no bucket, o worker do cluster faz o resto — mede a forma de onda, grava a linha no banco, publica a faixa.

## Metadados — de onde sai cada campo

Para o YouTube, em ordem de confiança:

1. **O que o YouTube Music declara** (`track` e `artist` do vídeo). Já vem separado e sem ruído; quando existe, não há
   o que adivinhar. É daqui que saem também álbum e ano, quando vêm.
2. **O título quebrado no primeiro separador** (` - `, ` – `, ` — `, ` | `): esquerda é artista, direita é título. É a
   forma de praticamente todo upload de música. `Jay-Z - Song Cry` quebra no separador certo, não no hífen do nome.
3. **O canal como artista**, com o sufixo `- Topic` removido — é como o YouTube nomeia o canal automático de um
   artista.

Em qualquer um dos três, o título perde o **ruído de produção**: `(Official Music Video)`, `[HD]`, `(Letra)`, `(Áudio
Oficial)`, `(Remastered 2011)` e companhia. A régua é estreita de propósito: só sai quando o parêntese **inteiro** é
ruído, para `(feat. Alguém)`, `(Live at Wembley)` e `(Remix)` sobrarem — esses são parte do nome da música.

Para o SoundCloud, é mais simples: o `scdl` escreve as tags no arquivo, e elas vêm dos metadados do próprio SoundCloud.
O script não manda título de propósito: um título explícito ganharia das tags, e um álbum bem etiquetado viraria
"01 - Faixa".

A diferença entre as duas origens é um detalhe de produto, não de técnica: o YouTube sabe mais sobre o vídeo do que o
título deixa transparecer, e o `yt-dlp` expõe isso; o SoundCloud já traz o que precisa nas tags.

## Formato — o que entra e o que não entra

A régua de aceitação não é "o que o `ffmpeg` sabe ler": são os oito codecs que **a tag `<audio>` toca em navegador
atual** (`api/internal/ingest/midia.go:20-22`):

`mp3`, `aac`/`m4a`, `alac`, `flac`, `opus`, `vorbis`, `wav`/`pcm`.

Aceitar um `.wma` seria guardar um arquivo que a PWA nunca conseguiria tocar. É uma validação de produto disfarçada de
validação técnica — e por isso a lista é curta e enumerada à mão.

E há uma assimetria deliberada entre as duas origens:

| Origem | O que chega | O que se faz |
|---|---|---|
| YouTube | opus ~160k ou aac ~128k, ambos lossy | **nada** — `-c:a copy`, sem reconverter |
| SoundCloud | opus de 64k (stream) ou o arquivo original | **converter para mp3** se o codec for opus |

Por que converter o opus do SoundCloud e não o do YouTube? Não é pela qualidade: é pela **capa**. O `ffmpeg` lê capa de
ogg/opus — ele promove o `METADATA_BLOCK_PICTURE` a stream `attached_pic`, que é o que o worker procura —, mas **não
sabe escrevê-la** num `.opus` (`Unsupported codec id in stream 1`). Em mp3, a capa entra como APIC. O YouTube traz a
thumbnail como `.jpg` separado; o SoundCloud traz a capa que o `scdl` baixou ao lado. Para a capa entrar no arquivo, o
contêiner tem de saber guardá-la.

## Capa — duas rotas, um mesmo worker

A thumbnail do YouTube é 16:9, de vídeo; capa de música é quadrada. O recorte é **centrado**: as laterais do frame se
perdem de propósito — a alternativa é tarja preta ou imagem esticada na lista da PWA.

O lado é 1000px, porque o worker reduz para 960 na ingestão — passar de 1000 é carregar bytes que ele vai jogar fora.

O embute tem duas rotas, e a diferença é do `ffmpeg`, não do Ondas:

| Contêiner | Como a capa entra |
|---|---|
| `.m4a`, `.mp3`, `.flac` | stream anexado (`attached_pic`) — exatamente o que o worker procura |
| `.opus`, `.ogg` | bloco `METADATA_BLOCK_PICTURE` montado à mão e gravado como tag de vorbis comment |

A segunda rota existe porque o `ffmpeg` não sabe escrever `attached_pic` num `.opus`. O bloco PICTURE é montado em
~15 linhas de stdlib (`struct.pack` + `base64`), e é o único jeito de pôr capa num arquivo que o worker vai ler
corretamente.

Se a thumbnail não vier, ou o embute falhar, **a faixa entra sem capa e isso é dito**. Capa é melhor esforço; o que
não pode falhar calado é o áudio.

## Limites (recusas esperadas, não bugs)

| Limite | Valor | Por quê |
|---|---|---|
| Tamanho por arquivo | 60 MB | teto da API |
| Tempo de download | 180 s | a origem pode ser lenta; não é motivo para prender o worker |
| Tentativas por job | 3 | as falhas que se repetem são quase sempre permanentes (URL morta, formato que não toca) |
| Duração do YouTube | 20 min | mix e podcast não são faixa de acervo; `--longa` libera caso a caso |
| Faixas por set do SoundCloud | 20 | um laço numa playlist de 300 faixas seriam 300 ingestões |

Cada limite tem mensagem própria. Nenhum é genérico: a origem disse que o vídeo é ao vivo, que a faixa é privada, que o
codec não toca — e a mensagem diz exatamente isso.

## O estado do job

A ingestão é assíncrona: `POST /api/acervo/ingest` devolve `202` (aceito algo novo) ou `200` (essa URL já estava na
fila) e um id. O acompanhamento é por polling — `GET /api/acervo/ingest/{id}` —, não por `LISTEN/NOTIFY`.

Os estados são quatro: `pending` → `processing` → `ready` | `error`. O polling de 5 segundos é uma escolha de volume:
para uma fila que recebe alguns itens por dia, o custo de uma consulta a cada 5 s é menor que o de manter uma conexão
de notificação viva e reconectá-la.

A deduplicação é por índice **parcial** único em `(user_id, source_url)`, restrito aos status ativos — a mesma URL
pode ser reingerida depois que terminou, sem apagar nada. O `200` em vez de `202` é o que diz ao cliente: "você já
pediu isto, e o pedido anterior continua".

## O que aprendi

**A divisão de trabalho é o modelo de segurança.** O worker do cluster baixa da internet com a trava de SSRF; o node
extrai áudio de páginas com ferramentas locais. Cada lado faz o que o outro não pode — e essa fronteira é o que protege
o cluster e o que faz o YouTube funcionar. Não é uma contingência: é o desenho.

**O `ffprobe` é quem decide o que o arquivo é.** O `Content-Type` da origem serve de pista e nada mais. A régua de
aceitação não é "o que o `ffmpeg` lê": são os oito codecs que a PWA toca. É validação de produto disfarçada de
validação técnica.

**A capa é melhor esforço, o áudio não é.** A pergunta é: sem isto, o usuário ainda tem o que ele pediu? Para capa e
forma de onda, sim — ele tem a música. Para o arquivo de áudio, não. Melhor esforço silencioso vira dívida de dados;
por isso a falha vai para o log.

## Perguntas de system design

**"Como uma URL vira uma faixa no acervo?"** Depende da URL. Se é mídia direta, o worker do cluster baixa com a trava
de SSRF, valida o formato com `ffprobe`, extrai metadados e guarda no R2. Se é de página — YouTube, SoundCloud —, quem
extrai o áudio é o `yt-dlp` ou o `scdl`, rodando no node, porque o worker receberia HTML e o cluster sai por IP de
datacenter. O arquivo sobe direto para o bucket por PUT assinado; a API só reserva a vaga e enfileira.

**"Por que baixar no node e não no cluster?"** Duas razões. A URL do YouTube é página, não mídia — o worker baixa HTML
e o `ffprobe` recusaria. E o cluster sai por IP de datacenter, que o YouTube recusa. Abrir a trava de SSRF para um
resolvedor de páginas seria o avesso do desenho dela.

**"Como você decide o formato?"** O `ffprobe` decide o que o arquivo é, e a régua são os oito codecs que a tag
`<audio>` toca em navegador atual — não o que o `ffmpeg` sabe ler. Aceitar um formato que a PWA não toca seria guardar
um arquivo inútil. Do YouTube o áudio não é reconvertido: opus e aac já são lossy, e reencodar só perde geração. Do
SoundCloud o opus é convertido para mp3 — não pela qualidade, mas porque o `ffmpeg` não sabe escrever capa num
`.opus`.

**"Como você extrai metadados?"** Em ordem de confiança: o que o YouTube Music declara (`track` e `artist` separados),
o título quebrado no primeiro separador (`Artista - Título`), e o canal como artista com o sufixo `- Topic` removido.
O título perde o ruído de produção — `(Official Music Video)`, `[HD]`, `(Remastered 2011)` —, mas só quando o parêntese
inteiro é ruído; `(feat. Alguém)` e `(Live at Wembley)` ficam.

**"Como você decide o que é falha e o que é melhor esforço?"** Perguntando se, sem aquilo, o usuário ainda tem o que
pediu. Capa e forma de onda são melhor esforço: ele tem a música. O arquivo de áudio não é. E a falha vai para o log —
melhor esforço silencioso vira dívida de dados, e precisou de um comando de backfill para corrigir faixas antigas sem
reingerir.