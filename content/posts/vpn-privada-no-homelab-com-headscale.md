---
title: "Uma VPN privada para o homelab: WireGuard, Tailscale e Headscale"
date: 2026-06-29
tags:
  - homelab
  - wireguard
  - headscale
  - tailscale
  - redes
  - vpn
---

Meu homelab fica exposto à internet — os sites respondem nas portas 80 e 443, encaminhadas pelo
roteador. Mas aí vem o problema: como eu **administro** isso de fora de casa? A API do Kubernetes (a
"porta da frente de tudo": cria, apaga, lê segredos) e os painéis internos **não podem** ficar
abertos na internet. Abrir mais portas é abrir mais superfície de ataque. A solução foi montar uma
**VPN privada** — e o caminho até ela rende um bom post. (Toquei nisso de leve na
[visão geral do homelab](/posts/meu-homelab-uma-visao-geral/); aqui aprofundo.)

## A base: WireGuard

No fundo de tudo está o **WireGuard**: uma VPN moderna, rápida e enxuta, que já mora no kernel do
Linux. Ele cria túneis **cifrados ponta a ponta** entre dispositivos. O senão é que WireGuard "puro"
dá trabalho: você gerencia chaves, IPs e a config de cada par na mão. Não escala bem quando há
servidor, laptop e celular entrando e saindo de redes diferentes o tempo todo.

## O facilitador: Tailscale

É aí que entra o **Tailscale**: ele pega o WireGuard e resolve a parte chata — descoberta de pares
(malha), travessia de NAT (você **não** precisa abrir porta nenhuma no roteador para a VPN), rotação
de chaves e um DNS interno. Cada dispositivo ganha um IP fixo numa rede privada (faixa `100.x`) e
conversa com os outros como se estivessem na mesma LAN, de qualquer lugar.

O detalhe: o **control server** — o cérebro que coordena quem é quem — roda na nuvem **deles** (é um
SaaS). Funciona muito bem, mas significa depender de um terceiro para a peça central da minha rede.

## O dono da casa: Headscale

Para não depender disso, troquei o control server pelo **Headscale**: uma reimplementação
**open-source e self-hosted** desse cérebro. E aqui está o pulo do gato — os **clientes continuam
sendo os apps oficiais da Tailscale** (não existe "cliente Headscale"); eles só apontam para o **meu**
servidor em vez do SaaS. Resultado: a coordenação da malha roda no meu próprio hardware, de graça,
sob meu controle — e de quebra aprendo como a engenhoca funciona por dentro.

## Como fica, na prática

O Headscale roda como um serviço pequeno, exposto num subdomínio com HTTPS — digamos
`vpn.seuserver.com`. Em cada dispositivo instalo o app oficial da Tailscale e aponto para lá:

```bash
tailscale up --login-server https://vpn.seuserver.com
```

Dois truques deixam isso poderoso:

- **Subnet router:** faço o servidor de casa anunciar a faixa de IPs interna do cluster à malha.
  Assim, de fora, alcanço **qualquer serviço interno** (Grafana, painel de deploy, etc.) direto — sem
  publicar nada na internet.
- **MagicDNS:** em vez de decorar IPs, acesso nomes amigáveis tipo `grafana.malha.interna`.

No **celular** tem uma pegadinha: no app, escolha **"servidor alternativo"** e informe
`https://vpn.seuserver.com`. Se você simplesmente logar com a conta Tailscale, vai parar na rede
**pública** deles — que é outra coisa, e não enxerga o seu homelab.

## Por que isso importa

O ganho não é "conseguir acessar de fora" — é **como**. O único que fica público no meu setup são as
portas 80/443 dos sites. A API do Kubernetes, o Grafana, o painel de deploy, o banco de dados: **nada
disso toca a internet**. Eu os alcanço só pela malha, com todo o tráfego **cifrado pelo WireGuard**
ponta a ponta.

É o melhor dos dois mundos: privado como uma LAN, acessível como a nuvem. E resume o princípio que
guia o homelab inteiro: **exponha o mínimo possível; mantenha o acesso administrativo numa rede
privada e cifrada.**

---

Hoje administro tudo — inclusive do celular, no 4G — como se estivesse sentado em casa, sem ter aberto
uma única porta a mais. Para uma peça tão central, a tríade WireGuard + Tailscale + Headscale entrega
segurança e conveniência ao mesmo tempo. Difícil pedir mais de uma tarde de fim de semana.
