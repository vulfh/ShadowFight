# Implementation Plan — Play Mode Selector

## Overview

This plan translates the Play Mode Selector requirements into a sequenced set of implementation tasks.
Work is grouped into six phases. Each phase is a self-contained unit that can be reviewed and tested
independently before moving to the next. Dependencies between phases are called out explicitly.

---

## Codebase Anchor Points

The following existing files are directly touched by this feature:

| File | Role |
|---|---|
| `src/constants/strategies.ts` | Extend `STRATEGY_TYPES` |
| `src/constants/storage.ts` | Add `PLAY_MODE` key to `STORAGE_KEYS` |
| `src/utils/TechniqueSelectionStrategy.ts` | Add three new strategy classes; extend factory |
| `src/managers/SessionManager.ts` | Wire strategy activation on session start |
| `src/managers/FightListManager.ts` | Seed `FightListTechnique.priority` from global default |
| `src/components/TechniqueAddModal.ts` | Pre-select priority dropdown from technique's default |
| `src/managers/FightListUIManager.ts` | Play Mode Selector UI; priority dropdown in edit view |
| `src/styles/fightList.css` | BEM classes for the selector; `prefers-reduced-motion` block |

New files created:

| File | Purpose |
|---|---|
| `src/tests/TechniqueSelectionStrategy.test.ts` | Unit tests for all four strategies |
| `src/tests/PlayModeSelector.test.ts` | Integration tests for UI + persistence + session wiring |

---

## Phase 0 — Per-FightList Priority (Prerequisite)

**Requirement:** 0  
**Risk:** Low — isolated data-layer change with no new UI elements.

### Data Model Clarification

`FightListTechnique.priority` (a `number` 1–5) is **already** the per-FightList field in the current
type definition. No schema change is needed. The work in this phase is:

1. Ensure the priority is seeded correctly from `Technique.priority` at add-time.
2. Ensure the priority is shown pre-selected in the Add Technique modal.
3. Ensure the edit-view dropdown reads from and writes to `FightListTechnique.priority` only.
4. Ensure `removeTechniqueFromFightList` already deletes the entire `FightListTechnique` record
   (including its `priority`) when a technique is removed — confirm this is already correct.
5. Ensure the global `Technique.priority` field is never touched by any FightList operation.

### 0-A: Verify `mapPriorityToNumber` and removal behaviour in `FightListManager`

- Confirm `mapPriorityToNumber` maps `'low'→1`, `'medium'→3`, `'high'→5`, anything else→3.
- Confirm it is called in `convertTechniquesToFightListTechniques` and by callers of
  `addTechniqueToFightList`.
- **Confirm removal is already correct:** `removeTechniqueFromFightList` splices the
  `FightListTechnique` record entirely out of `fightList.techniques`, which removes the
  `priority` field along with it. No code change needed if this is already the case.
- Confirm `Technique.priority` is never written inside `FightListManager`.
- **No code change required** if all checks pass.

### 0-B: Pre-select priority in TechniqueAddModal (Req 0.4)

- `TechniqueAddModal.renderTechniqueList()` currently renders all five priority options with no
  pre-selection.
- Change: after building the `<select>`, set `prioritySelect.value` to
  `String(globalPriorityToNumber(technique.priority))` before appending the item.
- Add the mapping as a private method on the class:
  ```ts
  private globalPriorityToNumber(p: string): number {
    if (p === 'low')  return 1
    if (p === 'high') return 5
    return 3  // 'medium' and unknown
  }
  ```
- The `Technique` type already exposes `.priority: PriorityLevel`, so this is straightforward.
- The user's chosen value at add-time becomes the initial `FightListTechnique.priority` for
  that entry in this FightList only (Req 0.5). It has no effect on the global `Technique.priority`.

### 0-C: Priority dropdown reflects Per_FightList_Priority in edit view (Req 0.6, 0.7)

- `FightListUIManager.renderTechniquesList()` renders the `.priority-select` and calls
  `renderPriorityOptions(technique.priority)` which already marks the correct option as
  `selected`. **No code change required** — the current implementation already reads from
  `FightListTechnique.priority`.
- The `change` event handler on `.priority-select` already calls
  `fightListManager.updateFightList(...)` with the updated priority. **No change required.**
- Confirm the handler does NOT write back to the global `Technique` object.

### 0-D: Confirm removal deletes priority (Req 0.8)

- Read `removeTechniqueFromFightList` in `FightListManager`.
- It currently splices the `FightListTechnique` out of the array entirely, which removes the
  `priority` field. **No code change required** if this is confirmed.
- The test in Task 0-D covers this behaviour explicitly.

### 0-E: Tests for priority seeding and removal

Write unit tests in `FightListManager.test.ts` (new `describe` block) covering:

- Adding `priority: 'high'` → `FightListTechnique.priority === 5`.
- Adding `priority: 'medium'` → `FightListTechnique.priority === 3`.
- Adding `priority: 'low'` → `FightListTechnique.priority === 1`.
- Adding unknown priority string → `FightListTechnique.priority === 3`.
- Overriding priority in the modal (passing `priority: 4` to `addTechniqueToFightList`) → stored as 4, global `Technique.priority` unchanged.
- Updating priority in the edit view (`updateFightList`) → only the `FightListTechnique.priority`
  in this FightList changes; the global `Technique.priority` field is unchanged.
- Changing the same technique's priority in FightList A does NOT affect FightList B's entry for
  the same technique.
- Removing a technique from a FightList deletes the entire `FightListTechnique` record
  (including `priority`) from that FightList's `techniques` array.
- After removal, the global `Technique.priority` is still intact.

### 0-F: Priority Healing on Session Start (Req 10)

Before a session begins, the system must guarantee every `FightListTechnique` in the active
FightList has a valid numeric priority in 1–5. This handles FightList data created before the
per-FightList priority field existed (e.g., migrated data) or any entry where `priority` is
`undefined`, `null`, `0`, `NaN`, or out of range.

**Implementation location:** Add a `healFightListPriorities` method to `FightListManager`.
Call it from `SessionManager.startSessionWithFightList()` before activating the strategy, passing
the active FightList and the full technique catalog (needed to look up global priority strings).

**Algorithm:**
```
healFightListPriorities(fightList, allTechniques):
  dirty = false
  for each entry in fightList.techniques:
    if entry.priority is not a valid integer in [1, 5]:
      globalTechnique = allTechniques.find(t => t.name === entry.techniqueId)
      entry.priority = globalTechnique
        ? mapPriorityToNumber(globalTechnique.priority)  // low→1, medium→3, high→5
        : 3                                               // fallback when technique not found
      dirty = true
  if dirty:
    storageService.saveFightList(fightList)   // persist once, only if anything changed
```

**Key properties:**
- Only entries with invalid priorities are patched (Req 10.6).
- Global `Technique.priority` is never written (Req 10.7).
- No storage write occurs if all entries are already valid (Req 10.8).
- The method is idempotent: re-running on an already-healed FightList is a no-op (Req 10.9).

**Phase 0 exit condition:** All Phase 0 tests pass; no regressions in `FightListManager.test.ts`.

---

## Phase 1 — Constants and Types

**Requirements:** 9.2, 2 (storage key), 1 (play mode enum)  
**Depends on:** Nothing.

### 1-A: Extend `STRATEGY_TYPES`

In `src/constants/strategies.ts`:
```ts
export const STRATEGY_TYPES = {
  RANDOM:        'random',
  ROUND_ROBIN:   'roundRobin',      // keep — backward compat
  PRIORITY_BASED:'priorityBased',   // keep — backward compat
  UNIFIED_RANDOM:'unifiedRandom',
  ORDERED:       'ordered',
  PRIORITIZED:   'prioritized'
} as const
```

### 1-B: Add `PLAY_MODE` to `STORAGE_KEYS`

In `src/constants/storage.ts`:
```ts
PLAY_MODE: 'kravMagaPlayMode'
```
Add JSDoc comment consistent with the surrounding entries.

### 1-C: Add `PlayMode` type

Create `src/types/playMode.ts` (or add inline to `src/types/index.ts`):
```ts
export type PlayMode = 'Random' | 'Unified Random' | 'Ordered' | 'Prioritized'
export const PLAY_MODES: readonly PlayMode[] = ['Random','Unified Random','Ordered','Prioritized']
export const DEFAULT_PLAY_MODE: PlayMode = 'Random'
```
The string values intentionally match the display labels (Req 1.3) so no separate label map is needed.

### 1-D: Map `PlayMode` → `STRATEGY_TYPES` value

Add a lookup map (can live in `src/types/playMode.ts` or in the future `PlayModeSelectorService`):
```ts
import { STRATEGY_TYPES } from '../constants/strategies'

export const PLAY_MODE_TO_STRATEGY: Record<PlayMode, typeof STRATEGY_TYPES[keyof typeof STRATEGY_TYPES]> = {
  'Random':        STRATEGY_TYPES.RANDOM,
  'Unified Random':STRATEGY_TYPES.UNIFIED_RANDOM,
  'Ordered':       STRATEGY_TYPES.ORDERED,
  'Prioritized':   STRATEGY_TYPES.PRIORITIZED
}
```

**Phase 1 exit condition:** TypeScript compiles with no errors.

---

## Phase 2 — New Selection Strategies

**Requirements:** 4, 5, 6, 7, 9.1, 9.4  
**Depends on:** Phase 1.

All new strategy classes are added to `src/utils/TechniqueSelectionStrategy.ts`.
The `ITechniqueSelectionStrategy` interface gets an optional `reset()` method so `SessionManager`
can call it on stop without checking the type:

```ts
export interface ITechniqueSelectionStrategy {
  selectTechnique(techniques: FightListTechnique[]): FightListTechnique
  getName(): string
  reset?(): void
}
```

> **Note on the input type:** The strategies currently receive `Technique[]`. The requirements
> mandate using `FightListTechnique.priority`. The call site is
> `SessionManager.selectAndSetNextTechnique()` which filters `config.techniques` (type
> `Technique[]`). The bridge — already present in `startSessionWithFightList` — maps
> `flTechnique.priority` onto `technique.weight`. The new strategies will read `.weight` for
> priority, keeping the `Technique[]` input type intact and avoiding a breaking change to
> `SessionManager`. See Phase 3 for the full wiring.

### 2-A: `RandomTechniqueSelectionStrategy` (update — Req 4)

The existing implementation already uses `technique.weight` for weighted random draw and already
has the correct fallback. **No logic change needed.** The `reset()` method is not required but add
it as a no-op for interface compliance.

### 2-B: `UnifiedRandomTechniqueSelectionStrategy` (new — Req 5)

State: `private remaining: Set<string>` (technique names not yet picked this round).

```
selectTechnique(techniques):
  eligible = techniques where name is in remaining (and selected=true is guaranteed by caller)
  if eligible is empty → reset remaining to all technique names → eligible = all techniques
  pick uniformly at random from eligible
  remove picked from remaining
  if remaining is now empty → reset remaining to all technique names  // begin new Round
  return picked

reset():
  remaining = new Set()
```

Edge cases:
- Single technique: picked, `remaining` empties, resets — next call picks it again (Req 5.6).
- Empty techniques array: throw `ERROR_MESSAGES.NO_TECHNIQUES_AVAILABLE` (Req 5.7).

### 2-C: `OrderedTechniqueSelectionStrategy` (new — Req 6)

State: `private index: number = 0`.

```
selectTechnique(techniques):
  if techniques.length === 0 → throw NO_TECHNIQUES_AVAILABLE
  start = index
  loop up to techniques.length times:
    candidate = techniques[index % techniques.length]
    index = (index + 1) % techniques.length
    if candidate.selected → return candidate   // selected is always true here (caller filters)
  throw NO_TECHNIQUES_AVAILABLE  // only if all are unselected — defensive

reset():
  index = 0
```

Notes:
- Caller passes only `selected=true` techniques, so the loop always terminates on the first
  candidate. The wrap/scan logic is defensive but harmless.
- Pause preserves `index` (no reset on pause, only on `reset()`).
- Req 6.1: `reset()` is called by `SessionManager.stopSession()`.

### 2-D: `PrioritizedTechniqueSelectionStrategy` (new — Req 7)

State: `private counters: Map<string, number>` (techniqueId → missed-pick count).

```
selectTechnique(techniques):
  if techniques.length === 0 → throw NO_TECHNIQUES_AVAILABLE

  // Ensure counters exist for all current techniques
  for each t in techniques:
    if counters has no entry for t.name → counters.set(t.name, 0)

  // Anti-starvation check (Req 7.2, 7.3, 7.4)
  starving = techniques where counters.get(name) >= 5
  if starving.length > 0:
    // Pick the one with lowest priority (weight); ties broken by earliest index (Req 7.4)
    forced = starving sorted by (weight ASC, index ASC)[0]
    counters.set(forced.name, 0)
    for each other t in techniques where t !== forced:
      counters.set(t.name, counters.get(t.name) + 1)
    return forced

  // Normal weighted draw (Req 7.1)
  totalWeight = sum of t.weight for t in techniques
  r = Math.random() * totalWeight
  for each t in techniques:
    r -= t.weight
    if r <= 0:
      selected = t; break
  selected = selected ?? techniques[techniques.length - 1]  // floating-point fallback

  // Update counters
  counters.set(selected.name, 0)
  for each other t in techniques:
    counters.set(t.name, counters.get(t.name) + 1)
  return selected

reset():
  counters.clear()
```

### 2-E: Extend `TechniqueSelectionStrategyFactory` (Req 9.1, 9.4)

```ts
case STRATEGY_TYPES.UNIFIED_RANDOM: return new UnifiedRandomTechniqueSelectionStrategy()
case STRATEGY_TYPES.ORDERED:        return new OrderedTechniqueSelectionStrategy()
case STRATEGY_TYPES.PRIORITIZED:    return new PrioritizedTechniqueSelectionStrategy()
default:                            return new RandomTechniqueSelectionStrategy()
```

### 2-F: Tests — `TechniqueSelectionStrategy.test.ts`

One `describe` block per strategy. Key cases:

**RandomTechniqueSelectionStrategy**
- Weighted distribution: run 10 000 draws on two techniques (weight 1 vs 4); verify ~80 % hit rate
  for weight-4 within a tolerance band.
- Single technique: always returns it.
- Empty list: throws `NO_TECHNIQUES_AVAILABLE`.
- Consecutive identical picks are possible (no assertion, just structural).

**UnifiedRandomTechniqueSelectionStrategy**
- With N techniques, each appears exactly once before any repeat (run one full round, collect names,
  assert set equality).
- After a full round, all techniques are eligible again.
- `reset()` clears state; next pick starts a fresh round.
- Single technique: returns it every time; no error.
- Empty list: throws `NO_TECHNIQUES_AVAILABLE`.

**OrderedTechniqueSelectionStrategy**
- Returns techniques in array order.
- Wraps around after the last technique.
- `reset()` resets index to 0.
- Single technique: returns it every time.
- Empty list: throws `NO_TECHNIQUES_AVAILABLE`.

**PrioritizedTechniqueSelectionStrategy**
- Weighted distribution: similar to Random test.
- Counter increments correctly for non-selected techniques.
- Anti-starvation: after 5 consecutive non-picks, technique is force-selected.
- Multiple starving: lowest-priority technique wins; ties use earliest index.
- `reset()` clears all counters.
- Single technique: returns it, counter stays at 0 after reset.
- Empty list: throws `NO_TECHNIQUES_AVAILABLE`.

**Phase 2 exit condition:** All strategy unit tests pass; TypeScript compiles cleanly.

---

## Phase 3 — SessionManager Wiring

**Requirements:** 3.1, 3.2, 3.3, 3.4  
**Depends on:** Phase 2.

### 3-A: `stopSession()` calls `strategy.reset()`

In `SessionManager.stopSession()`, after the existing cleanup:
```ts
if (typeof this.selectionStrategy.reset === 'function') {
  this.selectionStrategy.reset()
}
```

### 3-B: `startSessionWithFightList()` accepts a `playMode` parameter

Change the signature:
```ts
async startSessionWithFightList(
  config: SessionConfig,
  fightList: FightList,
  playMode: PlayMode
): Promise<void>
```

Inside, before calling `this.startSession(fightListConfig)`:
```ts
const strategyType = PLAY_MODE_TO_STRATEGY[playMode]
if (!strategyType) throw new Error('A Play Mode must be selected before starting a session.')
this.setSelectionStrategy(strategyType)
```

The strategy is locked in at session start. The UI's subsequent dropdown changes do not affect the
running strategy (Req 3.2) because `setSelectionStrategy` is only called from here.

### 3-C: `setSelectionStrategy()` type-signature update (Req 9.3)

The existing signature already accepts `typeof STRATEGY_TYPES[keyof typeof STRATEGY_TYPES]`.
After Phase 1 extends `STRATEGY_TYPES`, this automatically accepts the new values. No change needed.

### 3-D: Tests — `SessionManager.playMode.test.ts`

- Starting a session with `'Random'` activates `RandomTechniqueSelectionStrategy`.
- Starting a session with `'Ordered'` activates `OrderedTechniqueSelectionStrategy`.
- Stopping and restarting with a different mode activates the new strategy (Req 3.4).
- Stopping calls `reset()` on the strategy.
- Passing an invalid play mode throws the expected error (Req 3.3).

**Phase 3 exit condition:** All Phase 3 tests pass; `startSessionWithFightList` callers in
`FightListUIManager`/`app.ts` are updated to pass the play mode.

---

## Phase 4 — Play Mode Persistence Service

**Requirements:** 2  
**Depends on:** Phase 1.

### 4-A: Create `PlayModeSelectorService`

New file `src/services/PlayModeSelectorService.ts`:

```ts
import { STORAGE_KEYS } from '../constants/storage'
import { PlayMode, PLAY_MODES, DEFAULT_PLAY_MODE } from '../types/playMode'

export class PlayModeSelectorService {
  read(): PlayMode {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PLAY_MODE)
      if (raw && (PLAY_MODES as readonly string[]).includes(raw)) {
        return raw as PlayMode
      }
      // Missing or invalid — write the default and return it
      this.write(DEFAULT_PLAY_MODE)
      return DEFAULT_PLAY_MODE
    } catch {
      // SecurityError or other — return default without writing (Req 2.5)
      return DEFAULT_PLAY_MODE
    }
  }

  write(mode: PlayMode): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PLAY_MODE, mode)
    } catch {
      // Best-effort; silent failure acceptable
    }
  }
}
```

This satisfies Req 2.1 – 2.5 in full.

### 4-B: Tests — `PlayModeSelectorService.test.ts`

- Returns stored valid value on read.
- Returns `'Random'` and writes it when nothing is stored.
- Returns `'Random'` and overwrites when stored value is invalid.
- Returns `'Random'` (no write attempt) when `localStorage.getItem` throws.
- `write()` persists the value under the correct key.

---

## Phase 5 — Play Mode Selector UI

**Requirements:** 1, 8  
**Depends on:** Phase 1, Phase 4.

The selector is rendered inside the fight-list session view, above the play/pause/stop controls.
Because the current session controls live in `FightListUIManager`, the selector is added there.

### 5-A: Add `renderPlayModeSelector()` to `FightListUIManager`

```ts
private renderPlayModeSelector(fightListId: string): HTMLElement {
  const service  = new PlayModeSelectorService()
  const current  = service.read()
  const isActive = this.sessionManager?.isActive ?? false

  const wrapper = document.createElement('div')
  wrapper.className = 'play-mode-selector d-flex align-items-center gap-2'
  wrapper.dataset.fightListId = fightListId

  wrapper.innerHTML = `
    <label class="play-mode-selector__label" for="play-mode-select-${fightListId}">
      Play Mode
    </label>
    <select id="play-mode-select-${fightListId}"
            class="form-select form-select-sm play-mode-selector__select"
            aria-label="Play Mode"
            ${isActive ? 'disabled' : ''}>
      ${PLAY_MODES.map(m =>
        `<option value="${m}" ${m === current ? 'selected' : ''}>${m}</option>`
      ).join('')}
    </select>
  `

  const select = wrapper.querySelector('select') as HTMLSelectElement
  select.addEventListener('change', () => {
    service.write(select.value as PlayMode)   // persist before visual update (Req 2.1)
  })

  return wrapper
}
```

- Disabled state driven by `sessionManager.isActive || sessionManager.isPaused` (Req 1.5).
- On session stop, call a helper `updatePlayModeSelectorState(fightListId, enabled: true)` that
  removes the `disabled` attribute.
- On session start/pause, call the same helper with `enabled: false`.

### 5-B: Mount selector in the session control area

In `createFightListElement()`, insert `renderPlayModeSelector(fightList.id)` directly above the
play/pause/stop button group. The exact DOM insertion point depends on the existing button
container structure; a selector like `[data-session-controls]` or `#session-controls-${id}` is
used.

### 5-C: Pass play mode to `startSessionWithFightList`

When the play button is clicked, read the current play mode from the selector (or fall back to
`PlayModeSelectorService.read()`):

```ts
const playMode = (document.querySelector(
  `#play-mode-select-${fightList.id}`
) as HTMLSelectElement | null)?.value as PlayMode ?? playModeSelectorService.read()

await this.sessionManager.startSessionWithFightList(config, fightList, playMode)
```

### 5-D: CSS — add to `fightList.css`

```css
/* Play Mode Selector */
.play-mode-selector {
  gap: 0.5rem;
}

.play-mode-selector__label {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}

.play-mode-selector__select {
  /* width capped to keep the control compact */
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

No new CSS classes on existing priority dropdowns (Req 8.5, 8.6).

### 5-E: Tests — `PlayModeSelector.test.ts`

- Selector renders with four options (Req 1.3).
- Selector defaults to `'Random'` when no stored value (Req 1.4).
- Selector is disabled while session is active (Req 1.5).
- Selector is enabled when session is stopped (Req 1.6).
- Changing the dropdown persists the value before the DOM update (Req 2.1 — check
  `localStorage.setItem` call order).
- On app load, selector reads and displays persisted value (Req 2.2).
- Starting a session with `'Ordered'` passes `'Ordered'` to `startSessionWithFightList` (Req 3.1).

**Phase 5 exit condition:** Manual smoke test confirms the selector renders, persists, locks during
session, and unlocks on stop. All Phase 5 tests pass.

---

## Phase 6 — Integration Sweep and Final Tests

**Requirements:** All.

### 6-A: End-to-end session flow test per mode

For each of the four play modes, write a test (or manual verification checklist) that:
1. Selects the mode in the dropdown.
2. Starts a session.
3. Requests 10+ technique picks.
4. Verifies the picks conform to the mode's contract (e.g., Ordered returns techniques in array
   order; Unified Random covers all techniques before repeating).

### 6-B: Regression — existing strategies not broken

Run the full test suite and confirm:
- `ROUND_ROBIN` and `PRIORITY_BASED` entries remain in `STRATEGY_TYPES`.
- Existing `RoundRobinTechniqueSelectionStrategy` and `PriorityBasedTechniqueSelectionStrategy`
  still resolve correctly from the factory.
- All pre-existing tests in `FightListManager.test.ts`, `SessionManager.instructionAudio.test.ts`,
  and `FightListUIManager.test.ts` still pass.

### 6-C: LocalStorage edge-case verification

Manually (or via test):
- Clear `localStorage`, open app → selector shows `'Random'`, value written to storage.
- Set storage to `'garbage'`, reload → selector shows `'Random'`, storage overwritten.
- Block `localStorage` access (e.g., private browsing that throws) → selector shows `'Random'`,
  no crash.

### 6-D: Accessibility check

- Selector has a visible label ("Play Mode") and a matching `for`/`id` pair (WCAG 1.3.1).
- `disabled` attribute is set via HTML attribute (not `aria-disabled`) so native browser styling
  applies (Req 8.3).
- `prefers-reduced-motion` rule suppresses the transition (Req 8.8) — verify in browser DevTools
  by enabling the emulation.

---

## Dependency Graph

```
Phase 0 (Priority Seeding)
       │
       ▼
Phase 1 (Constants & Types) ◄──── independent
       │
       ├──► Phase 2 (Strategies)
       │           │
       │           ▼
       │    Phase 3 (SessionManager)
       │
       └──► Phase 4 (Persistence Service)
                   │
                   ▼
            Phase 5 (UI Selector)
                   │
                   ▼
            Phase 6 (Integration)
```

Phases 2 and 4 can be developed in parallel after Phase 1 is complete.

---

## Open Questions (for reference)

These were surfaced during requirements review and should be confirmed before Phase 2 starts:

1. **Unified Random single-technique wrap (Req 5.2):** The just-picked technique is immediately
   eligible in the new round, meaning it can be picked twice in a row. Confirm this is intentional.

2. **Prioritized tiebreak direction (Req 7.4):** Force-select the technique with the *lowest*
   priority value first. This is intentional anti-starvation: low-priority techniques miss more
   often and therefore starve first.

3. **Ordered wrap-around (Req 6.3):** After the last selected technique, the next pick scans from
   index 0. The just-selected technique at the end of the array is therefore skipped until the scan
   reaches it again on the next lap. This is the standard circular-buffer interpretation.

4. **Req 3.3 reachability:** In normal UI flow, `PlayModeSelectorService` guarantees a valid mode
   on every session start. The guard in `startSessionWithFightList` is therefore a defensive layer
   for direct API usage (e.g., tests, future automation). No UI change needed.

5. **`ROUND_ROBIN` / `PRIORITY_BASED` usage:** These entries are kept in `STRATEGY_TYPES` for
   backward compatibility with `ConfigManager` and any persisted session state that may reference
   them. They are not surfaced in the new Play Mode dropdown.
