# Requirements Document

## Introduction

This feature adds an **Expertise Level** field to every technique in the catalogue, representing the martial-arts belt/grade progression at which the technique is typically introduced. Six levels are defined, ordered from beginner to advanced:

| Rank | Value | Display label |
|---|---|---|
| 1 (lowest) | `yellow` | Yellow |
| 2 | `orange` | Orange |
| 3 | `green` | Green |
| 4 | `blue` | Blue |
| 5 | `brown` | Brown |
| 6 (highest) | `black-dan-1` | Black Dan 1 |

Each technique is assigned exactly one expertise level. The feature also adds an **Expertise Level filter** to every place in the app where techniques are filtered or displayed — the **Fight Test** tab and the **Fight Lists** technique-picker modal — so the trainer can restrict a session to a specific level or to a level plus all levels below it (the "cumulative" mode).

---

## Glossary

- **ExpertiseLevel**: One of the six enumerated string values: `yellow`, `orange`, `green`, `blue`, `brown`, `black-dan-1`. Represents a martial-arts belt/grade rank.
- **ExpertiseLevel_Rank**: An integer 1–6 that encodes the position of an `ExpertiseLevel` in the hierarchy (`yellow=1` … `black-dan-1=6`). Used internally for range comparisons; never stored or displayed directly.
- **Strict_Filter**: An expertise-level filter mode that matches only techniques whose `expertiseLevel` equals the selected level exactly.
- **Cumulative_Filter**: An expertise-level filter mode that matches techniques whose `expertiseLevel` is less than or equal to (i.e. ranked at or below) the selected level. E.g., selecting `green` in cumulative mode matches `yellow`, `orange`, and `green`.
- **ExpertiseLevel_Filter**: The UI control (a level selector + a mode toggle) that lets the user choose either a Strict_Filter or a Cumulative_Filter. "No filter" (default) means all expertise levels are accepted.
- **Fight_Test**: The Adhoc Fight Test tab (`FightTest` / `FightTestFilterValues` types in `src/types/index.ts`).
- **Fight_List_Technique_Picker**: The `TechniqueAddModal` that lets the user add a technique from the catalogue to a Fight List.
- **AdhocFilterEngine**: The stateless filter class in `src/utils/AdhocFilterEngine.ts` that applies `FightTest` parameters to the catalogue.
- **Technique_Catalogue**: The complete list of all `Technique` objects loaded by `TechniqueManager`, regardless of their `selected` flag.

---

## Requirements

---

### Requirement 1: ExpertiseLevel Type and Hierarchy

**User Story:** As a developer, I want a well-defined `ExpertiseLevel` type with a stable rank ordering, so that filtering and display logic can rely on a single authoritative definition.

#### Acceptance Criteria

1. THE codebase SHALL define an `ExpertiseLevel` type (string union) in `src/types/index.ts` with exactly the following six values:  
   `'yellow' | 'orange' | 'green' | 'blue' | 'brown' | 'black-dan-1'`.
2. THE codebase SHALL define an ordered constant array `EXPERTISE_LEVELS: readonly ExpertiseLevel[]` (in `src/types/index.ts` or a dedicated constants file) that lists the levels from lowest to highest:  
   `['yellow', 'orange', 'green', 'blue', 'brown', 'black-dan-1']`.
   The index of each level in this array is its zero-based rank (`yellow` = 0, `black-dan-1` = 5).
3. A helper function `expertiseLevelRank(level: ExpertiseLevel): number` SHALL be implemented that returns the 0-based index of `level` in `EXPERTISE_LEVELS`.
4. THE `expertiseLevelRank` function SHALL be the single source of truth for rank comparisons used by filter predicates; no other code SHALL hard-code level rankings.
5. THE `ExpertiseLevel` type, `EXPERTISE_LEVELS` array, and `expertiseLevelRank` function SHALL be exported and available for import by all feature files that need them.

---

### Requirement 2: ExpertiseLevel Field on Technique

**User Story:** As a trainer, I want every technique to carry its expertise-level designation, so that I can build sessions focused on my current or target belt grade.

#### Acceptance Criteria

1. THE `Technique` interface in `src/types/index.ts` SHALL be extended with a required field `expertiseLevel: ExpertiseLevel`.
2. THE **developer** (not the implementing agent) is responsible for going over every existing technique in `TechniqueManager.loadTechniques()` and assigning the correct `ExpertiseLevel` value based on their domain knowledge of the curriculum. The agent SHALL NOT guess or infer expertise levels on the developer's behalf.
3. EVERY technique object in `TechniqueManager.loadTechniques()` SHALL be assigned a **valid** `ExpertiseLevel` value — one of `'yellow'`, `'orange'`, `'green'`, `'blue'`, `'brown'`, or `'black-dan-1'` — as decided by the developer. No technique entry SHALL be left without this field.
4. THE implementing agent SHALL NOT use a placeholder value such as `'NONE'`, `'unknown'`, `'tbd'`, or any other string that is not a member of the `ExpertiseLevel` union. Doing so would cause a TypeScript compilation error and break the build.
5. BECAUSE the `expertiseLevel` field is typed as `ExpertiseLevel` (a strict string union), the TypeScript compiler SHALL reject any technique object whose `expertiseLevel` is not one of the six valid values. The build MUST compile without errors after this feature is implemented.
6. IF a technique's `expertiseLevel` is missing or has an unrecognised value at runtime (e.g., loaded from old localStorage data), THE system SHALL default it to `'yellow'` rather than throwing an error.
7. THE `expertiseLevel` field SHALL NOT affect any existing behaviour (session start, audio playback, priority, ordering) when no ExpertiseLevel_Filter is active.

---

### Requirement 3: ExpertiseLevel Filter in Fight Test

**User Story:** As a trainer, I want to filter the Fight Test session by expertise level, so that I can train only techniques appropriate to my current or target belt grade.

#### Acceptance Criteria

1. THE Fight Test filter form (`FightTestFilterForm`) SHALL include an **ExpertiseLevel_Filter** control section containing:
   - A level selector: a toggle group or `<select>` presenting all six `ExpertiseLevel` values plus a "Any level" option (no restriction). The default SHALL be "Any level" (no restriction).
   - A filter-mode toggle: two mutually exclusive options — **"Strict"** (exact match) and **"Up to"** (cumulative, includes all levels at or below the selected level). The default SHALL be "Up to". This toggle SHALL be disabled and visually suppressed when "Any level" is selected.
2. WHEN "Any level" is selected, THE ExpertiseLevel_Filter SHALL accept techniques with any `expertiseLevel` value (no restriction).
3. WHEN a specific level is selected with filter mode "Strict", THE ExpertiseLevel_Filter SHALL accept only techniques whose `expertiseLevel` exactly equals the selected level.
4. WHEN a specific level is selected with filter mode "Up to", THE ExpertiseLevel_Filter SHALL accept techniques whose `expertiseLevelRank` is less than or equal to the rank of the selected level.
5. THE ExpertiseLevel_Filter state SHALL be included in `FightTestFilterValues` via two new fields:
   - `expertiseLevel: ExpertiseLevel | null` — the selected level; `null` means "Any level" (no restriction).
   - `expertiseLevelMode: 'strict' | 'cumulative'` — the filter mode. Ignored when `expertiseLevel` is `null`.
6. THE default `FightTestFilterValues` (used when no persisted state exists) SHALL have `expertiseLevel: null` and `expertiseLevelMode: 'cumulative'`.
7. THE ExpertiseLevel_Filter control SHALL update the live Match_Count immediately on every change, consistent with the behaviour of all other filter controls (Req 11.2 of spec 05).
8. THE ExpertiseLevel_Filter controls SHALL use Bootstrap 5 form classes and existing CSS custom properties only. No new CSS rules SHALL be introduced.
9. THE ExpertiseLevel_Filter section SHALL respect the minimum touch target height of 44 px for all interactive elements on mobile viewports.

---

### Requirement 4: ExpertiseLevel Filter Predicate in AdhocFilterEngine

**User Story:** As a developer, I want the filter engine to enforce the expertise-level constraint, so that only the intended techniques reach the session.

#### Acceptance Criteria

1. `AdhocFilterEngine.filter()` SHALL apply an **expertise-level predicate** as an additional conjunctive filter dimension alongside the existing mode, targetLevel, category, and side dimensions.
2. WHEN `ft.expertiseLevel` is `null`, THE expertise-level predicate SHALL return `true` for every technique (no restriction).
3. WHEN `ft.expertiseLevel` is non-null and `ft.expertiseLevelMode` is `'strict'`, THE expertise-level predicate SHALL return `true` only when `t.expertiseLevel === ft.expertiseLevel`.
4. WHEN `ft.expertiseLevel` is non-null and `ft.expertiseLevelMode` is `'cumulative'`, THE expertise-level predicate SHALL return `true` only when `expertiseLevelRank(t.expertiseLevel) <= expertiseLevelRank(ft.expertiseLevel)`.
5. THE expertise-level predicate SHALL be implemented as a private static method on `AdhocFilterEngine` (consistent with the existing `passesMode`, `passesTargetLevel`, etc. pattern) and wired into `filter()`.
6. IF `t.expertiseLevel` is undefined or an unrecognised value, THE predicate SHALL treat it as `'yellow'` for rank-comparison purposes (consistent with Req 2.3).

---

### Requirement 5: Persistence of ExpertiseLevel Filter State

**User Story:** As a trainer, I want my expertise-level filter settings to be saved automatically, so that they are restored the next time I open the app.

#### Acceptance Criteria

1. WHEN the user changes the ExpertiseLevel_Filter (level selector or mode toggle), `FightTestService.write()` SHALL persist the updated `FightTest` value to localStorage immediately — consistent with how all other filter dimensions are persisted (Req 6.1 of spec 05).
2. WHEN the application loads, `FightTestService.read()` SHALL restore the `expertiseLevel` and `expertiseLevelMode` fields from localStorage into the filter form.
3. IF the stored `expertiseLevel` is absent or not a valid `ExpertiseLevel` value, THE system SHALL default to `null` (no restriction).
4. IF the stored `expertiseLevelMode` is absent or not `'strict'` or `'cumulative'`, THE system SHALL default to `'cumulative'`.
5. THE two new fields SHALL be added to the existing `FightTest` / `FightTestFilterValues` types; no new storage keys or separate persistence services SHALL be introduced.

---

### Requirement 6: ExpertiseLevel Filter in Fight List Technique Picker

**User Story:** As a trainer, I want to filter the technique picker by expertise level when adding techniques to a Fight List, so that I can quickly find techniques appropriate to my grade.

#### Acceptance Criteria

1. THE Fight_List_Technique_Picker (`TechniqueAddModal`) SHALL display an **ExpertiseLevel_Filter** section with the same level-selector and filter-mode toggle described in Req 3.1.
2. WHEN an `ExpertiseLevel` is selected in the picker, THE displayed technique list SHALL update immediately to show only the techniques that pass the expertise-level filter (Strict or Cumulative, as configured).
3. WHEN "Any level" is selected in the picker, ALL techniques (subject to any other existing filters already present in the modal) SHALL be shown.
4. THE picker ExpertiseLevel_Filter state SHALL NOT be persisted; it SHALL reset to "Any level" / "Up to" each time the modal is opened.
5. THE ExpertiseLevel_Filter in the picker SHALL be implemented as a self-contained UI component (or reuse the same form-building helper used in `FightTestFilterForm`) to avoid duplication.

---

### Requirement 7: ExpertiseLevel Display in Technique Lists

**User Story:** As a trainer, I want to see the expertise level of each technique wherever techniques are listed, so that I can understand what belt grade each technique belongs to.

#### Acceptance Criteria

1. WHEN a technique is rendered in a Fight List's technique list (inside `FightListUIManager.renderTechniquesList()`), THE UI SHALL display its `expertiseLevel` as a small colour-coded badge next to the technique name.
2. WHEN a technique is rendered in the Fight_List_Technique_Picker, THE UI SHALL display its `expertiseLevel` as a colour-coded badge, consistent with Req 7.1.
3. THE colour coding for expertise-level badges SHALL follow a consistent mapping across the whole application. A suggested (non-normative) mapping:

   | Level | Bootstrap badge colour |
   |---|---|
   | yellow | `bg-warning text-dark` |
   | orange | `bg-orange` (custom) or `bg-warning` with orange override |
   | green | `bg-success` |
   | blue | `bg-primary` |
   | brown | `bg-secondary` |
   | black-dan-1 | `bg-dark` |

4. THE badge SHALL be implemented using Bootstrap `badge` component classes. No new CSS rules SHALL be required beyond a single optional colour override for `orange` if Bootstrap's `bg-warning` is considered insufficiently distinct.
5. THE badge SHALL be visible in both the collapsed (header) and expanded (card body) views of a Fight List card.

---

### Requirement 8: Validation and Defensive Behaviour

**User Story:** As a developer, I want the system to be robust against techniques that are missing an expertise level, so that old data or future data-entry errors do not break sessions.

#### Acceptance Criteria

1. WHEN `AdhocFilterEngine` encounters a technique with no `expertiseLevel` field (e.g. loaded from old localStorage), IT SHALL treat `expertiseLevel` as `'yellow'` for all filter and display purposes.
2. WHEN `FightTestService.read()` returns a stored object whose `expertiseLevel` field is not a valid `ExpertiseLevel` value, THE service SHALL replace it with `null` before returning the `FightTest` object.
3. WHEN `FightTestService.read()` returns a stored object whose `expertiseLevelMode` field is not `'strict'` or `'cumulative'`, THE service SHALL replace it with `'cumulative'` before returning the `FightTest` object.
4. THE TypeScript compiler SHALL emit a type error if any location in the codebase constructs a `Technique` object without supplying the `expertiseLevel` field, or supplies a value that is not a member of the `ExpertiseLevel` union (see Req 2.3 and Req 2.4). The project build SHALL produce zero TypeScript errors after this feature is implemented.

---

### Requirement 9: UI Styling Consistency

**User Story:** As a trainer, I want all new expertise-level UI elements to look and feel like the rest of the application, so that the interface remains coherent.

#### Acceptance Criteria

1. ALL new controls (level selector, filter-mode toggle, badges) SHALL use Bootstrap 5 utility and component classes consistent with the existing form controls in `FightTestFilterForm` and `FightListUIManager`.
2. THE expertise-level level selector in the Fight Test tab SHALL follow the same `btn-group` toggle pattern used by the existing Mode, Side, and Category selectors.
3. THE filter-mode toggle ("Strict" / "Up to") SHALL use a compact two-button `btn-group` with `btn-outline-secondary` style, consistent with the Side selector pattern.
4. WHEN the filter-mode toggle is disabled (because "Any level" is selected), it SHALL use Bootstrap's native `disabled` attribute so the browser renders the disabled state consistently with other disabled controls.
5. ALL new CSS rules, if any are strictly necessary (e.g., for the orange badge colour), SHALL follow BEM naming conventions and be added to the existing stylesheet (`fightList.css` or `main.css`). No inline styles SHALL be introduced.
6. ALL new interactive elements SHALL meet the WCAG 2.1 AA minimum colour contrast ratio of 4.5:1 for text and 3:1 for non-text UI components.
7. ALL new interactive elements SHALL have a minimum touch target height of 44 px on mobile viewports (`min-height: 44px`), consistent with the existing form controls.

---

### Requirement 10: Extensibility

**User Story:** As a developer, I want the expertise-level hierarchy to be extensible, so that new belt grades can be added in the future by updating a single constant rather than scattered conditionals.

#### Acceptance Criteria

1. THE `EXPERTISE_LEVELS` array (Req 1.2) SHALL be the single authoritative source for the ordered list of levels. All rank comparisons, filter predicates, badge renderers, and UI option lists SHALL derive their data from this array — not from hard-coded level lists or switch statements.
2. ADDING a new level to the `EXPERTISE_LEVELS` array SHALL be sufficient to make it appear in all filter controls and badge renderers without any other code changes (other than assigning the new level to techniques in `TechniqueManager`).
3. THE `expertiseLevelRank` helper SHALL compute ranks dynamically from `EXPERTISE_LEVELS.indexOf(level)`, not from a hard-coded numeric map.
