# Implementation Plan — Adhoc Fight Test (AFT)

## Overview

This plan transforms the Training panel by introducing a Tab Bar below the session controls and adding a "Fight Test" tab that lets users filter the full technique catalogue and start a session immediately. It is organized as a strict sequence of phases, each independently mergeable and testable.

**Core design principles applied throughout:**
- Reuse `sessionManager.startSessionWithFightList()` — it already does everything AFT needs (strategy selection, instruction audio, technique selection loop). AFT just supplies a dynamically-computed technique list instead of a stored one.
- No new CSS classes or files: Bootstrap 5 utilities + existing CSS custom properties only.
- SOLID: each new class/service has one responsibility; open/closed via the tab config array.
- Simplest possible type additions — `AdhocFightTest` is a pure data interface with no UI state.

---

## Phase 1 — Tab Bar Infrastructure (Fight Lists tab only)

**Goal:** Introduce the `TabBar` component and move the existing Fight Lists UI into the "Fight Lists" tab pane. No new features; no regressions.

### 1.1 Create `TabBar` component — `src/components/TabBar.ts`

```
interface TabConfig {
  id: string                         // e.g. 'fight-lists'
  label: string                      // Visible tab label
  paneElement: HTMLElement           // Content to show/hide
  onActivate?: (id: string) => void  // Optional callback
}

class TabBar {
  constructor(containerEl: HTMLElement, tabs: TabConfig[])
  getActiveTabId(): string
  setDisabled(disabled: boolean): void   // locks all tabs during session
  // Internally uses Bootstrap nav-tabs markup + aria-selected
}
```

- Renders standard Bootstrap `nav nav-tabs` + `tab-content` structure.
- Active-state toggling is fully generic — no tab-specific logic.
- Emits the active tab id via the `onActivate` callback.
- `setDisabled(true)` adds `pe-none` + `opacity-50` to all nav-items (no JS state copy needed).

### 1.2 Update `index.html`

- Add `<div id="training-tab-bar"></div>` immediately after the `.session-controls` row inside the Training panel card.
- The existing Fight Lists column (`col-12 col-lg-4`) is kept intact for now (removed in Phase 1.3).

### 1.3 Move Fight Lists into tab pane — `FightListUIManager`

- In `FightListUIManager.init()`, after `setupEventListeners()`:
  - Instantiate `TabBar` with a single "Fight Lists" tab whose `paneElement` is the existing `#fightListContainer` parent card or a new wrapper `<div>`.
  - The standalone Fight Lists column element (`col-12 col-lg-4` card) is relocated inside the tab pane via DOM move — no re-rendering required.
- Wire the `TabBar` instance into `KravMagaTrainerApp` by storing it and passing it to session start/stop handlers.

### 1.4 Session controls lock/unlock

In `app.ts`:
- `disableConfigurationControls()` → also calls `tabBar.setDisabled(true)`.
- `enableConfigurationControls()` → also calls `tabBar.setDisabled(false)`.

### 1.5 Acceptance criteria covered
- Req 1: Tab Bar below session controls ✓  
- Req 1.2: "Fight Lists" tab visible ✓  
- Req 1.3: Default active tab = Fight Lists ✓  
- Req 1.4: Content switching ✓  
- Req 1.5: Extensible config array ✓  
- Req 1.6: Bootstrap-only markup ✓  
- Req 1.7: Responsive (inherits col-12) ✓  
- Req 1.8: Tab locking during session ✓  
- Req 2: Fight Lists content unchanged ✓  
- Req 10: Extensible Tab Bar architecture ✓  

---

## Phase 2 — `AdhocFightTest` Type & Persistence Service

**Goal:** Define the data type and storage service before any UI is built on top of them.

### 2.1 Add `AdhocFightTest` interface — `src/types/index.ts`

```typescript
export interface AdhocFightTest {
  id: string                          // fixed: 'adhoc'
  name: string                        // fixed: 'Adhoc'
  mode: Mode | null                   // null = not yet selected
  targetLevels: TargetLevel[]         // [] = any
  categories: TechniqueCategory[]     // [] = any
  side: Side | 'BOTH' | null         // null treated as BOTH
  shuffleMode: PlayMode               // default: 'Random'
}
```

- Pure data interface — no UI state fields.
- Designed so adding named Fight Tests later requires only new persistence/management logic.

### 2.2 Add storage key — `src/constants/storage.ts`

```typescript
ADHOC_FIGHT_TEST: 'kravMagaAdhocFightTest'
```

### 2.3 Create `AdhocFightTestService` — `src/services/AdhocFightTestService.ts`

Single responsibility: persist and restore one `AdhocFightTest` from localStorage.

```typescript
class AdhocFightTestService {
  private readonly STORAGE_KEY = STORAGE_KEYS.ADHOC_FIGHT_TEST
  private readonly DEFAULT: AdhocFightTest = {
    id: 'adhoc', name: 'Adhoc', mode: null,
    targetLevels: [], categories: [], side: null,
    shuffleMode: 'Random'
  }

  read(): AdhocFightTest          // returns stored value or DEFAULT
  write(config: AdhocFightTest): void
  reset(): AdhocFightTest         // writes and returns DEFAULT
}
```

- All methods are safe against `SecurityError` (try/catch → in-memory fallback).
- `shuffleMode` is NOT persisted by `PlayModeSelectorService` — it is part of the `AdhocFightTest` document itself. This avoids dual-write confusion.

### 2.4 Acceptance criteria covered
- Req 5: `AdhocFightTest` interface ✓  
- Req 6.1-6.5: Persistence on every change, restore on load, safe defaults, localStorage safety ✓  

---

## Phase 3 — `AdhocFilterEngine` (pure logic, no UI)

**Goal:** Implement the filter function in isolation so it can be unit-tested without DOM.

### 3.1 Create `AdhocFilterEngine` — `src/utils/AdhocFilterEngine.ts`

```typescript
class AdhocFilterEngine {
  /**
   * Applies all AFT filter parameters to the full technique catalogue.
   * Deterministic: same inputs always produce the same output set.
   */
  static filter(catalogue: Technique[], config: AdhocFightTest): Technique[]
}
```

Implementation logic (mirrors Req 4.1):
1. `technique.modes?.includes(config.mode)` — mode must match (required, non-null by this point).
2. `config.targetLevels.length === 0 || config.targetLevels.includes(technique.targetLevel)` — empty = any.
3. `config.categories.length === 0 || config.categories.includes(technique.category)` — empty = any.
4. `config.side === null || config.side === 'BOTH' || technique.side === config.side` — null/BOTH = any.

All four conditions must be true (AND logic). Filters the full catalogue regardless of `technique.selected`.

### 3.2 Acceptance criteria covered
- Req 4.1-4.3: Filter logic, full catalogue, determinism ✓  
- Req 11.3: Match count uses same engine ✓  

---

## Phase 4 — Fight Test Tab UI

**Goal:** Add the "Fight Test" tab pane with the filter form, live match count, and inline validation. No session start logic yet.

### 4.1 Create `AdhocFightTestPanel` — `src/components/AdhocFightTestPanel.ts`

```typescript
class AdhocFightTestPanel {
  constructor(
    private readonly service: AdhocFightTestService,
    private readonly filterEngine: typeof AdhocFilterEngine,
    private readonly catalogue: Technique[]        // from TechniqueManager
  )

  /** Renders the form into the given container element and returns it */
  mount(container: HTMLElement): void

  /** Returns a snapshot of the current form state as AdhocFightTest */
  getCurrentConfig(): AdhocFightTest

  /** Exposes the panel element for TabBar registration */
  getElement(): HTMLElement
}
```

**Internal structure (pure Bootstrap 5, no new CSS):**

```
<div class="aft-panel p-3">

  <!-- Mode selector — btn-group radio -->
  <div class="mb-3">
    <label class="form-label fw-semibold">Mode <span class="text-danger">*</span></label>
    <div class="btn-group w-100" role="group" aria-label="Mode">
      <input type="radio" class="btn-check" id="aft-mode-performing" name="aftMode" value="PERFORMING">
      <label class="btn btn-outline-warning" for="aft-mode-performing" style="min-height:44px">Performing</label>

      <input type="radio" class="btn-check" id="aft-mode-responding" name="aftMode" value="RESPONDING">
      <label class="btn btn-outline-info"    for="aft-mode-responding"  style="min-height:44px">Responding</label>
    </div>
    <!-- Inline validation -->
    <div id="aft-mode-error" class="invalid-feedback d-none">Please select a mode.</div>
  </div>

  <!-- Target Levels — toggle buttons (multi-select) -->
  <div class="mb-3">
    <label class="form-label fw-semibold">Target Levels <small class="text-muted fw-normal">(empty = any)</small></label>
    <div class="d-flex flex-wrap gap-1" id="aft-target-levels">
      <!-- one btn-check toggle per TargetLevel -->
    </div>
  </div>

  <!-- Categories — toggle buttons (multi-select) -->
  <div class="mb-3">
    <label class="form-label fw-semibold">Categories <small class="text-muted fw-normal">(empty = any)</small></label>
    <div class="d-flex flex-wrap gap-1" id="aft-categories">
      <!-- one btn-check toggle per TechniqueCategory -->
    </div>
  </div>

  <!-- Side — btn-group radio -->
  <div class="mb-3">
    <label class="form-label fw-semibold">Side</label>
    <div class="btn-group w-100" role="group" aria-label="Side filter">
      <input type="radio" class="btn-check" id="aft-side-both"  name="aftSide" value="BOTH" checked>
      <label class="btn btn-outline-secondary" for="aft-side-both"  style="min-height:44px">Both</label>

      <input type="radio" class="btn-check" id="aft-side-left"  name="aftSide" value="LEFT">
      <label class="btn btn-outline-secondary" for="aft-side-left"  style="min-height:44px">Left</label>

      <input type="radio" class="btn-check" id="aft-side-right" name="aftSide" value="RIGHT">
      <label class="btn btn-outline-secondary" for="aft-side-right" style="min-height:44px">Right</label>
    </div>
  </div>

  <!-- Shuffle Mode — reuses same select pattern as FightListUIManager -->
  <div class="mb-3">
    <label class="form-label fw-semibold" for="aft-shuffle-mode">Shuffle Mode</label>
    <select id="aft-shuffle-mode" class="form-select" style="min-height:44px">
      <!-- PLAY_MODES options -->
    </select>
  </div>

  <!-- Match count indicator -->
  <div id="aft-match-count" class="mb-3 text-muted fst-italic">
    Select a mode to see matches
  </div>

</div>
```

**Behaviour wired inside `mount()`:**
- On every control `change` event:
  1. Read form state → build `AdhocFightTest` snapshot.
  2. Persist immediately via `service.write(snapshot)`.
  3. Recompute match count via `AdhocFilterEngine.filter()` and update `#aft-match-count`:
     - No mode selected → "Select a mode to see matches" (neutral, no count).
     - Count = 0 → `text-danger` + "0 techniques matched".
     - Count > 0 → `text-success` + "N techniques matched".
- On mount: restore state from `service.read()`, update all controls, run initial match count.
- Mode validation:
  - `showModeError()`: removes `d-none` from `#aft-mode-error`; adds `is-invalid` to the btn-group wrapper.
  - `clearModeError()`: adds `d-none`; removes `is-invalid`.
  - Mode `change` always calls `clearModeError()`.

### 4.2 Register Fight Test tab in `FightListUIManager.init()`

After the TabBar is created with the Fight Lists tab (Phase 1.3), register the Fight Test tab:

```typescript
const aftPanel = new AdhocFightTestPanel(aftService, AdhocFilterEngine, techniques)
aftPanel.mount(aftContainer)
tabBar.addTab({ id: 'fight-test', label: 'Fight Test', paneElement: aftPanel.getElement() })
```

Store `aftPanel` reference for use in Phase 5.

### 4.3 Acceptance criteria covered
- Req 3.1-3.8: All AFT filter form controls ✓  
- Req 3.6: Shuffle Mode via existing `PLAY_MODES` constant ✓  
- Req 6.1-6.3: Persist on change, restore on load, safe defaults ✓  
- Req 8.1-8.2: Inline mode validation ✓  
- Req 9.2-9.5: Bootstrap-only, responsive, WCAG contrast ✓  
- Req 11.1-11.7: Live match count ✓  

---

## Phase 5 — Session Start Integration

**Goal:** Wire the AFT tab into `handleStartSession()` using the existing `startSessionWithFightList()` path.

### 5.1 Adapt `handleStartSession()` in `app.ts`

Replace the current fight-list-only logic with a tab-aware branch:

```typescript
private async handleStartSession(): Promise<void> {
  const activeTab = this.tabBar.getActiveTabId()  // Req 10.4

  if (activeTab === 'fight-test') {
    await this.handleStartAftSession()
  } else {
    await this.handleStartFightListSession()  // existing logic, extracted
  }
}
```

### 5.2 Implement `handleStartAftSession()` in `app.ts`

```typescript
private async handleStartAftSession(): Promise<void> {
  const config = this.aftPanel.getCurrentConfig()

  // Req 7.5 / 8.1 — mode required
  if (!config.mode) {
    this.aftPanel.showModeError()
    return
  }

  const sessionConfig = this.configManager.getSessionConfig()
  const catalogue = this.techniqueManager.getTechniques()   // full catalogue
  const techniques = AdhocFilterEngine.filter(catalogue, config)

  // Req 7.6 / 8.3 — empty result
  if (techniques.length === 0) {
    this.showNotification({ message: 'No techniques match the current filters.', type: 'error' })
    return
  }

  // Build a synthetic FightList so startSessionWithFightList() can be reused as-is
  // This avoids duplicating instruction-audio and strategy logic
  const syntheticFightList: FightList = {
    id: 'adhoc',
    name: 'Adhoc',
    techniques: techniques.map((t, i) => ({
      id: String(i),
      techniqueId: t.name,
      priority: 3,
      selected: true
    })),
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    mode: config.mode    // triggers instruction audio (Req 7.2)
  }

  await this.sessionManager.startSessionWithFightList(
    sessionConfig,
    syntheticFightList,
    config.shuffleMode   // Req 7.1
  )

  this.updateSessionUI()
  this.disableConfigurationControls()  // also locks TabBar (Phase 1.4)

  if (!this.sessionManager.isPlayingInstructionAudio() &&
      !this.sessionManager.isWaitingForInstructionCompletion()) {
    this.startTechniqueAnnouncementLoop(sessionConfig)
  }

  this.showNotification({ message: 'Fight Test session started.', type: 'success' })
}
```

**Key reuse decisions:**
- `startSessionWithFightList` handles: strategy setup, priority healing, instruction audio, session timer — all unchanged.
- `startTechniqueAnnouncementLoop` handles: technique selection, audio playback, voice notes — all unchanged.
- No new session state or audio logic needed.

### 5.3 Extract `handleStartFightListSession()` (refactor)

Move the existing fight-list branch of `handleStartSession()` into a private method with the same signature. This is a pure extraction — no behaviour change. This makes `handleStartSession()` clean and the tab-branch readable.

### 5.4 Pause / Stop delegation (Req 7.4)

No changes needed — `handlePauseSession()` and `handleStopSession()` operate on `sessionManager` state regardless of which tab started the session. They already work correctly.

### 5.5 Acceptance criteria covered
- Req 7.1-7.6: All AFT session start scenarios ✓  
- Req 8.3-8.4: Empty-result error, valid-result no error ✓  
- Req 10.4: `getActiveTabId()` used for tab routing ✓  

---

## Phase 6 — Visual Polish & Responsive Verification

**Goal:** Ensure the full feature matches the existing design system and passes responsive checks.

### 6.1 Tab Bar visual integration

In the `TabBar` component's rendered HTML, the `<ul>` element receives:
```html
<ul class="nav nav-tabs border-bottom-0 px-3 pt-2 bg-success bg-opacity-10">
```
This ties visually to the Training panel's `bg-success` header using Bootstrap opacity utilities — no new CSS.

Active tab: Bootstrap's default `nav-link.active` styling (white background, border) is sufficient and already WCAG AA compliant on the `bg-success bg-opacity-10` background.

### 6.2 Responsive checklist

| Viewport | TabBar | Fight Test form | Touch targets |
|---|---|---|---|
| < 768 px | `col-12`, stacks vertically | `col-12`, single column | All controls `min-height: 44px` via inline `style` on `<label>` and `<select>` |
| ≥ 768 px | Full width of Training panel | Two-column layout (`col-md-6` pairs for Levels + Categories) | Normal Bootstrap sizing |

Multi-column layout at ≥ 768 px is implemented inside `AdhocFightTestPanel` using a `<div class="row">` wrapper around the two multi-select sections. This stays within the Training panel's `col-lg-4` column.

### 6.3 WCAG 2.1 AA

- Mode toggle: `btn-outline-warning` (Performing) and `btn-outline-info` (Responding) — both pass AA on white background with existing Bootstrap 5 palette.
- Match count: `text-danger` for zero, `text-success` for non-zero — both pass AA on white.
- All interactive elements have visible focus rings via existing `.btn:focus` rule in `main.css`.

### 6.4 Acceptance criteria covered
- Req 9.1-9.5 ✓  
- Req 3.7-3.8 ✓  

---

## File Change Summary

| File | Change |
|---|---|
| `src/types/index.ts` | Add `AdhocFightTest` interface |
| `src/constants/storage.ts` | Add `ADHOC_FIGHT_TEST` key |
| `src/components/TabBar.ts` | **New** — reusable tab bar component |
| `src/services/AdhocFightTestService.ts` | **New** — localStorage service |
| `src/utils/AdhocFilterEngine.ts` | **New** — pure filter logic |
| `src/components/AdhocFightTestPanel.ts` | **New** — Fight Test tab UI |
| `src/managers/FightListUIManager.ts` | Init TabBar + register both tabs |
| `src/app.ts` | Tab-aware start handler; lock/unlock TabBar |
| `index.html` | Add `#training-tab-bar` anchor div |

No new CSS files. No changes to `SessionManager`, `AudioManager`, `PlayModeSelectorService`, or any existing test.

---

## Execution Order

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
```

Each phase is independently testable:
- Phase 1: Fight Lists tab visible and functional; no regression.
- Phase 2: `AdhocFightTestService` unit tests (read/write/reset/error paths).
- Phase 3: `AdhocFilterEngine` unit tests (all filter combinations, edge cases).
- Phase 4: Fight Test tab renders correctly and persists on change.
- Phase 5: Session starts, instruction audio plays, techniques cycle — end-to-end.
- Phase 6: Visual and responsive review only.

---

## Property-Based Testing Notes

The following correctness properties should be encoded as PBT properties:

1. **Filter determinism**: `∀ catalogue, config → filter(catalogue, config)` always returns the same set.
2. **Filter subset**: `filter(catalogue, config) ⊆ catalogue` always holds.
3. **Mode inclusion**: Every technique in `filter(catalogue, config)` has `modes.includes(config.mode)`.
4. **Empty arrays = any**: `filter(catalogue, { ...config, targetLevels: [], categories: [] })` never excludes a technique solely on targetLevel or category.
5. **Side BOTH = any**: `filter(catalogue, { ...config, side: 'BOTH' })` ≡ `filter(catalogue, { ...config, side: null })`.
6. **Persistence round-trip**: `service.write(x); service.read() ≡ x` for any valid `AdhocFightTest`.
7. **Invalid localStorage fallback**: If storage throws, `service.read()` returns the default without throwing.
