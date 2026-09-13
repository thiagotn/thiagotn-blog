---
title: "Summary: Native is now the future of mobile at Shopify (Shopify Engineering)"
date: 2026-09-13
tags: ["engineering", "mobile", "ai", "agents"]
---

> *Summary of "Native is now the future of mobile at Shopify", published by Mustafa Ali on the Shopify Engineering Blog on September 10, 2026. [Read the original](https://shopify.engineering/back-to-native).*

---

Shopify decided to go all-in on React Native back in 2020, and that bet was extremely successful. They saved a ton of time building features just once, enabled developers with no mobile background to contribute to their apps, and freed themselves from constantly chasing feature parity between iOS and Android.

In January 2025, Mustafa Ali himself wrote that the future of React Native was bright and that Shopify planned to keep investing in it. That was true based on what they knew then. But since then, coding models have gotten dramatically better — and for their apps and their team, building the same feature in Swift and Kotlin no longer carries the cost it used to.

> "We don't hold on to a decision just because it was successful at the time. When a core assumption changes, we're willing to go back and ask whether it's still the right call."

A core assumption changed. LLMs changed one of the fundamental hypotheses behind the 2020 decision — so they reevaluated their mobile stack from first principles. And what they found led them back to native.

## Why switch back to native

The decision to switch to React Native in 2020 was based on three reasons:

1. Stop building the same features twice
2. Allow developers to work across the stack
3. Spend less time chasing feature parity and more time shipping value

React Native consistently delivered these benefits. There were costs — performance optimization, maintaining foundational areas of the framework, keeping up with dependency updates — but the benefits far outweighed the investments.

Shopify has been using LLMs to build software since 2021 (one year before ChatGPT). Initially for implementing features, investigating bugs, and reviewing code. As models improved, the complexity of delegated work increased. By late 2025, models weren't just helping write code faster — they were making Shopify question whether building software twice still meant doing twice the work.

They reevaluated their mobile stack and rebuilt core parts of their biggest apps in Swift and Kotlin using LLMs. The results were surprising:

- Agents could implement a feature on Android using the iOS version as reference, and vice versa
- Agents helped developers ramp up and contribute effectively outside their primary stack
- Agents dramatically reduced the cost of maintaining parity between platforms through shared specifications, tests, and review checkpoints

> "Native still means building and maintaining software on two platforms, that cost has not disappeared. What changed is that agents can now do enough of the implementation, translation, testing, and review work that it's no longer the deciding factor it was in 2020."

Native keeps Shopify closer to platform capabilities and first-party tooling, with fewer framework and dependency layers between their code and the OS. React Native apps can be fast — Shopify's are — but agents reduced the advantage of sharing implementation, while the advantages of building for each platform remain.

## The future of their React Native open-source libraries

Shopify published libraries that became the top choice in their respective categories. The transition needs to be clean with no surprises.

### React Native Skia

Shopify will continue sponsoring through the end of 2026. William Candillon will continue working on it beyond that — he will fork the repo in the coming months and start publishing under a new name. The original repo will be archived when the transition is complete.

### FlashList

With ~2M downloads/week, it's the default way to render high-performance lists in React Native. Shopify will continue fixing critical compatibility issues and is in discussions with several companies about long-term stewardship.

### Restyle

Smaller user base — the repo will be archived. It will keep working through the end of 2026, then stop being maintained. Anyone is welcome to fork.

## How the migration works

Shopify has several large apps (Shopify, Shop, Point of Sale, Inbox), with millions of merchants and buyers relying on them every day.

The debate was between gradual migration (brownfield) versus rebuilding from scratch (greenfield). This time, greenfield emerged as the clear winner for three reasons:

- LLMs are good at building features in Swift/Kotlin using the React Native version as reference
- It provides a clean slate to rebuild in the best way possible without previous constraints
- Prototypes showed they could rebuild these apps substantially faster than was possible before coding agents

### The Shop app

Shop — regularly at the top of the shopping category in the app stores — was the first to be migrated. Assisted by AI, the team went from proof of concept to a fully rebuilt native app published in the app stores in just **12 weeks**.

### The Shopify app

Shopify's biggest app (300+ screens, home & lockscreen widgets, Apple Watch app, complications, Siri Shortcuts) is also underway and will ship later in 2026. The rest of their apps will follow soon.

## Preventing slop: the Helix system

Pointing an LLM at the React Native codebase and trying to one-shot the same features in native doesn't work. Even with detailed specs, the result is a huge amount of unmaintainable code that can't be shipped.

To solve this, Shopify built a system called **Helix**. Helix takes a gradual approach:

1. The developer points Helix at a screen
2. Helix reads the React Native code and proposes a sequence of **checkpoints** — small, ordered slices of work that can be reviewed in minutes
3. Checkpoint by checkpoint, it builds: each one must prove its behavior with tests, match the running app in a visual review, survive two adversarial code reviewers, and get a human's approval before being committed
4. Feedback from every review is remembered, making the loop more autonomous as the migration progresses

> "It doesn't expect the first output to be correct, and builds a loop where an imperfect attempt simply cannot move forward until it becomes a good result."

## Fast feedback loops: architecture for humans and agents

Agentic control of simulators is a bottleneck. Agents can make code changes in seconds, but it takes them several minutes to test the output — primarily because they rely on the accessibility tree or screenshots to understand the app's state.

The solution: **completely decouple business logic from the UI** and make it run headlessly on desktop. Agents access it via a CLI that allows them to iterate in milliseconds instead of minutes, without involving simulators.

The CLI lets agents inspect the app's state, navigate between sections, and perform actions without touching the UI. When simulator interaction is needed, the CLI can connect via remote mode and drive the UI through commands — without inspecting the layout or accessibility tree. This enables blazing-fast E2E tests and allows agents to work autonomously for hours at a time.

## What's next

Shopify will migrate all their mobile apps to Swift and Kotlin using AI throughout the process. They're moving quickly but not by lowering the bar — every rebuild must meet or exceed the performance, stability, accessibility, and product quality people expect today. These aren't just the same apps rewritten in different languages — they're rebuilt so both humans and agents can understand, test, and change them quickly.

> "The migration isn't the finish line. Success means our teams can deliver better experiences for merchants and buyers faster than before."

They'll share what they learn along the way — including deeper dives into Helix, their agent-addressable architecture, and how they're building mobile apps with agents.

---

*Original article by Mustafa Ali, published on the [Shopify Engineering Blog](https://shopify.engineering/back-to-native) on September 10, 2026.*
