---
title: "Resumo: Google Play anuncia novos requisitos de qualidade — otimização de memória e migração segura de dispositivos (Android Developers Blog)"
date: 2026-08-30
tags: ["android", "desenvolvimento-mobile", "google-play"]
---

> *Resumo do artigo [Elevating app quality: Reducing memory usage and improving device migration](https://android-developers.googleblog.com/2026/08/app-quality-memory-optimization-secure-onboarding.html), publicado no [Android Developers Blog](https://android-developers.googleblog.com/) em 26 de agosto de 2026 por Raghavendra Hareesh Pottamsetty, GM, Google Play Developer & Monetization.*

---

O Google Play anunciou em 26 de agosto de 2026 dois novos requisitos de qualidade para apps e jogos na plataforma Android. O primeiro foca em **reduzir o consumo de memória** dos apps; o segundo introduz um padrão de **migração segura entre dispositivos** (o "Zero-Tap Sign-In"). Ambos têm prazos de enforcement em 2027 e já têm ferramentas disponíveis no Play Console para ajudar os desenvolvedores a se prepararem.

## Reduzindo o uso de memória e otimizando código

A indústria mobile está enfrentando restrições significativas na disponibilidade de memória dos dispositivos — uma consequência de limitações de hardware que afetam a experiência do usuário ao longo do tempo. O Android já está lidando com isso através de [memory limits mais amplos](https://android-developers.googleblog.com/2026/08/app-broader-memory-limits.html), que protegem o sistema contra apps que consomem excesso de memória e causam lentidão generalizada.

Agora, o Google Play está estabelecendo [performance thresholds](https://support.google.com/googleplay/android-developer/answer/17492799) específicos para garantir que os apps continuem entregando uma experiência premium. São três áreas de medição:

### 1. Memória dinâmica (Anonymous RSS + Swap)

Rastreia a memória usada para armazenamento de dados privados do app, incluindo tanto memória ativa quanto comprimida. Exclui arquivos armazenados no dispositivo (como código ou assets). A avaliação é feita considerando diferentes estados do app (em uso ou em background) e categorias de desempenho do dispositivo.

### 2. Uso de memória por Bitmaps

Avalia a memória consumida por bitmaps. Embora seja esperado que bitmaps ocupem memória quando o app está em foreground, eles **não devem permanecer na memória por períodos prolongados** em estados não-visíveis — como background e cached.

### 3. Código DEX otimizado

Um App Bundle bem otimizado usa menos memória, inicia mais rápido, reduz ANRs (Application Not Responding) e melhora a performance de renderização e execução. Para garantir um footprint otimizado, apps publicados no Google Play devem ser [otimizados](https://developer.android.com/topic/performance/app-optimization/enable-app-optimization) com **mínimo de 25% de cobertura** entre otimização, shrinking e obfuscação — usando ferramentas como R8 ou outra ferramenta de shrinking equivalente.

---

> Os detalhes técnicos completos dos thresholds — incluindo diferenças entre apps e jogos, buckets de RAM e estados de processo — estão disponíveis na [página oficial de suporte](https://support.google.com/googleplay/android-developer/answer/17492799).

## Novas ferramentas no Play Console

Para ajudar os desenvolvedores a descobrir, investigar e otimizar proativamente seus apps em relação aos novos thresholds, o Google Play já começou a liberar ferramentas no Play Console:

| Ferramenta | O que faz |
|---|---|
| **Métricas de memória dinâmica** | Monitora o uso de memória (anonymous RSS + swap) e bitmap diretamente no [Android vitals](https://play.google.com/console/developers/app/vitals/metrics/overview). Permite drill-down por percentis e buckets de RAM para identificar exatamente onde há memory bloat. |
| **Filtro de "out of memory" crashes** | Novo filtro em Crashes e ANRs para identificar quando o SO terminou o app devido a pressão severa de memória no dispositivo. |
| **Insights de otimização de DEX** | Para cada [novo app bundle enviado ao Play Console](https://play.google.com/console/developers/app/releases/overview), o Google exibe insights detalhados de otimização. Se a ferramenta de shrinking compartilha metadata de otimização, é possível avaliar a eficiência do código e identificar áreas de melhoria. |
| **Alertas proativos de performance** | Quando o app excede os [bad behavior thresholds](https://support.google.com/googleplay/android-developer/answer/17492799), um aviso aparece diretamente na página de overview do Android vitals. Também alerta sobre bitmaps não otimizados, otimização DEX limitada ou uso limitado de split-bundle. |

**Ferramentas adicionais** estão previstas para ainda este ano, incluindo:

- Métricas sobre **quanto tempo o app passa em cada estado** (foreground, background, cached)
- Insights detalhados sobre o [Android Memory Limiter](https://source.android.com/docs/core/perf/memory-limiter) — a feature que previne apps individuais de consumir excesso de memória do dispositivo

## Cronograma de enforcement

| Requisito | Data de enforcement | Consequência de não conformidade |
|---|---|---|
| Thresholds de memória (RSS + Swap), bitmaps e DEX | **Fevereiro 2027** | Visibilidade reduzida e capacidades de publicação limitadas no Google Play |
| Zero-Tap Sign-In | **Abril 2027** | Capacidades de publicação reduzidas e visibilidade não-otimizada no Play Store |

Os thresholds devem se adaptar ao longo do tempo conforme o ecossistema Android evolui. O Google promete dar tempo adequado para conformidade sempre que requisitos forem atualizados.

## Migração segura e sem fricção entre dispositivos

Quando um usuário troca de dispositivo, migrar os apps deveria ser seguro e sem esforço. O Google Play está introduzindo o padrão **Zero-Tap Sign-In** para tornar o login mais rápido e seguro durante transferências de dispositivo.

### Como funciona

O Zero-Tap Sign-In exige que qualquer app com suporte a sign-in (opcional ou obrigatório) **restaure automaticamente o estado de login do usuário** quando ele move de um dispositivo Android para outro, utilizando a [Android Restore Credentials API](https://developer.android.com/identity/sign-in/restore-credentials). Isso significa que quando o usuário abre o app pela primeira vez no novo dispositivo, ele é **reconhecido e autenticado instantaneamente**, sem taps adicionais.

> A partir de **abril de 2027**, o Google Play exigirá que os apps atendam ao requisito de Zero-Tap Sign-In para manter capacidades totais de publicação e visibilidade otimizada no Play Store.

**Jogos estão isentos** do requisito de Zero-Tap Sign-In por enquanto, mas o Google strongly encoraja o uso da Restore Credentials API para jogos que suportam single-account sign-in. Orientações dedicadas e soluções tailored para casos complexos de autenticação em jogos devem chegar em 2027. Mais informações na [help center do Google Play](https://support.google.com/googleplay/android-developer/answer/17492799#zero-tap_sign-in_restoration).

## Planejando sua roadmap

O Google recomenda revisar os detalhes de cada requisito com antecedência:

1. **[Reduzindo uso de memória e otimizando código](https://support.google.com/googleplay/android-developer/answer/17492799)** — revisar thresholds, entender diferenças entre apps e jogos, buckets de RAM e estados de processo
2. **[Migração segura de dispositivos](https://support.google.com/googleplay/android-developer/answer/17492799#zero-tap_sign-in_restoration)** — implementar a Restore Credentials API para Zero-Tap Sign-In

---

*Fonte: [Android Developers Blog](https://android-developers.googleblog.com/) — "Elevating app quality: Reducing memory usage and improving device migration", por Raghavendra Hareesh Pottamsetty, publicado em 26 de agosto de 2026.*
