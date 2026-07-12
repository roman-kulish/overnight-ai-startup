# Agent Instructions

This repo is a **vibe-coded** social experiment, not an enterprise monolith. Keep changes pragmatic, scoped, and story-consistent.

## What this repo is

A Cloudflare Workers + React dashboard hosting 4 parody AI apps satirizing the "overnight AI startup" genre. See `README.md` for context and the `docs/` directory for detailed knowledge.

## Before you change code

- Read the relevant docs in `docs/`.
- Prefer the simplest implementation that works.
- Each app is a standalone route with its own visual identity and a shared `AppShell`.

## Architecture quickmap

- `src/` — React + Vite frontend
- `worker/` — Cloudflare Workers API handlers
- `docs/` — OKF-style project knowledge (read this)
- `wrangler.jsonc` — Cloudflare deploy config

## Coding rules

- Keep components small and focused.
- Do not introduce abstractions for single-use code.
- Validate all external inputs in the Worker; never trust the frontend.
- Gateways handle rate limits, spend caps, and guardrails — keep that logic out of code.
- Dark mode, premium feel, parody tone.

## Documentation

For deeper context, see the `docs/` directory.