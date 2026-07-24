---
title: "My homelab: an overview"
date: 2026-06-27
slug: "my-homelab-an-overview"
tags:
  - homelab
  - kubernetes
  - infrastructure
---

For a while now I've been running a **homelab** at home: a mini PC running **Kubernetes** that hosts
my personal projects and doubles as a lab for learning infrastructure hands-on. This post is an
overview of what it does and the ideas behind it — without diving into configuration details.

## The hardware

Nothing special: a desktop mini PC, one of those repurposed corporate machines, with a modest
processor and enough RAM for a single node. The fun is precisely in fitting a lot into a small,
silent box that sits in a corner running 24/7.

![The HP ProDesk mini PC that runs the homelab](/images/homelab.jpeg)

## Kubernetes at home

I run **k3s**, a lightweight Kubernetes distribution. For a single node it's ideal: it boots fast,
has a small footprint and is still "real" Kubernetes — so everything I learn here applies to the
outside world. On top of it run an ingress controller (handling routing and HTTPS), automatic
certificate issuance, a shared database and the applications themselves.

## Everything as code

Almost nothing is done by clicking around or typing loose commands. Host provisioning is
**Ansible**; the cluster configuration is manifests and charts versioned in git. If the machine
dies, I rebuild the environment from the repository.

## Deploying is `git push`

The part I like the most: I adopted **GitOps**. An agent inside the cluster watches the repository
and keeps the live state matching what's versioned. Shipping a change is just a `git push` — the
pipeline builds the image and the cluster updates itself. No hand-run `kubectl`, and a full history
of everything in git.

## Access from anywhere, with the front door closed

Remote administration happens over a **private mesh** (a WireGuard-based VPN), self-hosted. That
way I manage the environment from outside the house **without** exposing the cluster's control
plane to the internet. The principle is simple: expose as little as possible and keep administrative
access on a private, encrypted network.

## Seeing what's going on

Finally, I set up an **observability** stack: metrics (CPU, memory, request latency), centralized
logs and service availability checks, with alerts. When something breaks, I find out — preferably
before someone tells me.

---

None of this is "serious production" — it's a playground that teaches me a lot and still hosts real
things. I'll keep writing about the more interesting parts here as it evolves. If the site goes
down at some point, it's probably the power or the internet at my place. 🙂
