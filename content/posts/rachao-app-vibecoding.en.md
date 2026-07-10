---
title: "rachao.app — A Real Problem, Solved End-to-End with Supervised AI/Vibecoding (SaaS-flavored)"
date: 2026-03-18
tags:
  - rachao.app
  - vibecoding
  - ai
  - saas
  - svelte
  - fastapi
  - python
---

![rachao.app logo](/images/rachao-app-logo.png "rachao.app logo")

Some ideas sit in a drawer for too long. This one did. It kept waiting for a window that never quite opened — until a shift in routine finally made room to build it.

A quick disclosure upfront: this is a personal side project, built in my spare time, entirely unrelated to my day job. Around three hours a day, on average, over the course of fifteen days.

## First, some Brazilian context

If you're not from Brazil, you're missing one of the country's most sacred sporting rituals: the **rachão**.

Literally translated, *rachão* means something like "the big split" — as in, splitting into teams. In practice, it's an informal football (soccer) match among friends, usually on a rented futsal court or a community field. No referees, no uniforms, no league tables. Just a recurring group of people who've been playing together for years, sometimes decades.

It's a fixture of Brazilian social life in a way that's hard to overstate. The *rachão* isn't just about football — it's the excuse that keeps a friend group together. It's the WhatsApp thread that actually has activity on it. It's the thing you negotiate around when planning your weekend. For millions of Brazilians, keeping the *rachão* alive is a genuine act of community maintenance.

And like any recurring group activity with money, schedules, and strong opinions involved, it generates a very specific set of organizational headaches.

## The context

I've been playing football with childhood friends for years. That sacred *rachão* that life gradually makes harder and harder to keep going. Recently, with the arrival of Gabriel — my youngest son — time became even more contested. But football has always been more than just playing. It's the pretext that keeps a group of people in contact who, without it, would probably see each other much less.

For years, we used an app to organize our matches. It worked well, but over time it fell into disrepair. Bugs accumulated, features broke, and complaining about the app became part of the *rachão* ritual itself. And with every complaint came the usual wishlist: fairer team draws, post-match voting, financial tracking, QR Code check-ins… The list existed. The app to solve it didn't.

![A typical Brazilian community football field](/images/rachao-app-campo.png "rachao.app — a Brazilian community football field")

## The problem

A group that plays football regularly has a few recurring pain points: confirming attendance without turning WhatsApp into a chaotic thread, drawing teams without controversy, tracking who owes money to the group, voting on the best and worst performers of the session, and maintaining some kind of meaningful history and ranking over time.

A well-mapped problem. What was missing was execution.

## Vibecoding — but supervised

The term **vibecoding** was coined by Andrej Karpathy in early 2025: you describe what you want to build and delegate the actual code writing to a language model. It makes sense for rapid prototyping and validating an idea without investing weeks of development time.

That was the spirit here — with one important qualifier: **supervised**.

In practice, the development was driven by Claude Code (Anthropic's CLI), using the **claude-sonnet-4-6** model on the **Pro** plan — which covers Claude Code usage without per-token charges. The fixed cost removed the friction of second-guessing before iterating aggressively. And it was exactly this setup that made it possible to go from zero to a working product in 15 days, at roughly 3 hours a day.

The idea is simple: let the model handle the bulk of code generation, while keeping technical responsibility over architecture decisions, stack choices, and overall direction. The model writes; you review, validate, and decide the next steps with real technical judgment. Without that, it's easy to accumulate invisible technical debt — code that works on the surface but doesn't scale and becomes a problem the moment you need to make any structural change.

> Vibecoding doesn't replace the engineer — it changes what the engineer does.

## Stack

rachao.app is a **PWA**: a single codebase delivers a native app experience on mobile — installable, with offline support and push notifications — without maintaining separate iOS and Android codebases.

| Layer | Technology |
|---|---|
| Frontend | SvelteKit 5 + Tailwind CSS |
| Backend | FastAPI + SQLAlchemy (async) |
| Database | Supabase PostgreSQL — sa-east-1 (SP) |
| Infra | VPS Hostinger + Traefik v3 |
| CI/CD | GitHub Actions → GHCR → SSH deploy |
| E2E Tests | Playwright + pytest |

![rachao.app architecture diagram](/images/rachao-app-arquitetura.png "rachao.app architecture")

The choice of SvelteKit for the frontend and Python/FastAPI for the backend was **personal** — familiarity, preference, what made sense to me at that moment. But it's worth noting: the project's architecture is decoupled enough that any layer could be rewritten independently. The frontend could be React, Vue, or anything else. The backend could be Rust, Go, Node.js, or even something more exotic. Nothing stops someone from following the same path and arriving at the same result with an entirely different stack — and that would actually be an interesting exercise.

FastAPI delivers real async performance and automatic Swagger docs with no extra effort. Supabase is used strictly as a managed database — the app talks directly to Postgres via SQLAlchemy.

## Phone verification — a decision that seems simple

Login uses a WhatsApp number as the unique identifier. But without validation, anyone can sign up with someone else's number — which, in a closed-group app, destroys trust in the product before it even has a chance to grow.

The solution is OTP (**One-Time Password**). The options were Twilio Verify, Meta Cloud API, plain SMS, or unofficial gateways like Z-API — which was immediately ruled out for violating WhatsApp's Terms of Service.

The choice was **Twilio Verify**: no local token table, no manual TTL, no rate-limiting built from scratch — all managed by Twilio — and with automatic fallback from WhatsApp to SMS. The current channel is SMS while the WhatsApp template approval from Meta is pending. Once approved, the switch is a single line of code.

## Subscription plans — a complete end-to-end flow in production

The main motivation for implementing subscription plans was, honestly, to **work through this complete flow in production**: checkout, webhooks, subscription lifecycle, grace periods, idempotency. These are things any SaaS product will eventually need, and there's no substitute for doing it for real, with real money.

That said, it's not hard to find friends who play *rachão* with different groups and deal with the same organizational problems. The need exists beyond my own circle. And if this ever generates some revenue someday… that wouldn't be bad, would it? After all, a Claude subscription, VPS, Twilio, domain registration — the costs add up. 🙂

The model is freemium: **Free** (1 group, 30 members, 3 open matches), **Basic** (3 groups, 50 members, unlimited matches), and **Pro** (10 groups, everything unlimited). Pricing for paid plans is still being finalized.

For the payment gateway, I compared Stripe, Pagar.me, and Asaas (two popular Brazilian processors). **Stripe won** — automatic proration on upgrades, native dunning management, a hosted Customer Portal, and a mature Python SDK. Pagar.me would have had lower transaction fees, but everything else would have required manual implementation: easily two to three extra weeks of work. At this stage, it's not worth it.

One decision I consider important: business logic never calls the Stripe SDK directly. Every interaction goes through `app/services/billing.py`, with the concrete implementation isolated in `billing_stripe.py`. If volume ever justifies switching gateways, the migration is a new file and an environment variable change.

The flow is already in production: checkout with credit card, PIX (Brazil's instant payment system), and bank slip (boleto); webhooks with HMAC-SHA256 verification and guaranteed idempotency; plan activation in under 30 seconds after payment.

## What rachao.app does today

- **Group and player management** — each crew is a group; multiple groups supported
- **QR Code check-in** — no WhatsApp thread needed to confirm who's showing up
- **Balanced team draw** — based on each player's *Rachão Score*
- **Post-match voting** — best and biggest disappointment of the session, with group rankings
- **Financial management** — monthly fees, payments, group balance
- **Subscription plans** — Free, Basic, and Pro, with Stripe checkout

## What I learned

Fifteen days, roughly three hours a day, a working product in production. The productivity gains from AI are real. But the model has no product context — it doesn't know what can be cut from an MVP, or what decision will cause problems three months from now. The quality of the output is directly proportional to the clarity of the input, and technical supervision is not optional. Accepting code without critical review is accumulating problems you'll pay for later, with interest.

## Next steps — and a question for you

This post is just the beginning. The plan is to document the project's progress in future posts — product decisions, technical choices that worked and ones that didn't. If you want to follow along, consider following here.

Before I close, a provocation: **how would you solve this problem?** A different gateway? A different stack — React, Rust, NoSQL? Would you approach vibecoding differently — or skip it entirely? I'm genuinely curious whether anyone would arrive at the same decisions or take very different paths. Drop a comment.

And if you have a group that plays regularly and you're tired of coordinating everything over WhatsApp: [rachao.app](https://rachao.app) — give it a try and send feedback.

---

*This post was originally published on [Medium](https://thiagotn.medium.com/rachao-app-a-real-problem-solved-end-to-end-with-supervised-ai-vibecoding-saas-flavored-09c6b791581b).*
