# Phase 1 — EnhancerContext Refactor Report

## Problem

`contexts/EnhancerContext.tsx` was a 756-line god file that concentrated seven unrelated concerns in a single module:

1. **Worker lifecycle** — creating, initialising, and disposing a `WorkerManager` instance.
2. **Model loading** — the full async model-download flow including progress tracking and error handling.
3. **Enhancement pipeline** — transcript chunking, per-chunk worker dispatch, chunk merging, and result assembly.
4. **Prompt selection** — a boolean branch (`useContextAwarePrompts`) that chose between a context-aware LLM prompt and a plain system prompt.
5. **Download-state persistence** — three separate `useEffect` blocks reading, writing, and marking-complete a `localStorage` key to allow resuming interrupted downloads.
6. **Hardware capability normalisation** — unwrapping the return value of `useHardwareCapabilities` into the context shape.
7. **Telemetry** — building and firing a `logEnhancementMetrics` call inline inside the enhancement flow.

Any change to any one concern required editing the same file, making it a permanent change-magnet.

---

## Cause

Two SOLID violations drove the growth:

### SRP — Single Responsibility Principle
The file had at least seven reasons to change (one per concern above). React context providers are natural aggregation points, but there is no rule requiring the *implementation* of every concern to live inside the provider. The provider should only wire things together, not implement them.

### OCP — Open/Closed Principle
The prompt-selection logic was a hard boolean branch:

```ts
// contexts/EnhancerContext.tsx (before)
if (useContextAwarePrompts && whisperResult) {
  // ... extract metadata, build context-aware prompt
} else {
  promptText = null;  // fall back to system prompt
}
```

Adding a third prompt strategy (e.g. a fine-tuned instruction format) required editing this block — the dispatcher was closed for extension.

### Side-effect: broken regression test
The error message thrown when `enhance` was called without a loaded model was `'Worker not initialized. Please wait for initialization.'`, but the regression test (`EnhancerContext.test.tsx`) expected `'Model not loaded'`. This mismatch left one test permanently failing before the refactor.

---

## Fix

### Scope of changes

| Location | Change |
|---|---|
| `contexts/EnhancerContext.tsx` | Reduced from 756 → 216 lines; now orchestration-only |
| `services/enhancer/enhancerEngine.ts` | New — `EnhancerEngine` interface + `createDefaultEnhancerEngine` factory (DIP boundary) |
| `services/enhancer/enhancementPipeline.ts` | New — pure chunking/merge pipeline, no React |
| `services/enhancer/downloadStatePersistence.ts` | New — `localStorage` read/write/clear for download state |
| `services/enhancer/enhancerTelemetry.ts` | New — `buildAndLogTelemetry` factory |
| `services/enhancer/promptStrategies/types.ts` | New — `PromptStrategy` interface |
| `services/enhancer/promptStrategies/contextAware.ts` | New — context-aware strategy |
| `services/enhancer/promptStrategies/simple.ts` | New — simple (system-prompt) strategy |
| `services/enhancer/promptStrategies/registry.ts` | New — `register` / `selectPromptStrategy` / `getAllStrategies` |
| `services/enhancer/promptStrategies/index.ts` | New — side-effect barrel that triggers both registrations |
| `hooks/enhancer/useEnhancerHardware.ts` | New — wraps `useHardwareCapabilities`, normalises shape |
| `hooks/enhancer/useDownloadResumePrompt.ts` | New — owns the three `localStorage` effects + `dismiss` |

### How each violation was resolved

**SRP** — Each extracted file passes the one-sentence test with no "and":
- `enhancerEngine.ts`: manages worker lifecycle and delegates requests to it.
- `enhancementPipeline.ts`: chunks a transcript and assembles chunked results.
- `downloadStatePersistence.ts`: persists download progress to `localStorage`.
- `useDownloadResumePrompt.ts`: tracks whether an interrupted download should surface a resume prompt.

**OCP** — The boolean branch is replaced by a priority-ordered strategy registry:

```ts
// services/enhancer/promptStrategies/registry.ts (after)
export function selectPromptStrategy(ctx: PromptSelectionContext): PromptStrategy {
  const match = registry.find(entry => entry.strategy.isApplicable(ctx));
  if (!match) throw new Error('No PromptStrategy registered');
  return match.strategy;
}
```

Adding a third prompt strategy now requires one new file (`newStrategy.ts`) and one `register()` call. The dispatcher (`selectPromptStrategy`) is never edited.

**DIP** — The provider depends on the `EnhancerEngine` interface, not the concrete implementation:

```ts
// contexts/EnhancerContext.tsx (after)
import { createDefaultEnhancerEngine } from '@/services/enhancer/enhancerEngine';
import type { EnhancerEngine } from '@/services/enhancer/types';

const engineRef = useRef<EnhancerEngine | null>(null);
```

Tests can substitute a fake engine without mocking internal worker calls.

**Broken error message** — The provider now throws `'Model not loaded'` when `enhance` is called without a loaded model, matching the pre-existing test expectation.

---

## Expected Behaviour After Fix

- All 17 `EnhancerContext.test.tsx` regression tests pass (previously 16 — the `'Model not loaded'` test now passes).
- 64 new tests across 8 test files pass, covering each extracted module in isolation.
- Next.js production build is clean.
- Adding a new prompt strategy requires creating one file in `services/enhancer/promptStrategies/` and calling `register()`. No existing file is edited.
- Interrupting and resuming a model download continues to work; the resume prompt appears on next load when a download was in progress.
- Enhancement flow (load model → enhance transcript → view result) is behaviourally identical to before the refactor.

---

## Where the Fix Lives

```
services/
└── enhancer/
    ├── types.ts                      ← EnhancerEngine interface (DIP seam)
    ├── enhancerEngine.ts             ← engine factory
    ├── enhancementPipeline.ts        ← chunking pipeline
    ├── downloadStatePersistence.ts   ← localStorage helpers
    ├── enhancerTelemetry.ts          ← telemetry builder
    └── promptStrategies/
        ├── types.ts                  ← PromptStrategy interface
        ├── registry.ts               ← register / selectPromptStrategy
        ├── contextAware.ts           ← strategy 1 (disabled, ready to enable)
        ├── simple.ts                 ← strategy 2 (active fallback)
        └── index.ts                  ← registration barrel

hooks/
└── enhancer/
    ├── useEnhancerHardware.ts        ← hardware caps normalisation
    └── useDownloadResumePrompt.ts    ← download resume side-effects

contexts/
└── EnhancerContext.tsx               ← orchestration shell (~216 lines)

__tests__/unit/enhancer/
    ├── downloadStatePersistence.test.ts
    ├── enhancementPipeline.test.ts
    ├── enhancerEngine.test.ts
    ├── promptStrategies/
    │   ├── registry.contract.test.ts
    │   ├── contextAware.test.ts
    │   └── simple.test.ts
    └── hooks/
        └── useDownloadResumePrompt.test.tsx
```
