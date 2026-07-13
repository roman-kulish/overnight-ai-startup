# Log

## 2026-07-13

- **Dashboard redesign**: arcade-style card grid with 3D tilt effects
  - Redesigned `src/pages/Dashboard.tsx` with tall portrait cards, full-bleed images, and per-app hover glows
  - Implemented 3D mouse-parallax tilt effect with `perspective()` and `rotateX/Y` transforms
  - Added slide-up description overlay on hover with backdrop blur
  - Respected `prefers-reduced-motion` to disable tilt for accessibility
  - Updated `AppShell` to hide header on dashboard and rename to "Overnight AI Startups"
- **VC Roast streaming implementation**: real-time AI responses with persona UI
  - Added streaming path to `createAIPipelineHandler` in `worker/routes/shared.ts` (SSE tokens + metadata + `done` event)
  - Updated `worker/routes/roast.ts` with clearer prompt, optimized single-pass buzzword regex, and deterministic zero-buzzword valuation
  - Rewrote `src/pages/Roast.tsx` to consume streaming API with 11-stage loading progress, neon valuation ticker, and character/speech-bubble layout
  - Fixed streaming timing issues: wait for metadata before transitioning status, use `AnimatePresence mode="sync"` for seamless transitions
  - Added anti-buffering headers (`no-transform`, `x-accel-buffering: no`) to prevent proxy buffering
  - Fixed global regex race condition by creating local `RegExp` instances per request
- **UI polish and bug fixes**
  - Fixed valuation ticker flash bug by conditionally rendering only when metadata is defined
  - Added mobile speech bubble pointer for responsive layout
  - Enlarged CEO avatar 2x and aligned with thought bubble pointer
  - Simplified card header layout with horizontal flex symmetry
  - Replaced AppShell footer with fixed floating "Buy Me a Coffee" button
  - Added custom background utilities (`bg-roast-radial`, `bg-grid-pattern`) and neon-pulse animation to `src/index.css`
- **Documentation and process improvements**
  - Added streaming & SSE patterns section to `AGENTS.md` (anti-buffering headers, AnimatePresence sync, metadata timing, local regex)
  - Added UI/UX patterns section to `AGENTS.md` (reduced motion, transform performance, mobile-first pointers)
  - Updated `docs/apps/vc-roast.md` with streaming implementation details
  - Commented out non-roast apps in dashboard until they're implemented
- All tests, lint, and build pass

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
