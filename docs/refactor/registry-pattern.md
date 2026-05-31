# Registry Pattern — OCP Strategy Dispatch

**Date:** 2026-05-31
**Status:** Accepted
**Applies to:** SOLID refactor Phases 1–6

## Problem

The codebase's largest files centralise dispatch logic as `switch`/`if-else` blocks keyed on discriminator unions (`ActionType`, `ExportFormat`, `FileKind`, `VideoMode`, `TabType`, …). Each new variant requires editing the dispatcher. This violates OCP and makes the file a change-magnet.

## Decision

Replace every discriminator-keyed dispatcher with a **typed strategy registry**. New variants plug in by adding one file and one registration call; the dispatcher never changes.

---

## Registry Shape

```ts
// types.ts  (per feature)
export interface FooStrategy {
  id: FooKind;              // the discriminator value this strategy handles
  // …feature-specific verbs (build, render, serialize, handle, …)
}

// registry.ts
import type { FooStrategy } from './types';

const registry = new Map<FooKind, FooStrategy>();

export function register(strategy: FooStrategy): void {
  registry.set(strategy.id, strategy);
}

export function get(id: FooKind): FooStrategy {
  const s = registry.get(id);
  if (!s) throw new Error(`No FooStrategy registered for "${id}"`);
  return s;
}

export function getAll(): FooStrategy[] {
  return [...registry.values()];
}
```

The registry module is the **only** file that imports from `strategies/`. Orchestrators import only `get`/`getAll`.

---

## Strategy File Convention

One file per discriminator value. Filename matches the value in kebab-case.

```ts
// strategies/foo/barVariant.ts
import { register } from '../registry';
import type { FooStrategy } from '../types';

const strategy: FooStrategy = {
  id: 'bar',
  // …implementation
};

register(strategy);

export default strategy;   // export kept for direct test imports
```

Side-effect registration (`register(strategy)`) runs on module load. The barrel (`index.ts`) imports every strategy file so registration happens before the registry is consumed.

---

## Dispatcher Usage

Callers replace `switch (kind) { case 'bar': ... }` with a single lookup:

```ts
import { get } from '@/components/Foo/registry';

// before
switch (kind) {
  case 'bar': return buildBar(input);
  case 'baz': return buildBaz(input);
}

// after
return get(kind).build(input);
```

If `kind` is not registered the registry throws immediately with a descriptive message — fail-fast instead of silently falling through.

---

## Folder Layout (per refactored file `X.tsx`)

```
X.tsx                       # public re-export barrel — external imports unchanged
X/
├── X.tsx                   # shell: wires hooks → registry → JSX (~100–200 lines)
├── components/             # one file per extracted sub-component
├── hooks/                  # one file per extracted hook
├── strategies/
│   ├── <discriminator>/    # one sub-folder per registry
│   │   ├── variantA.ts
│   │   ├── variantB.ts
│   │   └── …
│   └── …
├── registry.ts             # Map + register/get/getAll
├── services/               # pure logic, no React
├── types.ts                # strategy interfaces + discriminator unions
└── index.ts                # internal barrel — imports all strategy files
```

---

## Contract-Test Template

Every new registry gets a **contract test** in `__tests__/unit/<feature>/strategies/<discriminator>/registry.contract.test.ts`:

```ts
import '../../../<feature>/strategies/<discriminator>/index'; // trigger registrations
import { get, getAll } from '../../../<feature>/registry';

const EXPECTED_IDS = ['variantA', 'variantB'] as const;

describe('<Discriminator> registry contract', () => {
  it('registers exactly the expected ids', () => {
    const ids = getAll().map(s => s.id).sort();
    expect(ids).toEqual([...EXPECTED_IDS].sort());
  });

  it('has no duplicate ids', () => {
    const ids = getAll().map(s => s.id);
    expect(ids.length).toBe(new Set(ids).size);
  });

  it.each(EXPECTED_IDS)('get("%s") returns a valid strategy', id => {
    const s = get(id);
    expect(s).toBeDefined();
    expect(s.id).toBe(id);
    // assert required interface fields are present:
    // expect(typeof s.build).toBe('function');
  });

  it('throws for an unknown id', () => {
    expect(() => get('__nonexistent__' as never)).toThrow();
  });
});
```

Replace the commented assertion with the actual interface fields of the specific strategy type.

---

## Sanity Checks (applied every phase)

- **Registry sanity:** the dispatcher file contains zero `switch (discriminator)` or `if (x === variant)` over the registry's key type.
- **Cohesion:** every export in a strategy file participates in the same task; one-sentence description, no "and".
- **Coupling:** strategy files have ≤3 peer imports from the same folder; no reach-back into the parent barrel.
- **No silent dispatch:** `get()` throws — never returns `undefined` or a no-op fallback.

---

## `renderHook` Availability

`@testing-library/react@16.3.0` exports `renderHook` directly:

```ts
import { renderHook, act } from '@testing-library/react';
```

No separate `@testing-library/react-hooks` package needed. All hook tests in this refactor use this import.
