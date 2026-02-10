# Chat Handoff Context - MediaForge Project

**Date:** February 10, 2025  
**Purpose:** Continue fixes and development from this session. Provide full context for the next chat.

---

## 1. Project Overview

**MediaForge** is a 100% client-side video/audio transcription app. All AI runs in the browser via Web Workers. No backend, no uploads.

- **Tech:** Next.js 14, Transformers.js (Whisper), FFmpeg.wasm
- **Key constraint:** All processing stays client-side (privacy)

---

## 2. Work Completed in This Session

### A. Model Selection in Fast Mode
- **Before:** Fast Mode forced `distil-whisper/distil-small.en`
- **After:** Fast Mode = parallel processing; user can choose any model (tiny, base, small, distil-small)
- **Files:** `public/transcriber-fast.worker.js`, `WorkerPoolManagerFast.ts`, `useTranscriberFast.ts`, `InspectStateView.tsx`, `ModelSelector.tsx`, `app/page.tsx`

### B. Experimental NPU Support (WebNN)
- **Goal:** Allow NPU (Intel Core Ultra, etc.) for transcription via WebNN
- **Status:** Implemented
- **Plan:** `.cursor/plans/experimental_npu_support_44ba76d9.plan.md`

---

## 3. NPU Implementation Summary

All 8 tasks from the plan are implemented:

| Task | File | What Was Done |
|------|------|---------------|
| 1 | `lib/featureFlags.ts` | Added `ENABLE_WEBNN_NPU: true` |
| 2 | `types/fast-mode.ts` | Added `DevicePreference` type, `devicePreference` in FastModeConfig |
| 3 | `utils/systemCapabilities.ts` | Added `detectNPU()`, `npu` in capabilities, `useNPU`/`preferredDevice` in recommendations |
| 4 | `public/transcriber-fast.worker.js` | `detectBestDevice(preference)` with NPU→GPU→CPU fallback, WebNN pipeline options |
| 5 | `services/fast-mode/WorkerPoolManagerFast.ts` | `setDevicePreference()`, passes preference to workers |
| 6 | `hooks/useTranscriberFast.ts` | Config accepts `devicePreference`, passes to worker pool |
| 7 | `components/fast-mode/SystemCapabilitiesCard.tsx` | NPU badge, device selector (Auto/GPU/NPU/CPU) |
| 8 | `__tests__/unit/fast-mode/npuDetection.test.ts` | 9 tests, all passing |

**Data flow:** `SystemCapabilitiesCard` → `onWorkerConfigChange` → `app/page.tsx` → `handleWorkerConfigChange` → `fastTranscriber.updateConfig({ devicePreference })` → `WorkerPoolManagerFast.setDevicePreference()` → worker `init` message with `devicePreference`.

---

## 4. Key File Paths

```
app/page.tsx                              # Main app, handleWorkerConfigChange, handleFastModeTranscription
components/states/InspectStateView.tsx    # Mode + model UI, onWorkerConfigChange
components/states/DoneStateView.tsx       # Statistics button
components/fast-mode/SystemCapabilitiesCard.tsx  # NPU detection, device selector
components/fast-mode/TranscriptionModeSelector.tsx
components/ModelSelector.tsx              # Model selection (now enabled in Fast Mode)
components/StatisticsModal.tsx            # Stats display
hooks/useTranscriberFast.ts              # Fast Mode orchestration
hooks/useMediaProcessor.ts               # Main processing
services/fast-mode/WorkerPoolManagerFast.ts
services/fast-mode/ParallelChunkProcessorFast.ts
public/transcriber-fast.worker.js        # Fast Mode worker (Supports WebNN NPU)
utils/systemCapabilities.ts              # CPU, GPU, NPU detection
lib/featureFlags.ts                      # ENABLE_WEBNN_NPU, ENABLE_FAST_MODE, etc.
types/fast-mode.ts                       # DevicePreference, FastModeConfig
```

---

## 5. Known Issues / Potential Fixes

1. **Plan metadata:** `.cursor/plans/experimental_npu_support_44ba76d9.plan.md` still has `status: pending` for todos. Plan content is done; metadata can be updated.

2. **Unused import:** `SystemCapabilitiesCard.tsx` line 23 imports `Chrome` from lucide-react but may not use it. Could remove if unused.

3. **Pre-existing test failures (separate from NPU work):**
   - `__tests__/unit/enhancement-types.test.ts` – model ID mismatches
   - `__tests__/unit/ResourceWarningCard.test.tsx` – missing heading
   - `__tests__/integration/transcriber-context.test.tsx` – timeouts, null loadModel

4. **NPU browser requirements:** WebNN NPU needs Windows 11 24H2+, Chrome/Edge with `#enable-webnn`, and NPU drivers. On unsupported setups, detection correctly reports NPU unavailable.

---

## 6. Commands

```bash
pnpm dev                    # Dev server
pnpm test                   # All tests
pnpm test -- npuDetection  # NPU tests only
npx tsc --noEmit           # TypeScript check
pnpm perf:benchmark:fast    # Fast Mode benchmarks
```

---

## 7. Feature Flags (localStorage)

- `ENABLE_FAST_MODE` – Fast Mode UI
- `ENABLE_WEBNN_NPU` – NPU option in System Capabilities
- `ENABLE_PARALLEL_WORKERS` – Parallel chunks

---

## 8. How to Continue

- **Fixes:** Use the file paths above and the plan `.cursor/plans/experimental_npu_support_44ba76d9.plan.md` for behavior and acceptance criteria.
- **Tests:** Run `pnpm test -- npuDetection` to confirm NPU tests still pass.
- **Docs:** `AGENTS.md` and `.cursor/rules/` describe architecture and rules.
