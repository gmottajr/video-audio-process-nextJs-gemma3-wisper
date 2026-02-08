---
name: Fast Transcription Mode
overview: Implement Fast Transcription Mode with support structure (AGENTS.md, RULES, Design Docs) achieving 35-50%+ improvement via UI preset, with parallel worker architecture for future 80%+ gains.
todos:
  - id: agents-md
    content: Create AGENTS.md with project context, architecture, reference implementations
    status: completed
  - id: rules-performance
    content: Create .cursor/rules/performance.mdc with globs for app/lib
    status: completed
  - id: rules-privacy
    content: Create .cursor/rules/privacy.mdc enforcing client-side only
    status: completed
  - id: rules-commits
    content: Create .cursor/rules/commits.mdc with message format and timing rules
    status: completed
  - id: rules-patterns
    content: Create .cursor/rules/patterns.mdc for validated implementation patterns
    status: completed
  - id: rules-accessibility
    content: Create .cursor/rules/accessibility.mdc for a11y requirements
    status: completed
  - id: design-doc
    content: Create docs/design/transcription-performance.md design document
    status: pending
  - id: design-parallel
    content: Create docs/design/parallel-chunking-architecture.md for Phase 3
    status: pending
  - id: adr-parallel
    content: Create docs/design/adr-002-parallel-worker-implementation.md
    status: pending
  - id: test-fixtures
    content: Create test-fixtures/ with sample audio files for benchmarks
    status: pending
  - id: feature-flags
    content: Create lib/featureFlags.ts for Fast Mode and future features
    status: pending
  - id: perf-scripts
    content: Create scripts/perf-benchmark.ts and perf-compare.ts
    status: pending
  - id: perf-e2e-mcp
    content: Create scripts/perf-benchmark-e2e.ts using MCP browser automation
    status: pending
  - id: mode-selector
    content: Create TranscriptionModeSelector.tsx component with Standard/Fast toggle
    status: pending
  - id: mode-info-popover
    content: Create FastModeInfoPopover.tsx with user documentation
    status: pending
  - id: integrate-ui
    content: Integrate mode selector into InspectStateView and ActionSelector
    status: pending
  - id: validate-perf
    content: Run E2E benchmarks with MCP to validate >= 35% improvement
    status: pending
isProject: false
---

# Fast Transcription Mode Implementation Plan

## Status

**Phase 1 Support Structure: COMPLETED**

Files created:
- `/AGENTS.md` - Project context and reference implementations
- `/.cursor/rules/privacy.mdc` - Privacy enforcement rules
- `/.cursor/rules/performance.mdc` - Performance measurement discipline
- `/.cursor/rules/testing.mdc` - TDD discipline rules
- `/.cursor/rules/commits.mdc` - Commit message standards
- `/.cursor/rules/patterns.mdc` - Implementation patterns rules
- `/.cursor/rules/accessibility.mdc` - A11y requirements

**Next Steps: Phase 2 - Fast Mode UI**

---

## Quick Reference

### Key Files
- `AGENTS.md` - Start here for project context
- `.cursor/rules/*.mdc` - Rules loaded automatically via globs
- `.cursor/plans/fast-transcription-mode.plan.md` - This file

### Commands
```bash
pnpm dev              # Start dev server
pnpm test             # Run all tests
pnpm test:unit        # Unit tests only
pnpm perf:benchmark   # Run performance benchmarks (when created)
```

### Architecture Constraints
1. **Privacy-First**: No data leaves browser
2. **Offline-Capable**: Works after model download
3. **Non-Blocking**: All heavy work in Web Workers
4. **Stability**: 380+ tests must pass

---

## Implementation Phases

### Phase 1: Support Structure ✅ COMPLETED
- AGENTS.md
- 6 RULES files
- Plan file in workspace

### Phase 2: Fast Mode UI (Target: 35-50% improvement)
- [ ] Feature flags system (`lib/featureFlags.ts`)
- [ ] Design documents
- [ ] Performance benchmark scripts
- [ ] TranscriptionModeSelector component
- [ ] FastModeInfoPopover component
- [ ] UI integration

### Phase 3: Parallel Processing (Target: 80%+ improvement)
- [ ] WorkerPoolManagerFast.ts
- [ ] ParallelChunkProcessorFast.ts
- [ ] transcriber-fast.worker.ts
- [ ] TimestampMergerFast.ts

### Phase 4: Optional Enhancements
- [ ] WebGPU acceleration
- [ ] VAD pre-filtering

---

## Reference: Full Plan

See the complete plan details in the sections below or reference the original planning conversation.

The full specifications for all components, design documents, and implementation details are documented in the AGENTS.md file and this plan.
