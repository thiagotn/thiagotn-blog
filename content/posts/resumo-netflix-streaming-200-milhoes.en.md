---
title: "Summary: Designing a Scalable Video Streaming Platform for 200 Million Users (LinkedIn)"
date: 2026-09-25
tags: ["architecture", "scalability", "streaming", "distributed systems"]
---

> This post is a summary of [Sumit Kumar's original LinkedIn post](https://www.linkedin.com/posts/sumit-kumar-0ba08a189_netflix-asks-this-question-to-challenge-share-7507677815383801856-ah-9/), published in September 2026.

## The Challenge

Netflix asks the following question to challenge senior engineers in system design interviews:

> Design a video streaming platform. 200 million users. New season drops tonight. Everyone hits Play at 8:00 PM. Your streaming service crashes.

The question presents two concrete scenarios:

- Your single video server just received 200 million requests in 60 seconds. What happens?
- A user in Mumbai and a user in New York both hit Play on the same video. Your server is in California. Both are buffering. Why?

## The Naive Answer

The simplest approach works in a demo but collapses at scale:

- One large server stores the videos
- User hits Play, server streams the file
- Works in a demo, collapses at 8:00 PM

## The Real Challenges at Scale

### 1. 200 Million Requests in Seconds

When 200 million requests hit a single server within seconds, bandwidth is exhausted instantly. Every user buffers.

**Fix: CDN.** Popular content is pre-positioned across thousands of edge servers globally. The Mumbai user is served from a nearby edge server while the origin remains largely unaffected.

### 2. 4GB Video File with Slow Connection

You cannot deliver 4GB at once. Continuous buffering destroys the experience.

**Fix: Adaptive bitrate streaming.** Every video is encoded at multiple quality levels, from 360p to 4K. The client continuously evaluates available bandwidth and dynamically switches quality. Speed drops, quality drops. Speed recovers, quality improves.

### 3. Millions of Users Requesting the Same Video Simultaneously

Sending every request to the origin creates massive redundant load.

**Fix: Pre-warm the CDN before release.** Content is cached at the edge ahead of the traffic surge, allowing subsequent requests to be served directly from the edge while minimizing origin load.

### 4. Service Crashes 40 Minutes Into an Episode

The service recovers, but the user is sent back to the beginning. Frustrating.

**Fix: Store playback position in Redis**, per user and per video. After recovery, the last position is retrieved so playback resumes where it stopped.

## The Architecture That Survives 8:00 PM

The flow is:

```
User → API Gateway → Load Balancer → Streaming Service
                                         ↓
                           CDN (video delivery) + Redis (playback position)
```

Key points of this architecture:

- The CDN handles almost all video traffic. The origin remains largely untouched
- Adaptive bitrate keeps playback stable across varying network conditions
- Redis ensures playback position survives service failures
- Pre-warming prepares the infrastructure before the traffic surge instead of reacting to it

## Chaos Monkey

Netflix also runs Chaos Monkey, which intentionally introduces failures into production environments to validate system resilience before real failures occur.

## Conclusion

Netflix is not testing whether you can stream a video. They are testing whether you understand what happens when 200 million users press Play within the same minute.

---

*Summary based on [Sumit Kumar's original LinkedIn post](https://www.linkedin.com/posts/sumit-kumar-0ba08a189_netflix-asks-this-question-to-challenge-share-7507677815383801856-ah-9/).*
