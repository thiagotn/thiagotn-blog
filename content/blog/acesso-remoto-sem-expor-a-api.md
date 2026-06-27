---
title: "Acessar o homelab de qualquer lugar sem expor a API"
date: 2026-06-26
authors:
  - name: thiagotn
tags:
  - homelab
  - wireguard
  - headscale
  - rede
---

A API do Kubernetes (porta 6443) é a porta da frente de tudo: se ela vaza, vaza o cluster inteiro.
Então ela fica **fechada** à internet — só 80/443 dos sites são encaminhados pelo roteador. O
problema: como então eu administro o cluster de fora de casa?

## Malha privada com Headscale

A resposta foi uma **malha WireGuard privada**. Em vez de pagar/usar o SaaS do Tailscale, subi o
**Headscale** (o control server open-source, self-hosted) no próprio cluster. Os clientes continuam
sendo os oficiais da Tailscale — só apontam para o meu servidor:

```bash
tailscale up --login-server https://vpn.thiagotn.com
```

Agora cada device meu ganha um IP `100.x` na malha, e o tráfego entre eles é cifrado de ponta a
ponta pelo WireGuard. SSH, `kubectl`, deploy — tudo passa pela malha, de qualquer rede (4G, café,
outro país). O único serviço novo exposto publicamente é o endpoint do Headscale; a API do cluster
continua invisível.

## Bônus: subnet router

Coloquei o nó como **subnet router** anunciando a faixa de Services do k3s. Assim eu alcanço
qualquer serviço interno (painéis, dashboards) **pela malha**, sem precisar publicar nada na
internet — e como o WireGuard já cifra, nem TLS interno é necessário.

É o melhor dos dois mundos: privado como uma LAN, acessível como a nuvem.
