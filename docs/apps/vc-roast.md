---
type: App
title: "VC Roast Pitch Deck"
description: "Brutally roast a one-sentence billion-dollar AI idea"
tags: ["app", "vc", "roast", "pitch", "parody"]
timestamp: 2026-07-12T00:00:00Z
updated: 2026-07-13T13:00:00Z
---

# VC Roast Pitch Deck

## Concept

Submit a one-sentence "billion-dollar AI idea" and get a brutal roast in Silicon Valley venture-speak. A fake valuation counter ticks down while the roast streams, and a snarky VC persona comments on your pitch.

## Example

- **Input**: "An AI that reminds me to drink water."
- **Output**:

```json
{
  "ok": true,
  "roast": {
    "text": "Pre-revenue, post-utility. You've reinvented the alarm clock but bolted an LLM to it. Your burn rate will outpace your user acquisition by Q2.",
    "valuation": 0,
    "stage": "Pre-Industrial"
  }
}
```

The UI animates the `valuation` down to `$0.00` while the roast streams in a speech bubble from the VC persona.

## Model

`@cf/mistralai/mistral-small-3.1-24b-instruct` for sharp wit, with fallback to `@cf/meta/llama-3.1-8b-instruct-fp8-fast`.

## Pipeline

`worker/routes/roast.ts` uses the shared `createAIPipelineHandler` factory:

1. Validate and sanitize the pitch.
2. Run prompt-injection detection.
3. Call Workers AI with `stream: true` **through the AI Gateway** with response filtering (`request.skip_cache`, `request.collect_on_stream_failure`) disabled. Disabling the gateway's response buffering/cache collection is what lets the streaming response pass through unbuffered.
4. The worker streams token events to the client and computes deterministic fake valuation from Silicon Valley buzzword / cliché count up front.
5. Return `{ ok: true, roast: { text, valuation, stage } }` when not streaming; otherwise emit a Server-Sent Events stream.

> **Note:** Both streaming and non-streaming requests go through the AI Gateway for rate limiting, spend caps, and guardrails. Streaming works as long as the gateway's response filtering (cache collection) is disabled so it does not buffer the entire response.

### Valuation logic

- 0 buzzwords → random `$50,000`–`$150,000` (small valuation for terrible ideas)
- n ≥ 1 buzzwords → `min(10_000_000, max(100_000, n × 1_000_000))`

Stages map to the buzzword count: `Pre-Industrial`, `Pre-Concept`, `Pre-Product`, `Pre-Revenue`, `Pre-Everything`, and `Pre-Thermodynamics`.

The valuation logic lives in the Worker, so the frontend only renders what it receives.

## Visuals

Dark-mode pitch deck layout with:

- A centered pitch-deck input card.
- 11-stage loading sequence ("Analyzing Pitch...", "Evaluating TAM...", etc.).
- Streaming roast text inside a speech bubble attached to a CEO / VC persona character (hidden on mobile).
- Two large valuation displays side by side with a `TrendingDown` crash icon between them: a static accent-purple **"Hype Valuation"** (the computed number) on the left, and a neon-red pulsing **"Implied Valuation"** on the right that ticks down from the hype valuation to `$0.00`, with the **"Current stage"** shown as a third row underneath the implied valuation.
- A global floating "Buy Me a Coffee" button in the bottom-right (centered on mobile).

Tests live next to the handler in `worker/routes/roast.test.ts`.

## Related

- [Architecture](../architecture.md)
- [Security Controls](../security.md)
- [Meditate to Your Shares](./meditate-shares.md)
- [AI Automation Agency Generator](./agency-generator.md)
- [Crypto-Astrology Oracle](./crypto-oracle.md)
