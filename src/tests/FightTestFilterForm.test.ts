/**
 * Task 1.4 — TDD tests for FightTestFilterForm.
 *
 * Covers all 2.3.x acceptance criteria:
 *   - 2.3.2  mount() renders Mode toggle group with exactly two options
 *   - 2.3.3  mount() renders Target Levels group with exactly nine options
 *   - 2.3.4  mount() renders Categories group with the correct number of options
 *   - 2.3.5  mount() renders Side group with exactly three options, BOTH pre-selected
 *   - 2.3.6  populate(values) → getValues() round-trip returns deep-equal values
 *   - 2.3.7  onChange fires after each individual control change
 *   - 2.3.8  showModeError() adds is-invalid to the Mode group wrapper
 *   - 2.3.9  clearModeError() removes is-invalid
 *   - 2.3.10 PBT #9 — populate → getValues idempotent for a range of FightTestFilterValues
 *
 * Runs in jsdom (configured globally in vitest.config.ts).
 * No @testing-library — raw DOM APIs only, matching project conventions.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { FightTestFilterForm } from '../components/FightTestFilterForm'
import type { FightTestFilterValues, TargetLevel, TechniqueCategory, Side } from '../types/index'
import type { Mode } from '../constants/modes'
import type { PlayMode } from '../types/playMode'

// ---------------------------------------------------------------------------
// Domain value sets — mirrors what the form must render
// ---------------------------------------------------------------------------

const ALL_MODES: Mode[] = ['PERFORMING', 'RESPONDING']

const ALL_TARGET_LEVELS: TargetLevel[] = [
  'HEAD', 'NECK', 'CHEST', 'STOMACH', 'GROIN', 'HIP', 'SHIN', 'BACK', 'FOOT',
]

const ALL_CATEGORIES: TechniqueCategory[] = [
  'Punches', 'Strikes', 'Kicks', 'Knees', 'Defenses/Grabs',
  'Weapons', 'Hand-Grip', 'Knife', 'Slip', 'Defence',
  'Knee-Protection', 'Take Down', 'Elbow Strike',
]

const ALL_PLAY_MODES: PlayMode[] = ['Random', 'Unified Random', 'Ordered', 'Prioritized']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns a fresh container div attached to document.body, cleaned up after each test. */
function makeContainer(): HTMLElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function cleanupContainers(): void {
  document.body.innerHTML = ''
}

/** Creates a minimal catalogue (the form constructor accepts but does not filter). */
function makeCatalogue() {
  return [] // FightTestFilterForm only needs the signature; catalogue is reserved for future use
}

/** Helper to simulate a change event on an element. */
function fireChange(el: Element): void {
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

/** Builds a FightTestFilterValues snapshot for population tests. */
function makeFilterValues(overrides: Partial<FightTestFilterValues> = {}): FightTestFilterValues {
  return {
    mode: null,
    targetLevels: [],
    categories: [],
    side: null,
    shuffleMode: 'Random',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Pseudo-random helpers for PBT (seeded LCG — no fast-check dependency)
// ---------------------------------------------------------------------------

function makeLcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0x100000000
  }
}

function pickSubset<T>(arr: T[], rand: () => number): T[] {
  const n = Math.floor(rand() * (arr.length + 1))
  const copy = [...arr]
  const result: T[] = []
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rand() * copy.length)
    result.push(copy.splice(idx, 1)[0])
  }
  return result
}

function pickRandom<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]
}

/** Generates a FightTestFilterValues with random (but valid) values. */
function randomFilterValues(rand: () => number): FightTestFilterValues {
  const sideOptions: Array<Side | 'BOTH' | null> = ['LEFT', 'RIGHT', 'BOTH', null]
  const modeOptions: Array<Mode | null> = [...ALL_MODES, null]
  return {
    mode: pickRandom(modeOptions, rand),
    targetLevels: pickSubset(ALL_TARGET_LEVELS, rand),
    categories: pickSubset(ALL_CATEGORIES, rand),
    side: pickRandom(sideOptions, rand),
    shuffleMode: pickRandom(ALL_PLAY_MODES, rand),
  }
}

// ---------------------------------------------------------------------------
// mount() — structural rendering tests
// ---------------------------------------------------------------------------

describe('FightTestFilterForm — mount() structural rendering', () => {
  let container: HTMLElement
  let form: FightTestFilterForm

  beforeEach(() => {
    container = makeContainer()
    form = new FightTestFilterForm(makeCatalogue())
    form.mount(container, () => {})
  })

  afterEach(() => cleanupContainers())

  // 2.3.2 — Mode toggle group: exactly two btn-check inputs
  it('renders a Mode toggle group with exactly two radio inputs', () => {
    const modeGroup = container.querySelector('[aria-label="Mode"]')
    expect(modeGroup).not.toBeNull()
    const radios = modeGroup!.querySelectorAll('input[type="radio"]')
    expect(radios).toHaveLength(2)
  })

  it('Mode inputs have values PERFORMING and RESPONDING', () => {
    const modeGroup = container.querySelector('[aria-label="Mode"]')!
    const values = Array.from(modeGroup.querySelectorAll('input[type="radio"]')).map(
      (el) => (el as HTMLInputElement).value
    )
    expect(values).toContain('PERFORMING')
    expect(values).toContain('RESPONDING')
  })

  it('Mode group has aria-required="true"', () => {
    const modeGroup = container.querySelector('[aria-label="Mode"]')
    expect(modeGroup?.getAttribute('aria-required')).toBe('true')
  })

  // 2.3.3 — Target Levels toggle group: exactly nine btn-check inputs
  it('renders a Target Levels toggle group with exactly nine checkboxes', () => {
    const group = container.querySelector('[aria-label="Target Levels"]')
    expect(group).not.toBeNull()
    const checkboxes = group!.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(9)
  })

  it('Target Levels checkboxes cover all nine level values', () => {
    const group = container.querySelector('[aria-label="Target Levels"]')!
    const values = Array.from(group.querySelectorAll('input[type="checkbox"]')).map(
      (el) => (el as HTMLInputElement).value
    )
    ALL_TARGET_LEVELS.forEach((level) => expect(values).toContain(level))
  })

  // 2.3.4 — Categories toggle group: correct number of options
  it('renders a Categories toggle group with exactly 13 checkboxes', () => {
    const group = container.querySelector('[aria-label="Categories"]')
    expect(group).not.toBeNull()
    const checkboxes = group!.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes).toHaveLength(ALL_CATEGORIES.length)
  })

  it('Categories checkboxes cover all category values', () => {
    const group = container.querySelector('[aria-label="Categories"]')!
    const values = Array.from(group.querySelectorAll('input[type="checkbox"]')).map(
      (el) => (el as HTMLInputElement).value
    )
    ALL_CATEGORIES.forEach((cat) => expect(values).toContain(cat))
  })

  // 2.3.5 — Side toggle group: exactly three options, BOTH pre-selected
  it('renders a Side toggle group with exactly three radio inputs', () => {
    const group = container.querySelector('[aria-label="Side"]')
    expect(group).not.toBeNull()
    const radios = group!.querySelectorAll('input[type="radio"]')
    expect(radios).toHaveLength(3)
  })

  it('Side group has BOTH, LEFT, RIGHT options', () => {
    const group = container.querySelector('[aria-label="Side"]')!
    const values = Array.from(group.querySelectorAll('input[type="radio"]')).map(
      (el) => (el as HTMLInputElement).value
    )
    expect(values).toContain('BOTH')
    expect(values).toContain('LEFT')
    expect(values).toContain('RIGHT')
  })

  it('Side group has BOTH pre-selected by default', () => {
    const group = container.querySelector('[aria-label="Side"]')!
    const bothInput = group.querySelector('input[value="BOTH"]') as HTMLInputElement
    expect(bothInput).not.toBeNull()
    expect(bothInput.checked).toBe(true)
  })

  // Shuffle Mode select
  it('renders a Shuffle Mode <select> with all four PlayMode options', () => {
    const select = container.querySelector('select') as HTMLSelectElement
    expect(select).not.toBeNull()
    const optionValues = Array.from(select.options).map((o) => o.value)
    ALL_PLAY_MODES.forEach((pm) => expect(optionValues).toContain(pm))
  })

  it('renders a Mode error element with id ft-mode-error', () => {
    const err = container.querySelector('#ft-mode-error')
    expect(err).not.toBeNull()
  })

  // Accessibility: each toggle group has role="group"
  it('all toggle groups have role="group"', () => {
    const groups = container.querySelectorAll('[role="group"]')
    // Mode, Target Levels, Categories, Side — at least four groups
    expect(groups.length).toBeGreaterThanOrEqual(4)
  })

  // Touch targets: all interactive elements have min-height 44px (inline style or class)
  it('all toggle group wrappers have min-height style of 44px', () => {
    const modeGroup = container.querySelector('[aria-label="Mode"]') as HTMLElement
    expect(modeGroup?.style.minHeight).toBe('44px')
  })
})

// ---------------------------------------------------------------------------
// getValues() — initial state
// ---------------------------------------------------------------------------

describe('FightTestFilterForm — getValues() initial state', () => {
  let container: HTMLElement
  let form: FightTestFilterForm

  beforeEach(() => {
    container = makeContainer()
    form = new FightTestFilterForm(makeCatalogue())
    form.mount(container, () => {})
  })

  afterEach(() => cleanupContainers())

  it('initial mode is null (no radio selected)', () => {
    expect(form.getValues().mode).toBeNull()
  })

  it('initial targetLevels is empty array', () => {
    expect(form.getValues().targetLevels).toEqual([])
  })

  it('initial categories is empty array', () => {
    expect(form.getValues().categories).toEqual([])
  })

  it('initial side is null (BOTH selected maps to null)', () => {
    // BOTH pre-selected maps to null in getValues per FightTestFilterValues type
    expect(form.getValues().side).toBeNull()
  })

  it('initial shuffleMode is "Random"', () => {
    expect(form.getValues().shuffleMode).toBe('Random')
  })
})

// ---------------------------------------------------------------------------
// populate() + getValues() — round-trip (2.3.6)
// ---------------------------------------------------------------------------

describe('FightTestFilterForm — populate() + getValues() round-trip', () => {
  let container: HTMLElement
  let form: FightTestFilterForm

  beforeEach(() => {
    container = makeContainer()
    form = new FightTestFilterForm(makeCatalogue())
    form.mount(container, () => {})
  })

  afterEach(() => cleanupContainers())

  it('round-trips mode: PERFORMING', () => {
    form.populate(makeFilterValues({ mode: 'PERFORMING' }))
    expect(form.getValues().mode).toBe('PERFORMING')
  })

  it('round-trips mode: RESPONDING', () => {
    form.populate(makeFilterValues({ mode: 'RESPONDING' }))
    expect(form.getValues().mode).toBe('RESPONDING')
  })

  it('round-trips mode: null (no mode selected)', () => {
    form.populate(makeFilterValues({ mode: null }))
    expect(form.getValues().mode).toBeNull()
  })

  it('round-trips targetLevels with two levels selected', () => {
    const levels: TargetLevel[] = ['HEAD', 'SHIN']
    form.populate(makeFilterValues({ targetLevels: levels }))
    expect(form.getValues().targetLevels).toEqual(expect.arrayContaining(levels))
    expect(form.getValues().targetLevels).toHaveLength(levels.length)
  })

  it('round-trips targetLevels empty array', () => {
    form.populate(makeFilterValues({ targetLevels: [] }))
    expect(form.getValues().targetLevels).toEqual([])
  })

  it('round-trips categories with three categories selected', () => {
    const cats: TechniqueCategory[] = ['Kicks', 'Knees', 'Slip']
    form.populate(makeFilterValues({ categories: cats }))
    expect(form.getValues().categories).toEqual(expect.arrayContaining(cats))
    expect(form.getValues().categories).toHaveLength(cats.length)
  })

  it('round-trips categories empty array', () => {
    form.populate(makeFilterValues({ categories: [] }))
    expect(form.getValues().categories).toEqual([])
  })

  it('round-trips side: LEFT', () => {
    form.populate(makeFilterValues({ side: 'LEFT' }))
    expect(form.getValues().side).toBe('LEFT')
  })

  it('round-trips side: RIGHT', () => {
    form.populate(makeFilterValues({ side: 'RIGHT' }))
    expect(form.getValues().side).toBe('RIGHT')
  })

  it('round-trips side: BOTH maps to null', () => {
    form.populate(makeFilterValues({ side: 'BOTH' }))
    expect(form.getValues().side).toBeNull()
  })

  it('round-trips side: null maps to null (BOTH checked)', () => {
    form.populate(makeFilterValues({ side: null }))
    expect(form.getValues().side).toBeNull()
  })

  it('round-trips shuffleMode: Ordered', () => {
    form.populate(makeFilterValues({ shuffleMode: 'Ordered' }))
    expect(form.getValues().shuffleMode).toBe('Ordered')
  })

  it('round-trips a fully-populated FightTestFilterValues snapshot', () => {
    const values: FightTestFilterValues = {
      mode: 'RESPONDING',
      targetLevels: ['CHEST', 'GROIN', 'NECK'],
      categories: ['Kicks', 'Knife', 'Defence'],
      side: 'LEFT',
      shuffleMode: 'Prioritized',
    }
    form.populate(values)
    const result = form.getValues()
    expect(result.mode).toBe(values.mode)
    expect(result.targetLevels).toEqual(expect.arrayContaining(values.targetLevels))
    expect(result.targetLevels).toHaveLength(values.targetLevels.length)
    expect(result.categories).toEqual(expect.arrayContaining(values.categories))
    expect(result.categories).toHaveLength(values.categories.length)
    expect(result.side).toBe(values.side)
    expect(result.shuffleMode).toBe(values.shuffleMode)
  })
})

// ---------------------------------------------------------------------------
// onChange callback (2.3.7)
// ---------------------------------------------------------------------------

describe('FightTestFilterForm — onChange callback', () => {
  let container: HTMLElement
  let form: FightTestFilterForm
  let onChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    container = makeContainer()
    onChange = vi.fn()
    form = new FightTestFilterForm(makeCatalogue())
    form.mount(container, onChange)
  })

  afterEach(() => cleanupContainers())

  it('fires onChange when a Mode radio is changed', () => {
    const modeGroup = container.querySelector('[aria-label="Mode"]')!
    const radio = modeGroup.querySelector('input[value="PERFORMING"]') as HTMLInputElement
    radio.checked = true
    fireChange(radio)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('passes current FightTestFilterValues snapshot to onChange', () => {
    const modeGroup = container.querySelector('[aria-label="Mode"]')!
    const radio = modeGroup.querySelector('input[value="RESPONDING"]') as HTMLInputElement
    radio.checked = true
    fireChange(radio)
    const calledWith: FightTestFilterValues = onChange.mock.calls[0][0]
    expect(calledWith.mode).toBe('RESPONDING')
  })

  it('fires onChange when a Target Level checkbox is changed', () => {
    const group = container.querySelector('[aria-label="Target Levels"]')!
    const checkbox = group.querySelector('input[value="HEAD"]') as HTMLInputElement
    checkbox.checked = true
    fireChange(checkbox)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].targetLevels).toContain('HEAD')
  })

  it('fires onChange when a Category checkbox is changed', () => {
    const group = container.querySelector('[aria-label="Categories"]')!
    const checkbox = group.querySelector('input[value="Kicks"]') as HTMLInputElement
    checkbox.checked = true
    fireChange(checkbox)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].categories).toContain('Kicks')
  })

  it('fires onChange when a Side radio is changed', () => {
    const group = container.querySelector('[aria-label="Side"]')!
    const radio = group.querySelector('input[value="LEFT"]') as HTMLInputElement
    radio.checked = true
    fireChange(radio)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].side).toBe('LEFT')
  })

  it('fires onChange when the Shuffle Mode select is changed', () => {
    const select = container.querySelector('select') as HTMLSelectElement
    select.value = 'Ordered'
    fireChange(select)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].shuffleMode).toBe('Ordered')
  })
})

// ---------------------------------------------------------------------------
// showModeError() / clearModeError() (2.3.8, 2.3.9)
// ---------------------------------------------------------------------------

describe('FightTestFilterForm — showModeError() and clearModeError()', () => {
  let container: HTMLElement
  let form: FightTestFilterForm

  beforeEach(() => {
    container = makeContainer()
    form = new FightTestFilterForm(makeCatalogue())
    form.mount(container, () => {})
  })

  afterEach(() => cleanupContainers())

  it('showModeError() adds is-invalid class to the Mode group wrapper', () => {
    form.showModeError()
    const modeGroup = container.querySelector('[aria-label="Mode"]')!
    expect(modeGroup.classList.contains('is-invalid')).toBe(true)
  })

  it('showModeError() makes #ft-mode-error visible (removes d-none / sets display)', () => {
    form.showModeError()
    const err = container.querySelector('#ft-mode-error') as HTMLElement
    // Either d-none is removed, or display is not 'none'
    const isHidden = err.classList.contains('d-none') || err.style.display === 'none'
    expect(isHidden).toBe(false)
  })

  it('clearModeError() removes is-invalid from the Mode group wrapper', () => {
    form.showModeError()
    form.clearModeError()
    const modeGroup = container.querySelector('[aria-label="Mode"]')!
    expect(modeGroup.classList.contains('is-invalid')).toBe(false)
  })

  it('clearModeError() hides #ft-mode-error (adds d-none or sets display:none)', () => {
    form.showModeError()
    form.clearModeError()
    const err = container.querySelector('#ft-mode-error') as HTMLElement
    const isHidden = err.classList.contains('d-none') || err.style.display === 'none'
    expect(isHidden).toBe(true)
  })

  it('clearModeError() is safe to call when no error is shown (no throw)', () => {
    expect(() => form.clearModeError()).not.toThrow()
  })

  it('showModeError() is idempotent — calling twice does not duplicate class', () => {
    form.showModeError()
    form.showModeError()
    const modeGroup = container.querySelector('[aria-label="Mode"]')!
    const occurrences = modeGroup.className.match(/is-invalid/g)?.length ?? 0
    expect(occurrences).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// getValues() has no side effects (2.1.4.5)
// ---------------------------------------------------------------------------

describe('FightTestFilterForm — getValues() is side-effect free', () => {
  let container: HTMLElement
  let form: FightTestFilterForm

  beforeEach(() => {
    container = makeContainer()
    form = new FightTestFilterForm(makeCatalogue())
    form.mount(container, () => {})
  })

  afterEach(() => cleanupContainers())

  it('calling getValues() twice returns deep-equal snapshots', () => {
    form.populate(makeFilterValues({ mode: 'PERFORMING', targetLevels: ['HEAD', 'NECK'] }))
    const first = form.getValues()
    const second = form.getValues()
    expect(first).toEqual(second)
  })

  it('getValues() does not modify DOM state', () => {
    form.populate(makeFilterValues({ mode: 'PERFORMING' }))
    const htmlBefore = container.innerHTML
    form.getValues()
    expect(container.innerHTML).toBe(htmlBefore)
  })
})

// ---------------------------------------------------------------------------
// PBT #9 — populate → getValues idempotent (2.3.10)
// ---------------------------------------------------------------------------

describe('FightTestFilterForm — PBT #9: populate → getValues idempotent', () => {
  afterEach(() => cleanupContainers())

  it('populate(v); getValues() deep-equals v for 20 random FightTestFilterValues', () => {
    const rand = makeLcg(0xdeadbeef)

    for (let i = 0; i < 20; i++) {
      const container = makeContainer()
      const form = new FightTestFilterForm(makeCatalogue())
      form.mount(container, () => {})

      const v = randomFilterValues(rand)
      form.populate(v)
      const result = form.getValues()

      // mode
      expect(result.mode).toBe(v.mode)

      // targetLevels: same elements (order may differ)
      expect(result.targetLevels).toHaveLength(v.targetLevels.length)
      v.targetLevels.forEach((tl) => expect(result.targetLevels).toContain(tl))

      // categories: same elements (order may differ)
      expect(result.categories).toHaveLength(v.categories.length)
      v.categories.forEach((cat) => expect(result.categories).toContain(cat))

      // side: BOTH and null both map to null in getValues
      const expectedSide = v.side === 'BOTH' ? null : v.side
      expect(result.side).toBe(expectedSide)

      // shuffleMode: exact match
      expect(result.shuffleMode).toBe(v.shuffleMode)

      container.remove()
    }
  })
})
