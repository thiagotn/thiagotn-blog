# thiagotn.com — blog

Blog pessoal em **[Hugo](https://gohugo.io/)** com o tema **[Goa](https://themes.gohugo.io/themes/hugo-goa/)** (`shenoydotme/hugo-goa`),
conteúdo em markdown. Publicado no meu homelab k3s (repo de infra `../homelab`).

## Escrever

Site **bilíngue** (Hugo multilingual): pt-BR na raiz, inglês sob `/en/`.

Conteúdo em `content/`:
- home: gerada pelo tema a partir dos `params` por idioma no `hugo.yaml` (`intro`, `authorimage`…).
- `content/posts/` — posts. Cada post é um par `foo.md` (pt-BR) + `foo.en.md` (inglês); o Hugo
  linka a tradução pelo basename. Front matter com `title`, `date`, `tags` (tags são por idioma:
  `ia`/`ai` etc.). Se quiser URL em inglês diferente do basename, use `slug:` no `.en.md`.
- `content/about/index.md` + `index.en.md` — sobre.
- Strings de UI ("min de leitura", prev/next, 404…) em `i18n/pt-br.yaml` e `i18n/en.yaml`.
- `layouts/partials/` — overrides do tema (que não tem suporte i18n): datas localizadas, strings
  via i18n, hreflang, language switcher. Cópias do commit pinado do tema; re-diffar contra o
  upstream antes de atualizar o módulo (`hugo mod get -u`).

Preview local (precisa do Hugo extended, ou use o container abaixo):

```bash
hugo server --buildDrafts
# ou, sem instalar nada:
docker run --rm -it -p 1313:1313 -v "$PWD":/src hugomods/hugo:exts \
  hugo server --bind 0.0.0.0 --buildDrafts
```

## Deploy (GitOps — automático por `git push`)

`git push` na `main` dispara `.github/workflows/build-image.yml`:
1. **build-push:** Hugo builda o site (multi-stage Dockerfile) e a imagem vai pro GHCR
   (`ghcr.io/thiagotn/thiagotn-blog`, tags `sha-<sha>` + `latest`).
2. **bump-homelab-tag:** atualiza a tag no `kustomization.yaml` do repo `homelab` (deploy key SSH em
   `secrets.HOMELAB_DEPLOY_KEY`); o **Argo CD** detecta e faz o rollout. O cluster é read-only p/ o CI.

Manifests k8s (Deployment/Service/Ingress/ddns) vivem em `../homelab` → `helm/apps/thiagotn-blog/`.
Domínio canônico **thiagotn.com** (`www` faz 301 → apex), TLS Let's Encrypt via cert-manager (DNS-01).

## Arquivos de build
- `Dockerfile` — stage 1 (Hugo+Go buildam) → stage 2 (`nginx:stable-alpine`, non-root uid 101, :8080, `/healthz`).
- `nginx.conf` — gzip, cache por extensão, security headers, redirect `www` → apex.
- `.dockerignore` — exclui `.git`/`/public`/`/resources` (não exclui `content/**.md`).
