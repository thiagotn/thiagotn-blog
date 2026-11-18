---
title: "Summary: SimulationMaxxing — how Nubank ships agents 20× faster with simulation (AI Engineer — Aman Gupta & Shreya Rajpal)"
date: 2026-11-17
description: "Summary of the talk by Aman Gupta (Nubank) and Shreya Rajpal (Snowglobe) on how simulation of evaluation data accelerates the AI agent deployment cycle by 20× — production results, the mechanics of simulation, and practical takeaways."
tags: ["agents", "ai", "engineering", "nubank", "evaluation"]
---

> Detailed summary of the talk ["SimulationMaxxing: How we ship agents 20× faster"](https://www.youtube.com/watch?v=KMR_RBoCa4M) by **Aman Gupta** (Principal ML Engineer, Nubank) and **Shreya Rajpal** (CEO, Snowglobe), published by the **AI Engineer** channel on July 29, 2026.

The central thesis of the talk is one thing: **if you generate your evaluation data in simulation instead of waiting for production data, you ship agents 20× faster.** And Nubank has production proof of it.

Nubank is the leading digital bank in Latin America, with 135 million customers in Brazil, Mexico, and Colombia, and a US launch imminent. Quarterly revenue crossed US$ 5 billion in Q1 2026, with NPS very high. It's the perfect setting for AI agents in customer support: fanatical human care specialists work alongside agents that solve customer issues fast, empathetically, and correctly. AI handles a lot of routine end-to-end; humans focus on the hardest and longtail cases.

The results: the TNPS (a measure of customer satisfaction) of five AI agents in production increased dramatically over a few months, with many approaching — and some exceeding — human quality. There's a KDD paper being presented in August in Korea.

---

## Why evals matter (and why they're the bottleneck)

Evals are about two things: metrics and data. For metrics, there's a consolidated playbook — "LLM as a judge"-style classifiers aligned with human judgment, automatic prompt optimization, autoprompt tuning techniques. What remains challenging and unsolved is: **what is the data you're computing those metrics on?**

For agents, this is much more expensive than for traditional ML or even single-turn chatbots. Each data point of a multi-turn agent is a **trajectory** with many internal tool calls, state that needs to stay consistent across calls — a single data point is already expensive to generate and annotate, and scaling it is even harder.

Today, teams get eval data in two ways:

1. **Manual authoring** — extremely time-consuming. You need to hand-plan state updates, the trajectory the agent should follow, and keep consistency across all tool calls.
2. **Production traces** — almost free, you get them anyway. But the cost is that you're testing on real live users every experiment, and running many parallel experiments at scale becomes very hard.

---

## How simulation short-circuits the release cycle

Changing the agent harness (prompt, tools, LLM) takes a few hours in the best case. Running offline evals on hand-curated data takes a few days. An A/B test in production monitoring regressions with customer feedback can take forever — feedback is sparse, noisy, and it takes forever to know if you're moving in the right direction.

Nubank verified in production that **simulation short-circuits this timeline**: from weeks to less than a day, sometimes a few hours or minutes. With simulation, changing the harness still takes a few hours, but running offline evals becomes much easier because you have a simulated user to fall back on — you're not waiting on hand-curated data or people creating data for you. And the best part: knowing if a version will do well in production takes just a few hours.

### What is mechanically a simulation

Simulations have long existed in robotics and other domains, but for agent eval they mean a specific thing. This is where Snowglobe comes in and sets up the core infrastructure. The process:

1. **Wrap the agent** — the Snowglobe SDK points at your agent with no code changes required. You declare which tools need to be mocked for the simulation to work.
2. **Steering** — who are the personas, what are the use cases, what are the data points you want to simulate.
3. **Execution** — Snowglobe runs the simulation and produces on the output:
   - A dataset of thousands of multi-turn conversations against your real agents, with tools mocked and everything needed to be useful for evaluation.
   - Judges running on top of the dataset, generating per-turn information about how the agent is behaving.
   - All piped directly into your evaluation pipeline — data on demand.

### Concrete example of a simulated persona

A simulated persona: "Maria Souza", 34, designer, first-time credit card customer. Beyond this basic info, the simulation also generates essential grounding data — a fake address, a fake credit card — that stays consistent across the agent's execution. The agent can identify who the user is, verify the address, and everything is grounded in consistent account data. Tone and voice are also defined: this user interacts with curt, one-line messages, for example, because that's how the persona was set up.

---

## The self-improvement loop

The conference theme this year was self-improving agents. Nubank's loop:

1. **Ship** the agent
2. **Observe** in production
3. **Create robust evals** using automated prompt optimization with algorithms like DAPA
4. **Run simulation** and pipe simulated and real data through evals
5. **Optimize the agent harness** with the rich signal from evals
6. **Verify** and **ship** again

This enabled many A/B tests per agent, and Nubank has many agents across the company.

---

## Results and findings

**Sim vs. real correlation**: quality measured by evals on simulation and on real data has high correlation. 80% of domain expert labels confirmed that simulations produce usable data — not just for mature agents, but also for greenfield agents (built from scratch).

**Derisking**: simulation caught regressions that would have made it to production. In another case, it caught an issue that would have lowered the self-service rate. One agent had its TNPS **doubled** thanks to simulation combined with robust evals.

**Efficiency**: the team uses Snowglobe to test different ideas before launching A/B tests. Instead of 10 A/B tests per quarter per agent, they run many configurations in simulation and launch just one A/B test — short-circuiting the first five or six. The self-service rate was not compromised — it improved across all agents, in one case by 4%.

**Open source model testing**: with many open source models being released, Nubank uses simulation to test multiple models in the agent harness and eval setup to see which work best. This saved multiple weeks of effort. A/B tests are running to check whether these models are as good as frontier models.

---

## Three takeaways

1. **Generate eval data in simulation** instead of relying solely on production. This short-circuits the release bottleneck for agent versions.
2. **Close the sim-to-real gap**. Set up offline/online/human review metrics to understand how simulation compares to real production data, so you can trust the results.
3. **Aligned data and metrics**. If you have aligned metrics that capture the signals you care about and a reliable way to generate data for those metrics, it's easy to put together a self-improvement loop — which is where the field is heading.

---

*Talk by Aman Gupta (Nubank) and Shreya Rajpal (Snowglobe), published by the AI Engineer channel on July 29, 2026. Duration: 16 min 29 s. [Watch on YouTube](https://www.youtube.com/watch?v=KMR_RBoCa4M).*