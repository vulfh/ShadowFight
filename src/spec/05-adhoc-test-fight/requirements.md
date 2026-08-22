# Requirements Document

## Introduction

The **Adhoc Fight Test (AFT)** feature adds a second content tab to the Training panel, sitting directly below the session controls (Start/Pause/Stop buttons). The new **"Fight Test"** tab lets the user define a dynamic filter over the full technique catalogue and immediately start a training session with the matching subset — without having to create or maintain a named Fight List.

All filter parameters are persisted in localStorage so that the user's last configuration is restored on every visit. The session controls always operate on whichever tab is currently active, preserving the existing Fight Lists workflow without any breaking changes.

The tab is labelled **"Fight Test"** because that is what it represents to the user. Internally the current implementation is "adhoc" (a single unnamed configuration) because the future capability to save multiple named Fight Tests — analogous to today's Fight Lists — has not yet been built. The `AdhocFightTest` data type defined here will be the foundation for that future feature.

---

## Glossary

- **AFT**: Adhoc Fight Test — a dynamically configured session built by filtering the full technique catalogue, rather than from a saved Fight List.
- **AFT_Config**: The single persisted `AdhocFightTest` instance used by the current adhoc workflow. Stored under a fixed id (`'adhoc'`).
- **AdhocFightTest**: A named, serialisable data type that captures all filter parameters for one test configuration (see Requirement 5).
- **Mode**: Either `PERFORMING` or `RESPONDING` — matches `src/constants/modes.ts`. A technique's `modes[]` array lists the modes in which it applies.
- **PlayMode**: One of `'Random' | 'Unified Random' | 'Ordered' | 'Prioritized'` — from `src/types/playMode.ts`.
- **PlayModeSelectorService**: The existing service (`src/services/PlayModeSelectorService.ts`) that persists and reads a `PlayMode` per entity id via `read(entityId)` / `write(entityId, mode)`.
- **Tab_Bar**: The extensible tab component added below the session controls in the Training panel. Initially contains two tabs: "Fight Lists" (default) and "Fight Test".
- **Active_Tab**: The tab currently selected in the Tab_Bar. The session controls operate on the Active_Tab.
- **Filter_Result**: The set of techniques produced by applying all AFT filter parameters to the full technique catalogue.
- **Technique_Catalogue**: The complete list of all `Technique` objects loaded by `TechniqueManager`, regardless of their `selected` flag.
- **Side_Filter**: The AFT filter parameter that limits techniques by their `side` field (`LEFT`, `RIGHT`, or `BOTH`). `BOTH` means no side restriction.
- **Inline_Validation_Error**: An error message rendered immediately adjacent to the offending control inside the AFT form, visible without any modal or toast.
- **Match_Count**: The real-time count of techniques in the Technique_Catalogue that satisfy the current AFT filter parameters. Displayed in the Fight Test tab and updated on every filter change.

---

## Requirements

---

### Requirement 1: Tab Bar Below Session Controls

**User Story:** As a user, I want a tab bar below the Start/Pause/Stop buttons in the Training panel, so that I can switch between the Fight Lists workflow and the new Fight Test workflow.

#### Acceptance Criteria

1. THE Tab_Bar SHALL be rendered directly below the session controls row (Start/Pause/Stop buttons) inside the Training panel card.
2. THE Tab_Bar SHALL display a "Fight Lists" tab and a "Fight Test" tab at all times.
3. WHEN the application loads, THE Tab_Bar SHALL activate the "Fight Lists" tab by default.
4. WHEN the user selects a tab, THE Tab_Bar SHALL display the content region for that tab and hide the content regions of all other tabs.
5. THE Tab_Bar SHALL be implemented using standard Bootstrap 5 `nav-tabs` or `nav-pills` markup so that adding a third or fourth tab requires only appending new tab items and pane elements — no Tab_Bar infrastructure code changes.
6. THE Tab_Bar SHALL use only existing Bootstrap 5 utility classes and the CSS custom properties already defined in `src/styles/main.css` (`--primary-color`, `--border-radius`, etc.). No new CSS classes or style rules SHALL be introduced.
7. THE Tab_Bar SHALL stack vertically and remain fully usable on viewports narrower than 768 px (col-12 mobile layout).
8. WHEN a session is active or paused, THE Tab_Bar SHALL disable tab switching — all tab items SHALL be rendered non-interactive. Tab switching SHALL become available again only when the session is stopped or naturally finishes.

---

### Requirement 2: Fight Lists Tab Content

**User Story:** As a user, I want the existing Fight Lists UI to be unchanged when the Fight Lists tab is active, so that my existing workflow is not disrupted.

#### Acceptance Criteria

1. WHEN the "Fight Lists" tab is active, THE Training_Panel SHALL display the existing Fight Lists content inline — the list of fight lists, selection controls, and Shuffle Mode selector — inside the tab pane.
2. THE standalone right-hand Fight Lists column (previously `col-12 col-lg-4`) SHALL be removed from the layout. All fight-list UI moves into the "Fight Lists" tab pane inside the Training panel.
3. WHEN the "Fight Lists" tab is active and the user presses Start, THE Session_Manager SHALL start a session using the currently selected fight list and its configured PlayMode — identical to the behaviour before this feature was introduced.

---

### Requirement 3: Fight Test Tab — Filter Form

**User Story:** As a user, I want to configure filter parameters in the Fight Test tab, so that I can define exactly which techniques are included in my session without creating a named fight list.

#### Acceptance Criteria

1. WHEN the "Fight Test" tab is active, THE Training_Panel SHALL display the AFT filter form with the following controls: Mode selector, Target Levels multi-select, Categories multi-select, Sides selector, and Shuffle Mode selector.
2. THE Mode_Selector SHALL present exactly two mutually exclusive options — `PERFORMING` and `RESPONDING` — as a toggle group (Bootstrap `btn-group` with radio buttons or equivalent).
3. THE Target_Levels_Selector SHALL present all nine `TargetLevel` values (`HEAD`, `NECK`, `CHEST`, `STOMACH`, `GROIN`, `HIP`, `SHIN`, `BACK`, `FOOT`) as individually toggleable options (multi-select). No selection means "match any target level".
4. THE Categories_Selector SHALL present all thirteen `TechniqueCategory` values as individually toggleable options (multi-select). No selection means "match any category".
5. THE Sides_Selector SHALL present three mutually exclusive options — `LEFT`, `RIGHT`, and `BOTH` — as a toggle group. Selecting `BOTH` (or leaving the selector unset) means "match either side".
6. THE Shuffle_Mode_Selector SHALL reuse `PlayModeSelectorService` with entity id `'adhoc'`, presenting the same four `PlayMode` options (`Random`, `Unified Random`, `Ordered`, `Prioritized`) in the same visual style used by Fight Lists. The default SHALL be `Random`.
7. THE AFT_Form SHALL be fully responsive: on viewports narrower than 768 px all controls SHALL stack vertically and remain easily tappable (minimum touch target 44 px height).
8. THE AFT_Form SHALL use only Bootstrap 5 utility classes and existing CSS custom properties. No new CSS classes or style rules SHALL be introduced.

---

### Requirement 4: AFT Filter Logic

**User Story:** As a user, I want the session to include only the techniques that match all my selected filter parameters, so that the training is focused on the areas I choose.

#### Acceptance Criteria

1. WHEN an AFT session is started, THE Filter_Engine SHALL include a technique if and only if ALL of the following conditions are satisfied:
   - The technique's `modes[]` array contains the selected Mode.
   - IF one or more Target Levels are selected, THEN the technique's `targetLevel` is in the selected set; otherwise any `targetLevel` is accepted.
   - IF one or more Categories are selected, THEN the technique's `category` is in the selected set; otherwise any `category` is accepted.
   - IF the Side_Filter is set to `LEFT` or `RIGHT`, THEN the technique's `side` equals that value; if the Side_Filter is `BOTH` or unset, THEN any `side` is accepted.
2. THE Filter_Engine SHALL apply the filter to the entire Technique_Catalogue (all techniques, regardless of their `selected` flag).
3. THE Filter_Engine SHALL produce a deterministic Filter_Result for a given combination of filter parameters and catalogue.

---

### Requirement 5: AdhocFightTest Data Type (Future-Proofing)

**User Story:** As an architect, I want a well-defined `AdhocFightTest` type that encapsulates all filter parameters, so that the system can be extended to support multiple saved Fight Tests in the future without a type redesign.

#### Acceptance Criteria

1. THE codebase SHALL define an `AdhocFightTest` interface in `src/types/index.ts` (or a dedicated types file) with at minimum the following fields:
   - `id: string` — unique identifier.
   - `name: string` — human-readable label (the current adhoc config uses a fixed label such as `'Adhoc'`).
   - `mode: Mode | null` — the selected mode; `null` when not yet set.
   - `targetLevels: TargetLevel[]` — selected target levels; empty array means "any".
   - `categories: TechniqueCategory[]` — selected categories; empty array means "any".
   - `side: Side | 'BOTH' | null` — selected side filter; `null` means "any" (treated identically to `'BOTH'`).
   - `shuffleMode: PlayMode` — the selected play mode.
2. THE current adhoc configuration SHALL be implemented as a single `AdhocFightTest` instance persisted in localStorage under a fixed id (e.g. `'adhoc'`), using a dedicated storage key (e.g. `kravMagaAdhocFightTest`).
3. THE `AdhocFightTest` interface SHALL NOT include any UI state fields; it is a pure data type.
4. WHERE a future multi-named Fight Tests feature is built, THE existing `AdhocFightTest` type and its storage format SHALL require no structural changes — only new persistence / management logic.

---

### Requirement 6: Persistence of AFT Filter Parameters

**User Story:** As a user, I want my Fight Test filter settings to be saved automatically, so that I do not have to re-enter them every time I open the app.

#### Acceptance Criteria

1. WHEN the user changes any AFT filter parameter (Mode, Target Levels, Categories, Side, Shuffle Mode), THE AFT_Persistence_Service SHALL write the updated `AdhocFightTest` value to localStorage immediately (on each change, not on session start).
2. WHEN the application loads, THE AFT_Persistence_Service SHALL read the stored `AdhocFightTest` from localStorage and restore all filter controls to their saved state.
3. IF the localStorage entry is absent or invalid, THEN THE AFT_Persistence_Service SHALL initialise filter controls to their default state: Mode unset, Target Levels empty, Categories empty, Side unset, Shuffle Mode = `'Random'`.
4. THE Shuffle_Mode_Selector for AFT SHALL use `PlayModeSelectorService.read('adhoc')` to load its initial value and `PlayModeSelectorService.write('adhoc', mode)` to persist changes, consistent with how Fight Lists persist their play modes.
5. IF localStorage is unavailable (e.g. SecurityError), THEN THE AFT_Persistence_Service SHALL operate with in-memory defaults and SHALL NOT throw an unhandled exception.

---

### Requirement 7: Starting an AFT Session

**User Story:** As a user, I want pressing Start while the Fight Test tab is active to immediately begin a session with the filtered technique set, so that I can train without manually building a fight list.

#### Acceptance Criteria

1. WHEN the "Fight Test" tab is Active_Tab and the user presses Start, THE Session_Controller SHALL compute the Filter_Result and call `sessionManager.startSessionWithFightList(config, fightList, playMode)` using the Filter_Result as the technique list and the configured `shuffleMode` as the play mode.
2. WHEN the "Fight Lists" tab is Active_Tab and the user presses Start, THE Session_Controller SHALL use the existing fight-list-based session start logic unchanged.
3. WHEN the "Fight Test" tab is Active_Tab and the user presses Pause or Stop, THE Session_Controller SHALL pause or stop the currently running session — identical to the existing behaviour for Fight Lists.
4. THE Start button SHALL be disabled (and an Inline_Validation_Error SHALL be shown adjacent to the Mode selector) if the user presses Start while the "Fight Test" tab is active and no Mode has been selected.
5. IF the Filter_Result is empty when Start is pressed on the "Fight Test" tab, THEN THE Notification_Service SHALL display an error notification (type `'error'`) stating that no techniques match the current filters, and the session SHALL NOT start.

---

### Requirement 8: Validation and Error Handling

**User Story:** As a user, I want clear feedback when my AFT configuration would produce an invalid session, so that I can correct it quickly.

#### Acceptance Criteria

1. WHEN the user attempts to start an AFT session without selecting a Mode, THE AFT_Form SHALL display an Inline_Validation_Error immediately adjacent to the Mode selector using Bootstrap `is-invalid` / `invalid-feedback` patterns. The session SHALL NOT start.
2. WHEN the user selects a Mode after a validation error, THE AFT_Form SHALL remove the Inline_Validation_Error for the Mode field immediately.
3. WHEN the Filter_Result is empty after all filters are applied, THE Notification_Service SHALL display an error notification visible to the user (consistent with the `NotificationOptions` type, `type: 'error'`). The session SHALL NOT start.
4. IF the filter parameters are valid and the Filter_Result is non-empty, THE Session_Controller SHALL start the session without displaying any error or warning.
5. THE error notifications described in this requirement SHALL use only Bootstrap 5 alert or toast patterns already present in the application. No new notification UI styles SHALL be introduced.

---

### Requirement 9: Responsiveness and Visual Consistency

**User Story:** As a user, I want the Fight Test tab to look and feel consistent with the rest of the Training panel, so that the UI is cohesive on all devices.

#### Acceptance Criteria

1. THE Tab_Bar header SHALL use Bootstrap colour utilities consistent with the Training panel card header (`bg-success text-white` or `bg-primary text-white`) so that it visually integrates with the existing card.
2. THE AFT_Form controls SHALL use Bootstrap form classes (`form-check`, `btn-group`, `form-select`, `form-label`, `btn btn-outline-*`) and existing CSS custom properties only. No new CSS rules SHALL be introduced.
3. WHEN rendered on a viewport narrower than 768 px, THE AFT_Form SHALL display all controls in a single-column layout (col-12) with adequate touch targets (minimum 44 px height per interactive element).
4. WHEN rendered on a viewport of 768 px or wider, THE AFT_Form MAY use a multi-column layout (e.g. col-md-6) to make better use of available space, provided it remains within the Training panel's col-lg-4 column.
5. THE Tab_Bar and AFT_Form SHALL pass WCAG 2.1 AA colour contrast requirements using only the existing Bootstrap 5 colour palette.

---

### Requirement 10: Extensibility of the Tab Bar

**User Story:** As a developer, I want the Tab Bar to be architected so that adding new tabs in the future does not require rewriting the tab infrastructure.

#### Acceptance Criteria

1. THE Tab_Bar component SHALL be implemented as a reusable module (class or function) that accepts a configuration array describing tab id, label, and content-pane element reference — new tabs are added by appending to this array.
2. THE Tab_Bar component SHALL manage active-state toggling for all registered tabs generically, so that no tab-specific logic is hardcoded in the Tab_Bar itself.
3. WHEN a tab is activated, THE Tab_Bar SHALL emit (or call a callback with) the tab's id so that consumers can react to tab changes without coupling to the Tab_Bar internals.
4. THE Session_Controller SHALL query the Tab_Bar for the currently active tab id when Start is pressed, rather than maintaining its own copy of the active state.

---

### Requirement 11: Live Match Count

**User Story:** As a user, I want to see how many techniques match my current filter settings in real time, so that I know before pressing Start whether my selection will produce a meaningful session.

#### Acceptance Criteria

1. THE Fight_Test_Tab SHALL display a match-count indicator (e.g. "12 techniques matched") that is always visible while the "Fight Test" tab is active.
2. WHEN the user changes any filter parameter (Mode, Target Levels, Categories, Side), THE match-count indicator SHALL update immediately — on every individual filter change — without requiring any button press.
3. THE match-count indicator SHALL reflect the same Filter_Result that would be used if Start were pressed at that moment (i.e. it uses the same Filter_Engine logic as Requirement 4).
4. WHEN the match count is zero, THE match-count indicator SHALL render in a visually distinct error state (e.g. Bootstrap `text-danger`) to warn the user before they attempt to start.
5. WHEN the match count is greater than zero, THE match-count indicator SHALL render in a neutral or success state (e.g. Bootstrap `text-success` or `text-body`) consistent with existing app typography.
6. THE match-count indicator SHALL use only Bootstrap 5 utility classes and existing CSS custom properties. No new CSS rules SHALL be introduced.
7. WHEN no Mode has been selected (and the count cannot be computed meaningfully), THE match-count indicator SHALL display a neutral prompt such as "Select a mode to see matches" instead of a number.
