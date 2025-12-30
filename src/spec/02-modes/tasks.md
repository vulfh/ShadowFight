# Task Breakdown: Technique and Fight List Modes

This document provides a granular breakdown of tasks required to implement the Technique and Fight List Modes feature.

## 1. Data Model and Constants

##SubTask 1.1
- [x] **Create `src/constants/modes.ts`**
  - [x] Create the new file.
  - [x] Define and export the `MODES` constant with `PERFORMING` and `RESPONDING` values.
  - [x] Define and export the `Mode` type from the keys of the `MODES` constant.

##SubTask 1.2
- [x] **Update `src/types/index.ts`**
  - [x] Add an import for the `Mode` type from `../constants/modes`.
  - [x] Add the `modes: Mode[]` property to the `Technique` interface.
  - [x] Add the `mode: Mode` property to the `FightList` interface.

## 2. Core Logic Modifications

##SubTask 2.1
- [ ] **Update `src/managers/TechniqueManager.ts`**
  - [ ] Add an import for the `MODES` constant from `../constants/modes`.
  - [ ] In the `loadTechniques` method, iterate through the `this.techniques` array.
  - [ ] For each technique object, add the `modes` property and assign it `[MODES.PERFORMING, MODES.RESPONDING]`.

##SubTask 2.2
- [ ] **Update `src/managers/FightListManager.ts`**
  - [ ] Add an import for the `Mode` type from `../types`.
  - [ ] Update the `createFightList` method signature to accept a `mode: Mode` parameter.
  - [ ] In the `createFightList` method, ensure the new `FightList` object includes the `mode` property.
  - [ ] In the `addTechniqueToFightList` method, add a validation check to ensure the technique being added has a `modes` array that includes the fight list's `mode`.

## 3. User Interface and Experience

##SubTask 3.1
- [ ] **Update `src/managers/FightListUIManager.ts`**
  - [ ] **Mode Selection**: In the fight list creation form, add a UI element (e.g., radio buttons) for selecting the fight list mode.
  - [ ] **Technique Filtering**: Modify the logic that opens the technique selection modal to pass the current fight list's mode.
  - [ ] **Disable Mode Selection**: Implement logic to disable the mode selection UI once the first technique is added to a new fight list.
  - [ ] **Display Mode**: Update the fight list rendering logic to display a visual indicator (e.g., a badge) for the `mode` of each fight list.

##SubTask 3.2
- [ ] **Update `src/components/TechniqueAddModal.ts`**
  - [ ] Modify the modal's initialization or show method to accept a `mode: Mode` parameter.
  - [ ] Implement filtering logic to ensure that only techniques compatible with the passed `mode` are displayed.

## 4. Data Migration

##SubTask 4.1
- [ ] **Create `src/services/MigrationService.ts`**
  - [ ] Create the new file and define a `MigrationService` class.
  - [ ] Implement a `run` method that checks a version key in `localStorage` to see if the migration has already been performed.
  - [ ] If the migration is needed, use the `StorageService` to get all existing fight lists.
  - [ ] Iterate over the fight lists, assign `mode: MODES.RESPONDING` to each, and save them back using `StorageService`.
  - [ ] After a successful migration, set the version key in `localStorage` to prevent it from running again.

##SubTask 4.2
- [ ] **Update Application Entry Point (`src/app.ts` or `src/main.ts`)**
  - [ ] Import the `MigrationService`.
  - [ ] Instantiate the `MigrationService` and call its `run` method before the main application logic is initialized.

## 5. Unit Tests

##SubTask 5.1
- [ ] **Create `src/managers/__tests__/FightListManager.test.ts`**
  - [ ] Write a test to confirm that `createFightList` correctly assigns the `mode`.
  - [ ] Write a test to ensure `addTechniqueToFightList` successfully adds a technique with a compatible mode.
  - [ ] Write a test to ensure `addTechniqueToFightList` throws an error or rejects an attempt to add a technique with an incompatible mode.

##SubTask 5.2
- [ ] **Create `src/services/__tests__/MigrationService.test.ts`**
  - [ ] Write a test to verify that the migration service correctly updates existing fight lists to include `mode: 'RESPONDING'`.
  - [ ] Write a test to confirm that the migration service only runs once.
  - [ ] Use mocking for the `StorageService` to isolate the migration logic.
