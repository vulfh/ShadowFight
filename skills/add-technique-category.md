# Skill: add-technique-category

Add a new technique category to the ShadowFight application using the supplied category name.

Parameters:
- categoryName: the new category label to add, for example `Choke`

## Goal
Extend the app so the category behaves like the existing categories and is available in the filter form, add-technique modal, technique catalogue, and session stats.

## Required edits
Apply the following changes using `categoryName` as the concrete value.

### 1) Add the category to the shared type union
File: `src/types/index.ts`

Add the new value to `TechniqueCategory`:

```ts
export type TechniqueCategory =
  | 'Punches'
  | 'Strikes'
  | 'Kicks'
  | 'Knees'
  | 'Defenses/Grabs'
  | 'Weapons'
  | 'Hand-Grip'
  | 'Knife'
  | 'Slip'
  | 'Defence'
  | 'Knee-Protection'
  | 'Take Down'
  | 'Elbow Strike'
  | '{{categoryName}}'
```

### 2) Add the category to the category constants
File: `src/constants/strategies.ts`

Add:

```ts
export const TECHNIQUE_CATEGORIES = {
  PUNCHES: 'Punches',
  STRIKES: 'Strikes',
  KICKS: 'Kicks',
  KNEES: 'Knees',
  DEFENSES_GRABS: 'Defenses/Grabs',
  WEAPONS: 'Weapons',
  HAND_GRIP: 'Hand-Grip',
  KNIFE: 'Knife',
  SLIP: 'Slip',
  DEFENCE: 'Defence',
  KNEE_PROTECTION: 'Knee-Protection',
  TAKE_DOWN: 'Take Down',
  ELBOW_STRIKE: 'Elbow Strike',
  {{categoryNameUpperSnakeCase}}: '{{categoryName}}'
} as const
```

Example for `Choke`:

```ts
CHOKE: 'Choke'
```

### 3) Add the category to the filter form options
File: `src/components/FightTestFilterForm.ts`

Add `{{categoryName}}` to the `CATEGORIES` array:

```ts
const CATEGORIES: TechniqueCategory[] = [
  'Punches', 'Strikes', 'Kicks', 'Knees', 'Defenses/Grabs',
  'Weapons', 'Hand-Grip', 'Knife', 'Slip', 'Defence',
  'Knee-Protection', 'Take Down', 'Elbow Strike', '{{categoryName}}',
]
```

### 4) Add the category to the technique-modal filter
File: `src/components/TechniqueAddModal.ts`

Add `{{categoryName}}` to `TECHNIQUE_CATEGORIES`.

### 5) Add category counters to session stats
File: `src/managers/SessionManager.ts`

Add a zero-count entry in both `sessionStats.techniquesByCategory` initializers and in `resetSessionStats()`:

```ts
[TECHNIQUE_CATEGORIES.{{categoryNameUpperSnakeCase}}]: 0
```

### 6) Do not invent catalogue techniques
File: `src/managers/TechniqueManager.ts`

Do not add technique entries, names, audio files, or placeholder catalogue data unless the user explicitly provides those real techniques and requests them. Adding a category only updates the category infrastructure.

### 7) Update tests and default category arrays
Wherever arrays are explicitly enumerating categories (for example in tests), also add `{{categoryName}}`.

Typical files:
- `src/tests/FightTestFilterForm.test.ts`
- `src/tests/AdhocFilterEngine.test.ts`
- `src/tests/UIManager.instructionAudio.test.ts`

### 8) Validation
Run the smallest relevant validation:

```bash
npm run test:run -- src/tests/FightTestFilterForm.test.ts src/tests/AdhocFilterEngine.test.ts
npm run type-check
```

## Parameter conventions
- Use title case for the visible label, for example `Choke`
- For constant names, convert to upper snake case, for example `CHOKE`
- For file names, use lowercase kebab case, for example `choke`

## Example invocation
For `categoryName = Choke`, only the category infrastructure should be added; no Choke techniques should be invented.
