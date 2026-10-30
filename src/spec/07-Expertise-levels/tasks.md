# Implementation Tasks — Expertise Levels

## Task Dependency Graph

```
Task 1 — Type foundation (types, constants, FightTest extension) ✅
  └─ Task 2 — FightTestService update ✅
       └─ Task 3 — AdhocFilterEngine extension ✅
  └─ Task 4 — ExpertiseLevelFilterControl (shared UI + badge helper) ✅ [parallel with 3]
       └─ Task 5 — FightTestFilterForm integration ✅
       └─ Task 6 — TechniqueAddModal integration ✅
       └─ Task 7 — FightListUIManager badge integration ✅
Task 8 — Developer: assign expertiseLevel on all techniques  [unblocks build]
  └─ Task 9 — Build verification + smoke test
```

Tasks 3 and 4 are independent after Task 1 completes.  
Tasks 5, 6, 7 are independent of each other after Task 4 completes.  
**Task 8 is a human (developer) task** — it must be done before the build passes.

---

## Task 1 — Type Foundation

**Owner:** Agent  
**Blocked by:** Nothing  
**Files:** `src/types/index.ts`

- [x] **1.1** Add the `ExpertiseLevel` union type:
  ```typescript
  export type ExpertiseLevel =
    | 'yellow'
    | 'orange'
    | 'green'
    | 'blue'
    | 'brown'
    | 'black-dan-1'
  ```
- [x] **1.2** Add the `EXPERTISE_LEVELS` ordered constant array immediately after the type:
  ```typescript
  export const EXPERTISE_LEVELS: readonly ExpertiseLevel[] = [
    'yellow', 'orange', 'green', 'blue', 'brown', 'black-dan-1',
  ]
  ```
- [x] **1.3** Add the `expertiseLevelRank` helper function:
  ```typescript
  export function expertiseLevelRank(level: ExpertiseLevel | string): number {
    const idx = EXPERTISE_LEVELS.indexOf(level as ExpertiseLevel)
    return idx === -1 ? 0 : idx
  }
  ```
- [x] **1.4** Add `expertiseLevel: ExpertiseLevel` as a **required** field to the `Technique` interface.
  > After this step the TypeScript build will fail — every technique in `TechniqueManager`
  > is missing the field. This is intentional. Task 8 (developer task) resolves it.
- [x] **1.5** Add two new fields to the `FightTest` interface:
  ```typescript
  expertiseLevel: ExpertiseLevel | null        // null = no restriction
  expertiseLevelMode: 'strict' | 'cumulative'  // ignored when expertiseLevel is null
  ```
  `FightTestFilterValues` is derived via `Omit<FightTest, 'id' | 'name'>` — no change needed there.

**Acceptance criteria:** Req 1.1–1.5, Req 2.1, Req 3.5

---

## Task 2 — Update `FightTestService`

**Owner:** Agent  
**Blocked by:** Task 1  
**Files:** `src/services/FightTestService.ts`

- [x] **2.1** Add `expertiseLevel: null` and `expertiseLevelMode: 'cumulative'` to the `DEFAULT` constant.
- [x] **2.2** In `read()`, after parsing the stored JSON, add validation for the two new fields:
  - If `parsed.expertiseLevel` is not `null` and not a member of `EXPERTISE_LEVELS`, replace it with `null`.
  - If `parsed.expertiseLevelMode` is not `'strict'` and not `'cumulative'`, replace it with `'cumulative'`.
- [x] **2.3** Verify TypeScript compiles for this file (other files may still fail due to Task 8 being pending).

**Acceptance criteria:** Req 5.1–5.5, Req 8.2–8.3

---

## Task 3 — Extend `AdhocFilterEngine` ✅

**Owner:** Agent  
**Blocked by:** Task 1  
**Files:** `src/utils/AdhocFilterEngine.ts`

- [x] **3.1** Import `expertiseLevelRank` from `src/types/index.ts`.
- [x] **3.2** Add a new private static predicate method `passesExpertiseLevel(t: Technique, ft: FightTest): boolean`:
  ```typescript
  private static passesExpertiseLevel(t: Technique, ft: FightTest): boolean {
    if (ft.expertiseLevel === null) return true
    const techRank = expertiseLevelRank(t.expertiseLevel ?? 'yellow')
    if (ft.expertiseLevelMode === 'strict') {
      return t.expertiseLevel === ft.expertiseLevel
    }
    return techRank <= expertiseLevelRank(ft.expertiseLevel)
  }
  ```
- [x] **3.3** Wire `passesExpertiseLevel` into `filter()` as the fifth conjunctive dimension, after `passesSide`.
- [x] **3.4** Verify no changes are made to any of the existing four predicate methods.
- [x] **3.5** Verify TypeScript compiles for this file.

**Acceptance criteria:** Req 4.1–4.6, Req 8.1

---

## Task 4 — Create `ExpertiseLevelFilterControl` ✅

**Owner:** Agent  
**Blocked by:** Task 1  
**Files:** `src/components/ExpertiseLevelFilterControl.ts` *(new file)*

- [x] **4.1** Create the file and export the `ExpertiseLevelFilterValues` interface:
  ```typescript
  export interface ExpertiseLevelFilterValues {
    expertiseLevel: ExpertiseLevel | null
    expertiseLevelMode: 'strict' | 'cumulative'
  }
  ```
- [x] **4.2** Export the `ExpertiseLevelFilterControl` interface:
  ```typescript
  export interface ExpertiseLevelFilterControl {
    element: HTMLElement
    getValues(): ExpertiseLevelFilterValues
    populate(values: ExpertiseLevelFilterValues): void
  }
  ```
- [x] **4.3** Implement and export `buildExpertiseLevelFilterControl(onChange: (values: ExpertiseLevelFilterValues) => void): ExpertiseLevelFilterControl`:
  - Render a `<div class="mb-3">` wrapper containing:
    - A `<label class="form-label fw-semibold">` reading "Expertise Level" with a `<small class="text-muted fw-normal">(none = any)</small>` hint.
    - A level selector `btn-group`: one `btn-check` radio for "Any" (value `""`, checked by default) followed by one `btn-check` radio per entry in `EXPERTISE_LEVELS` (generated from the array — no hard-coded list). All label elements set `style="min-height:44px"`.
    - A mode toggle `btn-group` (id `el-mode-group`): two `btn-check` radios — "Up to" (value `cumulative`, checked by default) and "Strict" (value `strict`). All labels set `style="min-height:44px"`.
  - When the level selector changes to "Any" (empty value): set `disabled = true` on both mode inputs and add `opacity-50 pe-none` to the mode group wrapper.
  - When the level selector changes to any non-empty value: remove `disabled` and remove `opacity-50 pe-none`.
  - Wire `change` event on both groups to call `onChange(getValues())` after updating disabled state.
  - `getValues()`: reads checked level radio (empty string → `null`) and checked mode radio (`'strict'` or `'cumulative'`).
  - `populate({ expertiseLevel, expertiseLevelMode })`: checks the matching level radio (null → "Any"), checks the matching mode radio, then calls the disabled-state sync helper.
- [x] **4.4** Implement and export `expertiseLevelBadgeHtml(level: ExpertiseLevel | undefined): string`:
  - Use `EXPERTISE_LEVELS.includes(...)` to guard against undefined/invalid levels (fall back to `'yellow'`).
  - Build a `classMap` keyed on `ExpertiseLevel` (no switch statement — derive from the array or a plain object literal):
    - `yellow`: `bg-warning text-dark`
    - `orange`: `bg-warning text-dark el-badge--orange`
    - `green`: `bg-success text-white`
    - `blue`: `bg-primary text-white`
    - `brown`: `bg-secondary text-white`
    - `black-dan-1`: `bg-dark text-white`
  - Return `<span class="badge ${classes} ms-1">${displayLabel}</span>` where the display label capitalises the first letter and replaces hyphens with spaces.
- [x] **4.5** Verify TypeScript compiles for this file.

**Acceptance criteria:** Req 3.1, Req 6.5, Req 7.3–7.4, Req 9.1–9.5

---

## Task 5 — Integrate into `FightTestFilterForm`

**Owner:** Agent  
**Blocked by:** Task 4  
**Files:** `src/components/FightTestFilterForm.ts`

- [x] **5.1** Import `buildExpertiseLevelFilterControl` and `ExpertiseLevelFilterControl` from `./ExpertiseLevelFilterControl`.
- [x] **5.2** Add a private field `private elControl: ExpertiseLevelFilterControl | null = null`.
- [x] **5.3** At the end of `buildForm()`, mount the expertise level section:
  ```typescript
  const elSection = buildExpertiseLevelFilterControl(notify)
  this.elControl = elSection
  form.appendChild(elSection.element)
  ```
- [x] **5.4** Extend `getValues()` to spread in the expertise-level values:
  ```typescript
  ...( this.elControl?.getValues() ?? { expertiseLevel: null, expertiseLevelMode: 'cumulative' } ),
  ```
- [x] **5.5** Extend `populate()` to restore expertise-level state:
  ```typescript
  this.elControl?.populate({
    expertiseLevel:     values.expertiseLevel,
    expertiseLevelMode: values.expertiseLevelMode,
  })
  ```
- [x] **5.6** Verify that no existing form section is modified; all changes are additive.
- [x] **5.7** Verify TypeScript compiles for this file.

**Acceptance criteria:** Req 3.1–3.9, Req 5.1–5.2

---

## Task 6 — Integrate into `TechniqueAddModal`

**Owner:** Agent  
**Blocked by:** Task 4  
**Files:** `src/components/TechniqueAddModal.ts`

- [x] **6.1** Import `buildExpertiseLevelFilterControl`, `expertiseLevelBadgeHtml`, and `ExpertiseLevelFilterControl` from `./ExpertiseLevelFilterControl`.
  Also import `expertiseLevelRank` from `../types/index`.
- [x] **6.2** Add a private field `private elControl: ExpertiseLevelFilterControl | null = null`.
- [x] **6.3** In the modal's search bar HTML template (inside `initializeModal()`), add a container div after the category `<select>` and before the "Add All" button:
  ```html
  <div class="technique-add-modal__el-filter"></div>
  ```
- [x] **6.4** After `this.setupEventListeners()` in `initializeModal()`, mount the control into the container:
  ```typescript
  const elContainer = this.modal.querySelector('.technique-add-modal__el-filter') as HTMLElement
  const elCtrl = buildExpertiseLevelFilterControl(() => this.filterTechniques())
  this.elControl = elCtrl
  elCtrl.populate({ expertiseLevel: null, expertiseLevelMode: 'cumulative' }) // reset on open (Req 6.4)
  elContainer.appendChild(elCtrl.element)
  ```
- [x] **6.5** Extend `filterTechniques()` to apply the expertise-level predicate after the existing search and category filters.
- [x] **6.6** In `renderTechniqueList()`, add the badge after the `<span class="technique-category">` line inside each item's `.technique-item__info` block.
- [x] **6.7** Verify the filter resets to "Any level" / "Up to" every time `show()` is called (it does by construction — confirmed by inspection).
- [x] **6.8** Verify TypeScript compiles for this file.

**Acceptance criteria:** Req 6.1–6.4, Req 7.2, Req 9.1

---

## Task 7 — Add Badge to `FightListUIManager`

**Owner:** Agent  
**Blocked by:** Task 4  
**Files:** `src/managers/FightListUIManager.ts`

- [x] **7.1** Import `expertiseLevelBadgeHtml` from `../components/ExpertiseLevelFilterControl`.
- [x] **7.2** In `renderTechniquesList()`, for each technique entry look up the full `Technique` object from `TechniqueManager`.
- [x] **7.3** In the template string for each list item, insert the badge immediately after the `<span class="technique-name...">` element.
- [x] **7.4** Verify no other part of `renderTechniquesList()` is modified.
- [x] **7.5** Verify TypeScript compiles for this file.

**Acceptance criteria:** Req 7.1, Req 7.5

---

## Task 8 — Assign ExpertiseLevel to All Techniques ⚠️ HUMAN TASK

**Owner:** Developer (human) — **the agent must NOT do this task**  
**Blocked by:** Task 1 (field must exist on the interface first)  
**Files:** `src/managers/TechniqueManager.ts`

Open `src/managers/TechniqueManager.ts` and add `expertiseLevel: '<your-choice>'` to every
technique object. Each value must be one of: `'yellow'`, `'orange'`, `'green'`, `'blue'`, `'brown'`, `'black-dan-1'`.

The full list of techniques is grouped below to make it easier to work through systematically.
Check each one off as you assign it.

---

### Punches (7 techniques)

- [ ] `Left Uppercot`
- [ ] `Right Uppercot`
- [ ] `Left Hook`
- [ ] `Right Hook`
- [ ] `Left Straight Punch`
- [ ] `Right Straight Punch`
- [ ] `Head Left Right`

---

### Strikes (6 techniques)

- [ ] `Head Left Palm Heel Strike`
- [ ] `Head Right Palm Heel Strike`
- [ ] `Left Back Fist`
- [ ] `Right Back Fist`
- [ ] `Left Back Fist.Rotational Motion`
- [ ] `Right Back Fist. Rotational Motion`

---

### Elbow Strikes (3 techniques)

- [ ] `Left Elbow Strike Against Group Of People`
- [ ] `Right Elbow Strike Against Group Of People`
- [ ] `Bocking Way By Group Of People`

---

### Kicks — Basic (16 techniques)

- [ ] `Right Jumping Double Roundhouse Kick`
- [ ] `Left Jumping Double Roundhouse Kick`
- [ ] `Right Jumping Roundhouse Kick`
- [ ] `Left Jumping Roundhouse Kick`
- [ ] `Right Side Kick`
- [ ] `Left Side Kick`
- [ ] `Right Knee Front Kick`
- [ ] `Left Knee Front Kick`
- [ ] `Left High Front Kick`
- [ ] `Right High Front Kick`
- [ ] `Left Middle Front Kick`
- [ ] `Right Middle Front Kick`
- [ ] `Right Round Kick High`
- [ ] `Left Round Kick High`
- [ ] `Right Low Kick`
- [ ] `Left Low Kick`

---

### Kicks — Advanced (28 techniques)

- [ ] `Left Question Mark Kick`
- [ ] `Right Question Mark Kick`
- [ ] `Left Back Round House Kick`
- [ ] `Right Back Round House Kick`
- [ ] `Left Axe Kick`
- [ ] `Right Axe Kick`
- [ ] `Left Turn Back Round House Kick`
- [ ] `Right Turn Back Round House Kick`
- [ ] `Left Block Front Round House Kick`
- [ ] `Right Block Front Round House Kick`
- [ ] `Left Block Round House Kick To Ribs`
- [ ] `Right Block Round House Kick To Ribs`
- [ ] `Left Front Kick And Round House Kick`
- [ ] `Right Front Kick And Round House Kick`
- [ ] `Left Turn Back Round Slap Kick`
- [ ] `Right Turn Back Round Slap Kick`
- [ ] `Left Side Knee Kick`
- [ ] `Right Side Knee Kick`
- [ ] `Left Underhook Front Kick`
- [ ] `Right Underhook Front Kick`
- [ ] `Left Underhook Back Kick`
- [ ] `Right Underhook Back Kick`
- [ ] `Left Underhook Back And Front Kick`
- [ ] `Right Underhook Back And Front Kick`
- [ ] `Right Regular Hill Kick To Chin`
- [ ] `Left Regular Hill Kick To Chin`
- [ ] `Right Regular Backward Kick`
- [ ] `Left Regular Backward Kick`
- [ ] `Right Snooker Backward Kick`
- [ ] `Left Snooker Backward Kick`
- [ ] `Right Front Kick Left Round House Jump Kick`
- [ ] `Left Front Kick Right Round House Jump Kick`

---

### Slip / Defence Against Kicks (3 techniques)

- [ ] `Left Slipping Against Front Kick In Dead Zone`
- [ ] `Left Slipping Against Front Kick In Live Zone`
- [ ] `Right Slipping Against Front Kick In Live Zone`

---

### Defence — Kicks (16 techniques)

- [ ] `Left Internal Defence Against Round Kick - Side Kick`
- [ ] `Right Internal Defence Against Round Kick - Side Kick`
- [ ] `Left Internal Defence Against Front Kick To Chin`
- [ ] `Right Internal Defence Against Front Kick To Chin`
- [ ] `Left Internal Defence Against Round Kick - Back Kick`
- [ ] `Right Internal Defence Against Round Kick - Back Kick`
- [ ] `Left Internal Defence Against Side Kick`
- [ ] `Right Internal Defence Against Side Kick - Back Kick`
- [ ] `Left External Defence Against Front Kick. Break Through`
- [ ] `Right External Defence Against Front Kick. Break Through`
- [ ] `Left Internal Defence Against Front Kick - Leg Sweep`
- [ ] `Right Internal Defence Against Front Kick - Leg Sweep`
- [ ] `Left External Defence Against Front Kick - Short Sweep`
- [ ] `Right Internal Defence Against Front Kick - Short Sweep`
- [ ] `Left Defence From The Round House Kick. Break Through`
- [ ] `Right Defence From The Round House Kick. Break Through`

---

### Defence — Other (2 techniques)

- [ ] `Left Release From A Side Neck Grab And Take Down`
- [ ] `Right Release From A Side Neck Grab And Take Down`

---

### Knife — Attacks (responding, 28 techniques)

- [ ] `Right Hand Knife Top Front Attack`
- [ ] `Left Hand Knife Top Front Attack`
- [ ] `Right Hand Knife Ribs Side Attack`
- [ ] `Left Hand Knife Ribs Side Attack`
- [ ] `Right Hand Knife Stomach Side Attack`
- [ ] `Left Hand Knife Stomach Side Attack`
- [ ] `Right Hand Knife Bottom Front Attack`
- [ ] `Left Hand Knife Bottom Front Attack`
- [ ] `Left Hand Knife Top Back Attack`
- [ ] `Right Hand Knife Top Back Attack`
- [ ] `Left Attacker Attacks From Side Upfront`
- [ ] `Right Attacker Attacks From Side Upfront`
- [ ] `Left Attacker Attacks From Back Side Up`
- [ ] `Right Attacker Attacks From Back Side Up`
- [ ] `Left Attacker Attacks From Side Infront`
- [ ] `Right Attacker Attacks From Side Infront`
- [ ] `Left Attacker Attacks From Side Back`
- [ ] `Right Attacker Attacks From Side Back`
- [ ] `Left Attacker Attacks From Side Bottom`
- [ ] `Right Attacker Attacks From Side Bottom`
- [ ] `Left Attacker Attacks From Side Bottom Behind`
- [ ] `Right Attacker Attacks From Side Bottom Behind`
- [ ] `Left Attacker Attacks From Side. Straight Attack`
- [ ] `Right Attacker Attacks From Side. Straight Attack`
- [ ] `Left Hand Knife Oriental Back Attack`
- [ ] `Right Hand Knife Oriental Back Attack`
- [ ] `Left Straight Bottom Attack`
- [ ] `Right Straight Bottom Attack`

---

### Knife — Threats (responding, 8 techniques)

- [ ] `Right Hand Knife Threat To Left Neck Next to Wall`
- [ ] `Left Hand Knife Threat To Right Neck Next To Wall`
- [ ] `Left Hand Knife Threat Blade To Throat`
- [ ] `Right Hand Knife Threat To Right Neck`
- [ ] `Left Hand Knife Threat Blade To Throat.Straight Hand`
- [ ] `Right Hand Knife Threat Blade To Right Neck.Straight Hand`
- [ ] `Left Hand Knife Threat Point To Throat.Straight Hand`
- [ ] `Right Hand Knife Threat Point To Right Neck.Straight Hand`

---

### Knife — Defences (performing, 12 techniques)

- [ ] `Left Defence Against Straight Attack From Side. Dead Side`
- [ ] `Right Defence Against Straight Attack From Side. Dead Side`
- [ ] `Left Defence Against Straight Attack From Side. Live Side`
- [ ] `Right Defence Against Straight Attack From Side. Live Side`
- [ ] `Left Defence Against Oriental Knife Attack. Hands`
- [ ] `Right Defence Against Oriental Knife Attack. Hands`
- [ ] `Left Defence Against Straight Bottom Attack`
- [ ] `Right Defence Against Straight Bottom Attack`
- [ ] `Left Internal Defence Against Straight Attack From Side. Live Side`
- [ ] `Right Internal Defence Against Straight Attack From Side. Live Side`
- [ ] `Left Internal Defence Against Straight Attack From Side. Dead Side`
- [ ] `Right Internal Defence Against Straight Attack From Side. Dead Side`

---

### Hand-Grip (3 techniques)

- [ ] `Left Hand Grip`
- [ ] `Right Hand Grip`
- [ ] `Laying Both Hands Grip`

---

### Choke — Ground (8 techniques)

- [ ] `Release From Choke on the ground. Straight Arms`
- [ ] `Choke on the ground. Straight Arms`
- [ ] `Release From Choke on the ground. Bent Arms`
- [ ] `Choke on the ground. Bent Arms`
- [ ] `Tight Choke on the ground.`
- [ ] `Release From Tight Choke on the ground.`
- [ ] `Release From Side Choke on the ground.`
- [ ] `Side Choke on the ground.`

---

### Knee Protection (2 techniques)

- [ ] `Left Defend Against Left Round Knee`
- [ ] `Right Protect Against Left Round Knee`

---

### Defences / Grabs / Take Down (2 techniques)

- [ ] `Fall Prevention Grab Calves In Front To Take Down`
- [ ] `Grab Calves In Front To Take Down`

---

**Total: ~144 techniques across 14 categories.**

Once all techniques have a value, run `npx tsc --noEmit` and confirm zero errors before handing
back to the agent for Task 9.

---

## Task 9 — Build Verification and Smoke Test

**Owner:** Agent (after Task 8 is complete)  
**Blocked by:** Tasks 1–8  

- [ ] **9.1** Run `npx tsc --noEmit` and confirm zero TypeScript errors.
- [ ] **9.2** Run the project build (`npm run build` or equivalent) and confirm it succeeds.
- [ ] **9.3** Manual smoke test — Fight Test tab:
  - Open the app, switch to the Fight Test tab.
  - Confirm the Expertise Level section renders below the Shuffle Mode selector.
  - Select a Mode (e.g. PERFORMING); confirm match count updates.
  - Select "Green" with "Up to" mode; confirm match count decreases to yellow+orange+green techniques.
  - Select "Green" with "Strict" mode; confirm match count shows only green techniques.
  - Select "Any level"; confirm match count returns to full unfiltered count.
  - Reload the page; confirm expertise-level filter state is restored from localStorage.
- [ ] **9.4** Manual smoke test — Technique Add Modal:
  - Open any Fight List, click "Add Technique".
  - Confirm the expertise-level filter section renders in the search bar area.
  - Select a level and confirm the technique list narrows immediately.
  - Close and reopen the modal; confirm the filter resets to "Any level".
  - Confirm each technique shows a coloured badge next to its name.
- [ ] **9.5** Manual smoke test — Fight List card:
  - Expand a Fight List card; confirm each technique row shows a coloured badge.
  - Confirm badges match the `expertiseLevel` values assigned in Task 8.
- [ ] **9.6** Regression check — start a Fight List session and confirm existing behaviour is unchanged.
- [ ] **9.7** Regression check — start a Fight Test session with no expertise filter and confirm it works identically to before this feature.

**Acceptance criteria:** Req 8.4 (zero TypeScript errors), all smoke tests pass

---

## Optional Task 10 — Orange Badge CSS Rule

**Owner:** Agent (only if the orange badge is visually indistinguishable from yellow in testing)  
**Blocked by:** Task 9  
**Files:** `src/styles/fightList.css`

- [ ] **10.1** Add a single BEM-scoped CSS rule to `fightList.css`:
  ```css
  /* Expertise level badge — orange override (Bootstrap bg-warning is too similar to yellow) */
  .el-badge--orange {
    background-color: #fd7e14 !important; /* Bootstrap $orange */
    color: #fff !important;
  }
  ```
- [ ] **10.2** Verify no other CSS is changed.

**Acceptance criteria:** Req 7.3, Req 9.5

---

## File Change Summary

| File | Task | Change type |
|---|---|---|
| `src/types/index.ts` | 1 | Modified — add type, constant, helper, extend interfaces |
| `src/services/FightTestService.ts` | 2 | Modified — update DEFAULT, add validation |
| `src/utils/AdhocFilterEngine.ts` | 3 | Modified — add predicate, wire into filter() |
| `src/components/ExpertiseLevelFilterControl.ts` | 4 | **New** — shared control + badge helper |
| `src/components/FightTestFilterForm.ts` | 5 | Modified — mount control, extend getValues/populate |
| `src/components/TechniqueAddModal.ts` | 6 | Modified — mount control, extend filter, add badge |
| `src/managers/FightListUIManager.ts` | 7 | Modified — add badge to technique list |
| `src/managers/TechniqueManager.ts` | 8 (**human**) | Modified — assign expertiseLevel on every technique |
| `src/styles/fightList.css` | 10 (optional) | Modified — one orange badge CSS rule |

No changes to: `SessionManager`, `AudioManager`, `FightListManager`, `StorageService`,
`TabBar`, `FightTestTabPane`, `TechniqueSelectionStrategy`, `app.ts`, `index.html`.
