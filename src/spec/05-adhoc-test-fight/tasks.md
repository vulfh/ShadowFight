# Implementation Tasks — Adhoc Fight Test (AFT)

## Task Dependency Graph

```
Phase 1 (Tab Bar Infrastructure)
  └─ ✅ 1.1 Types & Storage Key (2.1, 2.2)
       └─ ✅ 1.2 FightTestService (2.3)
            └─ ✅ 1.3 AdhocFilterEngine (3.1)
                 └─ ✅ 1.4 FightTestFilterForm (4.1)
                      └─ ✅ 1.5 FightTestTabPane (4.2)
                           └─ ✅ 1.6 TabBar Component (1.1)
                                └─ ✅ 1.7 HTML + FightListUIManager integration (1.2, 1.3, 4.3)
                                     └─ 1.8 app.ts session wiring (5.1–5.3)
                                          └─ 1.9 Tests (2.4, 3.2, all PBT)
```

---

## Phase 1 — Tab Bar Infrastructure

### Task 1.1 — Add `FightTest` types and storage key — COMPLETED ✅

- [x] **1.1.1** In `src/types/index.ts`, add the `FightTest` interface:
  ```typescript
  export interface FightTest {
    id: string
    name: string
    mode: Mode | null
    targetLevels: TargetLevel[]
    categories: TechniqueCategory[]
    side: Side | 'BOTH' | null
    shuffleMode: PlayMode
  }
  ```
- [x] **1.1.2** In `src/types/index.ts`, add the `FightTestFilterValues` type:
  ```typescript
  export type FightTestFilterValues = Omit<FightTest, 'id' | 'name'>
  ```
- [x] **1.1.3** In `src/constants/storage.ts`, add the `FIGHT_TEST` storage key:
  ```typescript
  FIGHT_TEST: 'kravMagaFightTest'
  ```
- [x] **1.1.4** Verify TypeScript compiles with no errors after the additions.

**Acceptance criteria:** Req 5.1, 5.3

---

### Task 1.2 — Create `FightTestService` — COMPLETED ✅

- [x] **1.2.1** Create `src/services/FightTestService.ts`.
- [x] **1.2.2** Implement static constants:
  - `ADHOC_ID = 'adhoc'`
  - `ADHOC_NAME = 'Adhoc'`
  - `DEFAULT: Readonly<FightTest>` with all fields at their default values (`mode: null`, arrays empty, `side: null`, `shuffleMode: 'Random'`).
- [x] **1.2.3** Implement `read(): FightTest` — reads from `localStorage` using `FIGHT_TEST` key, validates that the parsed object has all required fields, returns `DEFAULT` on absence or corruption.
- [x] **1.2.4** Implement `write(ft: FightTest): void` — serialises to `localStorage`; swallows `SecurityError` silently.
- [x] **1.2.5** Implement `reset(): FightTest` — calls `write(DEFAULT)` and returns `DEFAULT`.
- [x] **1.2.6** Verify TypeScript compiles with no errors.

**Acceptance criteria:** Req 5.2, 6.1–6.3, 6.5

---

### Task 1.3 — Create `AdhocFilterEngine` — COMPLETED ✅

- [x] **1.3.1** Create `src/utils/AdhocFilterEngine.ts`.
- [x] **1.3.2** Implement static method `filter(catalogue: Technique[], ft: FightTest): Technique[]` applying the four filter dimensions in order:
  1. Mode — `t.modes?.includes(ft.mode!)` (caller ensures `ft.mode` is non-null).
  2. Target levels — skip if `ft.targetLevels` is empty; otherwise `ft.targetLevels.includes(t.targetLevel)`.
  3. Categories — skip if `ft.categories` is empty; otherwise `ft.categories.includes(t.category)`.
  4. Side — skip if `ft.side` is `null` or `'BOTH'`; otherwise `t.side === ft.side`.
- [x] **1.3.3** Ensure method has no side effects, no DOM references, and no state.
- [x] **1.3.4** Verify TypeScript compiles with no errors.

**Acceptance criteria:** Req 4.1–4.3, 11.3

---

### Task 1.4 — Create `FightTestFilterForm` — COMPLETED ✅

- [x] **1.4.1** Create `src/components/FightTestFilterForm.ts`.
- [x] **1.4.2** Implement constructor accepting `catalogue: Technique[]`.
- [x] **1.4.3** Implement `mount(container: HTMLElement, onChange: (values: FightTestFilterValues) => void): void` — renders the full filter form HTML using Bootstrap 5 only:
  - Mode toggle group (`btn-group` with two radio `btn-check` inputs, `min-height: 44px`).
  - Target Levels multi-select toggle group (one `btn-check` per `TargetLevel` value from constants).
  - Categories multi-select toggle group (one `btn-check` per `TechniqueCategory` value from constants).
  - Side toggle group (`BOTH`, `LEFT`, `RIGHT`; `BOTH` checked by default).
  - Shuffle Mode `<select class="form-select">` with options from `PLAY_MODES`.
  - Mode error `<div id="ft-mode-error" class="invalid-feedback">` adjacent to the Mode selector.
  - All interactive elements set to `min-height: 44px` for touch targets (Req 3.7, 9.3).
  - Attach change listeners to each control; each fires `onChange(this.getValues())`.
- [x] **1.4.4** Implement `populate(values: FightTestFilterValues): void` — sets every control to reflect the passed values (Mode radio, Target Levels checkboxes, Category checkboxes, Side radio, Shuffle Mode select).
- [x] **1.4.5** Implement `getValues(): FightTestFilterValues` — reads current control state and returns a snapshot with no side effects.
- [x] **1.4.6** Implement `showModeError(): void` — adds `is-invalid` class to the mode `btn-group` wrapper and makes `#ft-mode-error` visible.
- [x] **1.4.7** Implement `clearModeError(): void` — removes `is-invalid` and hides the error element.
- [x] **1.4.8** Add accessibility attributes: `role="group"` and `aria-label` on each toggle group; `aria-required="true"` on the Mode group.
- [x] **1.4.9** Verify TypeScript compiles with no errors.

**Acceptance criteria:** Req 3.1–3.8, 8.1–8.2, 9.2–9.4

---

### Task 1.5 — Create `FightTestTabPane` — COMPLETED ✅

- [x] **1.5.1** Create `src/components/FightTestTabPane.ts`.
- [x] **1.5.2** Implement constructor accepting `service: FightTestService` and `catalogue: Technique[]`.
- [x] **1.5.3** Implement `mount(container: HTMLElement): void`:
  - Creates the outer pane `<div>` with an inner `formContainer` div and a `#ft-match-count` div.
  - Instantiates `FightTestFilterForm` and calls `form.mount(formContainer, onChange)`.
  - `onChange` handler: merges `FightTestService.ADHOC_ID`/`ADHOC_NAME` with the new values, calls `service.write(ft)`, calls `updateMatchCount(ft)`.
  - After mount: calls `form.populate(service.read())` and `updateMatchCount(service.read())`.
- [x] **1.5.4** Implement `updateMatchCount(ft: FightTest): void` (private):
  - `ft.mode === null` → `text-muted fst-italic`, text "Select a mode to see matches".
  - `count === 0` → `text-danger`, text "0 techniques matched".
  - `count > 0` → `text-success`, text `"${count} techniques matched"`.
- [x] **1.5.5** Implement `getElement(): HTMLElement` — returns the pane's root element (for registration with `TabBar`).
- [x] **1.5.6** Implement `getCurrentFightTest(): FightTest` — returns `{ id: ADHOC_ID, name: ADHOC_NAME, ...form.getValues() }`.
- [x] **1.5.7** Implement `showModeError(): void` and `clearModeError(): void` — delegate to the inner `FightTestFilterForm`.
- [x] **1.5.8** Verify TypeScript compiles with no errors.

**Acceptance criteria:** Req 6.1–6.3, 11.1–11.7

---

### Task 1.6 — Create `TabBar` component — COMPLETED ✅

- [x] **1.6.1** Create `src/components/TabBar.ts`.
- [x] **1.6.2** Define `TabConfig` interface:
  ```typescript
  interface TabConfig {
    id: string
    label: string
    icon?: string
    paneElement: HTMLElement
    onActivate?: (id: string) => void
  }
  ```
- [x] **1.6.3** Implement `constructor(containerEl: HTMLElement, tabs: TabConfig[])`:
  - Renders `<ul class="nav nav-tabs" role="tablist">` with one `<li role="presentation">` + `<button role="tab">` per tab.
  - Renders `<div class="tab-content">` with one `<div role="tabpanel">` per tab, inserting each `TabConfig.paneElement`.
  - Activates the first tab by default (adds `active`/`aria-selected="true"`; shows first pane, hides others).
  - Attaches click listeners that call the private `activate(id)` method.
- [x] **1.6.4** Implement `getActiveTabId(): string` — returns the currently active tab id.
- [x] **1.6.5** Implement `setDisabled(disabled: boolean): void`:
  - `true` → adds `pe-none opacity-50` to the `<ul>`; sets `aria-disabled="true"` on each tab button.
  - `false` → removes those classes/attributes.
- [x] **1.6.6** Implement private `activate(id: string): void`:
  - Iterates all registered tabs, applies `active`/`aria-selected` to the target tab, removes from all others.
  - Shows/hides corresponding pane elements.
  - Calls `onActivate(id)` for the activated tab config if provided.
- [x] **1.6.7** Add full ARIA: `role="tablist"` on `<ul>`, `role="tab"` + `aria-controls` + `aria-selected` on each button, `role="tabpanel"` + `aria-labelledby` on each pane.
- [x] **1.6.8** Verify TypeScript compiles with no errors.

**Acceptance criteria:** Req 1.1–1.8, 10.1–10.4

---

### Task 1.7 — Update `index.html` and `FightListUIManager` — COMPLETED ✅

- [x] **1.7.1** In `index.html`, add `<div id="training-tab-bar"></div>` immediately after the `.session-controls` div inside the Training panel card.
- [x] **1.7.2** In `index.html`, remove the standalone Fight Lists column (`col-12 col-lg-4` wrapper containing `id="fightListContainer"` or equivalent) from the main row layout.
- [x] **1.7.3** In `src/managers/FightListUIManager.ts`, update `init()`:
  - Create a wrapper `<div id="fight-lists-tab-pane">` and move all existing fight-list DOM content into it.
  - Instantiate `FightTestService` and `FightTestTabPane`.
  - Call `ftPane.mount(ftPaneContainer)`.
  - Instantiate `TabBar` with two entries: `{ id: 'fight-lists', label: 'Fight Lists', icon: 'fa-list-ul', paneElement: fightListsWrapper }` and `{ id: 'fight-test', label: 'Fight Test', icon: 'fa-flask', paneElement: ftPane.getElement() }`.
  - Store `tabBar` and `ftPane` as fields.
- [x] **1.7.4** In `FightListUIManager`, expose `getTabBar(): TabBar` and `getFightTestTabPane(): FightTestTabPane`.
- [x] **1.7.5** Verify the existing Fight Lists workflow still renders correctly in the browser (manual smoke test).
- [x] **1.7.6** Verify TypeScript compiles with no errors.

**Acceptance criteria:** Req 1.1–1.7, 2.1–2.3, 4.3 (tab registration)

---

### Task 1.8 — Wire session start in `app.ts`

- [ ] **1.8.1** Extract the existing fight-list branch of `handleStartSession()` into a private method `handleStartFightListSession()` — pure extraction, zero behaviour change.
- [ ] **1.8.2** Update `handleStartSession()` to query the active tab:
  ```typescript
  const activeTab = this.tabBar.getActiveTabId()
  if (activeTab === 'fight-test') {
    await this.handleStartFightTestSession()
  } else {
    await this.handleStartFightListSession()
  }
  ```
- [ ] **1.8.3** Implement `handleStartFightTestSession()`:
  - Reads `getCurrentFightTest()` from `FightTestTabPane`.
  - Validates `ft.mode !== null`; if null → calls `fightTestTabPane.showModeError()` and returns.
  - Calls `AdhocFilterEngine.filter(catalogue, ft)`.
  - Validates `techniques.length > 0`; if zero → shows error notification and returns.
  - Builds `syntheticFightList: FightList` with `mode: ft.mode`, mapping filtered techniques to list entries with `priority: 3, selected: true`.
  - Calls `await this.sessionManager.startSessionWithFightList(sessionConfig, syntheticFightList, ft.shuffleMode)`.
  - Calls `this.updateSessionUI()` and `this.disableConfigurationControls()`.
  - Starts `startTechniqueAnnouncementLoop` if instruction audio is not playing.
  - Shows success notification.
- [ ] **1.8.4** In `disableConfigurationControls()`, add `this.tabBar.setDisabled(true)`.
- [ ] **1.8.5** In `enableConfigurationControls()`, add `this.tabBar.setDisabled(false)`.
- [ ] **1.8.6** Add `fightTestTabPane.clearModeError()` call in the onChange path (e.g. via `FightTestTabPane` internal wiring already handles this via `FightTestFilterForm.clearModeError()`; verify the wiring is complete).
- [ ] **1.8.7** Verify TypeScript compiles with no errors.

**Acceptance criteria:** Req 7.1–7.6, 8.1–8.4, 10.4

---

## Phase 2 — Tests

### Task 2.1 — Unit tests for `FightTestService`

- [ ] **2.1.1** Create `src/tests/FightTestService.test.ts`.
- [ ] **2.1.2** Test `read()` returns `DEFAULT` when localStorage is empty.
- [ ] **2.1.3** Test `read()` returns `DEFAULT` when stored value is corrupted JSON.
- [ ] **2.1.4** Test `read()` returns `DEFAULT` when stored object is missing required fields.
- [ ] **2.1.5** Test `write(ft)` → `read()` round-trip returns a deep-equal value.
- [ ] **2.1.6** Test `reset()` clears state and returns `DEFAULT`.
- [ ] **2.1.7** Test `write()` swallows `SecurityError` without throwing (mock `localStorage.setItem` to throw `SecurityError`).
- [ ] **2.1.8** Test `read()` returns in-memory default when `localStorage.getItem` throws `SecurityError`.
- [ ] **2.1.9** Run `npm run test -- --run` and confirm all new tests pass.

**PBT coverage:** Property 7 (persistence round-trip), Property 8 (fallback safety)

---

### Task 2.2 — Unit tests for `AdhocFilterEngine`

- [ ] **2.2.1** Create `src/tests/AdhocFilterEngine.test.ts`.
- [ ] **2.2.2** Test that a technique matching no mode is excluded.
- [ ] **2.2.3** Test that an empty `targetLevels` array accepts all target levels.
- [ ] **2.2.4** Test that a non-empty `targetLevels` array excludes non-matching techniques.
- [ ] **2.2.5** Test that an empty `categories` array accepts all categories.
- [ ] **2.2.6** Test that a non-empty `categories` array excludes non-matching techniques.
- [ ] **2.2.7** Test `side: 'BOTH'` includes both LEFT and RIGHT techniques.
- [ ] **2.2.8** Test `side: null` includes both LEFT and RIGHT techniques (same result as `'BOTH'`).
- [ ] **2.2.9** Test `side: 'LEFT'` excludes RIGHT techniques.
- [ ] **2.2.10** Test `side: 'RIGHT'` excludes LEFT techniques.
- [ ] **2.2.11** Test that all four filters are applied conjunctively (a technique must satisfy all active filters).
- [ ] **2.2.12** Test determinism: calling `filter()` twice with the same arguments returns identical arrays (same order, same elements).
- [ ] **2.2.13** Test subset property: every element in the result exists in the input catalogue.
- [ ] **2.2.14** Property-based test — **Determinism (PBT #1):** for randomly generated `(catalogue, ft)` pairs, `filter(cat, ft)` called twice returns identical results.
- [ ] **2.2.15** Property-based test — **Subset (PBT #2):** every item in `filter(cat, ft)` is present in `cat`.
- [ ] **2.2.16** Property-based test — **Mode inclusion (PBT #3):** every item in the result satisfies `modes.includes(ft.mode)`.
- [ ] **2.2.17** Property-based test — **Empty = any, levels (PBT #4):** `ft.targetLevels = []` never causes a technique to be excluded due to targetLevel.
- [ ] **2.2.18** Property-based test — **Empty = any, categories (PBT #5):** `ft.categories = []` never causes a technique to be excluded due to category.
- [ ] **2.2.19** Property-based test — **Side BOTH ≡ null (PBT #6):** `filter(cat, { ...ft, side: 'BOTH' })` deep-equals `filter(cat, { ...ft, side: null })`.
- [ ] **2.2.20** Run `npm run test -- --run` and confirm all new tests pass.

**PBT coverage:** Properties 1–6

---

### Task 2.3 — Unit tests for `FightTestFilterForm`

- [ ] **2.3.1** Create `src/tests/FightTestFilterForm.test.ts` (jsdom environment).
- [ ] **2.3.2** Test `mount()` renders a Mode toggle group with exactly two options (PERFORMING, RESPONDING).
- [ ] **2.3.3** Test `mount()` renders a Target Levels group with exactly nine options.
- [ ] **2.3.4** Test `mount()` renders a Categories group with the correct number of options.
- [ ] **2.3.5** Test `mount()` renders a Side group with exactly three options (BOTH, LEFT, RIGHT) with BOTH pre-selected.
- [ ] **2.3.6** Test `populate(values)` → `getValues()` round-trip returns deep-equal values.
- [ ] **2.3.7** Test that `onChange` fires after each individual control change.
- [ ] **2.3.8** Test `showModeError()` adds `is-invalid` to the Mode group wrapper.
- [ ] **2.3.9** Test `clearModeError()` removes `is-invalid`.
- [ ] **2.3.10** Property-based test — **populate → getValues idempotent (PBT #9):** `form.populate(v); form.getValues()` deep-equals `v` for a range of generated `FightTestFilterValues`.
- [ ] **2.3.11** Run `npm run test -- --run` and confirm all new tests pass.

**PBT coverage:** Property 9

---

### Task 2.4 — Integration smoke test

- [ ] **2.4.1** Manual browser test: load the app and confirm the Fight Lists tab is active by default.
- [ ] **2.4.2** Manual browser test: switch to the Fight Test tab and confirm the filter form renders.
- [ ] **2.4.3** Manual browser test: select a Mode and confirm the match count updates.
- [ ] **2.4.4** Manual browser test: change filter parameters and confirm localStorage is updated on each change (inspect via DevTools > Application > localStorage).
- [ ] **2.4.5** Manual browser test: refresh the page and confirm AFT filter state is restored.
- [ ] **2.4.6** Manual browser test: select Mode + filters with at least one match → press Start → confirm instruction audio plays and session begins.
- [ ] **2.4.7** Manual browser test: press Start without selecting a Mode → confirm inline error appears adjacent to the Mode selector.
- [ ] **2.4.8** Manual browser test: select filters that yield 0 matches → press Start → confirm error notification appears and session does not start.
- [ ] **2.4.9** Manual browser test: start a session → confirm tab switching is disabled; stop session → confirm tabs are re-enabled.
- [ ] **2.4.10** Manual browser test: switch to Fight Lists tab → start a session from a fight list → confirm existing behaviour is unchanged.

---

## Phase 3 — Responsive & Visual Verification

> No code changes expected. Verify each item by inspection and manual testing.

- [ ] **3.1** Tab Bar container uses `bg-success bg-opacity-10` or equivalent — visually integrates with the `bg-success` Training card header.
- [ ] **3.2** Active tab uses Bootstrap default `nav-link.active` styling — white background, top and side borders.
- [ ] **3.3** At viewport < 768 px: all AFT form controls stack in a single column; every interactive element is at least 44 px tall.
- [ ] **3.4** At viewport ≥ 768 px: form uses available space within the Training panel's column without overflow.
- [ ] **3.5** WCAG AA contrast: `btn-outline-warning` / `btn-outline-info` on white background passes contrast check.
- [ ] **3.6** WCAG AA contrast: `text-danger` / `text-success` match-count text on white background passes contrast check.
- [ ] **3.7** Tab locking: clicking tabs during an active session produces no tab switch.
- [ ] **3.8** Fight Lists tab: all existing fight-list workflows (create, select, start, pause, stop) function identically to pre-AFT behaviour.

---

## File Change Summary

| File | Task(s) |
|------|---------|
| `src/types/index.ts` | 1.1 |
| `src/constants/storage.ts` | 1.1 |
| `src/services/FightTestService.ts` *(new)* | 1.2 |
| `src/utils/AdhocFilterEngine.ts` *(new)* | 1.3 |
| `src/components/FightTestFilterForm.ts` *(new)* | 1.4 |
| `src/components/FightTestTabPane.ts` *(new)* | 1.5 |
| `src/components/TabBar.ts` *(new)* | 1.6 |
| `index.html` | 1.7 |
| `src/managers/FightListUIManager.ts` | 1.7 |
| `src/app.ts` | 1.8 |
| `src/tests/FightTestService.test.ts` *(new)* | 2.1 |
| `src/tests/AdhocFilterEngine.test.ts` *(new)* | 2.2 |
| `src/tests/FightTestFilterForm.test.ts` *(new)* | 2.3 |
