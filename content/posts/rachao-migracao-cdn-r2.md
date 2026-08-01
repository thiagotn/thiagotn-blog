---
title: "Adeus Supabase, olá Cloudflare R2 — migrando a CDN de imagens do rachao.app"
date: 2026-08-01
tags:
  - rachao.app
  - cloudflare
  - r2
  - supabase
  - homelab
  - infraestrutura
  - s3
---

No último post contei a história do rachao.app — do vibecoding supervisionado ao produto em produção. Uma das decisões que mencionei de passagem foi a escolha do Supabase como banco. Pois bem: o Supabase acabou de sair de cena. Este post é sobre como e por que migrei a última peça que ainda dependia dele — o storage de avatares — para o Cloudflare R2, e como isso fecha o ciclo de uma migração maior: VPS Hostinger → homelab self-hosted.

## O contexto — ou: como chegamos aqui

O rachao.app nasceu numa stack clássica de projeto pessoal: VPS Hostinger + Traefik + Supabase (Postgres gerenciado + Storage de imagens). Funcionou bem por meses. Mas em julho de 2026, migrei tudo para o homelab — um HP EliteDesk 800 G3 rodando k3s, atrás de um Cloudflare Tunnel. O banco foi restaurado num Postgres 16 rodando no próprio cluster; a API (em Go) e o frontend (SvelteKit) passaram a rodar como deployments no k3s, gerenciados por Argo CD via GitOps.

Depois desse cutover, sobrou uma pendência: o **Storage do Supabase**. A API Go falava HTTP direto com a Storage API do Supabase para upload e remoção de avatares (WebPs 256×256). Era a única dependência restante — e manter um projeto Supabase inteiro só pra isso não fazia sentido.

## Por que sair do Supabase Storage?

Dois motivos, um de negócio e um técnico:

**Negócio:** O plano Free do Supabase pausa projetos por inatividade. Como o banco já não estava mais no Supabase — só a Storage API recebia chamadas esporádicas (upload de avatar) — o risco de pausa por inatividade era real. E pausa significava avatares fora do ar. O plano Pro custa US$ 25/mês, o que não se justifica pra ~290 KB de imagens.

**Técnico:** A URL absoluta do Supabase (`https://<ref>.supabase.co/storage/v1/object/public/avatars/…`) estava persistida em `players.avatar_url` no banco. Isso acoplava o domínio do fornecedor aos dados — uma migração futura exigiria backfill de novo. Quanto mais cedo cortasse o vínculo, mais fácil.

## Cloudflare R2 — a escolha natural

A zona de DNS do rachao.app já estava na Cloudflare (DNS + Tunnel + proxy). O R2 se encaixou sem atrito: mesmo fornecedor, custom domain nativo (`cdn.rachao.app`), cache na borda, e — o detalhe que mais importa — **zero egress**. O R2 não cobra por tráfego de saída. No free tier (10 GB), o custo é zero em qualquer cenário realista para o app.

| Critério | Supabase Storage | Cloudflare R2 |
|---|---|---|
| Egress | Cobrado (limitado no Free) | **US$ 0** — qualquer volume |
| Custom domain | Não (URL `.supabase.co`) | **Sim** (`cdn.rachao.app`) |
| Cache na borda | Não | **Sim** (CDN da Cloudflare) |
| API | REST proprietária | **S3 compatível** (minio-go) |
| Free tier | 1 GB, pausa por inatividade | **10 GB**, sem pausa |
| Lock-in | URL do fornecedor no banco | URL própria (`cdn.rachao.app`) |

Outras alternativas foram consideradas e descartadas:

- **MinIO/Garage no cluster** — node único, SSD `local-path`, uptime residencial. Mídia pública não pode depender de se a luz caiu em casa.
- **Backblaze B2** — mais barato por GB, mas irrelevante nessa escala; mais um fornecedor e mais uma fatura.
- **Bunny Storage** — mínimo mensal de ~US$ 1 > custo do R2 (US$ 0 no free tier).

## A migração, passo a passo

### 1. Bucket e custom domain

Criei o bucket `rachao-media` no R2 e configurei o custom domain `cdn.rachao.app`. Como a zona já estava na Cloudflare, o cache na borda foi automático — não precisou de nenhuma config extra de DNS.

### 2. Migração dos objetos

Os 11 avatares existentes (~290 KB no total) foram copiados do bucket `avatars` do Supabase para o R2, mantendo a mesma estrutura de paths. Por serem poucos arquivos pequenos, a migração foi manual — sem script de automação.

### 3. Backfill do banco

As URLs em `players.avatar_url` apontavam para o Supabase. Atualizei as 7 linhas que tinham avatar para o novo formato `https://cdn.rachao.app/avatars/…`. Importante: o path do objeto (`avatars/{player_id}-{token}.webp`) foi preservado — só o domínio mudou.

### 4. Reescrita do código

O `StorageService` em Go foi reescrito por completo. Antes, falava HTTP direto com a Storage API do Supabase (POST com `Authorization: Bearer`, `x-upsert: true`). Agora, usa a **API S3** via `minio-go`:

```go
// Antes: Supabase Storage HTTP API
func NewStorageService(supabaseURL, serviceRoleKey string) *StorageService {
    return &StorageService{
        baseURL:        strings.TrimRight(supabaseURL, "/"),
        serviceRoleKey: serviceRoleKey,
    }
}

// Depois: Cloudflare R2 via S3 (minio-go)
func NewStorageService(accountID, accessKeyID, secretAccessKey, bucket, publicBaseURL string) (*StorageService, error) {
    endpoint := accountID + ".r2.cloudflarestorage.com"
    client, err := minio.New(endpoint, &minio.Options{
        Creds:  credentials.NewStaticV4(accessKeyID, secretAccessKey, ""),
        Secure: true,
        Region: "auto",
    })
    // ...
}
```

O upload passou de um `http.NewRequestWithContext` manual para um `client.PutObject` com metadados S3 nativos — incluindo `Cache-Control: public, max-age=31536000, immutable`. O nome do objeto muda a cada upload (token aleatório), então a URL é efetivamente imutável e pode ser cacheada agressivamente.

A função `ExtractStoragePath` — que extrai o object key da URL para deletar o avatar antigo — foi escrita para **aceitar os dois formatos**: o novo (`cdn.rachao.app/avatars/…`) e o legado do Supabase (`<ref>.supabase.co/storage/v1/object/public/avatars/…`). Isso garante que avatares antigos ainda referenciados no banco sejam corretamente deletados quando o usuário troca de foto, mesmo antes do backfill completar.

### 5. Configuração e secrets

As variáveis de ambiente mudaram:

| Antes (Supabase) | Depois (R2) |
|---|---|
| `SUPABASE_URL` | `R2_ACCOUNT_ID` |
| `SUPABASE_SERVICE_ROLE_KEY` | `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` |
| — | `R2_BUCKET` (default: `rachao-media`) |
| — | `R2_PUBLIC_BASE_URL` (default: `https://cdn.rachao.app`) |

No homelab, as credenciais R2 vivem no Secret `rachao-api` do k8s — não em GitHub Actions. O ConfigMap expõe apenas `R2_BUCKET` e `R2_PUBLIC_BASE_URL` (não-secreto). O Argo CD gerencia tudo via GitOps.

### 6. Testes

Escrevi testes unitários novos para o `StorageService` usando um **fake S3** (um `httptest.Server` que captura requests e responde com status configurado). Os testes validam:

- Upload faz `PUT` no bucket correto com `Content-Type: image/webp` e `Cache-Control` longo
- Erro 500 do R2 propaga como erro de upload
- Delete por URL legada do Supabase extrai o key correto e faz `DELETE`
- URL de fora (não-CDN, não-Supabase) é ignorada — nenhum request é feito

### 7. Política de privacidade

Pequena mas importante: a política de privacidade do app (nos três idiomas — pt-BR, EN, ES) foi atualizada. O subprocessador "Provedor de banco de dados (Supabase) — Todos os dados da plataforma" virou "CDN e armazenamento de mídia (Cloudflare) — Fotos de perfil e tráfego da plataforma". Afinal, trocar de fornecedor sem atualizar a política seria no mínimo desleixado.

## O panorama maior — VPS de saída

A migração do R2 é a última peça de um movimento que começou em julho:

1. **2026-07-16** — Decomissionamento do ambiente de homologação no VPS (`beta.rachao.app`, API Go de homologação, db-hml). Stack inteira removida, Traefik routes limpos, alertas do Grafana purgados.
2. **2026-07-22** — Cutover completo: `rachao.app`, `www` e `api.rachao.app` passam a ser servidos pelo homelab via Cloudflare Tunnel. O job de deploy no VPS é removido do CI; o frontend passa a buildar com `VITE_API_URL` apontando para `/api/v2`. Quem faz rollout agora é o Argo CD, consumindo as tags `:<sha>` do GHCR.
3. **2026-07-31** — API v1 (Python) e containers do frontend no VPS são parados definitivamente. Alertas do Prometheus para a v1 são removidos.
4. **2026-08-01** — Storage de avatares migrado do Supabase para o R2. Última dependência externa cortada.

O resultado: zero fornecedores ativos pra esse projeto além da Cloudflare (DNS + Tunnel + proxy + storage) e do Stripe (pagamentos). O banco e a aplicação rodam no homelab. O CI/CD roda no GitHub Actions. Tudo o que custava dinheiro (VPS, Supabase) foi eliminado.

## O que ficou

A arquitetura atual do rachao.app:

```
Internet → Cloudflare (proxy + cache) → Tunnel → Traefik (k3s)
   rachao.app / www        → SvelteKit SSR (Node :3000)
   api.rachao.app          → football-api-go (Go :8080, /api/v2)
   cdn.rachao.app          → Cloudflare R2 (avatares, cache na borda)

API Go → postgres.postgres.svc.cluster.local:5432/rachao
CI/CD  → GitHub Actions → GHCR → Argo CD (GitOps) → k3s
```

## Valeu a pena?

Sem dúvida. O aprendizado de fazer uma migração de storage com zero downtime — mantendo compatibilidade com URLs legadas, escrevendo testes contra um S3 fake, atualizando política de privacidade — é o tipo de coisa que se estuda melhor fazendo. Poderia ter deixado o Supabase rodando, mas aí não teria aprendido a integrar R2, não teria exercitado a API S3, e a pendência continuaria lá, acumulando risco.

E tem um lado satisfatório em cortar dependências. O rachao.app hoje roda numa infraestrutura que eu entendo ponta a ponta — do túnel da Cloudflare ao pod no k3s. Cada peça tem um motivo pra estar ali, e cada uma pode ser trocada independentemente.

## E você?

Se tivesse que escolher hoje — R2, B2, S3 direto, MinIO no cluster — qual seria sua opção para um projeto pequeno que precisa crescer sem dor? E o egress zero da Cloudflare é um fator decisivo pra você, ou irrelevante na sua escala? Comenta aí.

---

*Os detalhes técnicos completos dessa migração estão documentados na [ADR 0006](https://github.com/thiagotn/homelab/blob/main/docs/adr/0006-avatares-cloudflare-r2.md) do repo do homelab e nos [commits do football-manager](https://github.com/thiagotn/football-manager/commit/c9d1327ab334).*