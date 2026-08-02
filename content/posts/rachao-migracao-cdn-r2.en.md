---
title: "Migrating the rachao.app image CDN — from Supabase Storage to Cloudflare R2"
date: 2026-08-01
tags:
  - rachao.app
  - cloudflare
  - r2
  - supabase
  - homelab
  - infrastructure
  - s3
---

In my previous post about rachao.app, I mentioned Supabase as the database and image storage. After the homelab migration, the database was already moved off Supabase — to a Postgres 16 running in the k3s cluster itself. Only the avatar Storage remained as the last Supabase service still in use. This post is about how I migrated that resource to Cloudflare R2 — a targeted adjustment that closes the loop on fully exiting Supabase and the VPS Hostinger.

## The context

rachao.app was born on a classic personal-project stack: VPS Hostinger + Traefik + Supabase (managed Postgres + image storage). It worked well for months. In July 2026, I migrated the application to the homelab — an HP EliteDesk 800 G3 running k3s, behind a Cloudflare Tunnel. The database was restored to a Postgres 16 instance running inside the cluster; the API (Go) and frontend (SvelteKit) became k8s deployments managed by Argo CD via GitOps.

After that cutover, **Supabase Storage** was the only remaining service. The Go API talked directly to the Storage HTTP API to upload and delete avatars (256×256 WebP files) — sporadic calls, ~290 KB of images total. Keeping an entire Supabase project alive just for that was unnecessary.

## Why migrate the storage

Two reasons — one business, one technical:

**Business:** Supabase's Free tier pauses projects due to inactivity. Since the database was no longer on Supabase — only the Storage API received sporadic calls — the risk of inactivity pause was real. And a pause meant avatars going offline. The Pro plan costs $25/month, which is hard to justify for ~290 KB of images.

**Technical:** The absolute Supabase URL (`https://<ref>.supabase.co/storage/v1/object/public/avatars/…`) was persisted in `players.avatar_url` in the database. This coupled the vendor's domain to the data — any future vendor switch would require another backfill. The sooner I cut that tie, the simpler.

## Cloudflare R2 — the natural choice

The rachao.app DNS zone was already on Cloudflare (DNS + Tunnel + proxy). R2 fit without friction: same vendor, native custom domain (`cdn.rachao.app`), edge caching, and — the detail that matters most — **zero egress**. R2 doesn't charge for outbound traffic. On the free tier (10 GB), the cost is zero in any realistic scenario for the app.

| Criteria | Supabase Storage | Cloudflare R2 |
|---|---|---|
| Egress | Charged (limited on Free) | **$0** — any volume |
| Custom domain | No (`.supabase.co` URL) | **Yes** (`cdn.rachao.app`) |
| Edge cache | No | **Yes** (Cloudflare CDN) |
| API | Proprietary REST | **S3-compatible** (minio-go) |
| Free tier | 1 GB, inactivity pause | **10 GB, no pause** |
| Lock-in | Vendor URL in database | Own URL (`cdn.rachao.app`) |

Other alternatives were considered and discarded:

- **MinIO/Garage in the cluster** — single node, `local-path` SSD, residential uptime. Public media can't depend on whether the power went out at home.
- **Backblaze B2** — cheaper per GB, but irrelevant at this scale; one more vendor and one more invoice.
- **Bunny Storage** — ~$1/month minimum > R2 cost ($0 on free tier).

## The migration, step by step

### 1. Bucket and custom domain

Created the `rachao-media` bucket in R2 and set up the custom domain `cdn.rachao.app`. Since the zone was already on Cloudflare, edge caching was automatic — no extra DNS config needed.

### 2. Object migration

The 11 existing avatars (~290 KB total) were copied from the Supabase `avatars` bucket to R2, keeping the same path structure. With so few small files, the migration was manual — no automation script needed.

### 3. Database backfill

The URLs in `players.avatar_url` pointed to Supabase. Updated the 7 rows that had avatars to the new format `https://cdn.rachao.app/avatars/…`. Important: the object path (`avatars/{player_id}-{token}.webp`) was preserved — only the domain changed.

### 4. Code rewrite

The Go `StorageService` was rewritten entirely. Before, it spoke HTTP directly to the Supabase Storage API (POST with `Authorization: ***` and `x-upsert: true`). Now it uses the **S3 API** via `minio-go`:

```go
// Before: Supabase Storage HTTP API
func NewStorageService(supabaseURL, serviceRoleKey string) *StorageService {
    return &StorageService{
        baseURL:        strings.TrimRight(supabaseURL, "/"),
        serviceRoleKey: serviceRoleKey,
    }
}

// After: Cloudflare R2 via S3 (minio-go)
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

The upload went from a manual `http.NewRequestWithContext` to a `client.PutObject` with native S3 metadata — including `Cache-Control: public, max-age=31536000, immutable`. The object name changes on every upload (random token), so the URL is effectively immutable and can be cached aggressively.

The `ExtractStoragePath` function — which extracts the object key from a URL to delete the old avatar — was written to **accept both formats**: the new one (`cdn.rachao.app/avatars/…`) and the legacy Supabase one (`<ref>.supabase.co/storage/v1/object/public/avatars/…`). This ensures old avatars still referenced in the database are correctly deleted when a user changes their photo, even before the backfill completes.

### 5. Configuration and secrets

The environment variables changed:

| Before (Supabase) | After (R2) |
|---|---|
| `SUPABASE_URL` | `R2_ACCOUNT_ID` |
| `SUPABASE_SERVICE_ROLE_KEY` | `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` |
| — | `R2_BUCKET` (default: `rachao-media`) |
| — | `R2_PUBLIC_BASE_URL` (default: `https://cdn.rachao.app`) |

In the homelab, R2 credentials live in the k8s `rachao-api` Secret — not in GitHub Actions. The ConfigMap exposes only `R2_BUCKET` and `R2_PUBLIC_BASE_URL` (non-secret). Argo CD manages everything via GitOps.

### 6. Tests

New unit tests were written for the `StorageService` using a **fake S3** (an `httptest.Server` that captures requests and responds with a configured status). The tests validate:

- Upload does a `PUT` to the correct bucket with `Content-Type: image/webp` and long `Cache-Control`
- R2 500 error propagates as an upload error
- Delete by legacy Supabase URL extracts the correct key and issues `DELETE`
- Foreign URL (not CDN, not Supabase) is ignored — no request is made

### 7. Privacy policy

Small but important: the app's privacy policy (in all three languages — pt-BR, EN, ES) was updated. The subprocessor "Database provider (Supabase) — All platform data" became "CDN and media storage (Cloudflare) — Profile photos and platform traffic". After all, switching vendors without updating the policy would be sloppy at best.

## The bigger picture — VPS exit

The R2 migration is the last piece of a movement that started in July:

1. **2026-07-16** — Decommissioned the staging environment on the VPS (`beta.rachao.app`, staging Go API, db-hml). Entire stack removed, Traefik routes cleaned up, Grafana alerts purged.
2. **2026-07-22** — Full cutover: `rachao.app`, `www` and `api.rachao.app` are now served by the homelab via Cloudflare Tunnel. The VPS deploy job is removed from CI; the frontend now builds with `VITE_API_URL` pointing to `/api/v2`. Argo CD handles rollouts, consuming `:<sha>` tags from GHCR.
3. **2026-07-31** — The v1 Python API and frontend containers on the VPS are stopped for good. Prometheus alerts for v1 are removed.
4. **2026-08-01** — Avatar storage migrated from Supabase to R2. Last external dependency cut.

The result: zero active vendors for this project besides Cloudflare (DNS + Tunnel + proxy + storage) and Stripe (payments). The database and application run on the homelab. CI/CD runs on GitHub Actions. Everything that cost money (VPS, Supabase) was eliminated.

## What's left

The current rachao.app architecture:

```
Internet → Cloudflare (proxy + cache) → Tunnel → Traefik (k3s)
   rachao.app / www        → SvelteKit SSR (Node :3000)
   api.rachao.app          → football-api-go (Go :8080, /api/v2)
   cdn.rachao.app          → Cloudflare R2 (avatars, edge cache)

API Go → postgres.postgres.svc.cluster.local:5432/rachao
CI/CD  → GitHub Actions → GHCR → Argo CD (GitOps) → k3s
```

## Was it worth it?

The learning experience of doing a zero-downtime storage migration — maintaining compatibility with legacy URLs, writing tests against a fake S3, updating privacy policies — is the kind of thing you learn best by doing. I could've left Supabase running, but then I wouldn't have exercised the S3 API, wouldn't have integrated R2, and the lingering dependency would still be there, accumulating risk.

In the end, it was a targeted resource adjustment that eliminated the project's last external dependency. rachao.app today runs on infrastructure I understand end to end — from the Cloudflare tunnel to the pod in k3s. Every piece has a reason to be there, and every piece can be swapped independently.

## What about you?

If you had to choose today — R2, B2, direct S3, MinIO in the cluster — what would be your pick for a small project that needs to scale without pain? And does Cloudflare's zero egress matter to you, or is it irrelevant at your scale? Let me know.

---

*The full technical details of this migration are documented in [ADR 0006](https://github.com/thiagotn/homelab/blob/main/docs/adr/0006-avatares-cloudflare-r2.md) of the homelab repo and in the [football-manager commits](https://github.com/thiagotn/football-manager/commit/c9d1327ab334).*