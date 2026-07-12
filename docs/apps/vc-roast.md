---
type: App
title: "VC Roast Pitch Deck"
description: "Brutally roast a one-sentence billion-dollar AI idea"
tags: ["app", "vc", "roast", "pitch", "parody"]
timestamp: 2026-07-12T00:00:00Z
updated: 2026-07-12T18:45:00Z
---

# VC Roast Pitch Deck

## Concept

Submit a one-sentence "billion-dollar AI idea" and get a brutal roast in Silicon Valley venture-speak. A fake valuation counter ticks down to zero while you read.

## Example

- **Input**: "An AI that reminds me to drink water."
- **Output**:

```json
{
  "ok": true,
  "roast": {
    "text": "Pre-revenue, post-utility. You've reinvented the alarm clock but bolted an LLM to it. Your burn rate will outpace your user acquisition by Q2.",
    "valuation": 100000,
    "stage": "Pre-Thermodynamics"
  }
}
```

The UI animates the `valuation` down to `$0.00` while the user reads the roast.

## Model

`@cf/mistralai/mistral-small-3.1-24b-instruct` for sharp wit, with fallback to `@cf/meta/llama-3.1-8b-instruct-fp8-fast`.

## Pipeline

`worker/routes/roast.ts` uses the shared `createAIPipelineHandler` factory:

1. Validate and sanitize the pitch.
2. Run prompt-injection detection.
3. Call Workers AI through the `vc-roast` AI Gateway.
4. Compute a deterministic fake valuation from Silicon Valley buzzword / cliché count.
5. Return `{ ok: true, roast: { text, valuation, stage } }`.

The valuation logic lives in the Worker, so the frontend only renders what it receives.

## Visuals

Dark-mode pitch deck layout with a loading stepper (`Analyzing Pitch...`, `Evaluating TAM...`, `Projecting Burn Rate...`, `Preparing Roast...`) and a ticking valuation display. Input form, result card, and a "Roast again" reset button. Tests live next to the handler in `worker/routes/roast.test.ts`.

## Related

- [Architecture](../architecture.md)
- [Security Controls](../security.md)
- [Meditate to Your Shares](./meditate-shares.md)
- [AI Automation Agency Generator](./agency-generator.md)
- [Crypto-Astrology Oracle](./crypto-oracle.md)
