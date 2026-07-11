# Requirements Document

## Introduction

This feature adds a **Play Mode** selector to the FightList session UI. A Play Mode controls the order and frequency in which techniques are announced during an active training session. Four modes are supported: Random, Unified Random, Ordered, and Prioritized. The selected mode is persisted across sessions and the selector is locked while a session is actively playing.

A prerequisite for the priority-sensitive modes (Random and Prioritized) is that technique priority is stored **per FightList** rather than shared globally. Each technique has a global default priority (`high`/`medium`/`low`) that seeds the per-FightList value when the technique is first added, but the trainer can override it independently in each FightList — both at add-time via the existing priority dropdown, and later in the FightList edit view.

The feature extends the existing strategy pattern in `TechniqueSelectionStrategy.ts` and integrates with `SessionManager.setSelectionStrategy()`. The UI renders a labeled dropdown above the play/pause/stop control panel.

---

## Glossary

- **Play_Mode_Selector**: The dropdown UI control that lets the user choose one of the four play modes before starting a session.
- **Session**: An active training run started via the play/pause/stop controls, managed by `SessionManager`.
- **FightList**: A named collection of `FightListTechnique` entries, each with a `priority` (1–5) and a `selected` flag.
- **FightListTechnique**: A record `{ id, techniqueId, priority: number (1–5), selected: boolean }` belonging to exactly one FightList. The `priority` field is per-FightList and is the authoritative priority value used during sessions. It is created when the technique is added to the FightList and destroyed when the technique is removed from it.
- **Technique**: A global technique entity with `name`, `file`, `weight`, `priority` (`high`/`medium`/`low`), and other metadata. The `priority` field is a global default used only to seed `FightListTechnique.priority` at add-time; it is never written to by FightList operations.
- **Default_Priority**: The numeric priority (1–5) derived from a `Technique`'s global `priority` field at add-time using the mapping: `low→1`, `medium→3`, `high→5`. Used once as the initial `FightListTechnique.priority`; subsequent changes to the per-FightList priority do not affect this global value.
- **Per_FightList_Priority**: The `FightListTechnique.priority` value. Scoped to a single FightList entry; changing it in one FightList has no effect on the same technique's priority in any other FightList or on the global `Technique.priority`.
- **Play_Mode**: One of four enumerated values — `random`, `unifiedRandom`, `ordered`, `prioritized` — that determines the technique selection algorithm for a session.
- **Round**: In Unified Random mode, a complete pass through all selected techniques before repetition is allowed.
- **Anti_Starvation_Window**: In Prioritized mode, a per-technique counter that tracks how many consecutive picks have elapsed since a technique was last selected; triggers a forced pick when the counter reaches 5.
- **Selection_Strategy**: An implementation of `ITechniqueSelectionStrategy` responsible for choosing the next technique from the active set.
- **LocalStorage**: The browser's `localStorage` API, used to persist the selected Play Mode across page loads.
- **STORAGE_KEYS**: The existing constant map in `src/constants/storage.ts` where new LocalStorage keys are registered.

---

## Requirements

### Requirement 0: Per-FightList Technique Priority (Prerequisite)

**User Story:** As a trainer, I want each technique's priority to be independently configurable per FightList, so that the same technique can be high-priority in one list and low-priority in another without affecting the global technique definition or other FightLists.

#### Acceptance Criteria

1. THE `FightListTechnique.priority` field (a number 1–5) IS the authoritative, per-FightList priority for that technique entry. It is stored directly on the `FightListTechnique` record inside the FightList and is independent of every other FightList.
2. WHEN a technique is added to a FightList, THE system SHALL seed the new `FightListTechnique.priority` from the technique's global `priority` field using the mapping: `low → 1`, `medium → 3`, `high → 5`. This seeded value is the starting point; the trainer may override it immediately in the Add Technique modal before confirming.
3. IF a technique's global `priority` value is not one of `low`, `medium`, or `high`, THEN THE system SHALL default the seeded `FightListTechnique.priority` to 3 (Medium).
4. WHEN a technique is added via the Add Technique modal, THE priority dropdown SHALL be pre-selected to the technique's Default_Priority value, allowing the user to override it before confirming the addition.
5. WHEN the user changes the priority dropdown during the add-technique flow and confirms the addition, THE system SHALL store the user-selected value as the `FightListTechnique.priority` for that entry in this FightList only.
6. WHEN a technique entry is displayed in the FightList edit view, THE priority dropdown SHALL reflect the current `FightListTechnique.priority` value stored on that specific `FightListTechnique` record (not the global Technique priority).
7. WHEN the user changes the priority dropdown for a technique in the FightList edit view and saves, THE system SHALL update `FightListTechnique.priority` on that record only, without modifying the technique's global `priority` field or the priority of the same technique in any other FightList.
8. WHEN a technique is removed from a FightList, THE system SHALL delete the entire `FightListTechnique` record for that entry — including its `priority` value — from the FightList's `techniques` array. The technique's global `priority` field SHALL remain unchanged.
9. WHEN a session is active, THE selection strategies SHALL use `FightListTechnique.priority` (the Per_FightList_Priority) as the authoritative priority value, never the technique's global `priority` field.

---

### Requirement 10: FightList Priority Healing on Session Start

**User Story:** As a trainer, I want the app to automatically repair missing or invalid technique priorities in a FightList when I start a session, so that sessions work correctly even if FightList data was created before the per-FightList priority field existed or was corrupted.

#### Acceptance Criteria

1. WHEN a FightList session is about to start, THE SessionManager (or the FightList loading path called by it) SHALL inspect every `FightListTechnique` entry in the FightList and check whether its `priority` field is a valid integer in the range 1–5 (inclusive).
2. IF any `FightListTechnique.priority` value is missing (`undefined` or `null`), zero, outside the range 1–5, or not a finite number, THEN THE system SHALL look up the corresponding global `Technique` object by matching `FightListTechnique.techniqueId` against `Technique.name`.
3. WHEN a matching global `Technique` is found during healing, THE system SHALL derive the replacement priority using the standard mapping: `low → 1`, `medium → 3`, `high → 5`; any unrecognised `Technique.priority` value SHALL default to 3.
4. WHEN no matching global `Technique` is found during healing (e.g., the technique has been removed from the config), THE system SHALL default the replacement priority to 3.
5. AFTER deriving the replacement priority, THE system SHALL write it back to `FightListTechnique.priority` and persist the updated FightList to storage before the session selection logic runs.
6. THE priority healing SHALL be applied only to `FightListTechnique` entries whose `priority` is invalid; entries with a valid priority value (1–5) SHALL be left unchanged.
7. THE healing operation SHALL NOT modify the global `Technique.priority` field of any technique.
8. IF all `FightListTechnique` entries already have valid priorities, THE system SHALL proceed directly to session start without persisting any changes.
9. THE healing operation SHALL be idempotent: running it multiple times on the same FightList SHALL produce the same result and SHALL NOT cause duplicate saves when no invalid entries are present.

---

### Requirement 1: Play Mode Selector UI

**User Story:** As a trainer, I want to choose how techniques are selected during a session, so that I can tailor the training intensity and variety to my current goals.

#### Acceptance Criteria

1. THE Play_Mode_Selector SHALL render as a labeled dropdown above the play/pause/stop control panel in the FightList session view.
2. THE Play_Mode_Selector SHALL display the label "Play Mode" visible to the user.
3. THE Play_Mode_Selector SHALL offer exactly four options: "Random", "Unified Random", "Ordered", and "Prioritized".
4. IF no previously persisted Play Mode value exists in LocalStorage, THEN THE Play_Mode_Selector SHALL display "Random" as the selected value.
5. WHILE a Session is active (playing or paused), THE Play_Mode_Selector SHALL be disabled and not accept user input.
6. IF a Session is stopped or has never been started, THEN THE Play_Mode_Selector SHALL be enabled and accept user input.
7. WHEN the user selects a Play Mode from the dropdown, THE Play_Mode_Selector SHALL update its displayed value to reflect the selection within 100ms.

---

### Requirement 2: Play Mode Persistence

**User Story:** As a trainer, I want my selected Play Mode to be remembered between app sessions, so that I do not have to re-select it every time I open the app.

#### Acceptance Criteria

1. WHEN the user selects a Play Mode from the dropdown, THE Play_Mode_Selector SHALL persist the selected value to LocalStorage under a key registered in STORAGE_KEYS before the dropdown visually updates.
2. WHEN the app initialises, THE Play_Mode_Selector SHALL read the persisted Play Mode from LocalStorage and set the dropdown to that value.
3. IF no persisted Play Mode value exists in LocalStorage at app initialisation, THEN THE Play_Mode_Selector SHALL default to "Random" and write "Random" to LocalStorage under the STORAGE_KEYS entry.
4. IF the value retrieved from LocalStorage at app initialisation is not one of "Random", "Unified Random", "Ordered", or "Prioritized", THEN THE Play_Mode_Selector SHALL default to "Random" and overwrite the invalid LocalStorage entry with "Random".
5. IF reading from LocalStorage throws an error (e.g., SecurityError) during app initialisation, THEN THE Play_Mode_Selector SHALL default to "Random" without retrying.

---

### Requirement 3: Strategy Activation on Session Start

**User Story:** As a trainer, I want the session to use the Play Mode I selected before pressing play, so that the correct technique selection behaviour is applied throughout the session.

#### Acceptance Criteria

1. WHEN a Session starts, THE SessionManager SHALL activate the Selection_Strategy that corresponds to the Play Mode selected at session start time, where "Random" maps to `RandomTechniqueSelectionStrategy`, "Unified Random" maps to `UnifiedRandomTechniqueSelectionStrategy`, "Ordered" maps to `OrderedTechniqueSelectionStrategy`, and "Prioritized" maps to `PrioritizedTechniqueSelectionStrategy`.
2. WHILE a Session is active, THE SessionManager SHALL continue to use the Selection_Strategy that was activated at session start, regardless of any subsequent Play Mode dropdown interaction.
3. IF no valid Play Mode is resolvable at session start time, THEN THE SessionManager SHALL reject the session start and surface an error indicating that a Play Mode must be selected.
4. WHEN a Session is stopped and a new Session starts, THE SessionManager SHALL activate the Selection_Strategy that corresponds to the Play Mode value present in the dropdown at the time the new Session starts.

---

### Requirement 4: Random Play Mode

**User Story:** As a trainer, I want pure random technique selection, so that I experience unpredictable variety in my training.

#### Acceptance Criteria

1. WHEN the Play Mode is "Random" and a technique must be selected, THE `RandomTechniqueSelectionStrategy` SHALL assign each technique a weight equal to its `FightListTechnique.priority` value (1–5) and perform a weighted random draw across all techniques with `selected` set to `true`.
2. WHEN the Play Mode is "Random", THE `RandomTechniqueSelectionStrategy` SHALL permit the same technique to be selected on consecutive picks.
3. WHEN the Play Mode is "Random" and the FightList contains exactly one technique with `selected` set to `true`, THE `RandomTechniqueSelectionStrategy` SHALL select that technique on every pick without error.
4. IF the Play Mode is "Random" and no techniques have `selected` set to `true`, THEN THE `RandomTechniqueSelectionStrategy` SHALL throw an error consistent with `ERROR_MESSAGES.NO_TECHNIQUES_AVAILABLE`.

---

### Requirement 5: Unified Random Play Mode

**User Story:** As a trainer, I want every technique to appear at least once before any repeats, so that I practice all selected techniques fairly in each round.

#### Acceptance Criteria

1. WHEN the Play Mode is "Unified Random" and a technique must be selected, THE `UnifiedRandomTechniqueSelectionStrategy` SHALL select uniformly at random from the subset of techniques in the FightList where `selected` is `true` and which have not yet been picked in the current Round.
2. WHEN the Play Mode is "Unified Random" and the last remaining technique in the current Round is selected, THE `UnifiedRandomTechniqueSelectionStrategy` SHALL immediately begin a new Round, making all techniques with `selected` set to `true` eligible again, including the technique just selected.
3. WHEN a new Round begins, THE `UnifiedRandomTechniqueSelectionStrategy` SHALL not carry any per-technique pick history from the previous Round into the new Round.
4. WHEN a Session is stopped, THE `UnifiedRandomTechniqueSelectionStrategy` SHALL discard its Round state so that the next Session begins a fresh Round from zero plays.
5. WHEN the Session is paused and then resumed, THE `UnifiedRandomTechniqueSelectionStrategy` SHALL preserve the Round state that was in effect at the time of pause, continuing from the same remaining pool.
6. WHEN the Play Mode is "Unified Random" and the FightList contains exactly one technique with `selected` set to `true`, THE `UnifiedRandomTechniqueSelectionStrategy` SHALL select that technique on every pick without error, resetting the Round after each pick.
7. IF no techniques have `selected` set to `true`, THEN THE `UnifiedRandomTechniqueSelectionStrategy` SHALL throw an error consistent with `ERROR_MESSAGES.NO_TECHNIQUES_AVAILABLE`.

---

### Requirement 6: Ordered Play Mode

**User Story:** As a trainer, I want techniques to be announced in the exact order they appear in the FightList, so that I can practice a choreographed sequence.

#### Acceptance Criteria

1. WHEN a Session starts with Play Mode "Ordered", THE `OrderedTechniqueSelectionStrategy` SHALL initialise its position index to 0 (the start of the FightList's `techniques` array).
2. WHEN the Play Mode is "Ordered" and a technique must be selected, THE `OrderedTechniqueSelectionStrategy` SHALL scan forward from the current position index through the FightList's `techniques` array, selecting the first entry whose `selected` flag is `true`, and then advance the position index to the next element after the selected one.
3. WHEN the Play Mode is "Ordered" and the scan reaches the end of the `techniques` array without finding a `selected=true` entry, THE `OrderedTechniqueSelectionStrategy` SHALL wrap the position index back to 0 and continue scanning from the beginning of the array, applying the same `selected=true` filter.
4. WHEN the Session is paused and then resumed with Play Mode "Ordered", THE `OrderedTechniqueSelectionStrategy` SHALL retain the position index that was in effect at the time of pause, continuing from that position on the next pick.
5. WHEN the Play Mode is "Ordered" and a Session is stopped, THE `OrderedTechniqueSelectionStrategy` SHALL reset its position index to 0 so that the next Session starts from the beginning of the list.
6. IF the Play Mode is "Ordered" and no techniques in the FightList have `selected` set to `true`, THEN THE `OrderedTechniqueSelectionStrategy` SHALL throw an error consistent with `ERROR_MESSAGES.NO_TECHNIQUES_AVAILABLE`.

---

### Requirement 7: Prioritized Play Mode

**User Story:** As a trainer, I want higher-priority techniques to appear more frequently, while still ensuring no technique is permanently starved, so that I focus training effort appropriately without neglecting any skill.

#### Acceptance Criteria

1. WHEN the Play Mode is "Prioritized" and a technique must be selected, THE `PrioritizedTechniqueSelectionStrategy` SHALL assign each technique with `selected` set to `true` a weight equal to its `FightListTechnique.priority` value (1–5) and perform a weighted random draw, so that a technique with priority 5 is selected five times more often in expectation than one with priority 1.
2. WHEN the Play Mode is "Prioritized", THE `PrioritizedTechniqueSelectionStrategy` SHALL maintain a per-technique counter that increments by 1 for every pick in which that technique was not selected; when a technique's counter reaches 5, it is eligible for forced selection.
3. WHEN the Play Mode is "Prioritized" and a technique is force-selected due to the Anti_Starvation_Window rule, THE `PrioritizedTechniqueSelectionStrategy` SHALL reset that technique's counter to 0 and increment the counters of all other selected techniques by 1 for that pick.
4. WHEN the Play Mode is "Prioritized" and multiple techniques simultaneously have a counter of 5 or more, THE `PrioritizedTechniqueSelectionStrategy` SHALL force-select the one with the lowest `FightListTechnique.priority` value, breaking ties by earliest index in the FightList's `techniques` array.
5. WHEN the Play Mode is "Prioritized" and a Session is stopped, THE `PrioritizedTechniqueSelectionStrategy` SHALL reset all per-technique counters to 0 so that the next Session begins with a clean Anti_Starvation_Window.
6. WHEN the Session is paused and then resumed with Play Mode "Prioritized", THE `PrioritizedTechniqueSelectionStrategy` SHALL preserve all per-technique counters that were in effect at the time of pause.
7. WHEN the Play Mode is "Prioritized" and the FightList contains exactly one technique with `selected` set to `true`, THE `PrioritizedTechniqueSelectionStrategy` SHALL select that technique on every pick without error.
8. IF the Play Mode is "Prioritized" and no techniques have `selected` set to `true`, THEN THE `PrioritizedTechniqueSelectionStrategy` SHALL throw an error consistent with `ERROR_MESSAGES.NO_TECHNIQUES_AVAILABLE`.

---

### Requirement 8: UI Styling Consistency

**User Story:** As a trainer, I want all new UI elements to look and feel like the rest of the application, so that the interface remains coherent and professional.

#### Acceptance Criteria

1. THE Play_Mode_Selector dropdown SHALL use the `form-select` and `form-select-sm` Bootstrap classes, consistent with the existing `priority-select` form control pattern used elsewhere in the FightList UI.
2. THE Play_Mode_Selector label SHALL use the same label typography and spacing pattern as other form labels in the session control area.
3. WHEN the Play_Mode_Selector is disabled (session active or paused), it SHALL use Bootstrap's native `disabled` attribute so the browser renders the disabled state using the same appearance as other disabled form controls in the application.
4. THE Play_Mode_Selector container SHALL use the same `d-flex align-items-center gap` layout pattern used for the existing technique action controls, ensuring consistent spacing and alignment.
5. THE priority dropdown in the Add Technique modal SHALL continue to use the existing `.priority-select` CSS class and BEM component styles defined in `fightList.css`, with no new CSS classes introduced for the priority control itself.
6. THE priority dropdown in the FightList edit view SHALL continue to use the existing `.form-select.form-select-sm.priority-select` class combination already applied to technique list items.
7. ALL new CSS rules introduced for this feature SHALL follow the existing naming conventions: component-scoped BEM-style class names (e.g., `.play-mode-selector`, `.play-mode-selector__label`) and SHALL be added to `fightList.css`.
8. THE Play_Mode_Selector SHALL respect the `prefers-reduced-motion` media query by suppressing any transition or animation, consistent with the existing `@media (prefers-reduced-motion: reduce)` rule in `fightList.css`.
9. THE Play_Mode_Selector SHALL apply the CSS custom properties defined in `main.css` (`--primary-color`, `--border-radius`, `--transition`, `--box-shadow`) for any colour, radius, transition, or shadow values, rather than hardcoded values.

---

### Requirement 9: Strategy Extensibility

**User Story:** As a developer, I want new play modes to be addable without modifying existing strategy classes, so that the codebase remains maintainable as the feature set grows.

#### Acceptance Criteria

1. THE `TechniqueSelectionStrategyFactory` SHALL be extended to map `STRATEGY_TYPES.UNIFIED_RANDOM` to `UnifiedRandomTechniqueSelectionStrategy`, `STRATEGY_TYPES.ORDERED` to `OrderedTechniqueSelectionStrategy`, and `STRATEGY_TYPES.PRIORITIZED` to `PrioritizedTechniqueSelectionStrategy`.
2. THE `STRATEGY_TYPES` constant SHALL be extended with entries `UNIFIED_RANDOM`, `ORDERED`, and `PRIORITIZED` without removing or renaming the existing `RANDOM`, `ROUND_ROBIN`, or `PRIORITY_BASED` entries.
3. THE `SessionManager.setSelectionStrategy()` method SHALL accept any value in `STRATEGY_TYPES` without requiring modifications to `SessionManager`'s own source code.
4. IF `TechniqueSelectionStrategyFactory.createStrategy()` receives an unrecognized strategy type, THEN it SHALL fall back to `RandomTechniqueSelectionStrategy` as the default.
