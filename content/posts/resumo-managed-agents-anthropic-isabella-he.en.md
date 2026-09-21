---
title: "Summary: How to Build and Ship Your First Managed Agent (Anthropic — Isabella He)"
date: 2026-09-20
description: "Summary of a 45-minute workshop by Anthropic engineer Isabella He on Claude Managed Agents — from internal architecture to deploying a live SRE incident response agent."
tags: ["agents", "ai", "engineering", "anthropic"]
---

> Detailed summary of the video ["Anthropic engineer Isabella He"](https://x.com/ZabihullahAtal/status/2074943938805273057) posted by **Atal** (@ZabihullahAtal), published in July 2026. The video is a ~37-minute hands-on workshop led by **Isabella He**, Member of Technical Staff on the Applied AI team at Anthropic.

If you build AI agents, this is one of the most practical workshops you'll watch this year. In 45 minutes, Isabella He shows you how to build and ship your first Managed Agent on Anthropic — from defining Agents, Environments, and Sessions to streaming events and integrating custom tools. The best part: she builds a live SRE incident response agent that diagnoses problems on its own, saving developers from being woken up at 3 AM.

---

## The Evolution of Agents at Anthropic

To understand the value of Managed Agents, Isabella walks through the chronological evolution:

| Phase | What it was | Problem |
|---|---|---|
| **Messages API** (2023) | Raw model access, tokens in/out | You implemented everything: context management, agent loop, compaction |
| **Agent SDK** | Programmatic harness with Claude Code's power | You still managed hosting, scaling, and container security |
| **Claude Managed Agents** (current) | Purpose-built harness, sandboxing, observability — all managed by Anthropic | Focus on what matters: task, tools, and domain |

> Customer reports: **10 to 15 times faster to production** with Managed Agents.

An interesting point Isabella raises: harnesses need to evolve alongside models. With Sonnet 4.5, Anthropic observed a behavior called **"context anxiety"** — Claude would wrap up tasks early even when it still had room in its context window. The team added mitigations in the harness to combat this. When Opus 4.5 came out, the behavior disappeared entirely, making all that mitigation work obsolete. The takeaway: maintaining a harness is a lot of work, and that's exactly what Managed Agents abstracts away for you.

---

## Core Concept: Separating the "Brain" from the "Hands"

The most important architectural decision in Claude Managed Agents is **decoupling the agent loop (brain) from tool execution (hands)**. Previously, the loop and tools ran together in the same container — which made sense for agents like Claude Code that need filesystem access. But this caused problems:

- **Security**: with the agent and tools in the same container, the agent could access credentials directly. By decoupling, credentials stay isolated and encrypted
- **Latency**: before, a new container had to be spun up for every session, increasing time to first token. With the separation, Anthropic saw **over 90% reduction in Time-to-First-Token (P95)**
- **Resilience**: if a container goes down, just spin up another — no need to restart the agent loop

---

## The Three Primitives of Managed Agents

Everything you build with Managed Agents rests on three concepts:

1. **Agent** = the *brain*. Defines model, system prompt, tools, MCP servers, and skills. It's the persona and capabilities of your agent.
2. **Environment** = the *hands*. The container/infrastructure where tools execute. Now supports **bring your own compute** (announced at Code with Claude London) — you can run on your own infrastructure instead of Anthropic's managed infrastructure.
3. **Session** = the *binding*. Connects an Agent to an Environment, mounts resources (files, data), and enables event streaming to the user.

A key characteristic: the agent loop runs **server-side**. When you close your laptop or hit hard refresh, everything is maintained. Durability and reliability come out of the box — no database or deployment configuration needed.

---

## Hands-on Workshop: SRE Incident Response Agent

The most exciting part of the workshop is the live construction of a **Site Reliability Agent** in a Streamlit app. The scenario is familiar to any software engineer: you're on call and get woken up at 3 AM because something broke. The agent does the diagnostic work for you.

### Agent Configuration

- Model: **Claude Opus 4.7**
- System prompt is extremely simple: "you are an SRE agent, responsible for debugging incidents, with access to metrics, recent deploys, diffs, and logs"
- Local tools: `get_metrics`, `get_recent_deploys`, `get_diff`, plus sandboxing and bash

### The Incident

The agent receives a simulated scenario: P99 latency is 10x above baseline. It then:

1. Runs sandbox commands to inspect logs
2. Calls `get_recent_deploys` to see what changed recently
3. Analyzes metrics and the diff of the suspicious commit
4. **Identifies the root cause**: a commit by developer Alice, refactoring the order summary builder, introduced a query that caused database connection pool exhaustion
5. Returns root cause + recommended actions

> Imagine: instead of being woken up at 3 AM to manually investigate logs and metrics, you simply hand the incident to the agent and it has already done the entire diagnosis.

Isabella notes that for a real SRE agent, you'd also give it access to **runbooks** — documentation teams create about how to debug specific incidents — so the agent has the same materials a human developer would have.

---

## Sessions Speak in Events, Not Tokens

A fundamental difference between Managed Agents and the Messages API: instead of request/response (tokens in/out), sessions work with **events**:

- `user_message`, `tool_call`, `agent_response`...
- Each event is **logged** (native observability in the console) and **streamed** to the user in real time
- Sessions have states: `idle → running → rescheduling → terminated`
- **Webhooks** can trigger or resume sessions based on external events
- **Full persistence**: hard refresh? Everything is still there. No database to configure.

This is crucial both for user experience (seeing things happen in real time, instead of waiting for the agent to finish everything) and for observability (everything is logged in the Anthropic console).

---

## Beyond the Basics: Advanced Features

The workshop covers the basics, but Isabella lists what else is available in Managed Agents:

| Feature | What it does |
|---|---|
| **Sub-agents** | An orchestrator agent delegates tasks to child agents with their own context windows (parallelization and context management) |
| **Memory + Dreaming** | The agent learns from corrections and memorizes user preferences across sessions. "Dreaming" is Claude reviewing its own memory logs to decide what to keep |
| **Outcomes** | You define a rubric for the desired result; the agent plans the necessary tool calls to get there |
| **Vaults** | Encrypted credentials per user/session, isolated from the agent — no need to set up your own secret store |
| **Webhooks** | The agent reacts to external events and resumes sessions automatically |
| **MCP Servers** | New MCP controls, including Cloud MCP Tunnels for private networks |
| **Console Agent Builder** | Native observability dashboard in the developer console |

---

## Final Reflection

What's most impressive isn't the demo itself — it's the **architectural decision to separate brain and hands**. This simultaneously solves security (isolated credentials), performance (90% less TTFT), and resilience (containers are disposable). It's the kind of design that only emerges when you've maintained a harness for years and watched models evolve — the Sonnet 4.5 "context anxiety" episode is the perfect example.

The promise is clear: **let Anthropic handle compaction, caching, context management, and infrastructure — focus on your domain and your agent's tools.** And the workshop proves this isn't just talk: in 45 minutes, you walk away with a functional SRE agent ready to iterate.

For those who want to go further, Isabella mentions follow-up sessions, including one on **dreaming** — the memory and self-improvement service for agents.

---

*Original post: [Atal (@ZabihullahAtal) on X](https://x.com/ZabihullahAtal/status/2074943938805273057) · ~37 min video · Workshop led by Isabella He (Anthropic)*
