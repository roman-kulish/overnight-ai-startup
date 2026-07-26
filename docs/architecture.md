---
type: Architecture
title: "Architecture"
description: "Cloudflare-first architecture for the Vibe Coding dashboard"
tags: ["architecture", "cloudflare", "workers", "react"]
timestamp: 2026-07-12T00:00:00Z
updated: 2026-07-13T13:30:00Z
---

# Architecture

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Router | React Router v7 |
| Backend | Cloudflare Workers |
| LLM | Cloudflare Workers AI via AI Gateway |
| Hosting | Cloudflare Workers static assets |
| Domain | vibe-coding.shiretechpartners.com.au |
| Tests | Vitest |

## Structure

```
vibe-coding/
├── src/              # React frontend
├── worker/           # Cloudflare Worker API
├── docs/             # This OKF knowledge bundle
├── wrangler.jsonc    # Cloudflare configuration
├── vitest.config.ts  # Vitest configuration
└── README.md
```

## Routing

Every app is a route in the single-page application. The shared `AppShell` provides:

- A prominent "Return to Dashboard" link at the top on every app route.
- The header is hidden on the Dashboard route itself so the tile grid owns the focus.
- A global floating "Buy Me a Coffee" button anchored to the bottom-right (centered on mobile).

## API

Each app calls one or more dedicated Worker endpoints. The Worker is responsible for:

1. Validating the request
2. Checking for prompt injection
3. Fetching external data if needed
4. Calling the LLM through the appropriate AI Gateway
5. Returning the generated content

Routes that fit a "single LLM call on every request" pattern use a shared factory, `createAIPipelineHandler`, in `worker/routes/shared.ts`. Each app supplies its own model binding, gateway name, prompt builder, and optional response transform. Every successful response uses a semantic key that matches the app (`roast`, `oracle`, etc.) so the contract stays obvious.

### Apps with bespoke handlers

Some apps don't fit the single-call pattern — for example, Meditate to Your Shares has:

- Two endpoints (`/api/meditate` for the LLM-cached phrase pool, `/api/meditate/quote` for fast 15s quote polling)
- A regex-based ticker validator that doesn't match the shared `validateInput` length-based shape
- Cloudflare KV caching of both quotes (30s TTL) and LLM-generated phrases (2h TTL)
- An upstream Yahoo Finance subrequest before any LLM call
- A `PHRASE:`-delimited LLM output that needs a custom parser

These endpoints reuse the shared helpers (`jsonResponse`, `parseJson`, `detectInjection`) but live in `worker/routes/meditate.ts` and `worker/routes/meditate-quote.ts` instead of going through the factory. The factory stays untouched so the simpler apps (roast, agency, oracle) keep working.

### Response envelope

Successful responses look like:

```json
{
  "ok": true,
  "roast": {
    "text": "Pre-revenue and pre-product...",
    "valuation": 2000000,
    "stage": "Pre-Product"
  }
}
```

Error responses look like:

```json
{
  "ok": false,
  "error": "Input exceeds 500 characters"
}
```

Deterministic business logic (e.g., the fake valuation) lives in the Worker, not the frontend. The UI renders only what the API returns.

## AI Gateway strategy

Each app has its own AI Gateway. This provides isolated spend limits, rate limits, guardrails, and caching per app without writing any rate-limiting logic in the Worker. The application code stays small because each gateway handles its own traffic protection.

## Models

| App | Primary model | Fallback |
|-----|--------------|----------|
| Meditate | `@cf/meta/llama-3.2-3b-instruct` | `@cf/meta/llama-3.2-1b-instruct` |
| Agency | `@cf/meta/llama-3.1-8b-instruct-fp8-fast` | `@cf/meta/llama-3.2-3b-instruct` |
| VC Roast | `@cf/mistralai/mistral-small-3.1-24b-instruct` | `@cf/meta/llama-3.1-8b-instruct-fp8-fast` |
| Oracle | `@cf/meta/llama-3.1-8b-instruct-fp8-fast` | `@cf/meta/llama-3.2-3b-instruct` |

Models are configurable through environment variables so they can be swapped without redeploying code.

## Related

- [Project overview](./project.md)
- [Security Controls](./security.md)
- [Deployment](./deployment.md)
- [Applications](./apps/index.md)
