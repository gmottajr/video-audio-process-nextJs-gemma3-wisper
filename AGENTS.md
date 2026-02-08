# MediaForge - Browser-Based Video Transcription SPA

## Overview

MediaForge is a 100% client-side video/audio transcription application.
All AI processing runs in the browser via Web Workers - no server calls ever.

**Core Principle:** No backend, no file upload, complete privacy.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Audio Processing:** FFmpeg.wasm 0.12.x
- **AI Engine:** Transformers.js 2.17.x (Whisper models)
- **Workers:** Web Workers for non-blocking AI inference
- **State:** React Context API
- **Styling:** Tailwind CSS

## Project Structure

```
app/           → Next.js pages and layouts
components/    → React components (52 files)
  states/      → State-based views (Idle, Inspect, Done, Error)
  transcription/ → Transcription-specific UI
hooks/         → Custom React hooks (9 files)
  useTranscriber.ts    → Whisper integration
  useFFmpeg.ts         → Audio extraction
  useMediaProcessor.ts → Processing orchestration
  useAppStateMachine.ts → App state flow
contexts/      → React Context providers
  TranscriberContext.tsx → Worker management
  EnhancerContext.tsx    → AI enhancement
utils/         → Utility functions (18 files)
services/      → Service layer (2 files)
public/
  transcription.worker.js → Whisper Web Worker
  enhancer.worker.js      → LLM enhancement worker
scripts/       → Setup and validation scripts
__tests__/     → Test suite (48 files, 380+ test cases)
```

## Commands

```bash
pnpm dev              # Start development server
pnpm build            # Production build
pnpm test             # Run all tests
pnpm test:unit        # Unit tests only
pnpm test:integration # Integration tests
pnpm perf:benchmark   # Run performance benchmarks
pnpm perf:compare     # Compare benchmark results
```

## Architecture Constraints (IMMUTABLE)

1. **Privacy-First**: No media/transcript data leaves the browser. Ever.
2. **Offline-Capable**: Works after initial model download.
3. **Non-Blocking**: All heavy processing in Web Workers.
4. **Stability**: 380+ tests must pass before any merge.

## Available Models

| Model | ID | Size | Speed | Use Case |
|-------|-----|------|-------|----------|
| Whisper Tiny | `Xenova/whisper-tiny` | 39MB | Very Fast | Quick drafts |
| Whisper Base | `Xenova/whisper-base` | 74MB | Fast | Default, balanced |
| Whisper Small | `Xenova/whisper-small` | 244MB | Moderate | Best accuracy |
| Distil-Whisper | `distil-whisper/distil-small.en` | 166MB | Fast | English-only, optimized |

## Current Performance Profile

- **Baseline:** ~1.0x real-time factor (36min video = 36min processing)
- **Bottleneck:** Whisper inference (~80% of time)
- **Enhancement overhead:** +25-35% when enabled
- **Target:** >= 35% improvement via Fast Mode

## Key Files for Performance Work

- `public/transcription.worker.js` - Model loading & inference
- `hooks/useTranscriber.ts` - Transcription orchestration
- `components/ModelSelector.tsx` - Model selection UI
- `components/ActionSelector.tsx` - Enhancement options

## Reference Implementations & Knowledge Bases

### 1. Transformers.js Whisper Examples
- **Repo:** https://github.com/xenova/transformers.js
- **Docs:** https://huggingface.co/docs/transformers.js
- **Key Examples:** `examples/whisper-web/`, `examples/whisper-worker/`
- **Extract:** Worker wiring, model loading, basic chunking

### 2. Workerpool (Worker Management)
- **npm:** https://www.npmjs.com/package/workerpool
- **GitHub:** https://github.com/josdejong/workerpool
- **Purpose:** Manage parallel transcription workers
- **Install:** `npm install workerpool`

### 3. OpenAI Whisper (Chunking Algorithm)
- **Repo:** https://github.com/openai/whisper
- **File:** `whisper/transcribe.py`
- **Ground Truth:** 30s chunks, 5s overlap, timestamp merging

### 4. Additional References
- **whisperX:** https://github.com/m-bain/whisperX (word-level timestamps)
- **faster-whisper:** https://github.com/guillaumekln/faster-whisper (batch processing)
- **Comlink:** https://github.com/GoogleChromeLabs/comlink (worker RPC)

## Fast Transcription Mode (In Development)

### Phase 1: Support Structure ✓
- AGENTS.md, RULES files, design docs

### Phase 2: Fast Mode UI (Target: 35-50% improvement)
- TranscriptionModeSelector component
- Auto-selects distil-whisper + disables enhancements
- Feature flags for gradual rollout

### Phase 3: Parallel Processing (Target: 80%+ improvement)
- Worker pool with workerpool library
- 2-worker parallel chunk processing
- Timestamp merging across workers

## Design Documents

- `.cursor/plans/` - Implementation plans
- `docs/design/transcription-performance.md` - Main design doc
- `docs/design/parallel-chunking-architecture.md` - Phase 3 architecture
- `docs/design/adr-002-parallel-worker-implementation.md` - ADR for workerpool
