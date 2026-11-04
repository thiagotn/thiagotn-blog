# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal blog (thiagotn.com) built with **Hugo**. The **Goa** theme is still imported as a Hugo Module (`github.com/shenoydotme/hugo-goa` — see `go.mod`/`hugo.yaml`) but only supplies the favicons: all layouts and styling are local (see "Layouts and styling"). The site is **bilingual** (Hugo multilingual): pt-BR is the default language at the root URLs, English lives under `/en/`. Repo prose (commits, comments) is written in Portuguese.

## Commands

```bash
# Local preview (needs Hugo extended + Go, because the theme is a Hugo Module)
hugo server --buildDrafts

# Without installing anything (matches the CI Hugo version pinned in the Dockerfile).
# `-u` keeps Hugo Pipes from writing root-owned files into resources/, and
# --renderToMemory avoids writing to public/ (which is root-owned from old builds).
docker run --rm -it -p 1313:1313 -u "$(id -u):$(id -g)" \
  -e HOME=/tmp -e HUGO_CACHEDIR=/tmp/hugo_cache -v "$PWD":/src \
  hugomods/hugo:exts-0.154.5 \
  hugo server --bind 0.0.0.0 --buildDrafts --renderToMemory --disableFastRender

# Production build (what the Dockerfile runs)
hugo --minify --gc

# Build the full container image (Hugo build → nginx)
docker build -t thiagotn-blog .
```

There are no tests or linters. The closest thing to a test suite is the verification
block under "Verifying a style change" below.

## Content conventions

- Posts live in `content/posts/`. Each post is a pair: `foo.md` (pt-BR) + `foo.en.md` (English) — Hugo links translations **by filename basename**. Front matter: `title`, `date`, `description`, `tags`, and optionally `images`. New-file archetype is `archetypes/default.md`.
- `description` (per language) feeds both `<meta name="description">` and `og:description` — without it they fall back to Hugo's auto-summary, which truncates mid-sentence. Write one for every new post.
- `images: ["/images/og/<name>.jpg"]` is the link-preview image (`og:image`). Posts without it fall back to the per-language default card (`languages.<lang>.params.images` in `hugo.yaml`). **Keep OG images 1200×630 and under ~300 KB** — WhatsApp silently drops the thumbnail on heavier files. Full-size originals stay in `static/images/` for the post body; normalized derivatives live in `static/images/og/`.
- Add `slug:` to a `.en.md` when the public English URL should differ from the PT basename (e.g. `vpn-privada-no-homelab-com-headscale.en.md` has `slug: "private-vpn-homelab-wireguard-headscale"`).
- Tags are per-language vocabularies on purpose (`ia`/`ai`, `arquitetura`/`architecture`) — `/tags/` and `/en/tags/` are separate taxonomies.
- Per-language site chrome (intro/bio, meta, copyright, menu labels, `dateformat`) lives under `languages.pt-br` / `languages.en` in `hugo.yaml`; language-neutral params (author, social, structural `extra` flags) stay top-level and are deep-merged.
- UI strings ("min de leitura", prev/next, 404 text) live in `i18n/pt-br.yaml` + `i18n/en.yaml` (filename must be the lowercased language key: `pt-br.yaml`, not `pt-BR.yaml`).
- Images go in `static/images/` and are referenced as `/images/<name>.png` (language-agnostic, shared by both versions). Author photo is `assets/images/eu.jpeg`.
- Site-wide CSS lives in `assets/css/site.css` (design tokens + components) and `assets/css/chroma.css` (syntax colors). Both go through Hugo Pipes — see "Styling" below. There is no `static/css/`.
- `content/about/index.md` + `index.en.md` are the about pages.

## Layouts and styling

The site **owns all of its markup**. The Goa theme is still a Hugo Module, but only
as a provider of `static/favicon*`, `apple-touch-icon.png`, `android-chrome-*.png`
and `favicon.ico`. Everything else about its appearance was dropped in favour of a
design system modelled on [omarchy.org](https://omarchy.org): monospace body
(JetBrains Mono), zero `border-radius`, Tokyo Night palette, hairlines instead of
cards, green accent. No CDN requests at all — Bootstrap, Font Awesome, Google Fonts
and highlight.js are gone (~523 KB of third-party CSS/JS replaced by ~22 KB of our
own, ~4 KB gzipped).

### The module mount

`hugo.yaml` declares `module.imports[0].mounts`, and **declaring `mounts` replaces
every default mount for that module** — so the theme's `layouts/` are deliberately
not mounted either. That is a feature: a missing layout name now fails loudly with
`WARN found no layout file for …` instead of silently falling back to a theme layout
that has no `{{ define "main" }}` and would render standalone, without our
`baseof.html`, dragging Bootstrap back in on a green build. The `excludeFiles` entry
stops the module's empty `css/custom.css`/`js/custom.js` and its dead `css/main.css`
from being published.

If you ever want to drop the theme module entirely, you must first copy those six
favicon/manifest files into `static/`.

### Layout files

Hugo 0.146+ naming, all in `layouts/` root (**do not** create `layouts/_default/`):

| file | `.Kind` it serves |
|---|---|
| `baseof.html` | wrapper for everything: whole `<head>`, sticky header, footer, theme-toggle script |
| `home.html` | `/` and `/en/` — compact profile + 8 most recent posts + "see all" |
| `page.html` | posts **and** `/about/` |
| `section.html` | `/posts/` |
| `taxonomy.html` | `/tags/` |
| `term.html` | `/tags/<tag>/` |
| `404.html` | 404 |

Partials: `social-meta.html` (Open Graph/Twitter — the only file surviving from the
old override set), `post-list.html` (the hairline list, shared by home/section/term),
`post-meta.html` (byline), `post-tags.html`, `profile.html`, `social-links.html`,
`icon.html`.

`icon.html` holds the only six icons the site uses (`github`, `linkedin`, `rss`,
`sun`, `moon`, `half`) as inline SVG: `{{ partial "icon.html" (dict "name" "rss"
"size" 15) }}`. An unknown name is an `errorf`, i.e. a red build — an invisible icon
would go unnoticed.

`post-tags.html` uses `.GetTerms "tags"`, not a hand-built `"/tags/" + urlize` URL:
`.GetTerms` yields the real term pages, so hrefs get the trailing slash and the right
language tree. It prints `.Data.Term` (the raw `rachao.app`), because `.Title` would
title-case it into `Rachao.app`.

### Styling

`assets/css/site.css` is the design system; `assets/css/chroma.css` is the generated
syntax palette. `baseof.html` concatenates, minifies and fingerprints them into one
`/css/site.min.<sha256>.css` with an SRI hash. **This is why there is no `?v=N`
cache-bust any more** — the filename changes when the content does.

Two things in that pipeline are load-bearing:

- `site.css` goes through `resources.ExecuteAsTemplate`, so its `@font-face` rules can
  interpolate the fingerprinted font URLs. A static `url("/fonts/x.woff2")` would
  point at the un-hashed path, 404 silently, and fall back to the system monospace
  with no error anywhere.
- The `<link rel="preload">` for the fonts needs a **valueless** `crossorigin`.
  Without it the preload is discarded and the font downloads twice.

Fonts are self-hosted Fontsource variable woff2 (latin subset — it covers ã/õ/ç/á/ê)
in `assets/fonts/`: `jetbrains-mono` (body, everything) and `geist` (auxiliary sans).

Theme switching uses two attributes on `<html>`, both set by the inline anti-FOUC
script in `<head>`: `data-theme` (`light|dark`, what the CSS reads) and
`data-theme-pref` (`light|dark|system`, which lets CSS pick the right toggle icon out
of the three that are always rendered — no post-load JS, no flash). Dark is the
default, including with JS disabled. The old attribute was Bootstrap's
`data-bs-theme`; nothing uses it now.

### Regenerating chroma.css

Syntax highlighting is server-side Chroma (`markup.highlight` in `hugo.yaml`), not
highlight.js. To regenerate the palette:

```bash
flatten() {
  docker run --rm hugomods/hugo:exts-0.154.5 hugo gen chromastyles --style="$1" \
  | grep -v '^/\* Generated' | grep -v '/\* Background \*/' | grep -v '/\* PreWrapper \*/' \
  | grep -v '^[[:space:]]*$' | sed 's|^/\*[^*]*\*/ ||' | sed "s|^|$2 |"
}
{ flatten tokyonight-day   'html:where([data-theme="light"])'
  flatten tokyonight-night 'html:where([data-theme="dark"],:not([data-theme]))'; } > assets/css/chroma.css
```

`.bg` and `PreWrapper` are dropped on purpose: they are the only rules carrying a
`background` outside the design tokens, and Hugo never emits the `.bg` class at all.
`<pre>`'s background comes from `site.css`. The prefix uses `:where()` so it adds no
specificity; a comma-separated prefix would not survive the `sed` (the first selector
would end up painting `<html>` itself).

### Verifying a style change

Two traps have bitten this codebase and both are easy to re-introduce:

**1. `guessSyntax` must stay `false`.** 46 of the 116 code fences in `content/` have
no language and are ASCII diagrams, directory trees and terminal output. With
guessing on, Chroma labels a directory tree `language-gdscript3` and colours garbage.

**2. There are two `<pre>` markups.** With `guessSyntax: false` Hugo emits
`<div class="highlight"><pre tabindex="0" class="chroma">` for a tagged fence but a
bare `<pre tabindex="0"><code>` for an untagged one. Styling only `.chroma` leaves
~26 code blocks in published posts with no background or padding. `site.css` targets
`.prose pre` generically and lets Chroma supply only token colours.
`/posts/football-api-go-port-go/` contains both markups — use it as the test page.

After any change to layouts or CSS, run a production build and check:

```bash
OUT=$(mktemp -d)
docker run --rm -u "$(id -u):$(id -g)" -e HOME=/tmp -e HUGO_CACHEDIR=/tmp/hugo_cache \
  -v "$PWD":/src -v "$OUT":/out hugomods/hugo:exts-0.154.5 hugo --minify --gc --destination /out
cd "$OUT"
grep -rl 'jsdelivr\|font-awesome\|cdnjs\|fonts.googleapis\|bootstrap' . || echo "no CDN: ok"
grep -o 'border-radius:[^;}]*' css/site.min.*.css | grep -v '^border-radius:0$' || echo "all square: ok"
for u in $(grep -o 'url(/fonts/[^)]*)' css/site.min.*.css | sed 's|url(||;s|)||'); do
  [ -f ".$u" ] && echo "font ok: $u" || echo "FONT 404: $u"
done
grep -roh '<pre[^>]*>' posts | sort | uniq -c            # expect both variants
head -c 2048 index.html | grep -c 'og:image'             # must be 1 (WhatsApp scraper)
ls css js 2>&1                                            # only site.min.<hash>.css; no js/
```

Build warnings matter: `WARN found no layout file for "html" for kind "<x>"` means a
layout name is missing and that page kind renders empty.

## Deploy pipeline (GitOps)

Push to `main` triggers `.github/workflows/build-image.yml`:

1. **build-push** — multi-stage `Dockerfile` (Hugo builds the site, then `nginx:stable-alpine` serves it non-root on :8080 with a `/healthz` endpoint) → image pushed to GHCR (`ghcr.io/thiagotn/thiagotn-blog`, tags `sha-<sha>` + `latest`).
2. **bump-homelab-tag** — updates `newTag` in `helm/apps/thiagotn-blog/kustomization.yaml` in the private `thiagotn/homelab` repo (SSH deploy key in `secrets.HOMELAB_DEPLOY_KEY`); Argo CD picks up the commit and rolls out. The CI never talks to the cluster directly.

K8s manifests live in the sibling `../homelab` repo. Canonical domain is the apex `thiagotn.com` (`www` gets a 301 from nginx, not the Ingress).

## Gotchas

- `enableGitInfo` is intentionally off: `.dockerignore` excludes `.git`, so the image build has no git metadata.
- `taxonomies: {tag: tags}` in `hugo.yaml` is there to *remove* `categories`. Hugo's default is `{category: categories, tag: tags}`, and with no post using categories that produced empty `/categories/` and `/en/categories/` pages — the EN one was in the sitemap.
- The old `<head>` advertised `feed.json` and `rsd.xml` on every page and both were 404 in production (there is no `outputs:` block). They are not emitted any more. A real JSON Feed would need `outputs:` plus `layouts/home.json.json`.
- `_internal/google_analytics.html` was being called with no `services.googleAnalytics.ID` configured, so it rendered an empty string. It is gone. Add the key first if you actually want GA.
- `static/site.webmanifest` is ours and shadows the theme's, which announced itself as `"name": "hugo-goa"` to anyone installing the site as a PWA.
- `public/` in the working tree is root-owned leftovers from a `docker run` without `-u`. It is gitignored *and* in `.dockerignore`, so it affects nothing, but `hugo server` cannot write to it — hence `--renderToMemory` in the preview command.
- `nginx.conf` caches `\.(css|js|woff2?|…)$` for 30 days. The CSS and fonts are fingerprinted now and could safely go to `1y`, but **post images in `static/images/` are not fingerprinted and match the same `location`** — split the blocks before raising it.
- `nginx.conf` uses `absolute_redirect off` / `port_in_redirect off` because nginx sits behind Traefik (TLS terminated upstream) on :8080 — without it, redirects would leak the internal port.
- nginx serves real 404s via `error_page 404 /404.html` (deliberate: a `try_files` fallback would return status 200); paths under `/en/` get the English `/en/404.html` via a dedicated `location ^~ /en/` block. Security headers are set with `add_header` at server level, so `location` blocks must use `expires` instead of their own `add_header` (nginx inheritance rule).
- The Dockerfile copies `go.mod`/`go.sum` first and runs `hugo mod get` to cache the theme module layer — keep that ordering if editing it.
