import type { Technique, FightTestFilterValues, TargetLevel, TechniqueCategory, Side } from '../types/index'
import type { Mode } from '../constants/modes'
import { PLAY_MODES } from '../types/playMode'

/**
 * FightTestFilterForm — renders the Adhoc Fight Test filter form and manages
 * its state.
 *
 * Design decisions (SOLID / Keep It Simple):
 *   - SRP: owns only form rendering and value read/write; no persistence, no
 *     filtering logic.
 *   - OCP: adding a new filter dimension means adding one render helper + one
 *     read branch in getValues(); existing dimensions are untouched.
 *   - No framework dependency — plain DOM API, Bootstrap 5 classes only.
 *   - mount() is idempotent per container; the component is single-use.
 *
 * Req 3.1–3.8, 8.1–8.2, 9.2–9.4
 */

// ---------------------------------------------------------------------------
// Internal value-array constants (union types have no runtime arrays)
// ---------------------------------------------------------------------------

const TARGET_LEVELS: TargetLevel[] = [
  'HEAD', 'NECK', 'CHEST', 'STOMACH', 'GROIN', 'HIP', 'SHIN', 'BACK', 'FOOT',
]

const CATEGORIES: TechniqueCategory[] = [
  'Punches', 'Strikes', 'Kicks', 'Knees', 'Defenses/Grabs',
  'Weapons', 'Hand-Grip', 'Knife', 'Slip', 'Defence',
  'Knee-Protection', 'Take Down', 'Elbow Strike',
]

/** Side options shown in the UI. 'BOTH' is the first and default selection. */
const SIDE_OPTIONS: Array<'BOTH' | Side> = ['BOTH', 'LEFT', 'RIGHT']

const MODE_OPTIONS: Mode[] = ['PERFORMING', 'RESPONDING']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export class FightTestFilterForm {
  // The catalogue is accepted for API compatibility with task spec (future use).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_catalogue: Technique[]) {}

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Renders the full filter form into `container` and wires every control so
   * that `onChange` is called with a fresh snapshot after each interaction.
   *
   * Must be called exactly once per instance.
   */
  mount(container: HTMLElement, onChange: (values: FightTestFilterValues) => void): void {
    container.appendChild(this.buildForm(onChange))
  }

  /**
   * Sets every control to reflect the passed values.
   * BOTH and null for `side` both select the BOTH radio.
   */
  populate(values: FightTestFilterValues): void {
    // Mode
    const modeGroup = this.modeGroup!
    modeGroup.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach(input => {
      input.checked = input.value === (values.mode ?? '')
    })

    // Target Levels
    const tlGroup = this.targetLevelGroup!
    tlGroup.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(input => {
      input.checked = values.targetLevels.includes(input.value as TargetLevel)
    })

    // Categories
    const catGroup = this.categoryGroup!
    catGroup.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(input => {
      input.checked = values.categories.includes(input.value as TechniqueCategory)
    })

    // Side — null and 'BOTH' both select the BOTH radio
    const sideGroup = this.sideGroup!
    const effectiveSide: string = values.side === null || values.side === 'BOTH' ? 'BOTH' : values.side
    sideGroup.querySelectorAll<HTMLInputElement>('input[type="radio"]').forEach(input => {
      input.checked = input.value === effectiveSide
    })

    // Shuffle Mode
    if (this.shuffleSelect) {
      this.shuffleSelect.value = values.shuffleMode
    }
  }

  /**
   * Reads current control state and returns a snapshot.
   * No side effects — DOM is not modified.
   */
  getValues(): FightTestFilterValues {
    return {
      mode: this.readMode(),
      targetLevels: this.readChecked<TargetLevel>(this.targetLevelGroup!),
      categories: this.readChecked<TechniqueCategory>(this.categoryGroup!),
      side: this.readSide(),
      shuffleMode: this.shuffleSelect
        ? (this.shuffleSelect.value as FightTestFilterValues['shuffleMode'])
        : 'Random',
    }
  }

  /**
   * Adds `is-invalid` to the Mode group wrapper and shows the error message.
   */
  showModeError(): void {
    this.modeGroup?.classList.add('is-invalid')
    const err = this.modeError
    if (err) {
      err.classList.remove('d-none')
      err.style.display = ''
    }
  }

  /**
   * Removes `is-invalid` from the Mode group wrapper and hides the error message.
   */
  clearModeError(): void {
    this.modeGroup?.classList.remove('is-invalid')
    const err = this.modeError
    if (err) {
      err.classList.add('d-none')
    }
  }

  // -------------------------------------------------------------------------
  // Private state — set during buildForm()
  // -------------------------------------------------------------------------

  private modeGroup: HTMLElement | null = null
  private targetLevelGroup: HTMLElement | null = null
  private categoryGroup: HTMLElement | null = null
  private sideGroup: HTMLElement | null = null
  private shuffleSelect: HTMLSelectElement | null = null
  private modeError: HTMLElement | null = null

  // -------------------------------------------------------------------------
  // Build helpers
  // -------------------------------------------------------------------------

  private buildForm(onChange: (values: FightTestFilterValues) => void): HTMLElement {
    const form = document.createElement('div')
    form.className = 'ft-filter-form'

    const notify = () => onChange(this.getValues())

    // Mode
    const modeSection = this.buildModeGroup(notify)
    form.appendChild(modeSection)

    // Target Levels
    form.appendChild(this.buildCheckboxGroup(
      'Target Levels',
      TARGET_LEVELS,
      notify,
      (el) => { this.targetLevelGroup = el },
    ))

    // Categories
    form.appendChild(this.buildCheckboxGroup(
      'Categories',
      CATEGORIES,
      notify,
      (el) => { this.categoryGroup = el },
    ))

    // Side
    form.appendChild(this.buildSideGroup(notify))

    // Shuffle Mode
    form.appendChild(this.buildShuffleSelect(notify))

    return form
  }

  /** Builds the Mode radio toggle group with error slot. */
  private buildModeGroup(notify: () => void): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'mb-3'

    const label = document.createElement('label')
    label.className = 'form-label fw-semibold'
    label.textContent = 'Mode'
    wrapper.appendChild(label)

    const group = document.createElement('div')
    group.setAttribute('role', 'group')
    group.setAttribute('aria-label', 'Mode')
    group.setAttribute('aria-required', 'true')
    group.className = 'btn-group d-flex flex-wrap gap-1'
    group.style.minHeight = '44px'
    this.modeGroup = group

    MODE_OPTIONS.forEach((mode, idx) => {
      const inputId = `ft-mode-${mode.toLowerCase()}`
      const input = document.createElement('input')
      input.type = 'radio'
      input.className = 'btn-check'
      input.name = 'ft-mode'
      input.id = inputId
      input.value = mode
      input.autocomplete = 'off'
      input.addEventListener('change', notify)

      const btn = document.createElement('label')
      btn.className = 'btn btn-outline-primary'
      btn.htmlFor = inputId
      btn.style.minHeight = '44px'
      btn.textContent = mode.charAt(0) + mode.slice(1).toLowerCase()

      group.appendChild(input)
      group.appendChild(btn)

      void idx // suppress unused warning
    })

    // Error element (adjacent to the group per task 1.4.3)
    const errorDiv = document.createElement('div')
    errorDiv.id = 'ft-mode-error'
    errorDiv.className = 'invalid-feedback d-none'
    errorDiv.textContent = 'Please select a mode.'
    this.modeError = errorDiv

    wrapper.appendChild(group)
    wrapper.appendChild(errorDiv)

    return wrapper
  }

  /** Builds a multi-select checkbox toggle group. */
  private buildCheckboxGroup<T extends string>(
    label: string,
    options: T[],
    notify: () => void,
    setRef: (el: HTMLElement) => void,
  ): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'mb-3'

    const lbl = document.createElement('label')
    lbl.className = 'form-label fw-semibold'
    lbl.textContent = label
    wrapper.appendChild(lbl)

    const group = document.createElement('div')
    group.setAttribute('role', 'group')
    group.setAttribute('aria-label', label)
    group.className = 'd-flex flex-wrap gap-1'
    group.style.minHeight = '44px'
    setRef(group)

    const nameAttr = `ft-${label.toLowerCase().replace(/\s+/g, '-')}`

    options.forEach(option => {
      const inputId = `${nameAttr}-${option.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.className = 'btn-check'
      input.name = nameAttr
      input.id = inputId
      input.value = option
      input.autocomplete = 'off'
      input.addEventListener('change', notify)

      const btn = document.createElement('label')
      btn.className = 'btn btn-outline-secondary btn-sm'
      btn.htmlFor = inputId
      btn.style.minHeight = '44px'
      btn.textContent = option

      group.appendChild(input)
      group.appendChild(btn)
    })

    wrapper.appendChild(group)
    return wrapper
  }

  /** Builds the Side radio toggle group (BOTH / LEFT / RIGHT). */
  private buildSideGroup(notify: () => void): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'mb-3'

    const label = document.createElement('label')
    label.className = 'form-label fw-semibold'
    label.textContent = 'Side'
    wrapper.appendChild(label)

    const group = document.createElement('div')
    group.setAttribute('role', 'group')
    group.setAttribute('aria-label', 'Side')
    group.className = 'btn-group d-flex flex-wrap gap-1'
    group.style.minHeight = '44px'
    this.sideGroup = group

    SIDE_OPTIONS.forEach(side => {
      const inputId = `ft-side-${side.toLowerCase()}`
      const input = document.createElement('input')
      input.type = 'radio'
      input.className = 'btn-check'
      input.name = 'ft-side'
      input.id = inputId
      input.value = side
      input.autocomplete = 'off'
      // BOTH is the default selection
      if (side === 'BOTH') input.checked = true
      input.addEventListener('change', notify)

      const btn = document.createElement('label')
      btn.className = 'btn btn-outline-secondary'
      btn.htmlFor = inputId
      btn.style.minHeight = '44px'
      btn.textContent = side.charAt(0) + side.slice(1).toLowerCase()

      group.appendChild(input)
      group.appendChild(btn)
    })

    wrapper.appendChild(group)
    return wrapper
  }

  /** Builds the Shuffle Mode <select>. */
  private buildShuffleSelect(notify: () => void): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.className = 'mb-3'

    const label = document.createElement('label')
    label.className = 'form-label fw-semibold'
    label.htmlFor = 'ft-shuffle-mode'
    label.textContent = 'Shuffle Mode'
    wrapper.appendChild(label)

    const select = document.createElement('select')
    select.id = 'ft-shuffle-mode'
    select.className = 'form-select'
    select.style.minHeight = '44px'
    select.addEventListener('change', notify)
    this.shuffleSelect = select

    PLAY_MODES.forEach(pm => {
      const option = document.createElement('option')
      option.value = pm
      option.textContent = pm
      select.appendChild(option)
    })

    // Default to 'Random'
    select.value = 'Random'

    wrapper.appendChild(select)
    return wrapper
  }

  // -------------------------------------------------------------------------
  // Read helpers
  // -------------------------------------------------------------------------

  private readMode(): Mode | null {
    const group = this.modeGroup
    if (!group) return null
    const checked = group.querySelector<HTMLInputElement>('input[type="radio"]:checked')
    return checked ? (checked.value as Mode) : null
  }

  private readChecked<T extends string>(group: HTMLElement): T[] {
    return Array.from(group.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked'))
      .map(el => el.value as T)
  }

  private readSide(): Side | 'BOTH' | null {
    const group = this.sideGroup
    if (!group) return null
    const checked = group.querySelector<HTMLInputElement>('input[type="radio"]:checked')
    if (!checked || checked.value === 'BOTH') return null
    return checked.value as Side
  }
}
