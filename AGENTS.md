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

## Backend patterns

- Reusable AI routes are built with `createAIPipelineHandler` in `worker/routes/shared.ts`.
- Each route reads its model and AI Gateway from environment variables and returns a semantic response key (e.g., `roast`, `oracle`).
- Keep deterministic business logic in the Worker rather than the frontend; the UI only renders what the API returns.

## Testing

- Tests live next to the code they cover (`*.test.ts`) or in feature-specific `tests/` directories.
- Use Vitest. Prefer unit tests for pure worker logic (validation, scoring, valuation, formatting) over end-to-end UI tests unless the interaction is the bug-prone part.

## Documentation

For deeper context, see the `docs/` directory.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **overnight-ai-startup** (206 symbols, 317 relationships, 6 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/overnight-ai-startup/context` | Codebase overview, check index freshness |
| `gitnexus://repo/overnight-ai-startup/clusters` | All functional areas |
| `gitnexus://repo/overnight-ai-startup/processes` | All execution flows |
| `gitnexus://repo/overnight-ai-startup/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
