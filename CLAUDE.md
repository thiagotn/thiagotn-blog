# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal blog (thiagotn.com) built with **Hugo** using the **Goa** theme, pulled in as a Hugo Module (`github.com/shenoydotme/hugo-goa` — see `go.mod`/`hugo.yaml`). The site is **bilingual** (Hugo multilingual): pt-BR is the default language at the root URLs, English lives under `/en/`. Repo prose (commits, comments) is written in Portuguese.

## Commands

```bash
# Local preview (needs Hugo extended + Go, because the theme is a Hugo Module)
hugo server --buildDrafts

# Without installing anything (matches the CI Hugo version pinned in the Dockerfile)
docker run --rm -it -p 1313:1313 -v "$PWD":/src hugomods/hugo:exts \
  hugo server --bind 0.0.0.0 --buildDrafts

# Production build (what the Dockerfile runs)
hugo --minify --gc

# Build the full container image (Hugo build → nginx)
docker build -t thiagotn-blog .
```

There are no tests or linters.

## Content conventions

- Posts live in `content/posts/`. Each post is a pair: `foo.md` (pt-BR) + `foo.en.md` (English) — Hugo links translations **by filename basename**. Front matter: `title`, `date`, `tags`. New-file archetype is `archetypes/default.md`.
- Add `slug:` to a `.en.md` when the public English URL should differ from the PT basename (e.g. `vpn-privada-no-homelab-com-headscale.en.md` has `slug: "private-vpn-homelab-wireguard-headscale"`).
- Tags are per-language vocabularies on purpose (`ia`/`ai`, `arquitetura`/`architecture`) — `/tags/` and `/en/tags/` are separate taxonomies.
- Per-language site chrome (intro/bio, meta, copyright, menu labels, `dateformat`) lives under `languages.pt-br` / `languages.en` in `hugo.yaml`; language-neutral params (author, social, structural `extra` flags) stay top-level and are deep-merged.
- UI strings ("min de leitura", prev/next, 404 text) live in `i18n/pt-br.yaml` + `i18n/en.yaml` (filename must be the lowercased language key: `pt-br.yaml`, not `pt-BR.yaml`).
- Images go in `static/images/` and are referenced as `/images/<name>.png` (language-agnostic, shared by both versions). Author photo is `assets/images/eu.jpeg`.
- Site-wide CSS overrides go in `static/css/custom.css`.
- `content/about/index.md` + `index.en.md` are the about pages.

## Theme overrides (layouts/partials/)

The Goa theme has **no i18n support** (no translation files, hardcoded English strings, `relURL` links that would point EN pages into the PT tree). Six partials are overridden locally, copied from the pinned module commit (`d003cbb6361f`) and minimally patched: `li.html`, `content.html` (localized dates via `time.Format`, i18n strings, `relLangURL` tag/category links), `menu.html` (i18n prev/next/home, language-aware section link), `header.html` (hreflang alternates + language switcher), `sub_footer.html` (per-language RSS feed), `error.html` (translated 404). Each file's top comment says what was patched. **Before bumping the theme module (`hugo mod get -u`), re-diff these six files against upstream.**

## Deploy pipeline (GitOps)

Push to `main` triggers `.github/workflows/build-image.yml`:

1. **build-push** — multi-stage `Dockerfile` (Hugo builds the site, then `nginx:stable-alpine` serves it non-root on :8080 with a `/healthz` endpoint) → image pushed to GHCR (`ghcr.io/thiagotn/thiagotn-blog`, tags `sha-<sha>` + `latest`).
2. **bump-homelab-tag** — updates `newTag` in `helm/apps/thiagotn-blog/kustomization.yaml` in the private `thiagotn/homelab` repo (SSH deploy key in `secrets.HOMELAB_DEPLOY_KEY`); Argo CD picks up the commit and rolls out. The CI never talks to the cluster directly.

K8s manifests live in the sibling `../homelab` repo. Canonical domain is the apex `thiagotn.com` (`www` gets a 301 from nginx, not the Ingress).

## Gotchas

- `enableGitInfo` is intentionally off: `.dockerignore` excludes `.git`, so the image build has no git metadata.
- `nginx.conf` uses `absolute_redirect off` / `port_in_redirect off` because nginx sits behind Traefik (TLS terminated upstream) on :8080 — without it, redirects would leak the internal port.
- nginx serves real 404s via `error_page 404 /404.html` (deliberate: a `try_files` fallback would return status 200); paths under `/en/` get the English `/en/404.html` via a dedicated `location ^~ /en/` block. Security headers are set with `add_header` at server level, so `location` blocks must use `expires` instead of their own `add_header` (nginx inheritance rule).
- The Dockerfile copies `go.mod`/`go.sum` first and runs `hugo mod get` to cache the theme module layer — keep that ordering if editing it.
