---
title: "A private VPN for my homelab: WireGuard, Tailscale and Headscale"
date: 2026-06-29
slug: "private-vpn-homelab-wireguard-headscale"
tags:
  - homelab
  - wireguard
  - headscale
  - tailscale
  - networking
  - vpn
---

![VPN architecture diagram: a laptop and a phone running the Tailscale app open WireGuard tunnels to the home server (k3s, subnet router), coordinated by the self-hosted Headscale; internal services are only reachable through the mesh, and only the sites' ports 80/443 are public.](/images/vpn-homelab-arquitetura-en.png)

My homelab is exposed to the internet — the sites answer on ports 80 and 443, forwarded by the
router. But here's the problem: how do I **administer** it from outside the house? The Kubernetes API
(the "front door to everything": it creates, deletes, reads secrets) and the internal dashboards
**cannot** sit open on the internet. Opening more ports means opening more attack surface. The answer
was to build a **private VPN** — and the road to it makes for a good post.

## The foundation: WireGuard

At the bottom of it all is **WireGuard**: a modern, fast, lean VPN that already lives in the Linux
kernel. It creates **end-to-end encrypted** tunnels between devices. The catch is that "raw"
WireGuard is fiddly: you manage keys, IPs and the config of every peer by hand. It doesn't scale well
once you have a server, a laptop and a phone hopping between different networks all the time.

## The enabler: Tailscale

That's where **Tailscale** comes in: it takes WireGuard and solves the tedious parts — peer discovery
(the mesh), NAT traversal (you **don't** need to open a single port on your router for the VPN), key
rotation and an internal DNS. Each device gets a fixed IP on a private network (the `100.x` range)
and talks to the others as if they were on the same LAN, from anywhere.

The trade-off: the **control server** — the brain that coordinates who's who — runs in **their** cloud
(it's a SaaS). It works great, but it means depending on a third party for the central piece of my
own private network.

## Owning it: Headscale

To avoid that, I swapped the control server for **Headscale**: an **open-source, self-hosted**
reimplementation of that brain. And here's the trick — the **clients are still the official Tailscale
apps** (there is no "Headscale client"); they just point at **my** server instead of the SaaS. The
result: the mesh coordination runs on my own hardware, for free, under my control — and as a bonus I
get to learn how the whole thing works under the hood.

## What it looks like in practice

Headscale runs as a small service, exposed on a subdomain over HTTPS — say `vpn.yourserver.com`. On
each device I install the official Tailscale app and point it there:

```bash
tailscale up --login-server https://vpn.yourserver.com
```

Two tricks make this powerful:

- **Subnet router:** I have the home server advertise the cluster's internal IP range to the mesh. So
  from outside, I can reach **any internal service** (Grafana, the deploy dashboard, etc.) directly —
  without publishing anything to the internet.
- **MagicDNS:** instead of memorizing IPs, I use friendly names like `grafana.mesh.internal`.

On **mobile** there's a gotcha: in the app you must pick **"alternate server"** and enter
`https://vpn.yourserver.com`. If you simply sign in with a Tailscale account, you'll land on their
**public** network — which is a different thing, and won't see your homelab.

## Why it matters

The win isn't "being able to access it from outside" — it's **how**. The only things public in my
setup are the sites' ports 80/443. The Kubernetes API, Grafana, the deploy dashboard, the database:
**none of it touches the internet**. I reach them only through the mesh, with all traffic
**encrypted end-to-end by WireGuard**.

It's the best of both worlds: private like a LAN, reachable like the cloud. And it captures the
principle that guides the whole homelab: **expose the bare minimum; keep admin access on a private,
encrypted mesh.**

---

Today I run everything — even from my phone, on cellular — as if I were sitting at home, without
having opened a single extra port. For such a central piece, the WireGuard + Tailscale + Headscale
trio delivers security and convenience at the same time. Hard to ask for more from a weekend
afternoon.
