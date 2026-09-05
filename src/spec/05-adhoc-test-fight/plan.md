# Implementation Plan — Adhoc Fight Test (AFT)

## Overview

This plan introduces a Tab Bar below the session controls in the Training panel and adds a "Fight Test"
tab that lets a user filter the full technique catalogue and start a session immediately — without
building a named Fight List.

### Guiding constraint: designed for the next sprint

A follow-on feature will convert the single adhoc config into a **list of named Fight Tests** (analogous
to today's Fight Lists). That future development will:

1. Replace the one-record `AdhocFightTestService` with a multi-record manager.
2. **Relocate the filter form** out of the inline tab pane and into a **create/edit modal or drawer**,
   the same way techniques are added to Fight Lists via `TechniqueAddModal`.

Both migrations must be **additive** — new persistence/management code wraps the existing service; the
filter form component is moved into a modal without modification. The shapes defined here make that
possible.

**Every design decision below is justified against one of these two migration paths.**

---

## Core design principles

| Principle | Application |
|-----------|-------------|
| Reuse session path | `sessionManager.startSessionWithFightList()` already handles instruction audio, strategy, timers. AFT builds a synthetic `FightList` and calls it unchanged. |
| Zero new CSS | Bootstrap 5 utilities + existing CSS custom properties in `main.css` only. |
| Filter form = standalone component | `FightTestFilterForm` has no knowledge of its host (inline pane today, modal tomorrow). |
| Service = single-record CRUD today | `FightTestService` API mirrors `FightListManager` so wrapping it in a list manager later is additive. |
| SOLID | Each class has one responsibility. Open/closed via `TabBar` config array and `FightTestService` interface. |

---

## Architecture overview

```
┌─ app.ts ─────────────────────────────────────────────────────────┐
│  handleStartSession()                                             │
│    └─ asks TabBar.getActiveTabId()                                │
│         ├─ 'fight-lists' → handleStartFightListSession() (today) │
│         └─ 'fight-test'  → handleStartFightTestSession()  (new)  │
└───────────────────────────────────────────────────────────────────┘

┌─ TabBar (Phase 1) ────────────────────────────────────────────────┐
│  Generic nav-tabs manager. Registered tabs: array of TabConfig.  │
│  setDisabled(bool) locks all tabs during a session.              │
└───────────────────────────────────────────────────────────────────┘

┌─ FightTestService (Phase 2) ──────────────────────────────────────┐
│  read(): FightTest                                               │
│  write(ft: FightTest): void          ← single-record today       │
│  reset(): FightTest                                              │
│                                                                   │
│  Future: wrap with FightTestManager that adds list CRUD.         │
│  This service becomes one node in that manager, unchanged.       │
└───────────────────────────────────────────────────────────────────┘

┌─ FightTestFilterForm (Phase 3) ───────────────────────────────────┐
│  Renders the filter controls into any container element.         │
│  Has no opinions about where it lives.                           │
│  Today: mounted inline in FightTestTabPane.                      │
│  Future: lifted into a modal/drawer with zero code changes.      │
│                                                                   │
│  Public API:                                                      │
│    mount(container: HTMLElement): void                            │
│    populate(ft: FightTest): void      ← used by edit path later  │
│    getValues(): FightTestFilterValues ← pure form read           │
│    showModeError() / clearModeError()                            │
└───────────────────────────────────────────────────────────────────┘

┌─ FightTestTabPane (Phase 4) ──────────────────────────────────────┐
│  The inline tab pane. Composes FightTestFilterForm.              │
│  Owns: live match count, persistence on change, tab-pane layout. │
│  Does NOT own validation logic (that lives in app.ts).           │
│  Future: replaced by a list view; FightTestFilterForm moves out. │
└───────────────────────────────────────────────────────────────────┘

┌─ AdhocFilterEngine (Phase 3) ─────────────────────────────────────┐
│  Static pure function. No DOM, no state.                         │
│  filter(catalogue, FightTest): Technique[]                        │
└───────────────────────────────────────────────────────────────────┘
```

---

## Type definitions

### `FightTest` interface — `src/types/index.ts`

> Named `FightTest`, not `AdhocFightTest`, because the type represents a single named configuration
> that will exist in a list. "Adhoc" is only the current UX pattern, not the data shape.

```typescript
export interface FightTest {
  id: string                          // 'adhoc' for the single adhoc config
  name: string                        // 'Adhoc' for the single adhoc config
  mode: Mode | null                   // null = not yet selected
  targetLevels: TargetLevel[]         // [] = any
  categories: TechniqueCategory[]     // [] = any
  side: Side | 'BOTH' | null          // null treated as BOTH
  shuffleMode: PlayMode               // default: 'Random'
}
```

Pure data — no UI state fields. When the multi-named feature lands, new `FightTest` records are created
with unique ids and names. The type shape requires no changes.

### `FightTestFilterValues` type — `src/types/index.ts`

The form's read-only output. Intentionally the same fields as `FightTest` minus the identity fields,
so converting form values into a `FightTest` is a trivial spread:

```typescript
export type FightTestFilterValues = Omit<FightTest, 'id' | 'name'>
```

This type explicitly communicates that the filter form does not own the record's identity. When the
form is reused for creating a new Fight Test, the caller supplies `id` and `name`.

---

## Phase 1 — Tab Bar Infrastructure (Fight Lists tab only)

**Goal:** Introduce the `TabBar` component and move the existing Fight Lists UI into the "Fight Lists"
tab pane. No new features; no regressions.

### 1.1 `TabBar` component — `src/components/TabBar.ts`

```typescript
interface TabConfig {
  id: string
  label: string
  icon?: string              // optional FA icon class e.g. 'fa-list-ul'
  paneElement: HTMLElement
  onActivate?: (id: string) => void
}

class TabBar {
  constructor(containerEl: HTMLElement, tabs: TabConfig[])

  getActiveTabId(): string
  setDisabled(disabled: boolean): void
  // addTab() is intentionally NOT exposed — tabs are registered at construction
  // time only, keeping the API minimal. The config array IS the extension point.
}
```

- Renders `<ul class="nav nav-tabs ...">` + `<div class="tab-content">` using Bootstrap markup.
- Active-state toggling is generic: iterates the registered tabs array, no tab-specific logic.
- `setDisabled(true)` adds `pe-none opacity-50` to the `<ul>`; reversed on `false`.
- Fires `onActivate(id)` for each registered tab after switching.
- Accessibility: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls` per Bootstrap docs.

### 1.2 Update `index.html`

Add immediately after the `.session-controls` div inside the Training card:

```html
<div id="training-tab-bar"></div>
```

Remove the standalone Fight Lists column (`col-12 col-lg-4` with `id="fightListContainer"` parent)
from the main row — its content will live inside the tab pane.

### 1.3 Integrate Tab Bar in `FightListUIManager`

In `FightListUIManager.init()`:

1. Create a wrapper `<div id="fight-lists-tab-pane">` and move all existing fight-list DOM into it.
2. Instantiate `TabBar` with one entry: `{ id: 'fight-lists', label: 'Fight Lists', icon: 'fa-list-ul', paneElement: fightListsWrapper }`.
3. Expose `getTabBar(): TabBar` so `app.ts` can call `setDisabled` and `getActiveTabId`.

The second tab ("Fight Test") is added in Phase 4. Phase 1 ships with one tab only.

### 1.4 Lock/unlock Tab Bar during session — `app.ts`

```typescript
disableConfigurationControls()  →  also: this.tabBar.setDisabled(true)
enableConfigurationControls()   →  also: this.tabBar.setDisabled(false)
```

### 1.5 Acceptance criteria
Req 1 (all), Req 2 (all), Req 10 (all) ✓

---

## Phase 2 — `FightTest` Type, Storage Key, and `FightTestService`

**Goal:** All data and persistence groundwork before any UI depends on it.

### 2.1 Types — `src/types/index.ts`

Add `FightTest` and `FightTestFilterValues` as defined in the Type definitions section above.

### 2.2 Storage key — `src/constants/storage.ts`

```typescript
FIGHT_TEST: 'kravMagaFightTest'
```

A single key stores the one adhoc `FightTest` object today. The multi-record feature will introduce a
`FIGHT_TESTS_LIST` key (an array) alongside this one and migrate data at that point. No migration is
needed now.

### 2.3 `FightTestService` — `src/services/FightTestService.ts`

```typescript
/**
 * Persists and restores the single adhoc FightTest configuration.
 *
 * Migration note: when the multi-named FightTest feature is built,
 * a FightTestManager wraps this service (or replaces it) to manage
 * a list of records. This service's read/write/reset contract is stable.
 */
export class FightTestService {
  static readonly ADHOC_ID = 'adhoc'
  static readonly ADHOC_NAME = 'Adhoc'

  static readonly DEFAULT: Readonly<FightTest> = {
    id: FightTestService.ADHOC_ID,
    name: FightTestService.ADHOC_NAME,
    mode: null,
    targetLevels: [],
    categories: [],
    side: null,
    shuffleMode: 'Random'
  }

  read(): FightTest          // returns stored value, or DEFAULT if absent/invalid
  write(ft: FightTest): void // writes immediately; swallows SecurityError
  reset(): FightTest         // writes DEFAULT and returns it
}
```

- `read()` validates the parsed object has all required fields before returning it. Falls back to
  `DEFAULT` on any corruption.
- `shuffleMode` lives on the `FightTest` record — not delegated to `PlayModeSelectorService` — to
  avoid dual-write ambiguity and because the future list manager will own each record's shuffle mode.

### 2.4 Acceptance criteria
Req 5 (all), Req 6 (all) ✓

---

## Phase 3 — `AdhocFilterEngine` (pure logic)

**Goal:** Isolated, deterministic filter function, unit-testable without DOM.

### 3.1 `AdhocFilterEngine` — `src/utils/AdhocFilterEngine.ts`

```typescript
export class AdhocFilterEngine {
  /**
   * Returns the subset of `catalogue` that satisfies all filter parameters
   * in `ft`. Requires ft.mode to be non-null (caller's responsibility).
   * Output order matches input catalogue order (deterministic).
   */
  static filter(catalogue: Technique[], ft: FightTest): Technique[] {
    return catalogue.filter(t => {
      // 1. Mode — technique must support the selected mode
      if (!t.modes?.includes(ft.mode!)) return false
      // 2. Target levels — empty means any
      if (ft.targetLevels.length > 0 && !ft.targetLevels.includes(t.targetLevel)) return false
      // 3. Categories — empty means any
      if (ft.categories.length > 0 && !ft.categories.includes(t.category)) return false
      // 4. Side — null or BOTH means any
      if (ft.side !== null && ft.side !== 'BOTH' && t.side !== ft.side) return false
      return true
    })
  }
}
```

Operates on the full catalogue regardless of `technique.selected`. No state, no side effects.

### 3.2 Acceptance criteria
Req 4 (all), Req 11.3 ✓

---

## Phase 4 — Filter Form Component and Tab Pane

**Goal:** Render the filter UI. The form is a standalone component; the tab pane composes it.
This decomposition is the key decision that makes the future modal migration additive.

### 4.1 `FightTestFilterForm` — `src/components/FightTestFilterForm.ts`

**Single responsibility:** render filter controls into any container; read their current values.
No knowledge of persistence, session start, or what contains it.

```typescript
export class FightTestFilterForm {
  constructor(private readonly catalogue: Technique[])

  /**
   * Renders controls into `container`. Idempotent — safe to call once.
   * `onChange` fires after every individual control change with the
   * latest values. The caller decides what to do (persist, recount, etc.).
   */
  mount(container: HTMLElement, onChange: (values: FightTestFilterValues) => void): void

  /**
   * Populates all controls from the given values.
   * Used on initial load and (future) when opening the edit modal for an existing record.
   */
  populate(values: FightTestFilterValues): void

  /** Returns a snapshot of the current control state. Pure read — no side effects. */
  getValues(): FightTestFilterValues

  /** Shows/hides the Bootstrap is-invalid pattern adjacent to the Mode selector. */
  showModeError(): void
  clearModeError(): void
}
```

**Rendered HTML (Bootstrap 5 only, no new CSS):**

```html
<form class="fight-test-filter-form">

  <!-- Mode — required, mutually exclusive -->
  <div class="mb-3">
    <label class="form-label fw-semibold">
      Mode <span class="text-danger" aria-hidden="true">*</span>
    </label>
    <div class="btn-group w-100" role="group" aria-label="Mode">
      <input type="radio" class="btn-check" id="ft-mode-performing" name="ftMode" value="PERFORMING">
      <label class="btn btn-outline-warning" for="ft-mode-performing" style="min-height:44px">
        <i class="fas fa-sword me-1"></i>Performing
      </label>
      <input type="radio" class="btn-check" id="ft-mode-responding" name="ftMode" value="RESPONDING">
      <label class="btn btn-outline-info" for="ft-mode-responding" style="min-height:44px">
        <i class="fas fa-shield-alt me-1"></i>Responding
      </label>
    </div>
    <div id="ft-mode-error" class="invalid-feedback">Please select a mode before starting.</div>
  </div>

  <!-- Target Levels — multi-select toggles -->
  <div class="mb-3">
    <label class="form-label fw-semibold">
      Target Levels <small class="text-muted fw-normal">(none = any)</small>
    </label>
    <div class="d-flex flex-wrap gap-1" role="group" aria-label="Target Levels">
      <!-- one btn-check per TargetLevel, generated from TARGET_LEVELS constant -->
    </div>
  </div>

  <!-- Categories — multi-select toggles -->
  <div class="mb-3">
    <label class="form-label fw-semibold">
      Categories <small class="text-muted fw-normal">(none = any)</small>
    </label>
    <div class="d-flex flex-wrap gap-1" role="group" aria-label="Categories">
      <!-- one btn-check per TechniqueCategory, generated from TECHNIQUE_CATEGORIES constant -->
    </div>
  </div>

  <!-- Side — mutually exclusive -->
  <div class="mb-3">
    <label class="form-label fw-semibold">Side</label>
    <div class="btn-group w-100" role="group" aria-label="Side">
      <input type="radio" class="btn-check" id="ft-side-both"  name="ftSide" value="BOTH" checked>
      <label class="btn btn-outline-secondary" for="ft-side-both"  style="min-height:44px">Both</label>
      <input type="radio" class="btn-check" id="ft-side-left"  name="ftSide" value="LEFT">
      <label class="btn btn-outline-secondary" for="ft-side-left"  style="min-height:44px">Left</label>
      <input type="radio" class="btn-check" id="ft-side-right" name="ftSide" value="RIGHT">
      <label class="btn btn-outline-secondary" for="ft-side-right" style="min-height:44px">Right</label>
    </div>
  </div>

  <!-- Shuffle Mode — reuses PLAY_MODES array, same visual as fight-list selector -->
  <div class="mb-3">
    <label class="form-label fw-semibold" for="ft-shuffle-mode">Shuffle Mode</label>
    <select id="ft-shuffle-mode" class="form-select" style="min-height:44px" aria-label="Shuffle Mode">
      <!-- options generated from PLAY_MODES -->
    </select>
  </div>

</form>
```

**Important:** `FightTestFilterForm` does NOT include the match-count indicator or a Start button.
Those belong to the host (the tab pane today; the list item card tomorrow).

### 4.2 `FightTestTabPane` — `src/components/FightTestTabPane.ts`

**Single responsibility:** compose `FightTestFilterForm` inside a scrollable pane, display the live
match count, and forward `onChange` to persistence.

```typescript
export class FightTestTabPane {
  constructor(
    private readonly service: FightTestService,
    private readonly catalogue: Technique[]
  )

  /**
   * Builds the pane element, mounts FightTestFilterForm inside it,
   * restores persisted state, shows initial match count.
   */
  mount(container: HTMLElement): void

  /** The DOM element to register with TabBar */
  getElement(): HTMLElement

  /**
   * Returns the current FightTest snapshot (id + name from service defaults,
   * filter values from the form).
   */
  getCurrentFightTest(): FightTest

  /** Delegates to the inner FightTestFilterForm */
  showModeError(): void
  clearModeError(): void
}
```

**Internal wiring (inside `mount()`):**

```typescript
const form = new FightTestFilterForm(this.catalogue)
const stored = this.service.read()
form.mount(formContainer, (values) => {
  const ft: FightTest = { ...stored, ...values }
  this.service.write(ft)           // persist immediately (Req 6.1)
  this.updateMatchCount(ft)        // live count (Req 11)
})
form.populate(stored)              // restore on load (Req 6.2)
this.updateMatchCount(stored)      // initial count
```

**Match count indicator** (inside the tab pane, not inside the form):

```html
<div id="ft-match-count" class="mt-2 fw-semibold">
  <!-- updated by updateMatchCount() -->
</div>
```

States:
- `mode === null` → `class="text-muted fst-italic"`, text: "Select a mode to see matches"
- `count === 0`   → `class="text-danger"`, text: "0 techniques matched"
- `count > 0`     → `class="text-success"`, text: "N techniques matched"

### 4.3 Register the Fight Test tab

In `FightListUIManager.init()`, after the TabBar is created (Phase 1.3):

```typescript
const ftPane = new FightTestTabPane(fightTestService, techniques)
ftPane.mount(ftPaneContainer)
tabBar.addTabEntry({ id: 'fight-test', label: 'Fight Test', icon: 'fa-flask', paneElement: ftPane.getElement() })
```

Store `ftPane` as a field; expose via `getFightTestTabPane(): FightTestTabPane` for `app.ts`.

### 4.4 Acceptance criteria
Req 3 (all), Req 6 (all), Req 8.1–8.2, Req 9 (all), Req 11 (all) ✓

---

## Phase 5 — Session Start Integration

**Goal:** Wire the Fight Test tab into `handleStartSession()` using the existing
`startSessionWithFightList()` path — zero new session logic.

### 5.1 Extract `handleStartFightListSession()` in `app.ts` (refactor first)

Move the existing fight-list branch of `handleStartSession()` into a private method — pure
extraction, no behaviour change. This makes the resulting switch clean and reviewable.

### 5.2 Tab-aware `handleStartSession()`

```typescript
private async handleStartSession(): Promise<void> {
  const activeTab = this.tabBar.getActiveTabId()   // Req 10.4

  if (activeTab === 'fight-test') {
    await this.handleStartFightTestSession()
  } else {
    await this.handleStartFightListSession()
  }
}
```

### 5.3 `handleStartFightTestSession()` in `app.ts`

```typescript
private async handleStartFightTestSession(): Promise<void> {
  const ft = this.fightTestTabPane.getCurrentFightTest()

  // Validation — mode required (Req 7.5, 8.1)
  if (!ft.mode) {
    this.fightTestTabPane.showModeError()
    return
  }

  const sessionConfig = this.configManager.getSessionConfig()
  const catalogue     = this.techniqueManager.getTechniques()
  const techniques    = AdhocFilterEngine.filter(catalogue, ft)

  // Validation — non-empty result (Req 7.6, 8.3)
  if (techniques.length === 0) {
    this.showNotification({
      message: 'No techniques match the current filters. Adjust your selection and try again.',
      type: 'error'
    })
    return
  }

  // Build synthetic FightList — reuses startSessionWithFightList() unchanged (Req 7.1, 7.2)
  // All weight values default to 3 (medium) because AFT has no per-technique priorities today.
  // The future named-Fight-Test feature may add priority editing; the synthetic list approach
  // already supports that via the weight field.
  const syntheticFightList: FightList = {
    id:            ft.id,
    name:          ft.name,
    techniques:    techniques.map((t, i) => ({
                     id: String(i), techniqueId: t.name, priority: 3, selected: true
                   })),
    createdAt:     new Date().toISOString(),
    lastModified:  new Date().toISOString(),
    mode:          ft.mode    // triggers instruction-for-performer/responder audio
  }

  await this.sessionManager.startSessionWithFightList(sessionConfig, syntheticFightList, ft.shuffleMode)

  this.updateSessionUI()
  this.disableConfigurationControls()   // locks TabBar too (Phase 1.4)

  if (!this.sessionManager.isPlayingInstructionAudio() &&
      !this.sessionManager.isWaitingForInstructionCompletion()) {
    this.startTechniqueAnnouncementLoop(sessionConfig)
  }

  this.showNotification({ message: 'Fight Test session started.', type: 'success' })
}
```

**What is reused without modification:**
- `startSessionWithFightList` — strategy selection, priority healing, instruction audio, session timer.
- `startTechniqueAnnouncementLoop` — technique selection, audio playback, voice notes.
- `handlePauseSession` / `handleStopSession` — operate on session state, tab-agnostic (Req 7.4).

### 5.4 Acceptance criteria
Req 7 (all), Req 8.3–8.4, Req 10.4 ✓

---

## Phase 6 — Responsive & Visual Verification

No new code. Verify the following by inspection and manual testing:

| Check | Expected |
|-------|----------|
| Tab Bar visual | `bg-success bg-opacity-10` container integrates with `bg-success` card header |
| Active tab | Bootstrap default `nav-link.active` — white bg, top/side border |
| Fight Test form < 768 px | Single column, all controls `min-height: 44px` |
| Fight Test form ≥ 768 px | Two-column row wrapping Target Levels + Categories sections |
| WCAG contrast — mode buttons | `btn-outline-warning` / `btn-outline-info` on white → passes AA |
| WCAG contrast — match count | `text-danger` / `text-success` on white → passes AA |
| Tab locking | Clicking tabs during an active session has no effect |
| Fight Lists tab | Existing fight-list workflows function identically |

---

## Future migration guide (non-normative)

### Sprint N+1: Named Fight Tests list

1. Add `FightTestManager` (like `FightListManager`) with CRUD over an array of `FightTest` records.
   `FightTestService` either becomes one helper inside it or is retired — the `FightTest` type is unchanged.
2. Replace `FightTestTabPane` with a list view (cards per test, "Set Active", "Edit", "Delete" buttons).
   The match-count indicator moves to each card's footer, driven by `AdhocFilterEngine.filter()`.
3. Session start: `handleStartFightTestSession()` reads the currently-active `FightTest` from the
   manager instead of from `FightTestTabPane.getCurrentFightTest()`. The rest is unchanged.

### Sprint N+1: Filter form in create/edit modal

1. Create `FightTestEditModal` (mirrors `TechniqueAddModal` pattern already in the codebase).
2. `FightTestEditModal` creates an instance of `FightTestFilterForm`, calls `mount()` and `populate()`.
   Zero changes to `FightTestFilterForm`.
3. The "Add" / "Save" button in the modal reads `form.getValues()`, merges with `{ id, name }`, and
   calls `fightTestManager.save(ft)`.

No existing component is modified in either migration. The extensions are purely additive.

---

## File change summary

| File | Change |
|------|--------|
| `src/types/index.ts` | Add `FightTest` interface and `FightTestFilterValues` type |
| `src/constants/storage.ts` | Add `FIGHT_TEST` storage key |
| `src/components/TabBar.ts` | **New** — reusable tab bar |
| `src/services/FightTestService.ts` | **New** — single-record persistence |
| `src/utils/AdhocFilterEngine.ts` | **New** — pure filter logic |
| `src/components/FightTestFilterForm.ts` | **New** — standalone filter form |
| `src/components/FightTestTabPane.ts` | **New** — tab pane composing the form |
| `src/managers/FightListUIManager.ts` | Init TabBar + register Fight Test tab |
| `src/app.ts` | Tab-aware start handler; lock/unlock TabBar; extract fight-list branch |
| `index.html` | Add `#training-tab-bar` anchor; remove standalone fight-list column |

No new CSS files. No changes to `SessionManager`, `AudioManager`, `PlayModeSelectorService`,
`FightListManager`, or any existing test.

---

## Execution order

```
Phase 1  →  Phase 2  →  Phase 3  →  Phase 4  →  Phase 5  →  Phase 6
```

Each phase ships and tests independently before the next begins.

| Phase | Independent test target |
|-------|--------------------------|
| 1 | Fight Lists tab displays and works; tab locking during session |
| 2 | `FightTestService` unit tests: read/write/reset, corruption fallback, SecuriytError |
| 3 | `AdhocFilterEngine` unit tests: all filter combinations, PBT properties |
| 4 | Fight Test tab renders, persists on change, live count updates, validation fires |
| 5 | End-to-end: session starts, instruction audio, techniques cycle, stop works |
| 6 | Visual + responsive review — no code changes expected |

---

## Property-Based Testing properties

| # | Property |
|---|----------|
| 1 | **Determinism**: `filter(cat, ft)` for the same inputs always returns the same ordered set |
| 2 | **Subset**: every item in the result exists in the input catalogue |
| 3 | **Mode inclusion**: every result item satisfies `modes.includes(ft.mode)` |
| 4 | **Empty = any (levels)**: `ft.targetLevels = []` never excludes a technique on that dimension |
| 5 | **Empty = any (categories)**: same for `ft.categories = []` |
| 6 | **Side BOTH ≡ null**: `{ side: 'BOTH' }` and `{ side: null }` produce identical results |
| 7 | **Persistence round-trip**: `service.write(x); service.read()` deep-equals `x` |
| 8 | **Fallback safety**: if localStorage throws, `service.read()` returns DEFAULT without throwing |
| 9 | **populate → getValues idempotent**: `form.populate(v); form.getValues()` deep-equals `v` |
