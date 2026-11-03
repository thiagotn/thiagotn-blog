---
title: "Summary: When to fold subagents into your main agent loop (Anthropic — Diane Sarkis)"
date: 2026-10-22
description: "Summary of Anthropic's article on when to consolidate subagents into the main agent loop — from common enterprise failure modes to the single-loop design with skills and tool search."
tags: ["agents", "ai", "engineering", "anthropic"]
---

> Detailed summary of the article [“Building agents: When to fold subagents into your main agent loop”](https://claude.com/es/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop), published by **Diane Sarkis** (Applied AI team, Anthropic) on October 22, 2026 on the Claude Platform.

Subagents — agents with their own context window, tools, and instructions, orchestrated by a coordinator — are a core component of agent design. They are effective at verification, parallel work, and modular permissioning. Anthropic uses them in many of their own agents, like the multi-agent research system.

However, recently the Applied AI team has found a pattern in enterprise agent deployments that benefits from **folding routers, planners, and domain subagents into the main agent loop**. In comparisons across several enterprise deployments, a single agent with skills frequently outperformed both the one-prompt-for-everything design and the subagent design on quality — and often at a lower cost and latency per task.

The article explains when to consider this migration and the best practices learned from building agents in large organizations.

---

## When subagents still make sense

Subagents still have their place, including at the research frontier. Use them when:

- A single agent loop hits measurable performance degradation from context bloat, or
- Multiple tasks need to be tackled in parallel with fresh context windows that can be discarded once the task is done, or
- A single agent struggles to select appropriate tools or there are conflicting instructions in the system prompt.

But too often, enterprises give each team or problem type its own subagent — and the agent architecture becomes a copy of their org chart (Conway's law at work).

---

## Agent building failure modes for large organizations

Companies often want to build an agent that unites multiple products and capabilities into a single customer interface. Typically, each capability is owned by a separate team, so companies start by letting each individual team build their own agent, then a central platform team builds an orchestrator on top. This can take on several structures: orchestrator-subagent or a single agent with specific agents exposed as MCP tools.

This looks like the simplest solution, but introduces immediate complexity around:

- **Context management**: you need to decide what context is exchanged between agents and often lose details in the back and forth.
- **Subagent sprawl**: every team ships its own subagent, so companies end up with hundreds of overlapping subagents with no enforced standards and no specific owner.
- **The Frankenprompt**: every team adds a sentence to the system prompt, resulting in conflicting rules and no consistent voice.
- **Unvetted, overly localized evals**: everyone adds their own evals, overly optimized for their subtask. No one owns or maintains the whole set, and leadership makes decisions based on watered-down, overly localized scores.
- **Latency**: multi-agent architectural complexity adds latency. One customer that evaluated their multi-agent harness against a single agent loop saw a roughly 2x faster runtime with the latter.

---

## Using an agent loop with progressive disclosure

The orchestrator-subagent design is a reasonable approach to coordinating specialists built across teams, but often a more effective approach is **progressively disclosing context via skills** and **progressively disclosing tools via tool search**. In other words: the agent sees short descriptions of skills and tools, which are fully loaded only when needed.

There are three reasons this approach makes sense:

1. **Shared context produces better answers**: for longer-running agents, we want the context from several different tasks to sit in the main context window. An agent that has seen the result of each earlier step can connect them, leading to richer outputs and better insights than a set of summaries handed back by subagents. It also means fewer context windows and fewer lossy handoffs.

2. **Progressive disclosure prevents context bloat**: this technique allows teams to build single agents that can accomplish a wide variety of tasks without requiring all context to be immediately loaded into one long system prompt. This removes the main reason teams previously split work across subagents. In fact, Anthropic reduced Claude Code's system prompt for more advanced models by over 80% — including cuts related to progressively disclosing skills and tools.

3. **Models are more capable**: starting with Opus 4.5, models became capable of managing far more in a single loop than most teams expected. You cannot turn off thinking on Opus 5.5 and Fable 5.1, and recent models increasingly narrate their progress and check their work as they go — making some harness elements redundant. Each new model lets you move more decision-making out of the harness and into the model itself. A simpler loop is also easier to move to the next model; in migrations Anthropic helped with, rigid multi-agent structures were often what stopped the new model from doing more of the work.

The single agent loop design requires discipline: a carefully managed system prompt, skill and tool descriptions that trigger at the right times, and deliberate handling of context windows, memory, and note-taking. One central team should own end-to-end quality and the system prompt, vetting every new tool and eval before it ships. Keeping that central team small helps iteration move quickly and lowers coordination cost across a large org.

If you go the multi-agent route, start with the simplest pattern (generator-verifier, orchestrator-subagent, or other) that could work. Decompose boundaries effectively by dividing by context: give each subagent a piece of work that needs little from the rest of the system and have it hand back a compact result (good candidates are independent research paths, separate components with clean interfaces, or black-box verification). When agents are split by problem type, they engage in a "telephone game," passing information back and forth with each handoff degrading fidelity.

---

## How to fold subagents into the main agent loop

Many teams already have an orchestrator and a set of specialist agents in production. The single loop design Anthropic suggests working toward:

- **One model and one context window** running an open-ended tool loop, with limits (turn and cost budgets, write gates) set in the harness.
- **Each turn**, the model emits a batch of tool calls. The harness runs them in parallel and returns raw results to the same model, which decides the next step: another batch, a question to the user, or an answer.
- **The loop stops** when the model answers or hits a budget. A goal or verifier check can optionally run after the answer.
- **The model writes its plan in context** on the first turn and revises it as results arrive. This is the main change from the orchestrator and specialist agents setup: the model that writes the plan is also the one carrying it out, so it can change the plan mid-turn.
- **Context still gets loaded**, but is managed by the agent itself:
  - A code step that rewrites the plan from a catalog of rules is no longer needed, since the model decides each step.
  - Ordering and domain procedure move into skills.
  - Hard limits (validation, approval gates) and anything else that comes up mid-conversation (e.g. memory lookup) move into the tools.
  - Code can still be used to load anything cheap and almost always relevant (e.g. an entity resolution step), and to handle mechanical parts (payload construction, stream parsing, resuming a clarification) inside tools the loop calls.

This single loop design also helps with the end state many teams are working toward — an agent that understands a user's high-level goals and acts on their behalf — since it keeps everything the agent has learned in one context.

---

## Task-completion evals

The first step is to create an eval set that helps determine whether you should fold a subagent into the main agent loop. The eval structure that worked: one shared end-to-end set owned by a central team, with smaller eval sets shipped with each skill by the team that owns it. Even a set of 10 golden examples is enough to start.

Grading the agent's final message against a rubric is a good starting point for tracking answer quality. While you still have an orchestrator, also track routing accuracy (did it pick the right subagent?). Once a subagent is folded in, check instead whether the agent loaded the right skill or called the right tool. Working toward task-completion evals over time is helpful as this matters most when comparing architectures.

This can be complex in environments where internal systems are difficult to replay and user engagement is difficult to simulate. One approach that worked internally: record timestamps on important events, so they can be replayed later to run as targeted evals.

---

## Reducing subagents over time

Evolving toward a single agent loop involves folding subagents into tools and skills. This can be done by merging domain subagents, calling them as tools, or replacing them with skills and tools.

### Combining domain agents

Build a small end-to-end eval before the first merge. Then fold in by shared context, starting with the subagents that are most used. Merge specialists that chain on each other's output, touch the same data, or are often called together. For example, if a significant share of production traffic is one specialist followed by a second, that is a tightly coupled pair — a candidate to merge into one domain agent.

### Subagents called as tools

When one of the three conditions above applies and you keep a subagent, it can be effective to have the main agent call subagents as tools so it can continue holding the conversation with the user. Anthropic would only recommend a full handoff — where the subagent takes over the conversation — when it needs to talk to the user directly. Everything else can be a skill plus tools in the main loop.

This allows you to define a shared response schema for subagents, verify the conclusion against real data with the main agent, and trim the input to any final synthesis step. It's a good first step, as you don't need to rewrite the subagents. It also gives you a baseline on the task-completion eval before deciding to fold any subagent into the main agent.

However, some failure modes remain:

- Each specialist has its own prompt, context, owner team, and evals.
- Each call still hands back a lossy summary.
- Every call is a nested model loop that adds latency.

### Folding subagents into the main agent via skills and tools

Fold subagents into the main agent one at a time by turning each one's prompts into skills and API calls into MCP tools. Compare eval performance with and without the subagent. Then decide which to keep.

When you compare, don't just examine the final score — take a look at which tasks flipped. When Anthropic tested this on a sample support agent, folding one subagent into another lowered latency, but also broke a process that had been passing. The main agent was holding the order lookup tool and answering on its own, without asking the shipping specialist for the delivery date.

Before each change, make sure your eval has a task for every chain of agents that runs together in production and for every rule the agent must not break. And run each task more than once, since a break like this one only showed up in one run out of two.

---

## How several teams can contribute to a single agent

Domain reasoning can be retrieved from knowledge bases, skills, and MCP tools. Individual teams can shift their ownership from agents to skills and tools, with one small central team keeping ownership of the system prompt and end-to-end quality. This involves vetting new skills, tools, and evals before they ship.

### MCP tools

Tools are the right fit when the agent needs to take an action, read live data from a system, or return a result in a fixed shape. You can also use tools as a way to keep calling subagents while you migrate. Anthropic recommends tools grouped by user intent (not one tool per API), because once you exceed 30-50 tool definitions in the system prompt, tool choice tends to degrade.

Use tool search with deferred loading, limit hard preconditions, and move any needed ones into the tools. For example, if Y needs X's output, Y's tool checks for it and returns an instruction the model can act on. Per-user permissions work the same way: each tool checks what the calling user may see or do and returns a plain refusal the model can read, so one loop can serve users with different access without a separate agent per permission level.

### Skills

Skills are the right fit when the agent needs to know how a team does work — the steps, rules, and judgment calls a specialist subagent's prompt used to hold.

Anthropic's approach to growing skill libraries is to give the maintenance work back to the people writing the skills. Claude can do the heavy lifting with skills that can build, test, and prune other skills.

To prevent skill sprawl, teams can have DRIs (directly responsible individuals) own their skills and make sure they are well crafted, distinct, and shipped with appropriate evals.

- `/skill-creator` lets you author new skills that start well-formed, and audit existing ones to trim, deduplicate, and restructure them.
- `/skill-doctor` lets you see what each skill in your library costs and how often it's actually used, and delete dead weight.

### Knowledge bases

Knowledge bases are the right fit for reference material the agent only needs some of the time. Facts and reference material (policies, metric definitions, product specs) can sit behind a search or lookup tool the model calls, or ship as reference files inside a skill. Avoid having code retrieve and paste this context into prompts.

---

## Tools to accelerate this work

Anthropic released a set of Claude API skills that help with most of the work mentioned above. The migration kit chains these skills together in one guided workflow for assessing and moving multi-agent systems to a single agent loop. It includes a demo you can try before running it on the real thing:

- **`/claude-api build-eval`**: helps create a first end-to-end set owned by the central team, or small evals each team ships with its skill.
- **`/claude-api prompt-audit`**: flags instructions written for older models in your prompts, skills, and tool descriptions, and proposes fixes as a diff. Can be run on your system prompts to find rules added for an earlier model that now make the agent slower or more rigid. Each team's DRI can also run it on their own skills and tool descriptions.
- **`/claude-api hillclimb`**: iteratively improves an app against an existing eval. Can be used for the "folded in vs kept" comparison — after folding one subagent into a skill plus tools, let it iterate on the skill and tool descriptions and see if the folded version matches or beats the subagent — as well as your system prompt.
- **`/claude-api cost-optimize`**: profiles where your calls go and proposes savings from options such as prompt caching, trimming unneeded input and output tokens, effort, and model choice — one change at a time.

---

## Conclusion

As models evolve, our understanding of how to best use them and guidance around best practice evolve as well. That makes any one architecture less important than the principle behind it: **measure, change one thing at a time, and keep what holds up**.

This is one of those cases. As models get more capable and agents get longer running, more of your subagents can be skills and tools. You don't have to make that move in one step, though. Build a small end-to-end eval, fold in one subagent, and keep it as a subagent only if the folded version scores worse — then rinse and repeat.

---

*Original post: [“Building agents: When to fold subagents into your main agent loop”](https://claude.com/es/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop) · Diane Sarkis (Anthropic) · October 22, 2026*