---
type: Security
title: "Security Controls"
description: "Rate limiting, input validation, and cost controls for public-facing LLM apps"
tags: ["security", "ai-gateway", "rate-limiting", "validation"]
timestamp: 2026-07-12T00:00:00Z
---

# Security Controls

This is a public-facing LLM application. Security is focused on cost control, abuse prevention, and keeping generated content safe.

## Layer 1: AI Gateway

Each app has its own AI Gateway that handles:

- **Guardrails**: content moderation on prompts and responses
- **Rate limiting**: per-gateway request limits
- **Spend limits**: per-app daily/monthly dollar budgets
- **Caching**: cached LLM responses for identical inputs

The gateway returns a `429 Too Many Requests` response when a limit is exceeded.

## Layer 2: Application validation

The Worker validates every request before touching the gateway:

- **Length limits** per app
- **Format validation** with allow-listed patterns
- **Control character stripping**
- **Prompt injection pattern detection**
- **Output length and content checks**

## Layer 3: CAPTCHA

Cloudflare Turnstile appears after a threshold of rapid requests from the same IP.

## Per-app rate limits

| App | Per minute | Per hour | Per day |
|-----|-----------|----------|---------|
| Meditate | 5 | 50 | 200 |
| Agency | 5 | 50 | 200 |
| VC Roast | 3 | 30 | 100 |
| Oracle | 5 | 50 | 200 |

## Budgets

| App | Daily | Monthly |
|-----|-------|---------|
| Meditate | $5 | $100 |
| Agency | $5 | $100 |
| VC Roast | $8 | $150 |
| Oracle | $5 | $100 |

## Validation rules

- **Meditate**: ticker symbol, max 50 characters
- **Agency**: hobby description, max 200 characters
- **VC Roast**: idea pitch, max 500 characters
- **Oracle**: zodiac + crypto, max 100 characters
