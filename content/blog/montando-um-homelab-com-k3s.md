---
title: "Montando um homelab com k3s"
date: 2026-06-20
authors:
  - name: thiagotn
tags:
  - homelab
  - kubernetes
  - k3s
---

Faz um tempo que eu queria tirar meus projetos pessoais de serviços gerenciados e rodar tudo em
casa. O resultado é um **HP EliteDesk 800 G3** (i5-6500, 16GB) com Ubuntu Server e **k3s**, exposto
direto na internet por uma fibra residencial com IP dinâmico.

## Por que k3s

k3s é uma distribuição leve de Kubernetes — um binário só, com tudo embutido. Para um nó único, é
perfeito: sobe em segundos, consome pouca RAM e ainda é Kubernetes "de verdade", então tudo que eu
aprendo aqui vale lá fora.

Subi com `--disable traefik` para rodar o meu **próprio** Traefik via Helm, que assume as portas
80/443 do host via `hostPort`. Sem `LoadBalancer`, sem complicação.

## O que roda hoje

- **Traefik** como ingress controller, terminando TLS.
- **cert-manager** emitindo certificados Let's Encrypt via desafio **DNS-01** (Cloudflare) — assim
  os certs saem mesmo sem a porta 80 aberta.
- **PostgreSQL** compartilhado, um banco por app.
- Os sites (este blog é um deles).

Nos próximos posts: como o deploy virou um `git push`, como acesso tudo de qualquer lugar sem expor
a API do cluster, e como ando vendo o que acontece lá dentro.
