# Log

## 2026-07-13

- Overhauled **VC Roast Pitch Deck**: streaming AI responses, new persona UI, and global floating BMC button
  - Added streaming path to `createAIPipelineHandler` in `worker/routes/shared.ts` (SSE tokens + metadata + `done` event)
  - Updated `worker/routes/roast.ts` with clearer prompt, optimized single-pass buzzword regex, and deterministic zero-buzzword valuation
  - Rewrote `src/pages/Roast.tsx` to consume the streaming API, show 11-stage loading progress, neon valuation ticker, and a character/speech-bubble layout (character hidden on mobile)
  - Replaced the AppShell footer with a fixed floating "Buy Me a Coffee" button that is centered on mobile and bottom-right on desktop
  - Added custom background utilities (`bg-roast-radial`, `bg-grid-pattern`) and a neon-pulse animation to `src/index.css`
  - Fixed lint warnings and a buzzword-counting test assertion; all tests, lint, and build now pass
  - Updated `docs/apps/vc-roast.md` and this log

## 2026-07-12

- Implemented **VC Roast Pitch Deck** end-to-end
  - Added shared `createAIPipelineHandler` factory in `worker/routes/shared.ts`
  - Wrote `worker/routes/roast.ts` with a Workers AI prompt and deterministic buzzword-based valuation logic
  - Built the full React UI in `src/pages/Roast.tsx` with loading stepper, error handling, and animated valuation ticker
- Added Vitest and `worker/routes/roast.test.ts` covering valuation logic, request validation, prompt injection, AI errors, and empty responses
- Updated `AGENTS.md`, `docs/architecture.md`, and `docs/apps/vc-roast.md` to reflect the new pipeline and tests
- Created repository `roman-kulish/overnight-ai-startup`
- Wrote `README.md`, `AGENTS.md`, and initial OKF documentation
- Defined AI Gateway model strategy and security controls
- Confirmed **4 separate AI Gateways** (one per app) for isolated rate limits, spend budgets, and guardrails; removed KV rate limiter concept from plan
