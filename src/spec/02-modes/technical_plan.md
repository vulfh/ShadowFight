# Technical Plan: Technique and Fight List Modes

This document outlines the technical implementation plan for the Technique and Fight List Modes feature.

## 1. Data Model and Constants

- **Create `src/constants/modes.ts`**
  - This new file will export a single `MODES` constant and a `Mode` type.
  - Example: 
    ```typescript
    export const MODES = { PERFORMING: 'PERFORMING', RESPONDING: 'RESPONDING' } as const;
    export type Mode = keyof typeof MODES;
    ```

- **Update `src/types/index.ts`**
  - Import the `Mode` type.
  - Add `modes: Mode[]` to the `Technique` interface.
  - Add `mode: Mode` to the `FightList` interface.

## 2. Core Logic

- **Update `src/managers/TechniqueManager.ts`**
  - In the `loadTechniques` method, add the `modes` property to each technique object. For now, all techniques can be assigned `[MODES.PERFORMING, MODES.RESPONDING]` for backward compatibility.

- **Update `src/managers/FightListManager.ts`**
  - Modify the `createFightList` method to accept a `mode` parameter and include it in the new `FightList` object.
  - In the `addTechniqueToFightList` method, add a validation check to ensure the technique's `modes` array includes the `FightList`'s `mode` before adding it.

## 3. User Interface

- **Update `src/managers/FightListUIManager.ts`**
  - **Creation View**: Add a mode selector (e.g., radio buttons for `PERFORMING` and `RESPONDING`) to the UI for creating a new fight list.
  - **Technique Filtering**: When opening the technique selection modal, pass the selected fight list mode to filter the list of available techniques.
  - **Disable Mode Selection**: Once the first technique is added to a new fight list, the mode selector should be disabled to prevent inconsistencies.
  - **Display Mode**: In the main view where all fight lists are displayed, add a visual indicator (e.g., a badge or label) to show the mode of each list.

- **Update `src/components/TechniqueAddModal.ts`**
  - Modify the modal to accept a `mode` parameter.
  - Use this parameter to filter the techniques displayed, showing only those that are compatible with the given mode.

## 4. Data Migration

- **Create `src/services/MigrationService.ts`**
  - This new service will be responsible for handling the one-time data migration.
  - It will use the `StorageService` to fetch all existing fight lists.
  - It will iterate through the lists, set `mode: MODES.RESPONDING` for each, and save them back to storage.
  - Implement a versioning mechanism (e.g., a key in `localStorage`) to ensure this migration runs only once.

- **Update `src/app.ts` or `src/main.ts`**
  - At the application's entry point, instantiate the `MigrationService` and execute the migration logic before the main application initializes.

## 5. Testing

- **Create `src/managers/__tests__/FightListManager.test.ts`**
  - Add tests for creating fight lists with specific modes.
  - Add tests to verify that adding a technique with an incompatible mode is not allowed.

- **Create `src/services/__tests__/MigrationService.test.ts`**
  - Add tests to ensure the migration service correctly updates existing fight lists with the `RESPONDING` mode.
  - Mock the `StorageService` to isolate the migration logic for testing.
