---
title: "Summary: How to trust AI agents to write code — the management analogy (Lauren Tan / Cursor)"
date: 2026-09-02
tags: ["engineering", "ai", "agents", "management"]
---

> *Summary of Lauren Tan's (@potato_en on Twitter) live session on scaling the use of AI agents to write code — from total distrust to auto-merging 20 PRs a day. Lauren is an engineer at Cursor (formerly Meta/React, formerly Netflix). The presentation took place on September 12, 2026.*

---

Lauren Tan opened her presentation with a personal observation: after years alternating between IC (individual contributor) and engineering manager roles at Netflix and Meta (where she worked on the React Compiler), she realized that **managing AI agents has deep parallels with managing people**. The central question that guides the entire talk is simple: *how do you trust an agent to write code?*

## The trust curve

Lauren describes her personal journey in a chart she admits isn't scientific, but captures the experience well. About a year ago, almost no one was using agents to code. When you started, you entered a **micromanagement mode**: supervising every output, constantly prompting, unable to parallelize beyond one or two agents because you couldn't even trust the output of one.

> "You can't spawn a hundred agents when you don't even trust the output of one."

Over five months at Cursor, Lauren ascended this trust curve. Today, she has agents **auto-merging PRs** — she woke up one day with 20 PRs already merged to main, all reviewed after the fact. In August 2026, she shipped 1,000 PRs. In September (the 12th), she was already at almost 800. The velocity is absurd, and she acknowledges it's fair to question the quality — but argues that with the right setup, you can get there.

## Verification: the most important skill

For Lauren, the most important skill in her agent toolbox is **verification** — the ability for an agent to actually run the code, take CPU traces, heap snapshots, open an iOS simulator, or however your application is exposed to users. The agent needs to be able to run and test the code it writes.

Without verification, **you are the bottleneck**. The agent writes code, you open the dev build, discover it doesn't work, copy-paste screenshots and console errors back to the agent, and you're stuck in a slow loop that's impossible to parallelize.

### The Agent Window (Glass) case

When Lauren joined Cursor, she was assigned to help with the Agent Window (internal codename: "Glass"), a React application with a one-week launch deadline. She tried taking Chrome DevTools performance traces and sending screenshots to the agent, but the agent had no context for what it was seeing — confidently claiming to have found the problem, and always being wrong.

The solution was to build a **verification skill** (called "Control Glass") that teaches the agent to:

- Open the application locally via Chrome DevTools Protocol (CDP)
- Take performance traces
- Interact with the UI programmatically

But that alone wasn't enough. The agent could run the application but didn't know how to **navigate** it — when someone reported "the sidebar is laggy," the agent didn't know what the sidebar was or how to get there. Lauren had to create a **feature map**: a file describing all UI features, how to access them (keyboard shortcuts, DOM selectors, CDP attributes), and the mapping between user concepts and code.

With the feature map, even vague reports or screenshots without descriptions become useful. Internally at Cursor, there's a Slack channel where people send screenshots with "???" — the agent can interpret and reproduce the problem because it has navigation context.

## P-Stack: the plugin that started as observation

Lauren created **P-Stack** (the "P" stands for "Potato Stack" — a joke about Gary Tan, CEO of YC, who has "G-Stack"). P-Stack is a Cursor plugin that bundles a set of engineering skills and practices she developed by observing agents fail.

She never planned to build P-Stack. It started with the Control Glass skill, and grew incrementally: every time she observed an agent failing in a specific way, she created a skill to correct that behavior. One example: the agent would confidently claim a bug was caused by X, but when she looked at the tool calls, she realized the agent wasn't even reading the relevant code. The "how" skill was created to force the agent to search and read code before drawing conclusions.

The management analogy: if you have a brilliant coder with zero business context (just hired), you need to provide context, documentation, instructions. Skills are exactly that — **markdown that encodes knowledge** and "pulls the agent into a smarter latent space" (as some describe it on Twitter).

## Evals: unit tests for skills

Maintaining skills is hard. It requires "taste and observation" — being a good backseat driver, like in pair programming. You open the tool calls, read the agent's thinking blocks, observe where it fails, and build a skill for that.

To validate changes to skills, Lauren uses **evals** — essentially unit tests for agents. The process:

1. A coordinator agent creates a **rubric** for what the skill should do
2. It spawns several **subagents** in individual directories (with names that don't indicate they're being evaluated — agents change behavior when they know they're being tested)
3. A **judge agent** from a different model cross-references results to avoid bias
4. The eval produces a **score** that can be "hill climbed" — in Cursor, you can use `/loop` to iterate until everything is 10/10

She did the same with the verification skill: hill climbing until the CLI was good. Cursor supports multiple models, so you can eval a skill across a matrix of different models.

## Cloud agents: the multiplier

After trusting locally, the next leap is **cloud agents**. That's where the real power lies: you set up verification skills once and they level up not just you, but your entire team and company.

The example: **Benny**, an agent that picks up bug reports automatically, opens a Cursor instance in the cloud, uses the same control skills to interact with the application, and tries to reproduce the bug. In one example shown, Benny reproduced the bug — but found it was already fixed on main. All Lauren had to do was release another build. Hours of work reduced to seconds, with zero human intervention.

> "Don't try to jump from 'I don't trust one agent' to 'I'll spawn a thousand cloud agents.' You'll waste a lot of tokens and it'll be very expensive."

## Refactoring and rewrites: the case for

Lauren makes a counterintuitive case for **rewrites**, especially in greenfield applications. The argument:

- **Brownfield applications** (large codebases with established guardrails, like Meta and Google) are in a good position. These companies already design everything for the least capable engineer — frameworks, conventions, guardrails, credential restrictions. Before "AI slop" there was already "human slop." These guardrails serve agents perfectly.

- **Greenfield applications** are the biggest risk and the biggest opportunity. When you vibe-code a prototype (like Grokbot, launched the day before the presentation), humans don't read the code. Without guardrails, agents solve each task in whatever way is most convenient, and the codebase spirals out of control.

Grokbot was vibe-coded very quickly. Lauren spent **over 600 PRs** refactoring Grokbot to a new architecture (codename "Dune"). Now she doesn't look at the code anymore — and says this not to sell tokens, but because she invested heavily to get there.

## Dune: the architecture for agents

Dune is described as "Next.js for Electron apps," designed for agents to write code. The principles:

### Codebase constraints

- **Co-located features**: each feature lives in a single directory. The agent doesn't need to search for where things are — it opens the feature directory and 80% of the work is there.
- **Import blocking**: `electron-main` and `electron-renderer` directories have CI checks that verify the dependency graph to prevent accidental imports between them (preventing UI jank from heavy code running on the renderer).
- **Shortest path principle**: agents love shortcuts. If the shortest path is the best path, they naturally do the right thing.

### CI constraints

- **`useEffect` banned** in React — CI fails if you use it.
- **Code comments banned** — 99% of the time, agents write irrelevant comments (like "Lauren said never to do this" as a permanent comment). Banned entirely.
- **Linters for observed bad patterns**.
- **Compiler diagnostics** as the first layer.
- **BugBot** (Cursor's automated code review tool) running on CI.

### The enforcement pyramid

Lauren describes layers of enforcement, from strongest to weakest:

| Level | Mechanism | Hardness |
|---|---|---|
| 1 | Codebase architecture (directory convention, co-located features) | Maximum — agents copy existing patterns |
| 2 | Import blocking / dependency graph checks (CI) | Hard fail |
| 3 | Linters / compiler diagnostics (CI) | Hard fail |
| 4 | BugBot (automated code review) | Soft — can forget |
| 5 | Rules / skills / style guide | Soft — not always applied |

> "If you rely only on rules, skills, and style guides, it's just a matter of time before your codebase turns to trash."

The worst place to be is **code review land** — where you, the human, enforce all invariants by reading code and commenting on PRs. Every time you do that, you should think: *how do I turn this into a hard rule, a lint, or a CI failure?*

### Why Rust is an advantage

Lauren notes that Rust is gaining popularity again precisely because the compiler is extremely strict — borrow checker, ownership rules. If you ban `unsafe` blocks, you can be reasonably confident that if it compiles, it probably works. The compiler does the verification work that a human would otherwise have to do manually.

## ROI: is the token investment worth it?

Lauren acknowledges she works at an AI lab with unlimited tokens, and not everyone is in that situation. But argues it's a question of ROI:

- Yes, refactoring a codebase costs many tokens upfront.
- But if we're heading toward a world where agents write all the code, you want to stay lean and nimble, not become a 10,000-engineer org.
- The value of agents isn't just saving tokens on each task — it's enabling things you couldn't do before. Lauren, as a single person, built a framework that would have taken years.
- Even non-frontier agents write excellent code when the codebase has strong constraints.

The ROI extends further: the Dune architecture allows PMs, designers, and GTM people to contribute code directly to Grokbot. A PM can report a bug, fix it, send it to Lauren for review — and she just stamps it.

## Grokbot: the "Cursor moment" for non-technical people

Grokbot was launched the day before the presentation (September 11, 2026). It's an application that lets you create agents with their own identities and orchestrate them — in an interface that looks like iMessage, very accessible.

For Lauren, Grokbot is the "Cursor moment" for non-technical people: PMs use it to summarize engineering work, designers ship features, and it all works because the Dune architecture has constraints strong enough that non-expert contributions don't break anything.

## Synthesis: the journey in 5 steps

| Stage | What happens | Trust level |
|---|---|---|
| 1. Micromanagement | 1-2 agents, you watch everything, you're the bottleneck | Zero |
| 2. Verification skills | Agent runs code, takes traces, you observe | Low-medium |
| 3. Behavior skills | Fixes hallucination, forces code reading, evals | Medium |
| 4. Cloud agents | Benny reproduces bugs, levels up the whole team | High |
| 5. Auto-merge | 20 PRs merged overnight, you review on main | Maximum |

The central message: there's no shortcut. You climb the curve by building trust incrementally — through skills, evals, verification, and constraints. And when you reach the top, the payoff isn't just yours — it's your entire company's.

---

*Presentation by Lauren Tan (@potato_en), engineer at Cursor, in a live session on September 12, 2026. For more details on P-Stack, search "pstack cursor" on Google. For questions, Lauren opens DMs on Twitter.*
