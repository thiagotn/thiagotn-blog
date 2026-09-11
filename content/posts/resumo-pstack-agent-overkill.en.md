---
title: "Summary: Pstack Is Agent Overkill. Use It Anyway! (Rob Shocks)"
date: 2026-09-11
tags: ["agents", "ai", "engineering", "productivity"]
---

> Detailed summary of the video ["Pstack Is Agent Overkill. Use It Anyway!"](https://youtu.be/lUhXa8GiXns) from the **Rob Shocks** channel, published September 2026.

If you're building coding agents or using any kind of software factory, you need to know about **Pstack** — a set of skills created by **Lauren Tan**, an engineer who has worked at Netflix, the core React team, SpaceX, and Cursor. It's essentially a senior engineer's brain extracted into a stack. As Rob Shocks himself says: even if you don't end up using Pstack, just reading the skills is worth it for the learning of how a serious agent practitioner works at scale.

---

## What is Pstack?

Pstack is divided into three layers:

1. **Principles and engineering rules** — the philosophy that guides agent behavior
2. **Playbooks** — operating procedures that tell the agent what to do next
3. **Individual skills and slash commands** — that do the actual work

You can run Pstack anywhere: Cursor, Claude Code, Codex, OpenCode. In Cursor, it's as simple as typing `/add plugin Pstack`. For other agents, there's an unofficial port by Michael Denier available in plugin marketplaces.

---

## Potato Mode: the Pstack router

The heart of Pstack is **potato mode** — essentially a router that helps you decide which of the 20+ skills to use first. The skill tree contains 22 playbooks with examples for different use cases.

Rob gives potato mode a test prompt and it routes to the "figure it out" playbook. Worth noting: Pstack is **not designed for spec and planning**. It's built to operate on an established codebase. Lauren's personal take on this is direct:

> "I don't believe in planning. The best spec is the code."

So there's deliberately no planning skill baked into Pstack.

---

## The most notable skills

### Arena

If you have a critical feature to develop and tokens are not an issue, you can run the **arena** skill. It pits three or four different agents (Claude, GPT, Grok, Claude Opus 5) against the same problem, takes the best parts of each, and wraps them into a final commit. The idea is to have them all fight it out for the best design and then pick the best parts of each.

Based on what each sub-agent learned while working on the problem, arena decides whether to graft or reject contributions.

### Swarm

Similar to arena, but with a difference: instead of everyone working on the same problem, **swarm** gives different slices of the problem to parallel workers and then pulls everything back into an aggregated report. Pstack is designed for "fearless parallelism" — working across feature branches, work trees, etc., always aggregating work without overlaps.

### TDD (Test-Driven Development)

The TDD skill creates unit tests first and then makes sure they pass before proceeding with implementation.

### Why

The **why** skill is one of the most interesting. Instead of just checking the project transcript, it runs through all the MCPs and CLIs relevant to the project. It might check product information in PostHog, go to a Slack conversation thread about why a feature was implemented, pull logs from Sentry, and find ADRs (Architecture Decision Records) about decisions made. Rob says: "Definitely stealing this one."

### Recall

**Recall** is fantastic for when you want to pick up a project you left off a week ago. It scans through all transcripts and uses the **why** skill to check your MCPs (Notion, Linear, PostHog) to figure out where you are and what needs to be done next.

### Interrogate

In the validation phase, the **interrogate** skill gets two or three different models to review the code against its standards. Each model comes back with its opinions. Yes, you burn a ton of tokens — but if what you're looking for is the highest and strictest code quality, token count probably doesn't matter.

### Create Verification

This skill creates its own scripted way to prove out the app behavior. Since the app has a large surface area (multiple projects, setups, continuous scanning), there's plenty of room for it to appear to be working but actually be fundamentally broken or giving wrong data. The skill creates a set of verification scripts and cross-checks. Rob highlights:

> "When you're dealing with non-deterministic agents, this kind of verification step is just so valuable."

### Maintain Verification

Over time, the verifier you set up will diverge from development. This skill goes back and makes sure the verifier gets updated.

### Onslaught

The **onslaught** skill is a gift if you use your agents for any form of writing. Its purpose is to kill and remove all those annoying phrases like "pivotal moment," "crucial," "delve," "enduring" — and the controversial one: getting rid of em dashes entirely. Rob confesses he actually likes em dashes and used them long before AI came along, but acknowledges they've become a big tell that AI was used.

### Brawl

If you've been running lots of agents in parallel and your brain is coming to a halt, you can run the **brawl** skill, which restates the last message in plain human language with no jargon. "An absolute gift for clarity, particularly when your brain has been burning hard on 10 different agents."

---

## Show Me Your Work: an engineer at work

The **show me your work** skill reveals a lot about how Pstack operates. Rob ran a single prompt and tracked the entire process:

1. **Probing** — a quick test to see if what we're trying to achieve is even possible, without building the whole app
2. **Framing** — understanding the requirements and constraints (e.g., wants it to run on Mac, but eventually on other systems)
3. **Basic scaffolding** — before moving into the arena stage with 4 parallel agents
4. **Design changes forced by reality** — a crucial point. When the agent creates a detailed plan up front, it hasn't actually dealt with reality yet. It's only as we build that assumptions get broken and we have to rework the problem on the fly
5. **Verification testing** — testing and verification phase
6. **Audit** — final audit, where the agent realized it had hallucinated some details and caught 3 false claims that it corrected

---

## Key Pstack Principles

| Principle | What it means |
|---|---|
| **Laziness Protocol** | When refactoring, look to delete code if possible rather than adding more. Aim for the smallest change to get the job done — leads to far more maintainable code |
| **Redesigning from First Principles** | When adding a feature, imagine how the code would look if it existed from day one. Might involve removing structures to reach the "happy place" |
| **Minimizing Reader Load** | No more huge PRs written by agents with disjointed code across several abstractions. Keep things simple with minimum abstractions |
| **Exhaust the Design Space** | Use arena: multiple models/agents on the same problem, take the best of each |
| **Build a Lever** | If you do something by hand with your agent multiple times, build a tool for it (CLI, verification script, etc.) |
| **Verification** | Compiling and passing tests is not the same as proving it works. Deep verification (end-to-end, computer use) is central throughout the stack |
| **Guard the Context Window** | The central context window is key. Offload slices of the task to sub-agents with their own context windows |
| **Never Block the Human** | The human should never be left waiting |

Lauren's philosophy, woven throughout the stack, is clear:

> "The goal isn't more code, it's maximum impact with the least amount of code."

---

## Cost vs. Benefit

Rob is transparent about the trade-off:

| Metric | Fable 5.1 without skills | With Pstack |
|---|---|---|
| **Time** | ~30 minutes | ~1 hour |
| **Token cost** | Low | Very high |
| **Result quality** | Baseline | Substantially better |

Pstack as a set of skills will cost you a lot more money. All the validation, verification, and swarms means a lot of token burning. You might not need to throw the potato at every single project — small design changes or front-end UI work probably don't need it. But at least now you have an idea of what it's good at and where it can be used.

---

## Conclusion

Pstack is a fascinating case study of how to extract a senior engineer's mindset into a set of agent skills. It's not for every project — it's overkill by design. But the philosophy behind it (laziness protocol, deep verification, fearless parallelism, minimal reader load) is applicable even if you don't use the stack directly.

If you want to understand how a serious agent practitioner operates at scale, it's worth at least reading the skills. The official repo is at `plugins.pstack@cursor` (in Cursor) or ports for Claude Code, Codex, and OpenCode in marketplaces.

---

*Source: ["Pstack Is Agent Overkill. Use It Anyway!"](https://youtu.be/lUhXa8GiXns) — Rob Shocks, September 2026.*