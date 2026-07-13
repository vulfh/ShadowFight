# Task Breakdown — Play Mode Selector
## Source: `plan.md` | Feature: `04-shuffle`

> Tasks are ordered by phase dependency. Phases 2 and 4 may be worked in parallel once Phase 1 is done.
> Each task has a clear **file**, **exact change**, and **done condition**.

---

## Phase 0 — Per-FightList Priority (Prerequisite)

> **Data model note:** `FightListTechnique.priority` (type `number`, 1–5) is **already** the
> per-FightList field in the current type definition (`src/types/index.ts`). The priority lives
> inside the `FightListTechnique` record, which itself lives inside `FightList.techniques[]`.
> Each FightList has its own independent copy. The global `Technique.priority` (`'high'`/
> `'medium'`/`'low'`) is only ever read at add-time as the seed value; it is never written to
> by any FightList operation.

---

### ✅ Task 0-A · Verify `mapPriorityToNumber`, seeding, and removal in `FightListManager`
**File:** `src/managers/FightListManager.ts`

Four read-only checks — no code change expected if all pass:

1. **Priority mapping** — open `mapPriorityToNumber` (Line 552); confirm:
   - `'high'` → `5`, `'medium'` → `3`, `'low'` → `1`, anything else → `3`.
2. **Seeding on add** — confirm `addTechniqueToFightList` (Line 350) clamps the passed-in
   `priority` with `Math.max(1, Math.min(5, priority))` before storing it on the new
   `FightListTechnique`. Confirm `FightListUIManager` passes `globalPriorityToNumber(technique.priority)`
   (after Task 0-B is implemented) as that `priority` argument.
3. **Removal deletes the entire record** — confirm `removeTechniqueFromFightList` (Line 401)
   splices the `FightListTechnique` entirely out of `fightList.techniques`. This removes
   `priority`, `selected`, `id`, and `techniqueId` together. No partial deletion.
4. **Global Technique.priority never written** — confirm no method in `FightListManager`
   assigns to `technique.priority` where `technique` is of type `Technique`.

**Done:** All four checks confirmed; no diff produced.


### ✅ Task 0-B · Pre-select priority in `TechniqueAddModal.renderTechniqueList()`
**File:** `src/components/TechniqueAddModal.ts`

**Context:** Currently the priority `<select>` renders options 1–5 with no option pre-selected,
so it defaults to `1`. The fix seeds the selection from `Technique.priority` (the global default).
The user can still override before clicking Add. The chosen value becomes `FightListTechnique.priority`
for this FightList only — it has zero effect on `Technique.priority` or any other FightList.

**Step 1 — Add private helper method** to the class (above `renderTechniqueList`):
```ts
private globalPriorityToNumber(p: string): number {
  if (p === 'low')  return 1
  if (p === 'high') return 5
  return 3  // 'medium' and any unrecognised value
}
```

**Step 2 — Set the pre-selected value** inside `renderTechniqueList()`, immediately after the
`item.innerHTML = ...` block that creates the priority `<select>`, and **before** the
`addButton` click-listener is wired up:
```ts
const prioritySelect = item.querySelector('.priority-select') as HTMLSelectElement
prioritySelect.value = String(this.globalPriorityToNumber(technique.priority))
```

**Why before the listener?** The `addButton` click handler reads `prioritySelect.value`. If the
pre-selection is set after the listener is attached it still works, but setting it before is
more explicit about the intended read order.

**Done:** Opening the Add Techniques modal for a `'high'` technique shows `5` pre-selected;
`'medium'` shows `3`; `'low'` shows `1`; unknown shows `3`. `Technique.priority` is unchanged.


### ✅ Task 0-C · Verify edit-view priority dropdown in `FightListUIManager`
**File:** `src/managers/FightListUIManager.ts`

Three read-only checks:

1. `renderTechniquesList()` — confirm `renderPriorityOptions(technique.priority)` is called where
   `technique` is of type `FightListTechnique`, so the value read is `FightListTechnique.priority`
   (the per-FightList number), not the global `Technique.priority` string.
2. The `change` event on `.priority-select` — confirm it calls `fightListManager.updateFightList(...)`
   passing the updated numeric priority on the `FightListTechnique` record, and that it does NOT
   touch the global `Technique` object.
3. The update path — confirm `updateFightList` only modifies the `FightList` object in storage,
   leaving the global `Technique` data untouched.

**No code change required** if all three checks pass.

**Done:** Code review confirmed; no diff produced.

---

### ✅ Task 0-D · Verify `removeTechniqueFromFightList` deletes the full record
**File:** `src/managers/FightListManager.ts`

Read `removeTechniqueFromFightList` (Line 401). Confirm it:
- Finds the `FightListTechnique` by `id` and calls `splice(techniqueIndex, 1)`.
- This removes the **entire** `FightListTechnique` record — `id`, `techniqueId`, `priority`, and
  `selected` — from `fightList.techniques`.
- Saves the updated FightList to storage immediately after.
- Does NOT touch the global `Technique` object.

**No code change required** if confirmed.

**Done:** Confirmed; no diff produced.

---

### ✅ Task 0-E · Write priority seeding, isolation, and removal unit tests
**File:** `src/tests/FightListManager.test.ts` *(add a new `describe` block at the end)*

Write nine test cases inside `describe('per-FightList priority', () => { ... })`:

1. **`'high'` seeds priority 5**
   - `addTechniqueToFightList(listId, { priority: 'high', ... })` → `FightListTechnique.priority === 5`.

2. **`'medium'` seeds priority 3**
   - Same with `priority: 'medium'` → `=== 3`.

3. **`'low'` seeds priority 1**
   - Same with `priority: 'low'` → `=== 1`.

4. **Unknown string seeds priority 3**
   - `priority: 'ultra'` → `=== 3`.

5. **User override at add-time is stored correctly**
   - Call `addTechniqueToFightList(listId, technique, 4)` (passing explicit `4`).
   - Assert the resulting `FightListTechnique.priority === 4`.
   - Assert `technique.priority` (the global `PriorityLevel`) is still `'medium'` (or whatever it was).

6. **Edit-view update changes only this FightList**
   - Add the same technique to two FightLists (`listA`, `listB`), both seed priority 3.
   - Call `updateFightList(listA.id, { techniques: [...with priority 5 for that technique] })`.
   - Assert `listA`'s entry has `priority === 5`.
   - Assert `listB`'s entry still has `priority === 3`.

7. **Edit-view update does not touch global `Technique.priority`**
   - After the update in test 6, re-fetch the original `Technique` from config.
   - Assert `technique.priority` (the `PriorityLevel` string) is unchanged.

8. **Removing a technique deletes the entire `FightListTechnique` record**
   - Add a technique with priority 5 to a FightList.
   - Call `removeTechniqueFromFightList(listId, fightListTechniqueId)`.
   - Assert the FightList's `techniques` array no longer contains any entry with that `techniqueId`.
   - Assert the array length decreased by exactly 1.

9. **Removal does not affect the global `Technique.priority`**
   - After removal in test 8, re-fetch the global `Technique`.
   - Assert `technique.priority` (the `PriorityLevel` string) is still its original value.

**Done:** `npm run test -- FightListManager` passes all nine new cases with no regressions.

---

### ✅ Task 0-F · Add `healFightListPriorities` to `FightListManager` and call it on session start
**Files:** `src/managers/FightListManager.ts`, `src/managers/SessionManager.ts`

**Context:** FightList data created before per-FightList priority existed (or migrated data) may
have `FightListTechnique.priority` values that are `undefined`, `null`, `0`, `NaN`, or outside
the valid 1–5 range. This task adds a healing pass that runs once per session start, patches any
invalid entries, and persists the fix — only if something actually changed.

---

#### Step 1 — Expose `mapPriorityToNumber` as a package-private (non-private) method
**File:** `src/managers/FightListManager.ts`

Change the visibility of `mapPriorityToNumber` from `private` to `/** @internal */` (or simply
remove the `private` keyword) so it can be tested in isolation and reused by the new method.

```ts
// Before
private mapPriorityToNumber(priority: string): number { ... }

// After
mapPriorityToNumber(priority: string): number { ... }
```

> If the project's linting rules forbid public non-API methods, keep it `private` and call it
> internally from `healFightListPriorities`. The test coverage target is `healFightListPriorities`
> itself, not `mapPriorityToNumber` directly.

---

#### Step 2 — Add `healFightListPriorities()` to `FightListManager`
**File:** `src/managers/FightListManager.ts`

Add the method after `removeTechniqueFromFightList` (or alongside it in the mutation section):

```ts
/**
 * Ensures every FightListTechnique in the given FightList has a valid priority (1–5).
 * Heals any entry whose priority is missing, zero, NaN, or out-of-range by deriving
 * the replacement from the matching global Technique, falling back to 3 (Medium).
 * Persists the FightList to storage only if at least one entry was patched.
 *
 * @param fightList     - The FightList to inspect and potentially repair.
 * @param allTechniques - The full technique catalog, used to resolve global priority strings.
 */
healFightListPriorities(fightList: FightList, allTechniques: Technique[]): void {
  let dirty = false

  for (const entry of fightList.techniques) {
    const isValid =
      typeof entry.priority === 'number' &&
      Number.isFinite(entry.priority) &&
      entry.priority >= 1 &&
      entry.priority <= 5

    if (!isValid) {
      const globalTech = allTechniques.find(t => t.name === entry.techniqueId)
      entry.priority = globalTech
        ? this.mapPriorityToNumber(globalTech.priority)
        : 3  // fallback: technique no longer in catalog
      dirty = true
    }
  }

  if (dirty) {
    this.storageService.saveFightList(fightList)
  }
}
```

**Validity rule:** a priority is valid if and only if it is a finite number **and** `1 ≤ value ≤ 5`.
Values such as `undefined`, `null`, `0`, `NaN`, `6`, and `-1` are all invalid.

---

#### Step 3 — Call `healFightListPriorities` in `SessionManager.startSessionWithFightList()`
**File:** `src/managers/SessionManager.ts`

Add the healing call **after** the FightList is resolved but **before** the strategy is activated
(i.e., before `this.setSelectionStrategy(strategyType)`):

```ts
// Heal any FightListTechnique entries with missing or out-of-range priorities
const allTechniques = this.techniqueManager.getTechniques()  // existing accessor
this.fightListManager.healFightListPriorities(fightList, allTechniques)
```

> `this.fightListManager` and `this.techniqueManager` must be accessible from `SessionManager`.
> If `SessionManager` does not currently hold a reference to either, inject them via the
> constructor (consistent with the existing dependency injection pattern in the codebase).

---

### Done Condition for Task 0-F

- `healFightListPriorities` is callable on `FightListManager`.
- Called from `startSessionWithFightList` before strategy activation.
- `tsc --noEmit` produces zero errors.
- Unit tests (Task 0-F tests — see below) all pass.

---

### ✅ Task 0-F tests · Write healing unit tests
**File:** `src/tests/FightListManager.test.ts` *(append to the `per-FightList priority` describe block or add a sibling `describe('healFightListPriorities', …)` block)*

Eight test cases:

1. **`undefined` priority is healed from global `'high'`**
   - Create a FightListTechnique with `priority: undefined as any`.
   - Call `healFightListPriorities(fightList, [{ name: ..., priority: 'high', ... }])`.
   - Assert entry `priority === 5`; assert `saveFightList` called once.

2. **`null` priority is healed, defaults to 3 when global is `'medium'`**
   - `priority: null as any`, global `'medium'` → assert `priority === 3`.

3. **`0` is treated as invalid and healed**
   - `priority: 0`, global `'low'` → assert `priority === 1`.

4. **`6` (out of range) is healed**
   - `priority: 6`, global `'high'` → assert `priority === 5`.

5. **`NaN` is healed**
   - `priority: NaN`, global `'medium'` → assert `priority === 3`.

6. **Technique not found in catalog defaults to 3**
   - Entry `techniqueId: 'ghost-tech'`, `priority: undefined as any`; pass empty `allTechniques`.
   - Assert `priority === 3`.

7. **All valid entries — no storage write**
   - FightList with two entries both having `priority: 3`.
   - Call `healFightListPriorities`; assert `saveFightList` was NOT called.

8. **Idempotency — calling twice does not write twice**
   - FightList with one invalid entry.
   - Call `healFightListPriorities` twice.
   - Assert `saveFightList` was called exactly once (second call is a no-op, all valid after first).

**Done:** `npm run test -- FightListManager` passes all eight new healing tests with no regressions.

---

### ✅ Task 1-A · Extend `STRATEGY_TYPES` with three new keys
**File:** `src/constants/strategies.ts`

**Exact change** — replace the existing object (Lines 2–6) with:
```ts
export const STRATEGY_TYPES = {
  RANDOM:         'random',
  ROUND_ROBIN:    'roundRobin',       // keep — backward compat
  PRIORITY_BASED: 'priorityBased',   // keep — backward compat
  UNIFIED_RANDOM: 'unifiedRandom',
  ORDERED:        'ordered',
  PRIORITIZED:    'prioritized'
} as const
```

Rules:
- Preserve `ROUND_ROBIN` and `PRIORITY_BASED` exactly — do not rename or remove them.
- Keep the `as const` assertion.
- Add no other changes to this file.

**Done:** `tsc --noEmit` produces zero errors.

---

### ✅ Task 1-B · Add `PLAY_MODE` key to `STORAGE_KEYS`
**File:** `src/constants/storage.ts`

Append the following entry inside the `STORAGE_KEYS` object, after `PLAY_NOTES_ENABLED` and before the closing `} as const`:
```ts
  /**
   * Key for storing the selected Play Mode ('Random' | 'Unified Random' | 'Ordered' | 'Prioritized')
   * @type {string}
   * @constant
   */
  PLAY_MODE: 'kravMagaPlayMode'
```

**Done:** `STORAGE_KEYS.PLAY_MODE` resolves to `'kravMagaPlayMode'` in TypeScript; `tsc --noEmit` clean.


### Task 1-C · Create `src/types/playMode.ts`
**File:** `src/types/playMode.ts` *(new file)*

Full file content:
```ts
/**
 * The four play modes exposed in the Play Mode Selector dropdown.
 * String values intentionally match display labels so no separate label map is needed.
 */
export type PlayMode = 'Random' | 'Unified Random' | 'Ordered' | 'Prioritized'

/** Ordered list used to populate the dropdown and validate stored values. */
export const PLAY_MODES: readonly PlayMode[] = [
  'Random',
  'Unified Random',
  'Ordered',
  'Prioritized'
]

/** Fallback used when localStorage contains no valid value. */
export const DEFAULT_PLAY_MODE: PlayMode = 'Random'
```

**Done:** File created; `tsc --noEmit` clean; `PlayMode`, `PLAY_MODES`, `DEFAULT_PLAY_MODE` are importable from `'../types/playMode'`.

---

### Task 1-D · Add `PLAY_MODE_TO_STRATEGY` lookup map
**File:** `src/types/playMode.ts` *(append to the file created in Task 1-C)*

Append after `DEFAULT_PLAY_MODE`:
```ts
import { STRATEGY_TYPES } from '../constants/strategies'

/**
 * Maps each PlayMode to the corresponding STRATEGY_TYPES value
 * consumed by TechniqueSelectionStrategyFactory.
 */
export const PLAY_MODE_TO_STRATEGY: Record<
  PlayMode,
  typeof STRATEGY_TYPES[keyof typeof STRATEGY_TYPES]
> = {
  'Random':         STRATEGY_TYPES.RANDOM,
  'Unified Random': STRATEGY_TYPES.UNIFIED_RANDOM,
  'Ordered':        STRATEGY_TYPES.ORDERED,
  'Prioritized':    STRATEGY_TYPES.PRIORITIZED
}
```

**Done:** `tsc --noEmit` clean; `PLAY_MODE_TO_STRATEGY['Ordered']` resolves to `'ordered'` at the type level.

---

## Phase 2 — New Selection Strategies

### Task 2-A · Add optional `reset()` to `ITechniqueSelectionStrategy`
**File:** `src/utils/TechniqueSelectionStrategy.ts`

**Exact change** — in the `ITechniqueSelectionStrategy` interface (Line 6), add one line:
```ts
export interface ITechniqueSelectionStrategy {
  selectTechnique(techniques: Technique[]): Technique
  getName(): string
  reset?(): void   // ← add this line
}
```

The `?` makes it optional so existing strategy classes (`RoundRobinTechniqueSelectionStrategy`, `PriorityBasedTechniqueSelectionStrategy`) do not need to change.

**Done:** Interface updated; `tsc --noEmit` clean; no existing tests broken.

---

### Task 2-B · Add no-op `reset()` to `RandomTechniqueSelectionStrategy`
**File:** `src/utils/TechniqueSelectionStrategy.ts`

Inside `RandomTechniqueSelectionStrategy`, add after `getName()`:
```ts
reset(): void {
  // Stateless — no-op for interface compliance
}
```

**Done:** Class still passes existing `Random` tests; `tsc --noEmit` clean.

---

### Task 2-C · Implement `UnifiedRandomTechniqueSelectionStrategy`
**File:** `src/utils/TechniqueSelectionStrategy.ts` *(add new class after `RandomTechniqueSelectionStrategy`)*

```ts
export class UnifiedRandomTechniqueSelectionStrategy implements ITechniqueSelectionStrategy {
  private remaining: Set<string> = new Set()

  selectTechnique(techniques: Technique[]): Technique {
    if (techniques.length === 0) {
      throw new Error(ERROR_MESSAGES.NO_TECHNIQUES_AVAILABLE)
    }

    // Seed remaining with all names if the current round is exhausted or not yet started
    if (this.remaining.size === 0) {
      techniques.forEach(t => this.remaining.add(t.name))
    }

    // Find eligible techniques (those still in remaining)
    const eligible = techniques.filter(t => this.remaining.has(t.name))

    // Pick uniformly at random from eligible
    const picked = eligible[Math.floor(Math.random() * eligible.length)]
    this.remaining.delete(picked.name)

    // If the round is now complete, reset so the next call starts a fresh round
    if (this.remaining.size === 0) {
      techniques.forEach(t => this.remaining.add(t.name))
    }

    return picked
  }

  getName(): string {
    return 'Unified Random Selection'
  }

  reset(): void {
    this.remaining = new Set()
  }
}
```

**Done:** Class added; `tsc --noEmit` clean.


### Task 2-D · Implement `OrderedTechniqueSelectionStrategy`
**File:** `src/utils/TechniqueSelectionStrategy.ts` *(add after `UnifiedRandomTechniqueSelectionStrategy`)*

```ts
export class OrderedTechniqueSelectionStrategy implements ITechniqueSelectionStrategy {
  private index: number = 0

  selectTechnique(techniques: Technique[]): Technique {
    if (techniques.length === 0) {
      throw new Error(ERROR_MESSAGES.NO_TECHNIQUES_AVAILABLE)
    }

    // Circular scan — defensively handles deselected techniques,
    // though caller guarantees selected=true entries only.
    const start = this.index
    for (let i = 0; i < techniques.length; i++) {
      const candidate = techniques[this.index % techniques.length]
      this.index = (this.index + 1) % techniques.length
      if (candidate.selected !== false) {
        return candidate
      }
    }

    // Defensive throw — should never be reached with pre-filtered input
    throw new Error(ERROR_MESSAGES.NO_TECHNIQUES_AVAILABLE)
  }

  getName(): string {
    return 'Ordered Selection'
  }

  reset(): void {
    this.index = 0
  }
}
```

**Important:** `pause` must NOT call `reset()`. Only `SessionManager.stopSession()` calls `reset()`. Do not call `reset()` from `pauseSession()`.

**Done:** Class added; `tsc --noEmit` clean.

---

### Task 2-E · Implement `PrioritizedTechniqueSelectionStrategy`
**File:** `src/utils/TechniqueSelectionStrategy.ts` *(add after `OrderedTechniqueSelectionStrategy`)*

```ts
export class PrioritizedTechniqueSelectionStrategy implements ITechniqueSelectionStrategy {
  /** Maps technique name → number of consecutive rounds it was NOT picked */
  private counters: Map<string, number> = new Map()

  selectTechnique(techniques: Technique[]): Technique {
    if (techniques.length === 0) {
      throw new Error(ERROR_MESSAGES.NO_TECHNIQUES_AVAILABLE)
    }

    // Initialise counter for any technique that doesn't have one yet
    techniques.forEach(t => {
      if (!this.counters.has(t.name)) this.counters.set(t.name, 0)
    })

    // --- Anti-starvation check (threshold = 5 missed rounds) ---
    const starving = techniques.filter(t => (this.counters.get(t.name) ?? 0) >= 5)
    if (starving.length > 0) {
      // Force-select the lowest-weight technique; ties broken by earliest array index
      const forced = starving.sort((a, b) => a.weight - b.weight)[0]
      this.counters.set(forced.name, 0)
      techniques
        .filter(t => t.name !== forced.name)
        .forEach(t => this.counters.set(t.name, (this.counters.get(t.name) ?? 0) + 1))
      return forced
    }

    // --- Normal weighted draw ---
    const totalWeight = techniques.reduce((sum, t) => sum + t.weight, 0)
    let r = Math.random() * totalWeight
    let selected: Technique | undefined
    for (const t of techniques) {
      r -= t.weight
      if (r <= 0) { selected = t; break }
    }
    selected = selected ?? techniques[techniques.length - 1] // floating-point fallback

    // Update counters
    this.counters.set(selected.name, 0)
    techniques
      .filter(t => t.name !== selected!.name)
      .forEach(t => this.counters.set(t.name, (this.counters.get(t.name) ?? 0) + 1))

    return selected
  }

  getName(): string {
    return 'Prioritized Selection'
  }

  reset(): void {
    this.counters.clear()
  }
}
```

**Done:** Class added; `tsc --noEmit` clean.


### Task 2-F · Extend `TechniqueSelectionStrategyFactory`
**File:** `src/utils/TechniqueSelectionStrategy.ts`

In `TechniqueSelectionStrategyFactory.createStrategy()`, add three new `case` branches before the `default`:
```ts
case STRATEGY_TYPES.UNIFIED_RANDOM:
  return new UnifiedRandomTechniqueSelectionStrategy()
case STRATEGY_TYPES.ORDERED:
  return new OrderedTechniqueSelectionStrategy()
case STRATEGY_TYPES.PRIORITIZED:
  return new PrioritizedTechniqueSelectionStrategy()
```

Also update `getAvailableStrategies()` to include the three new entries:
```ts
{ type: STRATEGY_TYPES.UNIFIED_RANDOM, name: 'Unified Random Selection' },
{ type: STRATEGY_TYPES.ORDERED,        name: 'Ordered Selection' },
{ type: STRATEGY_TYPES.PRIORITIZED,    name: 'Prioritized Selection' }
```

**Done:** `TechniqueSelectionStrategyFactory.createStrategy('unifiedRandom')` returns an instance of `UnifiedRandomTechniqueSelectionStrategy`; same for the other two.

---

### Task 2-G · Write unit tests — `TechniqueSelectionStrategy.test.ts`
**File:** `src/tests/TechniqueSelectionStrategy.test.ts` *(new file)*

Create one `describe` block per strategy. All tests use a shared helper:
```ts
function makeTechnique(name: string, weight: number): Technique {
  return { name, weight, selected: true, priority: 'medium', /* other required fields */ } as Technique
}
```

#### `describe('RandomTechniqueSelectionStrategy')`
1. **Weighted distribution** — build two techniques `[{weight:1}, {weight:4}]`, call `selectTechnique` 10 000 times, assert the weight-4 technique is picked between 75 % and 85 % of the time.
2. **Single technique** — single-element array; assert always returns it.
3. **Empty list throws** — assert `() => strategy.selectTechnique([])` throws with message matching `NO_TECHNIQUES_AVAILABLE`.

#### `describe('UnifiedRandomTechniqueSelectionStrategy')`
4. **Full round covers all techniques** — 4-technique array; call `selectTechnique` 4 times; assert returned names form a set equal to all four names.
5. **No repeat within one round** — collect names over N calls (N = technique count); assert no name appears twice.
6. **After full round, all eligible again** — after N calls (one full round), call N more times; assert again all four appear exactly once.
7. **`reset()` clears state** — pick 2 from a 4-set, call `reset()`, pick 4 more; assert the post-reset picks again form the full set.
8. **Single technique — no error** — single-element array; call 3 times; assert each returns the same technique.
9. **Empty list throws.**

#### `describe('OrderedTechniqueSelectionStrategy')`
10. **Returns in array order** — 3 techniques `[A, B, C]`; assert calls return `A, B, C` in that order.
11. **Wraps around** — call 4 times; assert 4th pick equals `A` (first technique).
12. **`reset()` restarts from index 0** — call twice, reset, call once; assert returns `A`.
13. **Single technique — no error** — call 3 times; all return the same technique.
14. **Empty list throws.**

#### `describe('PrioritizedTechniqueSelectionStrategy')`
15. **Weighted distribution** — same as Random test #1 (weight 1 vs 4, 10 000 draws, 75–85 % band).
16. **Counter increments for non-selected techniques** — stub `Math.random` to always pick technique A; after 3 calls assert `counters.get('B') === 3`.
17. **Anti-starvation fires at threshold 5** — stub `Math.random` to always pick A; after 5 calls the 6th call must return B (the lowest-weight starving technique), even with `Math.random` stubbed.
18. **Multiple starving — lowest weight wins** — two starving techniques (weight 1 and weight 3); assert the weight-1 one is force-selected.
19. **Tie in weight — earliest index wins** — two starving techniques with equal weight; assert the one at index 0 is selected.
20. **`reset()` clears counters** — pick 3 times (counter increments), call `reset()`, assert subsequent forced-selection does not trigger at round 1.
21. **Single technique — counter stays 0 after reset** — call, reset, call again; no error.
22. **Empty list throws.**

**Done:** `npm run test -- TechniqueSelectionStrategy` all pass; zero TypeScript errors.

---

## Phase 3 — SessionManager Wiring


### Task 3-A · Call `strategy.reset()` in `stopSession()`
**File:** `src/managers/SessionManager.ts`

**Exact location:** `stopSession()` method (Line 309). At the **end** of the method body, after all existing cleanup, add:
```ts
if (typeof this.selectionStrategy.reset === 'function') {
  this.selectionStrategy.reset()
}
```

`this.selectionStrategy` is the instance returned by `TechniqueSelectionStrategyFactory.createStrategy(...)`. The optional-method guard handles the existing `RoundRobinTechniqueSelectionStrategy` and `PriorityBasedTechniqueSelectionStrategy` classes that do not implement `reset()`.

**Done:** Stopping a session resets strategy state; no TypeScript errors.

---

### Task 3-B · Add `playMode` parameter to `startSessionWithFightList()`
**File:** `src/managers/SessionManager.ts`

**Step 1 — Add imports at the top of the file:**
```ts
import { PlayMode, PLAY_MODE_TO_STRATEGY } from '../types/playMode'
```

**Step 2 — Change the method signature** (Line 89):
```ts
async startSessionWithFightList(
  config: SessionConfig,
  fightList: FightList,
  playMode: PlayMode
): Promise<void>
```

**Step 3 — Insert strategy activation** directly before the existing `await this.startSession(fightListConfig)` call:
```ts
const strategyType = PLAY_MODE_TO_STRATEGY[playMode]
if (!strategyType) {
  throw new Error('A Play Mode must be selected before starting a session.')
}
this.setSelectionStrategy(strategyType)
```

The strategy is locked in at session start. Subsequent dropdown changes in the UI do not affect the running strategy because `setSelectionStrategy` is only called from this method.

**Done:** Method accepts `playMode`; `tsc --noEmit` clean.

---

### Task 3-C · Update all callers of `startSessionWithFightList()`
**Files:** `src/managers/FightListUIManager.ts` and `src/app.ts` *(search for all call sites)*

For each call site:
1. Locate the call `sessionManager.startSessionWithFightList(config, fightList)`.
2. Read the play mode from the DOM selector (see Task 5-C for the DOM id pattern) or fall back to `playModeSelectorService.read()`.
3. Pass it as the third argument:
   ```ts
   const playMode = (
     document.querySelector(`#play-mode-select-${fightList.id}`) as HTMLSelectElement | null
   )?.value as PlayMode ?? playModeSelectorService.read()

   await sessionManager.startSessionWithFightList(config, fightList, playMode)
   ```

**Note:** `playModeSelectorService` must be instantiated (or injected) at the call site. A simple `const playModeSelectorService = new PlayModeSelectorService()` at the top of the play-button handler is acceptable.

**Done:** No TypeScript errors at any call site; passing wrong mode throws the guard error in tests.

---

### Task 3-D · Write `SessionManager.playMode.test.ts`
**File:** `src/tests/SessionManager.playMode.test.ts` *(new file)*

Five test cases:

1. **Random mode activates `RandomTechniqueSelectionStrategy`**
   - Call `startSessionWithFightList(config, fightList, 'Random')`.
   - Assert `sessionManager.getCurrentStrategyName() === 'Random Selection'`.

2. **Ordered mode activates `OrderedTechniqueSelectionStrategy`**
   - Same with `'Ordered'`; assert `getCurrentStrategyName() === 'Ordered Selection'`.

3. **Stopping and restarting with a different mode switches strategy**
   - Start with `'Random'`, stop, start with `'Unified Random'`.
   - Assert strategy name changed.

4. **`stopSession()` calls `reset()` on the strategy**
   - Spy on the active strategy's `reset` method.
   - Call `stopSession()`; assert the spy was called once.

5. **Invalid `playMode` throws**
   - Call `startSessionWithFightList(config, fightList, 'Garbage' as PlayMode)`.
   - Assert the error message is `'A Play Mode must be selected before starting a session.'`.

**Done:** `npm run test -- SessionManager.playMode` all pass.

---

## Phase 4 — Play Mode Persistence Service


### Task 4-A · Create `PlayModeSelectorService`
**File:** `src/services/PlayModeSelectorService.ts` *(new file)*

Full file content:
```ts
import { STORAGE_KEYS } from '../constants/storage'
import { PlayMode, PLAY_MODES, DEFAULT_PLAY_MODE } from '../types/playMode'

/**
 * Persists and retrieves the selected Play Mode from localStorage.
 * All operations are safe against SecurityError and corrupted values.
 */
export class PlayModeSelectorService {
  /**
   * Reads the stored play mode.
   * - Returns the stored value if it is a valid PlayMode.
   * - Writes and returns DEFAULT_PLAY_MODE if the key is missing or invalid.
   * - Returns DEFAULT_PLAY_MODE without writing if localStorage is unavailable.
   */
  read(): PlayMode {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PLAY_MODE)
      if (raw && (PLAY_MODES as readonly string[]).includes(raw)) {
        return raw as PlayMode
      }
      // Missing or invalid value — write the default then return it
      this.write(DEFAULT_PLAY_MODE)
      return DEFAULT_PLAY_MODE
    } catch {
      // SecurityError or QuotaExceededError — return default; do not attempt write
      return DEFAULT_PLAY_MODE
    }
  }

  /**
   * Persists the given play mode.
   * Silently swallows storage errors (best-effort persistence).
   */
  write(mode: PlayMode): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAY_MODE, mode)
    } catch {
      // Best-effort — silent failure acceptable
    }
  }
}
```

**Done:** File created; `tsc --noEmit` clean.

---

### Task 4-B · Write `PlayModeSelectorService.test.ts`
**File:** `src/tests/PlayModeSelectorService.test.ts` *(new file)*

Use `vi.stubGlobal` (or `jest.spyOn(window, 'localStorage', 'get')`) to control `localStorage` in each test. Five test cases:

1. **Returns stored valid value**
   - Stub `localStorage.getItem` to return `'Ordered'`.
   - Assert `service.read() === 'Ordered'`.
   - Assert `localStorage.setItem` was NOT called.

2. **Returns `'Random'` and writes it when nothing stored**
   - Stub `getItem` to return `null`.
   - Assert `service.read() === 'Random'`.
   - Assert `setItem` was called with `(STORAGE_KEYS.PLAY_MODE, 'Random')`.

3. **Returns `'Random'` and overwrites invalid stored value**
   - Stub `getItem` to return `'garbage'`.
   - Assert `service.read() === 'Random'`.
   - Assert `setItem` was called with `(STORAGE_KEYS.PLAY_MODE, 'Random')`.

4. **Returns `'Random'` and does NOT write when `getItem` throws**
   - Stub `getItem` to throw `new DOMException('SecurityError')`.
   - Assert `service.read() === 'Random'`.
   - Assert `setItem` was NOT called.

5. **`write()` persists value under correct key**
   - Spy on `localStorage.setItem`.
   - Call `service.write('Prioritized')`.
   - Assert spy was called with `('kravMagaPlayMode', 'Prioritized')`.

**Done:** `npm run test -- PlayModeSelectorService` all pass.

---

## Phase 5 — Play Mode Selector UI


### Task 5-A · Add `renderPlayModeSelector()` to `FightListUIManager`
**File:** `src/managers/FightListUIManager.ts`

**Step 1 — Add imports** at the top:
```ts
import { PlayModeSelectorService } from '../services/PlayModeSelectorService'
import { PlayMode, PLAY_MODES } from '../types/playMode'
```

**Step 2 — Add the private method** to the class:
```ts
private renderPlayModeSelector(fightListId: string): HTMLElement {
  const service = new PlayModeSelectorService()
  const current = service.read()
  const isLocked = (this.sessionManager?.isActive ?? false) ||
                   (this.sessionManager?.isPaused ?? false)

  const wrapper = document.createElement('div')
  wrapper.className = 'play-mode-selector d-flex align-items-center gap-2'
  wrapper.dataset.fightListId = fightListId

  wrapper.innerHTML = `
    <label class="play-mode-selector__label"
           for="play-mode-select-${fightListId}">
      Play Mode
    </label>
    <select id="play-mode-select-${fightListId}"
            class="form-select form-select-sm play-mode-selector__select"
            aria-label="Play Mode"
            ${isLocked ? 'disabled' : ''}>
      ${PLAY_MODES.map(m =>
        `<option value="${m}"${m === current ? ' selected' : ''}>${m}</option>`
      ).join('')}
    </select>
  `

  const select = wrapper.querySelector('select') as HTMLSelectElement
  // Persist before any visual change (Req 2.1)
  select.addEventListener('change', () => {
    service.write(select.value as PlayMode)
  })

  return wrapper
}
```

**Step 3 — Add helper** `updatePlayModeSelectorState()`:
```ts
private updatePlayModeSelectorState(fightListId: string, enabled: boolean): void {
  const select = document.querySelector(
    `#play-mode-select-${fightListId}`
  ) as HTMLSelectElement | null
  if (!select) return
  if (enabled) {
    select.removeAttribute('disabled')
  } else {
    select.setAttribute('disabled', '')
  }
}
```

**Step 4 — Wire state updates:**
- In the session-start handler: call `this.updatePlayModeSelectorState(fightList.id, false)`.
- In the session-pause handler: call `this.updatePlayModeSelectorState(fightList.id, false)`.
- In the session-stop handler: call `this.updatePlayModeSelectorState(fightList.id, true)`.

**Done:** Method compiles; `tsc --noEmit` clean.

---

### Task 5-B · Mount the selector in `createFightListElement()`
**File:** `src/managers/FightListUIManager.ts`

**Exact location:** Inside `createFightListElement()`, locate the DOM node that contains the play/pause/stop button group (search for the play button's creation or its container).

Insert the selector **directly above** that container:
```ts
const playModeSelector = this.renderPlayModeSelector(fightList.id)
sessionControlsContainer.insertAdjacentElement('beforebegin', playModeSelector)
// where sessionControlsContainer is the play/pause/stop button wrapper
```

The exact variable name for the button container depends on the current code; adapt accordingly.

**Done:** The Play Mode selector is visible above the session controls when a fight list card is rendered in the browser.

---

### Task 5-C · Read play mode and pass to `startSessionWithFightList()`
**File:** `src/managers/FightListUIManager.ts`

In the play-button click handler, replace the existing call to `startSessionWithFightList` with:
```ts
const svc = new PlayModeSelectorService()
const playMode = (
  document.querySelector(`#play-mode-select-${fightList.id}`) as HTMLSelectElement | null
)?.value as PlayMode ?? svc.read()

await this.sessionManager.startSessionWithFightList(config, fightList, playMode)
```

**Done:** Clicking play passes the currently selected mode; TypeScript resolves without errors.


### Task 5-D · Add CSS to `fightList.css`
**File:** `src/styles/fightList.css`

Append the following block at the end of the file:
```css
/* ============================================================
   Play Mode Selector
   BEM: .play-mode-selector / __label / __select
   ============================================================ */

.play-mode-selector {
  gap: 0.5rem;
}

.play-mode-selector__label {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}

.play-mode-selector__select {
  max-width: 160px;
  border-radius: var(--border-radius);
  box-shadow: var(--box-shadow);
  transition: var(--transition);
  color: inherit;
}

.play-mode-selector__select:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 0.2rem rgba(var(--primary-color-rgb, 13, 110, 253), 0.25);
}

@media (prefers-reduced-motion: reduce) {
  .play-mode-selector__select {
    transition: none;
  }
}
```

Rules:
- Do NOT add new classes to existing priority-dropdown elements.
- The `@media (prefers-reduced-motion: reduce)` block must be its own rule, not nested.

**Done:** Styles appended; selector renders with compact width; transition suppressed under `prefers-reduced-motion`.

---

### Task 5-E · Write integration tests — `PlayModeSelector.test.ts`
**File:** `src/tests/PlayModeSelector.test.ts` *(new file)*

Use JSDOM (already available via Vitest/Jest config). Seven test cases:

1. **Selector renders four options**
   - Mount the fight-list card HTML (or call `renderPlayModeSelector` directly).
   - Assert the `<select>` contains exactly 4 `<option>` elements with values `['Random','Unified Random','Ordered','Prioritized']`.

2. **Defaults to `'Random'` when nothing stored**
   - Stub `localStorage.getItem` to return `null`.
   - Render selector; assert `select.value === 'Random'`.

3. **Selector is disabled while session is active**
   - Mock `sessionManager.isActive = true`.
   - Render selector; assert `select.disabled === true`.

4. **Selector is enabled after session stops**
   - Start with `isActive = true`; call `updatePlayModeSelectorState(id, true)`.
   - Assert `select.disabled === false`.

5. **Changing dropdown persists value before DOM update**
   - Spy on `localStorage.setItem`.
   - Simulate a `change` event on the select.
   - Assert `setItem` was called before the event handler returns (check call order by recording call index vs. DOM mutation observer).

6. **App load displays persisted value**
   - Stub `localStorage.getItem` to return `'Ordered'`.
   - Render selector; assert `select.value === 'Ordered'`.

7. **Play button passes selected mode to `startSessionWithFightList`**
   - Spy on `sessionManager.startSessionWithFightList`.
   - Set `select.value = 'Ordered'`.
   - Simulate play-button click.
   - Assert spy was called with third arg `'Ordered'`.

**Done:** `npm run test -- PlayModeSelector` all pass.

---

## Phase 6 — Integration Sweep and Final Tests


### Task 6-A · End-to-end session flow test per mode
**File:** `src/tests/PlayModeSelector.test.ts` *(append four `describe` blocks or a new file)*

For each of the four modes write an `it` block:

**`'Random'`**
- Create a 3-technique array with different weights.
- Start a session with `'Random'`.
- Call `selectAndSetNextTechnique` 30 times; collect results.
- Assert no structural error; all returned techniques belong to the input array.

**`'Unified Random'`**
- Create a 4-technique array.
- Start a session with `'Unified Random'`.
- Collect 4 picks; assert the set of names equals all 4 technique names (one full round, no repeats).
- Collect 4 more picks; assert again the full set appears.

**`'Ordered'`**
- Create a 3-technique array `[A, B, C]`.
- Start a session with `'Ordered'`.
- Call `selectAndSetNextTechnique` 6 times; assert results are `[A, B, C, A, B, C]`.

**`'Prioritized'`**
- Create a 2-technique array `[{weight:1}, {weight:4}]`.
- Start a session with `'Prioritized'`.
- Call 10 000 times; assert the weight-4 technique is picked between 70–90 % of the time.

**Done:** All four `it` blocks pass; no regressions.

---

### Task 6-B · Regression — existing strategies and tests
**Action:** Run the full test suite.

Verify the following files still have 100 % pass rate:
- `src/tests/FightListManager.test.ts`
- `src/tests/SessionManager.instructionAudio.test.ts`
- `src/tests/FightListUIManager.test.ts`
- `src/tests/AudioManager.instructionAudio.test.ts`
- `src/tests/MigrationService.test.ts`
- `src/tests/UIManager.errorHandling.test.ts`
- `src/tests/UIManager.instructionAudio.test.ts`

Also assert:
- `STRATEGY_TYPES.ROUND_ROBIN` still equals `'roundRobin'`.
- `STRATEGY_TYPES.PRIORITY_BASED` still equals `'priorityBased'`.
- `TechniqueSelectionStrategyFactory.createStrategy('roundRobin')` returns a `RoundRobinTechniqueSelectionStrategy` instance.
- `TechniqueSelectionStrategyFactory.createStrategy('priorityBased')` returns a `PriorityBasedTechniqueSelectionStrategy` instance.

**Done:** `npm run test` — zero failures, zero regressions.

---

### Task 6-C · LocalStorage edge-case verification
**Method:** Manual browser test (or automated via `PlayModeSelectorService.test.ts`).

Three scenarios — each must be verified:

1. **Cold start** — Clear `localStorage` entirely (`localStorage.clear()`), reload app.
   - Expected: selector shows `'Random'`; `localStorage.getItem('kravMagaPlayMode')` returns `'Random'`.

2. **Corrupted value** — `localStorage.setItem('kravMagaPlayMode', 'garbage')`, reload.
   - Expected: selector shows `'Random'`; key is overwritten to `'Random'`.

3. **Storage unavailable** — In a private-browsing tab that blocks `localStorage` (or simulated via spy throwing `SecurityError`).
   - Expected: selector shows `'Random'`; no uncaught exception; `setItem` not called.

**Done:** All three scenarios produce the expected outcome; no console errors.

---

### Task 6-D · Accessibility verification
**Method:** Browser DevTools inspection.

Four checks:

1. **Label–input association** — In DevTools Elements panel, confirm:
   - `<label for="play-mode-select-{id}">` and `<select id="play-mode-select-{id}">` share the same `id`/`for` value.
   - WCAG 1.3.1 satisfied.

2. **Disabled state uses HTML attribute** — When a session is active, inspect the `<select>`:
   - `disabled` attribute is present on the element (not `aria-disabled="true"`).
   - Native browser grey-out styling is applied.

3. **`prefers-reduced-motion`** — In DevTools Rendering tab, enable "Emulate CSS media feature prefers-reduced-motion: reduce".
   - Confirm the transition on `.play-mode-selector__select` is `none`.

4. **Keyboard navigation** — Tab to the selector; confirm focus ring appears (`:focus` styles applied); use arrow keys to change value; confirm `change` event fires.

**Done:** All four checks pass; document outcome in a brief comment or PR description.

---

## Summary — File Change Map

| Task | File | Change Type |
|------|------|-------------|
| 0-A | `src/managers/FightListManager.ts` | Verify (no diff) |
| 0-B | `src/components/TechniqueAddModal.ts` | Modify |
| 0-C | `src/managers/FightListUIManager.ts` | Verify (no diff) |
| 0-D | `src/managers/FightListManager.ts` | Verify (no diff) |
| 0-E | `src/tests/FightListManager.test.ts` | Modify |
| 1-A | `src/constants/strategies.ts` | Modify |
| 1-B | `src/constants/storage.ts` | Modify |
| 1-C | `src/types/playMode.ts` | **New** |
| 1-D | `src/types/playMode.ts` | Modify |
| 2-A–2-F | `src/utils/TechniqueSelectionStrategy.ts` | Modify |
| 2-G | `src/tests/TechniqueSelectionStrategy.test.ts` | **New** |
| 3-A–3-C | `src/managers/SessionManager.ts` | Modify |
| 3-D | `src/tests/SessionManager.playMode.test.ts` | **New** |
| 4-A | `src/services/PlayModeSelectorService.ts` | **New** |
| 4-B | `src/tests/PlayModeSelectorService.test.ts` | **New** |
| 5-A–5-C | `src/managers/FightListUIManager.ts` | Modify |
| 5-D | `src/styles/fightList.css` | Modify |
| 5-E | `src/tests/PlayModeSelector.test.ts` | **New** |
| 6-A | `src/tests/PlayModeSelector.test.ts` | Modify |
| 6-B | *(run existing tests)* | Verify |
| 6-C | *(manual / service tests)* | Verify |
| 6-D | *(browser DevTools)* | Verify |

**New files: 5 · Modified files: 8 · Verify-only: 5**

### Key Per-FightList Priority Rules (enforced across all tasks)

- `FightListTechnique.priority` is the **only** priority value used during sessions.
- `Technique.priority` is **only** read at add-time to seed `FightListTechnique.priority`.
- `Technique.priority` is **never written** by any FightList operation.
- Removing a technique from a FightList **deletes the entire `FightListTechnique` record**
  (including its `priority`) from that FightList's `techniques[]` array.
- Changing priority in one FightList has **zero effect** on any other FightList's entry for
  the same technique.
