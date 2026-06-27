# syntax=docker/dockerfile:1

# ── Stage 1: build do site com Hugo (extended) + Hextra (Hugo Module, requer Go) ──
FROM hugomods/hugo:exts-0.154.5 AS builder
ENV HOME=/tmp HUGO_CACHEDIR=/tmp/hugo_cache
WORKDIR /src
# go.mod/go.sum primeiro: cacheia o download do módulo Hextra entre builds
COPY go.mod go.sum ./
RUN hugo mod get github.com/imfing/hextra
COPY . .
RUN hugo --minify --gc --destination /public

# ── Stage 2: nginx servindo o HTML estático (non-root, igual ao padrão do homelab) ──
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=builder --chown=nginx:nginx /public /usr/share/nginx/html

# Non-root: a imagem nginx:alpine traz o usuário "nginx" (uid 101).
RUN mkdir -p /var/cache/nginx /var/run \
 && chown -R nginx:nginx /var/cache/nginx /var/run /usr/share/nginx/html \
 && touch /var/run/nginx.pid && chown nginx:nginx /var/run/nginx.pid

USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
