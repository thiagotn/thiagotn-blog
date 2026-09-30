---
title: "Summary: Fixing the PR Bottleneck — brakes, not just accelerators (Matt Pocock / AI Engineer)"
date: 2026-09-30
description: "Summary of Matt Pocock's talk at AI Engineer: how layered checks, agent-based code review, and retrospectives transform the PR bottleneck into a system that speeds up without becoming a slop cannon."
tags: ["engineering", "ai", "agents", "code-review", "pr"]
---

> *Summary of Matt Pocock's talk on the AI Engineer channel about fixing the pull request bottleneck in the age of AI agents. The talk was published on September 25, 2026.*

---

Matt Pocock opens with a realization every engineer recognizes: **pull requests have always been the bottleneck**. Historically, there were already piles of PRs waiting for review that no one bothered to look at. With the arrival of AI agents, the problem got dramatically worse — more PRs, more code, more pressure to do more with less. The central promise of AI is to scale people up to produce more, but without the right mechanisms, that becomes a slop cannon.

## Software factory: accelerators and brakes

Matt describes the "software factory" concept — the buzzword of the moment. The core idea is that instead of humans initiating all the work, **agents initiate part of it**: a classifier receives a bug report, creates a reproduction, triggers a fix. Slow database query reports trigger changes. All of this is deterministic code triggering more code — not humans.

But acceleration without brakes is a recipe for disaster. If you just push code through the factory, you end up with a ton of bad PRs that no one can review. The **brakes** are mechanisms that increase quality and prevent the codebase from becoming an entropy nightmare — because code is the environment your agent operates in, and bad code begets more bad code.

Matt identifies **three layers of brakes**, forming a cake:

1. **Automated checks** — linters, tests, type checking, quality metrics. Deterministic, cheap (they cost CPU cycles, not tokens or human effort).
2. **Automated review** — agents that analyze code for things tests didn't catch.
3. **Human review** — people looking at the PR.

The goal is to make human review faster by leaning on the first two layers. Less bad code reaches the human, less intervention is needed.

---

## Automated checks can lie

The first big lesson: **green CI does not mean the code is ready to merge**. Matt shows three types of tests that look useful but are actually lies:

### Tautological tests

A test that simply reasserts the implementation. Real example: a constant `X_POST_CHARACTER_LIMIT = 280`. The test the agent wrote was simply `expect(X_POST_CHARACTER_LIMIT).toBe(280)` — meaning if you change the constant, the test fails, but the test isn't verifying any behavior, it's just restating what the code already says. These tests are extremely structure-sensitive: you can't rename the constant or refactor without breaking the test, but it catches no real bugs.

### Structure-sensitive tests

An even worse case: a test that checked whether two UI sections appeared in the right order (video section after content plan). Instead of rendering the UI, the test **read the module file into memory**, searched for the strings "content plan" and "videos", and verified the second appeared after the first in the source code. If you change the source code formatting — reformat, reorganize imports, anything — the test breaks. It's a test that tests nothing real.

### Tests that cannot fail

A test with so much mocking it becomes impossible to fail. The example: a `useAudioBoost` hook that uses the DOM's Audio Context API, which has complicated error modes. The test stubbed everything with fake methods, and none of those error modes were exercised. Result: strange errors in production that tests never catch.

---

## How to make checks harder to cheat

### Codebase design: deep modules

Matt advocates John Ousterhout's idea (from *A Philosophy of Software Design*): **deep modules** — modules that hide complex behavior behind a simple interface. A deep module has a small interface and a large implementation. A shallow module has a large interface with functions that don't do much individually.

With deep modules, tests naturally become less structure-sensitive — you test through the interface, not reaching into internal details. The engineer's job is to force agents to use that interface instead of diving into the implementation.

Matt mentions a skill of his that analyzes the codebase and suggests opportunities to deepen modules — reducing duplication, creating testable modules. He also defines a vocabulary for describing codebases: **locality** (how well-located code is — does a small change in one module ripple out?), **leverage** (the value a caller gets from a deep module's simple interface), and **seams** (separation points).

### Don't put coding standards in the implementer agent

Here Matt is categorical: most people get this wrong. The implementer agent is already overloaded — it needs to explore the codebase, implement the change, and debug by running checks. If you also pile coding standards on it, performance degrades.

The solution is a separate **code review agent**, running in a sub-agent with its own context and budget. It receives the diff, reads a customizable `coding-standards.md` file, and checks compliance. This agent is **underloaded**: it only needs to do some exploration and review — no implementation, no debugging. You can pile in lots of coding standards without degrading performance.

Matt frames this as a two-part process for writing good code:

1. **Implement** — make it work (red-green)
2. **Code review** — make it good (refactor)

For devs with a TDD background, it's the classic red-green-refactor, but in **two separate context windows** — one to implement, another to review and refactor.

### The reviewer should commit, not just comment

The natural tendency is to have the review agent comment on the PR. But that just creates more work for the human reviewer, who has to read verbose comments and decide what to implement. The default should be: the **reviewer commits fixes** directly. It only comments if it has genuine questions. When the human arrives, they review a clean artifact.

### Don't outsource automated review

Matt is skeptical of generic code review services (CodeRabbit, Cursor Bug Bot). He tried building a generic skill that finds bugs and does security review — and discovered it's really hard: either it's too generic (false positives irrelevant to your use case) or too specific (only works for TypeScript, for example). The recommendation is to build your own, accumulating coding standards over time and sharing them with your team.

---

## Human-friendly PRs

We arrive at the third layer: human review. How to maximize PR quality for the reviewer?

### One-way door vs two-way door

Using AWS terminology: a **two-way door** is a reversible change — you can merge and revert later. Most PRs are like this. A **one-way door** is irreversible: accidentally sending an email to 60,000 people, expensive migrations, data loss. Those need careful review.

### Blast radius and merge danger

Beyond knowing if it's reversible, you need to understand the **blast radius**: what can go wrong, and how bad would it be. Matt includes a "merge danger" summary at the bottom of his PRs: is it a two-way door? Is the blast radius localized? If so, the reviewer can relax — no deep attention needed.

### Pseudocode and diagrams

To understand what the PR does, Matt uses pseudocode and diagrams. He credits the "show me" skill from the Human Layer Skills repo (by Dex Hadley) — which dispenses with text and shows changes as images and diagrams. Mermaid diagrams, UML sequence diagrams, and simple CLI diagrams with new flags — making the "why" as fast as possible to grasp.

---

## Retro: the review that compounds

The last insight is the deepest: **the process that produces code is just as important as the code itself**. When you do human review, you're not just reviewing the code — you're reviewing the system that creates it.

The principle: you never want to write the same comment twice. You never want to catch the agent making the same mistake across PRs.

Matt announces the **Retro** skill (for retrospective). It takes an agent session, a PR, or a set of PRs and reviews from an entire week, and runs a retrospective. Retro suggests:

- New **automated checks** to catch recurring problems
- Updates to **coding-standards.md**
- Navigation pointers in **agents.md** — did the agent find information easily?
- Tool economy — are there tools that could be more token-efficient?
- Bloat — bloated steering files or skills that contribute to bad results?

The effect is **compounding**: each human review improves the quality of the next one. Less future work for you.

---

## Conclusion

Matt closes with the system summary: three layers of brakes. Cheap, abundant automated checks. Automated review with your own coding standards, where the agent commits fixes. Human review focused on one-way doors, with PRs that include merge danger and diagrams. And Retro closing the loop — turning each review into an improvement to the system.

The core message is counterintuitive: to go faster, you need better brakes. It's not about reducing review, but about **investing in the right review** and making each one count toward the next.

---

*Talk by Matt Pocock on the [AI Engineer](https://www.youtube.com/@AIEngineer) channel, published September 25, 2026. Duration: 22min35s. [Original video](https://youtu.be/LlgiOCmFG_w).*
