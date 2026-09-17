---
title: "Resumo: Monitoramento de QoS/QoE para Serviços de Streaming — Detecção de Falhas de Sincronismo Áudio/Vídeo (workshop Elecard)"
date: 2026-09-17
tags: ["streaming", "vídeo", "monitoramento", "redes"]
---

> Resumo detalhado do workshop técnico da Elecard sobre monitoramento não intrusivo de QoS/QoE em serviços de streaming, com foco nos mecanismos técnicos de detecção de falhas de sincronismo entre áudio e vídeo. O objetivo aqui não é vender a ferramenta apresentada, mas decompor os conceitos técnicos envolvidos — de transporte de pacotes MPEG-TS sobre IP até a análise de PCR/PTS/DTS — de uma forma que sirva de base para pensar em implementações com ferramentas open-source.

**Vídeo original:** [Workshop Técnico: Monitoramento de QoS/QoE para Serviços de Streaming](https://www.youtube.com/watch?v=0l6CstJjWo4) — Elecard, publicado em 17/08/2026, ~1h de duração.

---

## Transporte de vídeo sobre IP: TS over IP

O ponto de partida do workshop é a fundamental de como sinais de vídeo digital viajam por redes IP. Um sinal de vídeo codificado (H.264/AVC, HEVC, AV1, etc.) não é enviado diretamente como um fluxo de pixels — ele é empacotado em um **MPEG Transport Stream (MPEG-TS)**, composto por pacotes fixos de **188 bytes** cada.

Esses pacotes de 188 bytes precisam ser encapsulados para transmissão sobre IP. A hierarquia é:

1. **MPEG-TS** (188 bytes/pacote) → encapsulado em
2. **RTP** (Real-time Transport Protocol) → encapsulado em
3. **UDP** datagramas → encapsulados em
4. **IP** pacotes → transmitidos pela camada física

O RTP é o protocolo da camada de aplicação projetado especificamente para dados em tempo real. Ele adiciona timestamps e números de sequência aos pacotes, permitindo que o receptor reordene pacotes que chegaram fora de ordem e detecte perdas.

### Por que cabem até 7 pacotes TS em um datagrama IP

A unidade máxima de transmissão (MTU) de um datagrama IP padrão em Ethernet é de aproximadamente 1500 bytes. Descontando os cabeçalhos de IP (20 bytes) e UDP (8 bytes), sobram cerca de 1472 bytes de payload útil. Dividindo 1472 por 188:

```
1472 ÷ 188 ≈ 7,8 → 7 pacotes TS completos
```

É por isso que praticamente todo equipamento de broadcasting oferece a opção de encapsular de **1 a 7 pacotes TS** por datagrama IP. Essa relação entre o tamanho do TS e o MTU da rede é um detalhe técnico fundamental que costuma passar batido, mas determina a eficiência do transporte.

---

## Requisitos de SLA para transporte em tempo real

Pacotes de Transport Stream são de **tempo real** — não admitem reenvio de pacotes nem desenfileiramento (reordenação não recuperável). Para que o transporte funcione, a rede precisa atender a três requisitos críticos:

| Requisito | Descrição | Impacto se não atendido |
|---|---|---|
| **Baixo atraso (latência)** | Prioridade para pacotes de tempo real | Atraso excessivo quebra a transmissão ao vivo |
| **Jitter controlado** | Atraso constante e previsível | Jitter variável impede recuperação dos pacotes no receptor |
| **Baixa perda de pacotes** | Menor perda possível na rede | Perda excessiva causa artefatos e tela preta |

O **jitter** é inerente ao processo de encapsulamento/desencapsulamento. Toda vez que um pacote passa por uma camada de protocolo, ele sofre variação no tempo de chegada. Em redes com atraso variável (como a internet pública), esse problema se agrava.

---

## SRT: Secure Reliable Transport e recuperação por ARQ

Quando não é possível garantir os requisitos de SLA — o que é o caso típico quando se usa internet pública em vez de links dedicados de fibra ou microondas ponto a ponto —, recorre-se ao protocolo **SRT (Secure Reliable Transport)**.

### Origem: UDT e o conceito de protocolo ALF

O SRT tem suas raízes no **UDT (UDP-based Data Transfer)**, um protocolo originalmente criado para grandes transferências de arquivos sobre UDP, posteriormente adaptado para streaming ao vivo. O SRT é classificado como um protocolo **ALF (Application Layer Framing)** — a apresentação faz uma analogia divertida com o personagem ALF dos anos 90, mas o conceito técnico é sério: o protocolo define o enquadramento dos dados na camada de aplicação, por cima do UDP, sem depender do TCP.

### Mecanismo ARQ: ACKs positivos e NACKs negativos

O mecanismo central do SRT é a **recuperação de pacotes por ARQ (Automatic Repeat reQuest)**. Funciona assim:

1. O **transmissor (TX)** mantém um **buffer** onde cada pacote enviado recebe um **número de sequência** (tag): pacote 1, pacote 2, pacote 3, etc.
2. O **receptor (RX)** também mantém um buffer e, ao receber os pacotes, verifica quais chegaram.
3. Se um pacote está faltando (ex: chegou o 2 e o 3, mas não o 1), o RX envia um **NACK (Negative Acknowledgment)** de volta ao TX, informando que o pacote 1 não foi recebido.
4. O TX **retransmite apenas o pacote perdido**, anexando-o aos próximos pacotes que já vai enviar (ex: junto com os pacotes 4 e 5, reenvia o pacote 1).
5. O RX reordena os pacotes no buffer e os entrega de forma inteligível.

A diferença crucial em relação ao TCP é que o SRT **reenvia apenas os pacotes perdidos**, não todo o fluxo. E como os buffers do TX e RX têm tamanho conhecido e controlado, é possível reordenar e reorganizar os pacotes dentro de uma janela de tempo antes que precisem ser entregues ao decoder.

### Controle de jitter pelo buffer

O buffer do receptor serve também como **absorvedor de jitter**. Como o tamanho do buffer é negociado entre TX e RX no início da sessão SRT, o sistema consegue acomodar variações de atraso da rede dentro dessa janela. Se o jitter exceder a capacidade do buffer, os pacotes chegaram tarde demais e serão descartados — resultando em perda de quadros.

---

## Monitoramento não intrusivo (SRT Sniffing)

O conceito de **monitoramento não intrusivo** (ou *SRT sniffing*) é o tema central do workshop. A ideia é observar o tráfego de streaming **sem participar da troca de dados** e **sem abrir sessões SRT adicionais**.

### Por que monitoramento intrusivo é problemático

Um monitoramento intrusivo clássico funciona abrindo uma sessão SRT extra entre a sonda de monitoramento e o transmissor, para receber uma cópia do stream. Isso gera:

- **Tráfego fantasma**: duplicação do consumo de banda na rede
- **Crescimento do buffer negociado**: mais sessões = buffers maiores
- **Risco de sobrecarga**: a própria sonda pode se tornar um gargalo
- **Efeitos colaterais**: a sonda pode interferir no que está medindo

### Como funciona o monitoramento não intrusivo

A captura não intrusiva é feita em três níveis:

1. **Port mirroring (SPAN/TAP)** em switches de rede: o switch envia uma cópia exata do tráfego de uma ou mais portas para uma porta de monitoramento, onde a sonda está conectada. O tráfego ao vivo continua fluindo de A para B sem nenhuma interferência.
2. **TAP (Test Access Point)**: dispositivo de hardware que faz um espelhamento físico do sinal, com isolamento total — risco zero de afetar o tráfego production.
3. **Ambientes virtualizados/cloud**: o mesmo princípio pode ser aplicado em instâncias na nuvem (AWS, etc.) ou em CDNs de distribuição.

A sonda analisa os pacotes que passam pelo mirror, extrai informações de cada stream via **Socket ID** (cada stream SRT tem um identificador único, mesmo quando múltiplos fluxos compartilham a mesma porta UDP), e calcula métricas em tempo real — tudo sem gerar tráfego adicional.

### Vantagens técnicas

| Característica | Intrusivo | Não intrusivo |
|---|---|---|
| Impacto na rede | Duplica tráfego | Zero impacto |
| Consumo de banda | Cresce com nº de streams | Próximo de zero |
| Buffer negociado | Aumenta com sondas | Não afetado |
| Isolamento | Risco de interferência | Físico, risco zero |
| Latência induzida | Sim (sessão extra) | Não (latência não induzida) |

---

## QoS vs QoE: duas camadas de análise

O workshop estabelece uma distinção clara entre duas camadas de monitoramento:

### Qualidade do Serviço (QoS)

Foco na **rede**. Métricas:

- Largura de banda disponível vs. consumida
- Latência de rede
- Jitter (variação de atraso)
- Perda de pacotes
- Taxa de retransmissão (no caso de SRT)

QoS garante que o transporte funciona, mas **não captura o que o usuário final está vendo**.

### Qualidade da Experiência (QoE)

Foco na **percepção do usuário**. Detecta:

- Congelamento de imagem
- Tela preta
- Vídeo sem áudio (ou áudio sem vídeo)
- Artefatos visuais (macroblocos corrompidos)
- Falhas de sincronismo labial (lip sync)

QoE é o resultado da qualidade do serviço prestado, mas envolve métricas que não são fáceis de capturar diretamente da rede — exigem análise do conteúdo do bitstream.

### As três camadas de inteligência

O workshop propõe uma arquitetura de análise em três camadas:

1. **Integridade da rede** (QoS): latência, jitter, perda de pacotes, retransmissão
2. **Integridade do MPEG-TS** (análise de protocolo): seguindo a norma **TR 101 290**, que define erros de primeira, segunda e terceira prioridade
3. **Qualidade da experiência** (QoE): análise do conteúdo decodificado, métricas de qualidade de vídeo, sincronismo áudio/vídeo

---

## TR 101 290: a norma de análise de Transport Stream

A norma **ETSI TR 101 290** define três níveis de prioridade para erros em Transport Streams MPEG:

### Primeira prioridade (críticos)

Erros que quebram a decodificação basicamente. Incluem:

- **TS_sync_loss**: perda de sincronismo do Transport Stream
- **Sync_byte_error**: byte de sincronização incorreto
- **PAT_error**: problemas na Program Association Table
- **PMT_error**: problemas na Program Map Table
- **PID_error**: PID ausente por mais tempo que o esperado

### Segunda prioridade (importantes)

Erros que afetam a continuidade:

- **Transport_error**: indicador de erro de transporte (Transport Scrambling Control)
- **PCR_error**: problemas no PCR (Program Clock Reference)
- **PCR_repetition_error**: intervalo de PCR fora do especificado
- **PCR_discontinuity_indicator**: discontinuidade não sinalizada
- **PTS_error**: problemas no Presentation Time Stamp
- **CAT_error**: problemas na Conditional Access Table

### Terceira prioridade (informativos)

Alarmes menos críticos — normalmente indicativos, não causam falhas imediatas:

- Diversos alarmes sobre tabelas e PIDs específicos

**Regra prática:** para o stream estar "bom", os erros de primeira e segunda prioridade devem estar limpos (verdes). Erros de terceira prioridade costumam ser apenas alarmes informativos.

---

## Detecção de falhas de sincronismo áudio/vídeo

Esta é a parte mais técnica e interessante do workshop. A detecção de problemas de sincronismo entre áudio e vídeo baseia-se na análise de **três motores de validação** que precisam operar em sintonia:

### 1. PCR (Program Clock Reference)

O PCR é o **clock de referência** do Transport Stream. Ele é inserido pelo multiplexador no stream de vídeo e serve como base de tempo para todo o sistema. O receptor usa o PCR para:

- Sincronizar seu clock interno com o do transmissor
- Determinar quando cada pacote deve ser apresentado

**Tipos de erro de PCR detectáveis:**

- **PCR accuracy (precisão)**: o PCR está fora da tolerância especificada pela norma. O workshop mostra um exemplo onde o delta de PCR esperado era de 40ms, mas foi medido em 120ms — uma discrepância de 80ms que indica problema no multiplexador ou no transporte.
- **PCR repetition error**: o intervalo entre PCsRs consecutivos está fora do especificado (norma exige intervalos entre 25ms e 40ms para alguns perfis)
- **PCR discontinuity**: o indicador de descontinuidade do PCR foi acionado sem a sinalização adequada

### 2. PTS (Presentation Time Stamp)

O PTS indica o **momento exato em que um quadro deve ser apresentado** ao usuário final (exibido na tela ou reproduzido no alto-falante). Cada PID (video, áudio) tem seus próprios PTSs.

**Erros detectáveis:**

- **PTS_error**: o PTS está fora dos limites esperados em relação ao PCR
- Variação anormal de PTS entre quadros consecutivos
- Descontinuidade de PTS não sinalizada

### 3. DTS (Decoding Time Stamp)

O DTS indica o **momento em que um quadro deve ser decodificado** (processado pelo decoder), que pode ser diferente do momento de apresentação. Isso acontece porque quadros B (bidirecionais) precisam de quadros futuros para serem decodificados, então a ordem de decodificação difere da ordem de apresentação.

### A relação entre PCR, PTS e DTS

Os três timestamps precisam estar em sintonia. A regra prática apresentada é:

> **Se os deltas entre PCR, PTS e DTS têm um intervalo maior que 1 segundo, há com certeza um problema de lip sync** (falta de sincronismo labial entre áudio e vídeo).

O fluxo de detecção é:

1. Monitorar o **PCR** — se houver alarme de PCR (acuracidade, repetição ou descontinuidade), algo está errado na base de tempo
2. Verificar o **PTS** de cada PID (vídeo e áudio) — se o PTS está deslocado em relação ao PCR, a apresentação está fora de tempo
3. Verificar o **DTS** — se o DTS está desalinhado, a decodificação está fora de ordem
4. Correlacionar: se há alarme de PCR, é muito provável que algo tenha acontecido entre o PTS e o DTS

### Como medir o deslocamento na prática

A ferramenta apresentada mostra a medição do PCR em **milissegundos e nanossegundos**, permitindo ver:

- O PCR de um PID de áudio específico (ex: PID 301)
- O **sample rate** do áudio
- O quanto o PCR está deslocado desse sample rate em termos de tempo
- A evolução temporal do deslocamento (gráfico de PCR jitter)

Para o vídeo, é possível ver:

- O PTS e DTS de cada quadro
- A correlação entre eles
- Se estão dentro ou fora da margem de envio (janela de buffer)

### Sincronismo labial (Lip Sync / LIPSnc)

O termo **LIPSnc** (Lip Synchronization) é usado para descrever a falta de sincronismo labial — quando o movimento dos lábios na imagem não coincide com o áudio reproduzido. A detecção se faz pela análise combinada:

- O intervalo entre PTS de áudio e PTS de vídeo deve ser **menor que 1 segundo**
- Se for maior, o usuário perceberá a dessincronização
- A medição pode ser feita comparando os PTSs dos PIDs de áudio e vídeo em relação ao PCR comum

---

## Estrutura do Elementar Stream: GOP, I/P/B frames e qualidade

Para entender as falhas de sincronismo e qualidade, é preciso entender como o vídeo é estruturado antes de ser colocado no Transport Stream:

### GOP (Group of Pictures)

Um GOP é um conjunto de quadros que começa com um **I-frame (intra)** — um quadro completo, codificado independentemente, que contém toda a informação da imagem. A partir dele, o decoder pode reconstruir os quadros seguintes:

- **I-frame (Intra)**: quadro completo, autocontido. Maior consumo de bits.
- **P-frame (Predictive)**: codifica apenas a diferença em relação ao quadro anterior (I ou P). Menos bits.
- **B-frame (Bidirectional)**: codifica a diferença em relação aos quadros anterior e seguinte. Menor consumo de bits, mas introduz dependência temporal (precisa de quadros futuros para decodificar).

### Estruturas comuns de GOP

A notação **`NdM`** descreve a estrutura do GOP:

- **N** = tamanho total do GOP (número de quadros)
- **M** = distância entre quadros P (número de B-frames entre cada P)

Exemplos citados:

- **IBBP** (12, 2): GOP de 12 quadros com 2 B-frames entre cada P → 2 I-frames por GOP
- **IBBBP** (15, 1): GOP de 15 quadros com 1 B-frame entre cada P → 1 I-frame por GOP

### Trade-off: qualidade vs. latência

Aumentar o número de I-frames melhora a resiliência a erros (o decoder pode se recuperar mais rápido), mas aumenta o bit rate e o processamento necessário. Para transmissões ao vivo com banda limitada, isso é um **cobertor curto**: mais I-frames = mais latência e mais consumo de banda, mas melhor recuperação; menos I-frames = menos banda, mas mais vulnerável a perdas.

Para futebol (conteúdo de alto movimento), um GOP com mais I-frames tende a ser melhor. Para conteúdo com menos movimento, GOPs mais longos são mais eficientes.

---

## VMAF: Video Multimethod Assessment Fusion

O workshop menciona o **VMAF**, algoritmo desenvolvido pela Netflix para medir a qualidade do vídeo codificado em comparação com o vídeo original (fonte não comprimida).

### Como funciona

O VMAF não é uma métrica simples como PSNR (Peak Signal-to-Noise Ratio) ou SSIM (Structural Similarity Index). Ele é uma **fusão de múltiplos métodos** de avaliação que combina:

- Métricas de qualidade visual (resolução perceptual, detalhe, estrutura)
- Um modelo de aprendizado de máquina treinado em dados de avaliação subjetiva humana

O resultado é um **score de 0 a 100**, onde:

- **~90-100**: qualidade muito próxima ao original
- **~50-70**: degradação perceptível
- **<50**: qualidade ruim

### Comparação com PSNR e SSIM

O VMAF tem maior **acurácia perceptual** que PSNR e SSIM porque foi treinado com dados de avaliação humana. O PSNR mede apenas a diferença matemática pixel a pixel, que nem sempre corresponde à percepção humana de qualidade. O SSIM considera a estrutura, mas ainda é menos correlacionado com a percepção humana que o VMAF.

### Aplicação prática

No contexto do monitoramento, o VMAF permite:

- Medir o quanto o sinal codificado se aproxima da fonte original
- Comparar diferentes configurações de encoding (ex: ajustar GOP, bit rate, número de B-frames) e ver o impacto na qualidade perceptual
- Detectar degradações que não aparecem nas métricas de rede (QoS) mas afetam a experiência (QoE)

---

## SCTE-35: sinalização de ad insertion

O workshop também aborda o **SCTE-35**, o padrão para sinalização de pontos de inserção de anúncios (ad insertion) dentro de um Transport Stream. Isso é relevante para o monitoramento porque:

- Os **splice points** (pontos de corte) são marcados por timestamps PTS específicos
- Se houver erro de PTS no ponto de splice, o ad insertion pode falhar — cortando no momento errado ou não cortando
- É possível correlacionar alarmes de PTS com eventos de SCTE-35 para identificar problemas na inserção de publicidade

A análise de SCTE-35 permite verificar:

- Se todos os ad insertions iniciados foram finalizados (start/stop balanceado)
- Se houve **time stamp discontinuity** nos pontos de splice
- Se as mudanças de resolução do stream coincidiram com eventos de SCTE-35

---

## Análise de macroblocos e artefatos

O workshop demonstra a análise visual de artefatos de compressão a nível de macrobloco:

- Cada quadro é dividido em **macroblocos** (blocos de 16x16 pixels no H.264/AVC, ou CTUs de tamanho variável no HEVC)
- Quando há perda de pacotes, os macroblocos afetados não são decodificados corretamente
- A ferramenta mostra **blocos vermelhos** indicando perda total de pacote naquela região
- É possível ver o exato ponto onde houve perda de pacotes e o que isso originou na quantização

A análise também permite:

- Comparar um frame original (não comprimido) com o frame comprimido, calculando a diferença
- Visualizar a qualidade da quantização frame a frame
- Ver o **reader de extração** do pacote e a análise subjetiva de completude

---

## Codecs suportados

A ferramenta apresentada suporta análise de:

- **AVC (H.264)** — padrão atual mais usado
- **HEVC (H.265)** — mais eficiente, usado em 4K
- **AV1** — codec aberto da AOMedia, usado pelo YouTube
- **VVC (H.266)** — próxima geração
- **AVS3** — padrão chinês, relevante para TV 3.0

Isso cobre desde o ISDB-Tb atual (usado no Brasil) até TV 3.0 e streaming web com AV1.

---

## Resumo dos mecanismos de detecção de falhas de sincronismo

Para consolidar, aqui está o fluxo completo de detecção de problemas de sincronismo áudio/vídeo:

### Fluxo de diagnóstico

```
1. Monitorar QoS da rede
   ├── Latência, jitter, perda de pacotes
   ├── Taxa de retransmissão SRT (ARQ)
   └── Se jitter > buffer → overflow → perda de quadros

2. Analisar integridade do MPEG-TS (TR 101 290)
   ├── Erros de 1ª prioridade: sync, PAT, PMT, PID
   ├── Erros de 2ª prioridade: PCR, PTS, CAT
   └── Se PCR com erro → base de tempo comprometida

3. Análise fina de timestamps
   ├── PCR: precisão (accuracy), repetição, descontinuidade
   ├── PTS de cada PID (vídeo e áudio): deslocamento em relação ao PCR
   ├── DTS: ordem de decodificação vs. apresentação
   └── Delta PTS áudio - PTS vídeo > 1s → LIPSnc (lip sync failure)

4. Análise de QoE
   ├── VMAF: qualidade perceptual vs. fonte original
   ├── Artefatos visuais: macroblocos corrompidos, blocos vermelhos
   ├── Congelamento: perda de I-frame → decoder não consegue reconstruir
   └── Tela preta: perda estrutural do bitstream
```

### Tabela de correlação causa → sintoma

| Causa (camada técnica) | Sintoma (QoE) | Como detectar |
|---|---|---|
| Jitter severo > buffer RX | Congelamento, perda de quadros | Medir jitter de rede vs. tamanho do buffer |
| Perda de pacotes SRT não recuperada | Artefatos, macroblocos vermelhos | Taxa de retransmissão + NACKs não resolvidos |
| PCR inacurado / descontínuo | Dessincronização áudio/vídeo | Delta de PCR vs. esperado (ex: 120ms vs. 40ms) |
| PTS de áudio deslocado do PTS de vídeo | Lip sync failure (LIPSnc) | Delta PTS áudio - PTS vídeo > 1 segundo |
| Perda de I-frame | Tela preta até próximo I-frame | Análise de GOP + perda de pacotes no PID de vídeo |
| Erro de PTS em splice point SCTE-35 | Ad insertion falha/corta no momento errado | Correlação de alarmes PTS + eventos SCTE-35 |
| Largura de banda insuficiente | Artefatos, queda de qualidade | Bit rate do stream vs. banda contratada |

---

## Pensando em alternativas open-source

O workshop apresenta uma ferramenta comercial (Elecard Boro) que cobre todo o espectro de análise — de QoS de rede até QoE de conteúdo. Mas os conceitos técnicos são implementáveis com ferramentas open-source. Algumas reflexões:

### Análise de rede (QoS)

- **Wireshark / tshark**: análise de pacotes SRT, RTP, UDP. O Wireshark tem dissectors para RTP e pode calcular jitter, perda de pacotes e delta de timestamps. Para SRT, existem dissectors em desenvolvimento.
- **tcpdump**: captura de tráfego via port mirror / SPAN, alimentando análise posterior
- **Zeek (Bro)**: análise de tráfego em tempo real, com scripts customizados para extrair métricas de streaming

### Análise de MPEG-TS (TR 101 290)

- **tsanalyze** (do projeto **tsduck**): ferramenta CLI que analisa Transport Streams e reporta erros conforme TR 101 290, incluindo prioridade 1, 2 e 3
- **ffmpeg / ffprobe**: extração de informações de stream (PIDs, codecs, bit rate, resolução, PTS/DTS)
- **dvbsnoop**: analisador de DVB/MPEG-TS para diagnóstico detalhado de pacotes

### Análise de timestamps (PCR/PTS/DTS)

- **tsduck** (`tsp`, `tsanalyze`): permite extrair e analisar PCR, PTS e DTS de PIDs específicos, calcular jitter de PCR, descontinuidades
- **FFmpeg**: com filtros apropriados, é possível extrair timestamps e calcular deltas

### Análise de qualidade de vídeo (QoE / VMAF)

- **VMAF** (open-source da Netflix): disponível no GitHub, pode ser executado para comparar vídeo original vs. codificado
- **FFmpeg** com filtros de PSNR/SSIM: métricas mais simples mas úteis
- **Scenestar / VideoQualityMetrics**: ferramentas para análise de qualidade

### Sincronismo áudio/vídeo

A detecção de lip sync com ferramentas open-source exigiria um pipeline customizado:

1. Extrair PTS de áudio e PTS de vídeo do MPEG-TS com `tsduck` ou `ffprobe`
2. Calcular o delta entre eles em relação ao PCR
3. Gerar alertas quando o delta exceder 1 segundo
4. Correlacionar com perda de pacotes e alarmes de PCR

Isso é totalmente factível com um script Python que processa a saída do `tsduck` ou `ffprobe` e aplica as regras de detecção descritas acima.

### Monitoramento não intrusivo

O princípio do port mirroring / SPAN é independente de ferramenta — qualquer switch gerenciável suporta. A análise pode ser feita com `tcpdump` capturando da porta SPAN e processando com `tshark` ou scripts customizados.

---

## Conclusão

O workshop da Elecard é uma excelente introdução aos mecanismos técnicos de monitoramento de streaming, cobrindo desde o transporte de pacotes TS sobre IP até a análise fina de timestamps e qualidade perceptual. Os conceitos são sólidos e bem explicados, independente da ferramenta comercial apresentada.

A parte mais valiosa tecnicamente é a **correlação entre PCR, PTS e DTS** para detectar falhas de sincronismo áudio/vídeo — um problema que afeta diretamente a experiência do usuário mas que métricas de rede simples não conseguem capturar. A regra prática de que **deltas maiores que 1 segundo entre PTS de áudio e vídeo indicam lip sync failure** é um critério claro e implementável.

Fica o desafio: montar um pipeline open-source que cubra pelo menos as camadas de QoS (rede) e análise de TR 101 290 (MPEG-TS), com alertas de lip sync baseados em PCR/PTS. Com `tsduck`, `tshark`, `ffmpeg` e um pouco de Python, é possível chegar longe.

---

*Baseado no workshop "Monitoramento de QoS/QoE para Serviços de Streaming" da Elecard, publicado em 17/08/2026. [Link do vídeo](https://www.youtube.com/watch?v=0l6CstJjWo4).*
