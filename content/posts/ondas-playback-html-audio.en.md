---
title: "Ondas: the audio player with no library — just the element every browser already has"
date: 2026-11-01
description: "The Ondas player doesn't use Howler, doesn't use Web Audio API, doesn't use anything — it's a raw HTMLAudioElement behind a port. Streaming comes from R2 via 302, offline is a blob: from the Cache API, and the demo mode is a setInterval that advances time without audio."
slug: "ondas-playback-html-audio"
tags:
  - audio
  - architecture
  - frontend
---

*Part of the [Ondas, decision by decision](/en/posts/ondas-serie-engenharia/) series. The code is public: [github.com/thiagotn/ondas](https://github.com/thiagotn/ondas).*

What player is used to play the catalog media? The question sounds simple, and the answer is even
simpler than it sounds: none. There is no audio library in Ondas. It's the browser's own `<audio>`
— a single `HTMLAudioElement` created with `new Audio()`
(`packages/web/src/platform/WebPlayerEngine.ts:27`).

But the shape matters more than the answer. The interesting part isn't that I chose the native
element; it's how the choice was isolated so it can be swapped without touching the UI.

## The engine behind a port

The player sits behind a port, `PlayerEngine`
(`packages/core/src/ports/player-engine.ts:25`), and the core knows no implementation. The
`WebPlayerEngine` is the only thing in the repo that actually plays audio, and it translates the
HTML element's events (`timeupdate`, `progress`, `waiting`, `ended`) into the port's seven events.

The port's comment says in one line why it exists:

> *"On the web it's an `HTMLAudioElement`; on native it'll be `react-native-track-player`."*

Swapping the engine means writing a second class, not rewriting the UI. Every piece of the
interface — controls, progress bar, buffering state — talks to the port, not the element. If
Ondas ever goes native, the `WebPlayerEngine` stays where it is and a `NativePlayerEngine` is born
alongside it.

## How the catalog reaches the element

`Track.stream` for a catalog track is `/api/acervo/<id>/audio`
(`api/internal/httpapi/acervo.go:53`). This endpoint doesn't serve bytes — it responds with a
**302** to a signed R2 URL (`acervo.go:165,208`). The streaming and `Range` support come from R2
and the browser, not from our API.

The API isn't a media proxy. It's an **access negotiator**: it authenticates the request, generates
a signed URL, and returns a redirect. The browser does the rest — connects directly to R2, asks
for the missing chunks, manages the buffer. The API's CPU cost to play a track is zero.

## Three modes of `src`

The audio element's `src` is chosen in `controller.ts:105-113`, and there are three paths — each
one is a product decision:

| Mode | `src` | When |
|---|---|---|
| Streaming | R2 URL (via 302) | track not downloaded, with network |
| Offline | `blob:` from Cache API | track downloaded, with or without network |
| Simulated | `''` (empty) | track downloaded, but blob failed to open and no network |

### Streaming

The default path. The browser receives the 302, follows it to R2, and plays. Simple.

### Offline

If the track is downloaded, the `src` becomes a `blob:` from the `CacheOfflineStore`
(`createObjectURL` over what's in the Cache API, `CacheOfflineStore.ts:57`). The audio element
doesn't know it's offline — it reads a local blob like it would read any file. There's no offline
playback code; there's **cache** code that produces a URL the element accepts.

### Simulated — the mode that looks like a bug but is intentional

An empty `src` is a third mode, on purpose: **simulated playback**. A `setInterval` of 250 ms
advances time and buffer without audio (`WebPlayerEngine.ts:159-176`). It's what makes the demo
catalog demonstrable without network and without API.

When someone opens the app for the first time, without an account and without a connection, the
demo catalog appears and works: time advances, the progress bar moves, the next track is
selected. No sound comes out — but the entire interface is exercised. For someone evaluating the
product, that's the difference between "looks broken" and "looks working."

## Media Session API

Besides the audio element, the only other media API Ondas uses is the **Media Session API**
(`platform/mediaSession.ts`), which connects the lock screen and headphone buttons to the same
UI commands. Play, pause, next track, and previous track appear in the OS-level media controls
without extra UI code — the browser translates the `<audio>` state to the OS.

## What I learned

**The abstraction is worth more than the choice.** I could have used Howler or Web Audio API and
been fine. But the value isn't in which engine I chose — it's that the UI doesn't know which engine
is running. The port costs one interface of seven events and one class that translates. If there's
ever a need for an equalizer, crossfade, or real-time analysis, Web Audio API enters as a new
implementation of the same port, and the UI doesn't change.

**The 302 is more elegant than a proxy.** Serving bytes through the API would be the obvious path:
simpler to reason about, one URL. But every played track would pass through the API, consuming CPU
and memory to copy bytes that R2 already serves directly. The 302 is one line of code that removes
an entire bottleneck.

**The simulated mode was the hardest thing to explain to myself.** The temptation is to treat "no
audio" as an error state. But the demo catalog isn't an error — it's a product function. Making it
an explicit mode, with its own code and its own name, was more honest than letting the UI crawl
when audio doesn't arrive.

## In an interview

**"Which audio library do you use?"** None. It's the browser's `HTMLAudioElement`, created with
`new Audio()`. The decision isn't which library, but how to isolate the choice: the engine sits
behind a port with seven events, and the core knows no implementation. If tomorrow the app goes
native, `react-native-track-player` enters as a second implementation of the same port.

**"How do you stream without serving the bytes?"** The API responds with a 302 to a signed R2 URL.
The browser follows the redirect and makes Range requests directly to the bucket. The API isn't a
media proxy — it's an access negotiator that authenticates and returns a redirect. The CPU cost to
play a track is zero.

**"And offline?"** If the track is downloaded, the `src` becomes a `blob:` from the Cache API. The
audio element reads a local blob like it would read any URL. There's no offline playback code —
there's cache code that produces a URL the element accepts.

**"What happens with no network and no downloaded audio?"** The `src` is intentionally empty. A
`setInterval` of 250 ms advances simulated time and buffer. It's what makes the demo catalog
demonstrable without a backend. The temptation is to treat "no audio" as an error, but the demo is
a product function, not a failure state.
