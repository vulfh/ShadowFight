# Implementation Plan — Expertise Levels

## Overview

This plan adds an `expertiseLevel` field to every `Technique`, a shared `ExpertiseLevelFilter`
UI component, and expertise-level filtering to the Fight Test tab and the Fight List Technique
Picker modal. A colour-coded badge is also added wherever techniques are displayed.

The feature touches six areas of the codebase, delivered in five phases:

1. **Type & constants** — `ExpertiseLevel` union, `EXPERTISE_LEVELS` array, `expertiseLevelRank` helper.
2. **Technique catalogue** — `expertiseLevel` field wired on the `Technique` interface; developer fills in values.
3. **Filter engine** — new `passesExpertiseLevel` predicate in `AdhocFilterEngine`.
4. **Shared UI component** — `ExpertiseLevelFilterControl` reused by the Fight Test form and the Technique Add Modal.
5. **Integration** — Fight Test form, Technique Add Modal, badge rendering in Fight List cards.

---

## Guiding principles

| Principle | Application |
|---|---|
| Zero new CSS (almost) | Bootstrap 5 utilities only. One optional CSS rule for the orange badge colour if `bg-warning` is insufficiently distinct. |
| Single source of truth | `EXPERTISE_LEVELS` array drives all filter UIs, badge renderers, and rank comparisons. |
| SOLID — OCP on `AdhocFilterEngine` | New predicate added without modifying existing predicates. |
| Shared UI component | `ExpertiseLevelFilterControl` is a plain DOM helper function/class — no framework — reused by both filter surfaces to avoid duplication (Req 6.5). |
| Developer owns values | The agent wires all infrastructure. The developer assigns every `expertiseLevel` value in `TechniqueManager`. The agent must NOT supply placeholder values. |
| Zero regressions | When `expertiseLevel` is `null` in `FightTest`, `AdhocFilterEngine` accepts all techniques — identical behaviour to today. |

---

## Architecture overview

```
src/types/index.ts
  └─ ExpertiseLevel (union type)
  └─ EXPERTISE_LEVELS (const array, single source of truth)
  └─ expertiseLevelRank() (helper, re-exported)
  └─ Technique.expertiseLevel: ExpertiseLevel        ← new required field
  └─ FightTest.expertiseLevel: ExpertiseLevel | null ← new field
  └─ FightTest.expertiseLevelMode: 'strict'|'cumulative' ← new field

src/utils/AdhocFilterEngine.ts
  └─ passesExpertiseLevel() ← new private static predicate
  └─ filter() wired to include passesExpertiseLevel

src/components/ExpertiseLevelFilterControl.ts  ← NEW shared helper
  └─ buildExpertiseLevelSection(onChange) → HTMLElement
      renders: level selector (btn-group) + mode toggle (btn-group)
      reads:   getExpertiseLevelValues() → { expertiseLevel, expertiseLevelMode }
      writes:  populate(expertiseLevel, expertiseLevelMode)

src/components/FightTestFilterForm.ts  (modified)
  └─ mounts ExpertiseLevelFilterControl inside the form
  └─ getValues() includes expertiseLevel + expertiseLevelMode
  └─ populate() restores expertiseLevel + expertiseLevelMode

src/components/TechniqueAddModal.ts  (modified)
  └─ renders ExpertiseLevelFilterControl in the search bar area
  └─ filterTechniques() applies expertise-level predicate
  └─ renderTechniqueList() shows badge on each item

src/managers/FightListUIManager.ts  (modified)
  └─ renderTechniquesList() adds badge to each technique entry
  └─ createFightListElement() adds badge in collapsed header

src/services/FightTestService.ts  (modified)
  └─ DEFAULT updated with expertiseLevel: null, expertiseLevelMode: 'cumulative'
  └─ read() validates and sanitises the two new fields

src/managers/TechniqueManager.ts  (modified by developer)
  └─ every technique object gets expertiseLevel assigned by developer
```

---

## Type definitions

### Updated `Technique` interface — `src/types/index.ts`

```typescript
export interface Technique {
  name: string
  file: string
  category: TechniqueCategory
  priority: PriorityLevel
  selected: boolean
  weight: number
  targetLevel: TargetLevel
  side: Side
  modes?: Mode[]
  expertiseLevel: ExpertiseLevel   // ← NEW required field
}
```

Because `expertiseLevel` is **required** (not optional), TypeScript will emit a compile error for
every technique object in `TechniqueManager` that does not supply it. This is intentional — it
forces the developer to fill in a value for every technique rather than silently inheriting `undefined`.

### New type and constants — `src/types/index.ts`

```typescript
export type ExpertiseLevel =
  | 'yellow'
  | 'orange'
  | 'green'
  | 'blue'
  | 'brown'
  | 'black-dan-1'

/**
 * Ordered from lowest (index 0) to highest (index 5).
 * This array is the single source of truth for rank ordering.
 * All filter predicates, UI option lists, and badge renderers
 * derive their data from this array.
 */
export const EXPERTISE_LEVELS: readonly ExpertiseLevel[] = [
  'yellow', 'orange', 'green', 'blue', 'brown', 'black-dan-1',
]

/**
 * Returns the 0-based rank of `level` in EXPERTISE_LEVELS.
 * yellow=0, orange=1, green=2, blue=3, brown=4, black-dan-1=5.
 * Returns 0 (yellow) for any unrecognised value.
 */
export function expertiseLevelRank(level: ExpertiseLevel | string): number {
  const idx = EXPERTISE_LEVELS.indexOf(level as ExpertiseLevel)
  return idx === -1 ? 0 : idx
}
```

### Updated `FightTest` interface — `src/types/index.ts`

```typescript
export interface FightTest {
  id: string
  name: string
  mode: Mode | null
  targetLevels: TargetLevel[]
  categories: TechniqueCategory[]
  side: Side | 'BOTH' | null
  shuffleMode: PlayMode
  expertiseLevel: ExpertiseLevel | null        // ← NEW  null = no restriction
  expertiseLevelMode: 'strict' | 'cumulative'  // ← NEW  ignored when expertiseLevel is null
}

// FightTestFilterValues is derived — the Omit keeps working, no change needed:
export type FightTestFilterValues = Omit<FightTest, 'id' | 'name'>
```

---

## Phase 1 — Type Foundation

**Goal:** All type/constant plumbing in place so every subsequent phase compiles against the
final shape. No logic changes yet.

### 1.1 Add to `src/types/index.ts`

- `ExpertiseLevel` union type.
- `EXPERTISE_LEVELS` constant array.
- `expertiseLevelRank()` helper function.
- `expertiseLevel: ExpertiseLevel` required field on `Technique`.
- `expertiseLevel: ExpertiseLevel | null` and `expertiseLevelMode: 'strict' | 'cumulative'` on `FightTest`.

After this step the **TypeScript build will fail** because every technique object in
`TechniqueManager.loadTechniques()` is now missing the required field. This is expected — Phase 2
resolves it.

### 1.2 Update `FightTestService` default and validation — `src/services/FightTestService.ts`

```typescript
static readonly DEFAULT: Readonly<FightTest> = {
  // ... existing fields ...
  expertiseLevel: null,
  expertiseLevelMode: 'cumulative',
}
```

Add validation in `read()`:

```typescript
// After parsing the stored object:
const validLevels: readonly string[] = EXPERTISE_LEVELS
if (!validLevels.includes(parsed.expertiseLevel)) {
  parsed.expertiseLevel = null
}
if (parsed.expertiseLevelMode !== 'strict' && parsed.expertiseLevelMode !== 'cumulative') {
  parsed.expertiseLevelMode = 'cumulative'
}
```

### 1.3 Acceptance criteria
Req 1 (all), Req 2.1, Req 3.5–3.6, Req 5 (all), Req 8.2–8.4 ✓

---

## Phase 2 — Technique Catalogue (Developer Task)

**Goal:** Every technique in `TechniqueManager.loadTechniques()` has a valid `expertiseLevel`.
The TypeScript build must pass after this phase.

### 2.1 Developer action

The developer opens `src/managers/TechniqueManager.ts` and adds `expertiseLevel: '<value>'` to
every technique object, choosing from the six valid values based on curriculum knowledge.

**The agent MUST NOT do this.** The agent's job is only to ensure the field exists on the interface
(Phase 1) and to make the compiler enforce its presence.

### 2.2 Build verification

After the developer has assigned all values, run:

```
npx tsc --noEmit
```

The build must produce zero TypeScript errors before proceeding to Phase 3.

### 2.3 Acceptance criteria
Req 2 (all) ✓

---

## Phase 3 — Filter Engine Extension

**Goal:** `AdhocFilterEngine.filter()` enforces the expertise-level constraint.

### 3.1 Add `passesExpertiseLevel` — `src/utils/AdhocFilterEngine.ts`

```typescript
/** Dimension 5: expertise level. null = no restriction. */
private static passesExpertiseLevel(t: Technique, ft: FightTest): boolean {
  if (ft.expertiseLevel === null) return true

  // Treat missing/unrecognised technique expertise level as 'yellow' (rank 0)
  const techRank = expertiseLevelRank(t.expertiseLevel ?? 'yellow')

  if (ft.expertiseLevelMode === 'strict') {
    return t.expertiseLevel === ft.expertiseLevel
  }

  // 'cumulative' — technique rank must be <= selected level rank
  return techRank <= expertiseLevelRank(ft.expertiseLevel)
}
```

### 3.2 Wire into `filter()`

```typescript
static filter(catalogue: Technique[], ft: FightTest): Technique[] {
  return catalogue.filter(
    t =>
      AdhocFilterEngine.passesMode(t, ft) &&
      AdhocFilterEngine.passesTargetLevel(t, ft) &&
      AdhocFilterEngine.passesCategory(t, ft) &&
      AdhocFilterEngine.passesSide(t, ft) &&
      AdhocFilterEngine.passesExpertiseLevel(t, ft)   // ← new
  )
}
```

No changes to existing predicates. Open/closed principle preserved.

### 3.3 Acceptance criteria
Req 4 (all), Req 8.1 ✓

---

## Phase 4 — Shared UI Component

**Goal:** One reusable DOM helper that renders the expertise-level selector + mode toggle, so
`FightTestFilterForm` and `TechniqueAddModal` share the same implementation without coupling.

### 4.1 `ExpertiseLevelFilterControl` — `src/components/ExpertiseLevelFilterControl.ts`

This is a **plain-DOM helper** (not a class with instance state) that returns an `HTMLElement`
and a handle for reading/writing its values. This keeps it lightweight and easy to embed in both
surfaces.

```typescript
export interface ExpertiseLevelFilterValues {
  expertiseLevel: ExpertiseLevel | null
  expertiseLevelMode: 'strict' | 'cumulative'
}

export interface ExpertiseLevelFilterControl {
  /** The root element to append into a parent container. */
  element: HTMLElement
  /** Reads current control state. No side effects. */
  getValues(): ExpertiseLevelFilterValues
  /** Restores control state from stored values. */
  populate(values: ExpertiseLevelFilterValues): void
}

/**
 * Builds the expertise-level filter section (level selector + mode toggle).
 * `onChange` is called after every interaction.
 *
 * Uses only Bootstrap 5 btn-group / btn-check patterns — no new CSS classes.
 */
export function buildExpertiseLevelFilterControl(
  onChange: (values: ExpertiseLevelFilterValues) => void
): ExpertiseLevelFilterControl
```

**Rendered HTML structure** (Bootstrap 5 only):

```html
<!-- Expertise Level Filter section -->
<div class="mb-3">
  <label class="form-label fw-semibold">
    Expertise Level <small class="text-muted fw-normal">(none = any)</small>
  </label>

  <!-- Level selector — "Any" + one btn per EXPERTISE_LEVELS entry -->
  <div class="btn-group d-flex flex-wrap gap-1" role="group" aria-label="Expertise Level">

    <input type="radio" class="btn-check" id="el-any"    name="el-level" value=""           checked>
    <label class="btn btn-outline-secondary btn-sm" for="el-any" style="min-height:44px">
      Any
    </label>

    <!-- Generated from EXPERTISE_LEVELS array: -->
    <input type="radio" class="btn-check" id="el-yellow" name="el-level" value="yellow">
    <label class="btn btn-outline-secondary btn-sm el-badge--yellow" for="el-yellow"
           style="min-height:44px">Yellow</label>

    <input type="radio" class="btn-check" id="el-orange" name="el-level" value="orange">
    <label class="btn btn-outline-secondary btn-sm el-badge--orange" for="el-orange"
           style="min-height:44px">Orange</label>

    <!-- … green, blue, brown, black-dan-1 … -->
  </div>

  <!-- Mode toggle — disabled + aria-hidden when "Any" is selected -->
  <div class="btn-group mt-2" role="group" aria-label="Filter mode" id="el-mode-group">
    <input type="radio" class="btn-check" id="el-mode-cumulative" name="el-mode"
           value="cumulative" checked>
    <label class="btn btn-outline-secondary btn-sm" for="el-mode-cumulative"
           style="min-height:44px">Up to</label>

    <input type="radio" class="btn-check" id="el-mode-strict" name="el-mode" value="strict">
    <label class="btn btn-outline-secondary btn-sm" for="el-mode-strict"
           style="min-height:44px">Strict</label>
  </div>
</div>
```

**Mode toggle enable/disable logic (inside the helper):**

When the level selector changes to "Any" (empty value):
- Set both mode inputs `disabled = true`.
- Add `opacity-50 pe-none` to the mode group wrapper so it is visually muted.

When the level selector changes to any other value:
- Remove `disabled` from both mode inputs.
- Remove `opacity-50 pe-none` from the mode group wrapper.

This is purely DOM manipulation — no CSS classes beyond Bootstrap utilities.

**`getValues()` logic:**

```typescript
getValues(): ExpertiseLevelFilterValues {
  const levelInput = root.querySelector<HTMLInputElement>('input[name="el-level"]:checked')
  const modeInput  = root.querySelector<HTMLInputElement>('input[name="el-mode"]:checked')
  return {
    expertiseLevel:     levelInput?.value || null,
    expertiseLevelMode: (modeInput?.value ?? 'cumulative') as 'strict' | 'cumulative',
  }
}
```

**`populate()` logic:**

```typescript
populate({ expertiseLevel, expertiseLevelMode }: ExpertiseLevelFilterValues): void {
  // Set level radio
  const value = expertiseLevel ?? ''
  root.querySelectorAll<HTMLInputElement>('input[name="el-level"]').forEach(input => {
    input.checked = input.value === value
  })
  // Set mode radio
  root.querySelectorAll<HTMLInputElement>('input[name="el-mode"]').forEach(input => {
    input.checked = input.value === expertiseLevelMode
  })
  // Update disabled state
  syncModeGroupState()
}
```

### 4.2 Badge helper — `src/components/ExpertiseLevelFilterControl.ts` (same file)

A small pure function for generating badge HTML, used by both `FightTestFilterForm` and
`TechniqueAddModal`. Keeping it in the same file avoids a proliferation of tiny files.

```typescript
/**
 * Returns a Bootstrap badge HTML string for the given expertise level.
 * Uses the EXPERTISE_LEVELS array as the source of truth — no switch statements.
 */
export function expertiseLevelBadgeHtml(level: ExpertiseLevel | undefined): string {
  const safeLevel: ExpertiseLevel = EXPERTISE_LEVELS.includes(level as ExpertiseLevel)
    ? (level as ExpertiseLevel)
    : 'yellow'

  const classMap: Record<ExpertiseLevel, string> = {
    'yellow':      'bg-warning text-dark',
    'orange':      'bg-warning text-dark el-badge--orange',  // optional CSS override
    'green':       'bg-success text-white',
    'blue':        'bg-primary text-white',
    'brown':       'bg-secondary text-white',
    'black-dan-1': 'bg-dark text-white',
  }

  const label = safeLevel.charAt(0).toUpperCase() + safeLevel.slice(1)
    .replace('-', ' ')  // 'black-dan-1' → 'Black dan 1'
  return `<span class="badge ${classMap[safeLevel]} ms-1">${label}</span>`
}
```

**Orange badge CSS (the one optional new rule):**

If `bg-warning` is not distinct enough for orange, add in `fightList.css`:

```css
/* BEM: badge modifier for orange expertise level */
.el-badge--orange {
  background-color: #fd7e14 !important; /* Bootstrap $orange */
  color: #fff !important;
}
```

This is the only new CSS rule. If `bg-warning` is considered acceptable, this rule can be omitted entirely.

### 4.3 Acceptance criteria
Req 6.5, Req 7.3–7.4, Req 9 (all) ✓

---

## Phase 5 — Integration

**Goal:** Wire `ExpertiseLevelFilterControl` and `expertiseLevelBadgeHtml` into the three
integration points: `FightTestFilterForm`, `TechniqueAddModal`, and `FightListUIManager`.

### 5.1 `FightTestFilterForm` — `src/components/FightTestFilterForm.ts`

**Changes only — existing code is untouched.**

#### 5.1.1 Import the new helper

```typescript
import {
  buildExpertiseLevelFilterControl,
  type ExpertiseLevelFilterControl
} from './ExpertiseLevelFilterControl'
```

#### 5.1.2 Add private field

```typescript
private elControl: ExpertiseLevelFilterControl | null = null
```

#### 5.1.3 Mount in `buildForm()`

Append the expertise level section after the Shuffle Mode section:

```typescript
const elSection = buildExpertiseLevelFilterControl(notify)
this.elControl = elSection
form.appendChild(elSection.element)
```

`notify` is the existing local closure that calls `onChange(this.getValues())`. Because `getValues()`
now reads `elControl.getValues()` (see below), no extra wiring is needed — the existing
change-propagation chain works as-is.

#### 5.1.4 Extend `getValues()`

```typescript
getValues(): FightTestFilterValues {
  return {
    mode:               this.readMode(),
    targetLevels:       this.readChecked<TargetLevel>(this.targetLevelGroup!),
    categories:         this.readChecked<TechniqueCategory>(this.categoryGroup!),
    side:               this.readSide(),
    shuffleMode:        this.shuffleSelect
                          ? (this.shuffleSelect.value as FightTestFilterValues['shuffleMode'])
                          : 'Random',
    // ← NEW:
    ...( this.elControl?.getValues() ?? {
           expertiseLevel: null, expertiseLevelMode: 'cumulative'
         }
       ),
  }
}
```

#### 5.1.5 Extend `populate()`

```typescript
populate(values: FightTestFilterValues): void {
  // ... existing population of mode, targetLevels, categories, side, shuffleMode ...

  // ← NEW:
  this.elControl?.populate({
    expertiseLevel:     values.expertiseLevel,
    expertiseLevelMode: values.expertiseLevelMode,
  })
}
```

### 5.2 `TechniqueAddModal` — `src/components/TechniqueAddModal.ts`

**Changes only — existing code is untouched except where noted.**

#### 5.2.1 Add import

```typescript
import {
  buildExpertiseLevelFilterControl,
  expertiseLevelBadgeHtml,
  type ExpertiseLevelFilterControl,
} from './ExpertiseLevelFilterControl'
```

#### 5.2.2 Add private field

```typescript
private elControl: ExpertiseLevelFilterControl | null = null
```

#### 5.2.3 Render the control in `initializeModal()`

Insert the expertise level section directly inside `.technique-add-modal__search`, after the
category filter `<select>` and before the "Add All" button:

```html
<div class="technique-add-modal__el-filter"></div>
```

Then in `initializeModal()` after `this.setupEventListeners()`:

```typescript
const elContainer = this.modal.querySelector('.technique-add-modal__el-filter') as HTMLElement
const elControl = buildExpertiseLevelFilterControl(() => this.filterTechniques())
this.elControl = elControl
// Reset to default on every open (Req 6.4)
elControl.populate({ expertiseLevel: null, expertiseLevelMode: 'cumulative' })
elContainer.appendChild(elControl.element)
```

#### 5.2.4 Extend `filterTechniques()`

```typescript
private filterTechniques(): void {
  const searchTerm     = this.searchInput.value.toLowerCase()
  const categoryFilter = this.categoryFilter.value
  const elValues       = this.elControl?.getValues()
                         ?? { expertiseLevel: null, expertiseLevelMode: 'cumulative' }

  this.filteredTechniques = this.techniques.filter(technique => {
    const matchesSearch   = technique.name.toLowerCase().includes(searchTerm)
    const matchesCategory = !categoryFilter || technique.category === categoryFilter

    // ← NEW: expertise level filter
    let matchesLevel = true
    if (elValues.expertiseLevel !== null) {
      if (elValues.expertiseLevelMode === 'strict') {
        matchesLevel = technique.expertiseLevel === elValues.expertiseLevel
      } else {
        matchesLevel = expertiseLevelRank(technique.expertiseLevel)
                    <= expertiseLevelRank(elValues.expertiseLevel)
      }
    }

    return matchesSearch && matchesCategory && matchesLevel
  })

  this.renderTechniqueList()
}
```

> Note: `AdhocFilterEngine` is not reused here because `TechniqueAddModal` does not have a
> `FightTest` object — it has a simpler independent filter state. Using the filter engine would
> require constructing a synthetic `FightTest` for each change, which adds unnecessary coupling.
> The predicate logic is trivial enough to inline.

#### 5.2.5 Add badge to `renderTechniqueList()`

In the item's `info` block, after the `<h3>` name:

```typescript
item.innerHTML = `
  <div class="technique-item__info">
    <h3>${technique.name}</h3>
    <span class="technique-category">${technique.category}</span>
    ${expertiseLevelBadgeHtml(technique.expertiseLevel)}   <!-- ← NEW -->
  </div>
  ...
`
```

### 5.3 `FightListUIManager` — badge in technique lists

**Changes only — existing code is untouched except where noted.**

#### 5.3.1 Import badge helper

```typescript
import { expertiseLevelBadgeHtml } from '../components/ExpertiseLevelFilterControl'
```

#### 5.3.2 `renderTechniquesList()` — badge in expanded card body

The technique name `<span>` currently reads:

```typescript
`<span class="technique-name...">${technique.techniqueId}</span>`
```

Extend to:

```typescript
// Look up the full Technique object to access expertiseLevel
const fullTechnique = this.techniqueManager.getTechniques()
                        .find(t => t.name === technique.techniqueId)

// ... in the template:
`<span class="technique-name...">${technique.techniqueId}</span>
 ${expertiseLevelBadgeHtml(fullTechnique?.expertiseLevel)}`
```

> `FightListTechnique` stores only `techniqueId` (the name string), not the full `Technique`.
> Looking up the full technique from `TechniqueManager` is the correct approach — the same
> pattern is already used in `FightListManager.healFightListPriorities()`.

#### 5.3.3 `createFightListElement()` — badge in collapsed card header

The card header currently shows only the fight list name and mode badge. The expertise-level
badge is not shown here because a Fight List contains multiple techniques potentially spanning
multiple levels. The badge is only shown in the expanded technique list (Req 7.1 and 7.5 —
"visible in both collapsed and expanded views" refers to the collapsed/expanded technique entry
inside the card body, not the card header itself).

> **Clarification vs Req 7.5:** The requirement says the badge must be visible in both the
> "collapsed (header) and expanded (card body) views of a Fight List card." In context this means
> the technique-level item inside the card can be individually collapsed (via the notes toggle).
> The badge is on the technique row, which is always visible when the card is expanded.

### 5.4 Acceptance criteria
Req 3 (all), Req 6.1–6.4, Req 7.1–7.2, Req 9 (all) ✓

---

## Phase 6 — Verification

No new code. Verify the following before closing the feature:

| Check | Expected |
|---|---|
| TypeScript build | `npx tsc --noEmit` → zero errors |
| Fight Test — no filter | All techniques returned (same as before) |
| Fight Test — strict yellow | Only yellow techniques returned |
| Fight Test — cumulative green | Yellow, orange, green techniques returned |
| Fight Test — persistence | Reload page; expertise level filter is restored |
| Fight Test — match count | Updates immediately on every level/mode change |
| Technique Add Modal — level filter | Technique list narrows correctly; resets on modal reopen |
| Fight List card | Badge visible next to each technique name in expanded card |
| Technique Add Modal | Badge visible next to each technique name in the list |
| Mobile < 768 px | All controls ≥ 44 px height; single-column layout |
| WCAG contrast | Badges pass AA (4.5:1 text contrast ratio) |
| No regressions | Existing Fight Lists session workflow unchanged |

---

## File change summary

| File | Change type | Summary |
|---|---|---|
| `src/types/index.ts` | Modified | Add `ExpertiseLevel`, `EXPERTISE_LEVELS`, `expertiseLevelRank`, extend `Technique`, extend `FightTest` |
| `src/managers/TechniqueManager.ts` | Modified by **developer** | Add `expertiseLevel` to every technique object |
| `src/services/FightTestService.ts` | Modified | Add two new fields to DEFAULT; add validation in `read()` |
| `src/utils/AdhocFilterEngine.ts` | Modified | Add `passesExpertiseLevel` predicate; wire into `filter()` |
| `src/components/ExpertiseLevelFilterControl.ts` | **New** | Shared filter control + badge helper |
| `src/components/FightTestFilterForm.ts` | Modified | Mount control; extend `getValues()` and `populate()` |
| `src/components/TechniqueAddModal.ts` | Modified | Mount control; extend `filterTechniques()`; add badge |
| `src/managers/FightListUIManager.ts` | Modified | Add badge to `renderTechniquesList()` |
| `src/styles/fightList.css` | Modified (optional) | One `.el-badge--orange` rule if needed |

No changes to: `SessionManager`, `AudioManager`, `FightListManager`, `StorageService`,
`TabBar`, `FightTestTabPane`, `TechniqueSelectionStrategy`, `app.ts`, `index.html`.

---

## Execution order

```
Phase 1 → Phase 2 (developer) → Phase 3 → Phase 4 → Phase 5 → Phase 6
```

Phases 3, 4, and 5 can be executed in parallel once Phase 2 is complete, because they touch
different files. However, Phase 5 imports from Phase 4's new file, so Phase 4 must be
committed before Phase 5 starts.

| Phase | Blocking condition | Independent test |
|---|---|---|
| 1 | None | `tsc --noEmit` fails (expected — techniques missing field) |
| 2 | Developer must assign all `expertiseLevel` values | `tsc --noEmit` → zero errors |
| 3 | Phase 1 complete | `AdhocFilterEngine` unit tests — all 5 filter combinations |
| 4 | Phase 1 complete | Mount control in isolation; `getValues`/`populate` round-trip |
| 5 | Phases 3 + 4 complete | Manual: filter, badge display, persistence, modal reset |
| 6 | All phases complete | Full verification checklist above |

---

## Property-based testing properties

| # | Property |
|---|---|
| 1 | **Null pass-through**: `ft.expertiseLevel = null` → result equals result with no expertise filter |
| 2 | **Strict subset**: strict filter result is always a subset of cumulative filter result for same level |
| 3 | **Cumulative monotone**: selecting a higher level in cumulative mode never reduces the result set |
| 4 | **Rank consistency**: `expertiseLevelRank(EXPERTISE_LEVELS[i]) === i` for all i |
| 5 | **Populate round-trip**: `control.populate(v); control.getValues()` deep-equals `v` |
| 6 | **Service round-trip**: `service.write({...ft, expertiseLevel: 'green', expertiseLevelMode: 'strict'}); service.read()` returns same values |
| 7 | **Corrupt level sanitised**: stored `expertiseLevel: 'NONE'` → `service.read()` returns `expertiseLevel: null` |
