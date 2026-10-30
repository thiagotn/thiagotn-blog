---
title: "Summary: Spec Driven Development 2.0 — Google's method for engineering with AI agents (IA em 6 minutos)"
date: 2026-10-30
description: "Summary of the IA em 6 minutos video on the Elephant Goldfish Model, Google's Spec Driven Development 2.0: deep context to create, zero context to critique."
tags: ["agents", "ai", "engineering", "specification"]
---

> Detailed summary of the video ["Spec Driven Development 2.0: O método do Google para engenharia com Agentes de IA"](https://youtu.be/xJwegOxj2sc) from the **IA em 6 minutos** channel, published October 2026.

The Spec Driven Development you use has a hidden defect. Google engineers just released version 2.0 and it has an elephant and a goldfish. Sounds like a joke, but thousands of Google engineers already work this way — and it's open source. In the next few minutes, the video explains what the Elephant Goldfish Model is, why it solves the biggest flaw in Spec Driven Development, and how to use it today in Cloud Code or Codex.

---

## The hidden defect in Spec Driven Development 1.0

Version 1.0 is simple: before asking for code, you write the specification — what to build, the rules, the acceptance criteria — and the agent implements following that plan. Already much better than asking for code on the fly. But there's a hidden problem.

Who wrote the spec? The agent, while talking to you. And who reviews it? The same agent, in the same conversation. It already knows everything you agreed on. So when it reviews, it agrees with itself and agrees with you. Language models have this habit: they cling to their own wrong ideas and prefer to please you rather than contradict you. The spec comes out pretty, complete, and full of holes nobody saw. You only find out later, when the code is already done.

---

## The Elephant Goldfish Model: version 2.0

The model has two roles — and the name explains it all.

### The elephant never forgets

It's the agent with total context: the project's history, architecture, who uses the system and for what. It discusses the idea with you, explores angles, looks for where it might fail, and writes the specification.

### The goldfish remembers nothing

These are subagents with zero context. They read only the spec and the code. They never saw your conversation. So nothing you said can convince them. Each goldfish looks from one angle:

- One asks: "Is there a simpler way or does the system already do this?"
- Another reads it as someone who's never seen the project
- Another looks for what breaks when thousands of people use it at the same time
- And another checks if the spec is clear enough for the model to implement without guessing

The motto is: **design like an elephant, review like a goldfish**.

### And there's a third role: you

The goldfish generate lots of notes on purpose. You decide what goes in, resolve the trade-offs, and approve the spec. The AI designs and critiques. The decision still belongs to the engineer.

---

## Why plan mode doesn't solve this

You might think: "But my agent already has plan mode." It does. And it works like this: you explain the idea, it asks two or three questions, and writes the plan. All in the same conversation. The plan looks complete, until it's time to implement. Then the edge cases show up, you go back, fix, and implement again.

The Elephant Goldfish swaps this cycle of fixing later for a review that happens before — done by someone with no reason to agree with you.

---

## The workflow in practice: five commands

1. **Bootstrap**: the elephant maps your code, folder by folder, and documents what each part does and which rules can never be broken
2. **Brainstorm**: it asks you question after question until the idea is clear. Six goldfish attack the proposal before it becomes the concept brief
3. **Draft**: the spec is written one session at a time and it stops for you to approve each one. Critical user journeys, technical plan, alternatives considered, and the step-by-step implementation
4. **Review**: five rounds of goldfish. A single agent consolidates the reports so the main context doesn't get polluted
5. **Implementation**: only after the spec is approved does the agent implement

---

## Drift Report: the spec keeps being verified after

The most impressive part comes after. The code changes, the spec stays still. The drift report compares the two and points out where they no longer match.

In a test by the iLabs channel, it found a real bug: store owners could delete products that had already been sold. The rule said sold products can only be hidden. The normal review didn't catch it. The goldfish did.

That's why the video calls it Spec Driven Development 2.0: in version 1.0 the spec is a document. In 2.0 the spec is tested before a single line of code exists and keeps being verified after. It's no longer a document the agent follows — it's a contract that already survived an attack.

> Deep context to create. Zero context to critique.

---

## When NOT to use it

But it's not for everything. Google itself says: for a small, clear bug that the agent fixes in one shot, this only slows you down. Its place is in big features — the ones where getting it wrong is expensive.

---

## How to get started

Two commands to get started:

- In **Cloud Code**, you add Google's marketplace, Elephant Goldfish Model, and install the EGM plugin
- In **Codex** it's similar: open a new session. If the project already exists, run bootstrap first so the elephant gets to know your code. Then pick a feature that needs a design decision and run brainstorm

The link is in the video description.

---

*Source: ["Spec Driven Development 2.0: O método do Google para engenharia com Agentes de IA"](https://youtu.be/xJwegOxj2sc) — IA em 6 minutos, October 2026.*