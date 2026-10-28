import { ExpertiseLevel, EXPERTISE_LEVELS } from '../types/index'

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/**
 * The two expertise-level filter values managed by this control.
 * `expertiseLevel === null` means "any level" (no restriction).
 */
export interface ExpertiseLevelFilterValues {
  expertiseLevel: ExpertiseLevel | null
  expertiseLevelMode: 'strict' | 'cumulative'
}

/**
 * External API surface of the control returned by
 * `buildExpertiseLevelFilterControl`.
 *
 * - `element`  — mount this into the DOM.
 * - `getValues()` — read the current selection as `ExpertiseLevelFilterValues`.
 * - `populate()` — programmatically set the control state.
 */
export interface ExpertiseLevelFilterControl {
  element: HTMLElement
  getValues(): ExpertiseLevelFilterValues
  populate(values: ExpertiseLevelFilterValues): void
}

// ---------------------------------------------------------------------------
// Badge colour map
// ---------------------------------------------------------------------------

/**
 * Bootstrap class mapping for every `ExpertiseLevel`.
 * Derived from the constant array — no switch statement (Req 10.1).
 */
const BADGE_CLASS_MAP: Readonly<Record<ExpertiseLevel, string>> = {
  yellow: 'bg-warning text-dark',
  orange: 'bg-warning text-dark el-badge--orange',
  green: 'bg-success text-white',
  blue: 'bg-primary text-white',
  brown: 'bg-secondary text-white',
  'black-dan-1': 'bg-dark text-white',
}

// ---------------------------------------------------------------------------
// Badge helper — Req 4.4
// ---------------------------------------------------------------------------

/**
 * Returns an HTML string for a small colour-coded Bootstrap badge
 * representing the given `ExpertiseLevel`.
 *
 * Falls back to `'yellow'` for undefined / unrecognised levels (Req 8.1).
 * Display label: first letter capitalised, hyphens replaced with spaces.
 *
 * @example
 * expertiseLevelBadgeHtml('green')
 * // → '<span class="badge bg-success text-white ms-1">Green</span>'
 */
export function expertiseLevelBadgeHtml(level: ExpertiseLevel | undefined): string {
  const safeLevel: ExpertiseLevel = EXPERTISE_LEVELS.includes(level as ExpertiseLevel)
    ? (level as ExpertiseLevel)
    : 'yellow'

  const classes = BADGE_CLASS_MAP[safeLevel]
  const displayLabel = safeLevel
    .replace(/-/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())

  return `<span class="badge ${classes} ms-1">${displayLabel}</span>`
}

// ---------------------------------------------------------------------------
// Control factory — Req 4.3
// ---------------------------------------------------------------------------

/**
 * Builds and returns an `ExpertiseLevelFilterControl` — a self-contained DOM
 * subtree + controller for the expertise-level filter UI.
 *
 * The control renders:
 *   1. A labelled level-selector `btn-group` with an "Any" option and one
 *      button per entry in `EXPERTISE_LEVELS`.
 *   2. A labelled mode-toggle `btn-group` ("Up to" / "Strict").
 *
 * `onChange` is called after every user interaction.
 *
 * Design notes (SOLID / KIS):
 *   - SRP: owns only this control's DOM + read/write; zero persistence logic.
 *   - OCP: adding a new ExpertiseLevel only requires updating EXPERTISE_LEVELS.
 *   - No framework dependency — plain DOM API, Bootstrap 5 classes only.
 */
export function buildExpertiseLevelFilterControl(
  onChange: (values: ExpertiseLevelFilterValues) => void,
): ExpertiseLevelFilterControl {

  // ── Root wrapper ──────────────────────────────────────────────────────────
  const wrapper = document.createElement('div')
  wrapper.className = 'mb-3'

  // ── Label ─────────────────────────────────────────────────────────────────
  const label = document.createElement('label')
  label.className = 'form-label fw-semibold'
  label.innerHTML =
    'Expertise Level <small class="text-muted fw-normal">(none = any)</small>'
  wrapper.appendChild(label)

  // ── Level selector btn-group ──────────────────────────────────────────────
  const levelGroup = document.createElement('div')
  levelGroup.setAttribute('role', 'group')
  levelGroup.setAttribute('aria-label', 'Expertise level')
  levelGroup.className = 'btn-group d-flex flex-wrap gap-1 mb-2'

  // "Any" radio (empty value → null)
  _addRadio(levelGroup, 'el-level', 'el-level-any', '', 'Any', true)

  // One radio per level, derived from the constant array (Req 10.1)
  EXPERTISE_LEVELS.forEach(level => {
    const displayLabel = level.replace(/-/g, ' ').replace(/^\w/, c => c.toUpperCase())
    _addRadio(levelGroup, 'el-level', `el-level-${level}`, level, displayLabel, false)
  })

  wrapper.appendChild(levelGroup)

  // ── Mode toggle btn-group ─────────────────────────────────────────────────
  const modeGroupWrapper = document.createElement('div')
  modeGroupWrapper.id = 'el-mode-group'

  const modeGroupLabel = document.createElement('div')
  modeGroupLabel.className = 'form-label fw-semibold mb-1'
  modeGroupLabel.textContent = 'Filter mode'
  modeGroupWrapper.appendChild(modeGroupLabel)

  const modeGroup = document.createElement('div')
  modeGroup.setAttribute('role', 'group')
  modeGroup.setAttribute('aria-label', 'Expertise level filter mode')
  modeGroup.className = 'btn-group d-flex flex-wrap gap-1'

  const upToInput = _addRadio(modeGroup, 'el-mode', 'el-mode-cumulative', 'cumulative', 'Up to', true)
  const strictInput = _addRadio(modeGroup, 'el-mode', 'el-mode-strict', 'strict', 'Strict', false)

  modeGroupWrapper.appendChild(modeGroup)
  wrapper.appendChild(modeGroupWrapper)

  // ── Disabled-state sync ───────────────────────────────────────────────────
  /**
   * Enables or disables the mode group based on whether a level is selected.
   * When "Any" is selected the mode toggle is visually suppressed (Req 4.3).
   */
  function syncModeDisabled(): void {
    const levelIsAny = _checkedValue(levelGroup) === ''
    upToInput.disabled = levelIsAny
    strictInput.disabled = levelIsAny
    if (levelIsAny) {
      modeGroupWrapper.classList.add('opacity-50', 'pe-none')
    } else {
      modeGroupWrapper.classList.remove('opacity-50', 'pe-none')
    }
  }

  // ── Event wiring ──────────────────────────────────────────────────────────
  levelGroup.addEventListener('change', () => {
    syncModeDisabled()
    onChange(getValues())
  })

  modeGroup.addEventListener('change', () => {
    onChange(getValues())
  })

  // Apply initial disabled state (level starts at "Any")
  syncModeDisabled()

  // ── Control API ───────────────────────────────────────────────────────────
  function getValues(): ExpertiseLevelFilterValues {
    const rawLevel = _checkedValue(levelGroup)
    return {
      expertiseLevel: rawLevel === '' ? null : (rawLevel as ExpertiseLevel),
      expertiseLevelMode: (_checkedValue(modeGroup) as 'strict' | 'cumulative') || 'cumulative',
    }
  }

  function populate(values: ExpertiseLevelFilterValues): void {
    const levelValue = values.expertiseLevel ?? ''
    _checkRadioByValue(levelGroup, levelValue)
    _checkRadioByValue(modeGroup, values.expertiseLevelMode)
    syncModeDisabled()
  }

  return { element: wrapper, getValues, populate }
}

// ---------------------------------------------------------------------------
// Private DOM helpers
// ---------------------------------------------------------------------------

/**
 * Creates a `btn-check` radio + its visible label, appends both to `parent`,
 * and returns the `<input>` element.
 */
function _addRadio(
  parent: HTMLElement,
  name: string,
  id: string,
  value: string,
  labelText: string,
  checked: boolean,
): HTMLInputElement {
  const input = document.createElement('input')
  input.type = 'radio'
  input.className = 'btn-check'
  input.name = name
  input.id = id
  input.value = value
  input.autocomplete = 'off'
  input.checked = checked

  const btn = document.createElement('label')
  btn.className = 'btn btn-outline-secondary btn-sm'
  btn.htmlFor = id
  btn.style.minHeight = '44px'
  btn.textContent = labelText

  parent.appendChild(input)
  parent.appendChild(btn)
  return input
}

/** Returns the value of the currently checked radio inside `group`, or `''`. */
function _checkedValue(group: HTMLElement): string {
  const checked = group.querySelector<HTMLInputElement>('input[type="radio"]:checked')
  return checked ? checked.value : ''
}

/** Checks the radio whose value matches `value` inside `group`. */
function _checkRadioByValue(group: HTMLElement, value: string): void {
  group.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach(input => {
    input.checked = input.value === value
  })
}
