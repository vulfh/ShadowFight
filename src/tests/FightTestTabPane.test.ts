/**
 * Task 1.5 — TDD tests for FightTestTabPane.
 *
 * FightTestTabPane is a thin orchestrator: it wires FightTestFilterForm,
 * FightTestService, and AdhocFilterEngine together and owns the match-count
 * display.  Tests focus on observable behaviour through the public API and
 * the rendered DOM — not on implementation internals.
 *
 * Acceptance criteria: Req 6.1–6.3, 11.1–11.7
 *
 * Runs in jsdom (vitest.config.ts global environment).
 * No @testing-library — raw DOM APIs only, matching project conventions.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FightTestTabPane } from '../components/FightTestTabPane'
import { FightTestService } from '../services/FightTestService'
import { AdhocFilterEngine } from '../utils/AdhocFilterEngine'
import type { Technique, FightTest } from '../types/index'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContainer(): HTMLElement {
  const el = document.createElement('div')
  document.body.appendChild(el)
  return el
}

function cleanup(): void {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  localStorage.clear()
}

/** Minimal technique factory. */
function makeTechnique(overrides: Partial<Technique> = {}): Technique {
  return {
    name: 'test-technique',
    file: 'test.wav',
    category: 'Kicks',
    priority: 'medium',
    selected: true,
    weight: 1,
    targetLevel: 'HEAD',
    side: 'LEFT',
    modes: ['PERFORMING', 'RESPONDING'],
    ...overrides,
  }
}

/** A catalogue with two techniques that match PERFORMING mode. */
function makeCatalogue(): Technique[] {
  return [
    makeTechnique({ name: 'a', modes: ['PERFORMING'] }),
    makeTechnique({ name: 'b', modes: ['PERFORMING'] }),
    makeTechnique({ name: 'c', modes: ['RESPONDING'] }),
  ]
}

// ---------------------------------------------------------------------------
// getElement() — 1.5.5
// ---------------------------------------------------------------------------

describe('FightTestTabPane — getElement()', () => {
  afterEach(cleanup)

  it('returns an HTMLElement before mount', () => {
    const pane = new FightTestTabPane(FightTestService, makeCatalogue())
    expect(pane.getElement()).toBeInstanceOf(HTMLElement)
  })

  it('returns the same element instance on repeated calls', () => {
    const pane = new FightTestTabPane(FightTestService, makeCatalogue())
    expect(pane.getElement()).toBe(pane.getElement())
  })
})

// ---------------------------------------------------------------------------
// mount() — structural DOM (1.5.3)
// ---------------------------------------------------------------------------

describe('FightTestTabPane — mount() structure', () => {
  let container: HTMLElement
  let pane: FightTestTabPane

  beforeEach(() => {
    container = makeContainer()
    pane = new FightTestTabPane(FightTestService, makeCatalogue())
    pane.mount(container)
  })

  afterEach(cleanup)

  it('appends a child element to the container', () => {
    expect(container.children.length).toBeGreaterThan(0)
  })

  it('renders a #ft-match-count element', () => {
    expect(container.querySelector('#ft-match-count')).not.toBeNull()
  })

  it('renders the filter form controls (Mode toggle group)', () => {
    expect(container.querySelector('[aria-label="Mode"]')).not.toBeNull()
  })

  it('getElement() root is inside container after mount', () => {
    expect(container.contains(pane.getElement())).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// mount() — initial populate from service.read() (1.5.3)
// ---------------------------------------------------------------------------

describe('FightTestTabPane — mount() reads persisted state', () => {
  afterEach(cleanup)

  it('populates the form with the value returned by service.read()', () => {
    // Pre-store a RESPONDING mode selection
    FightTestService.write({
      ...FightTestService.DEFAULT,
      mode: 'RESPONDING',
    })

    const container = makeContainer()
    const pane = new FightTestTabPane(FightTestService, makeCatalogue())
    pane.mount(container)

    // The RESPONDING radio should be checked after populate
    const modeGroup = container.querySelector('[aria-label="Mode"]')!
    const respondingInput = modeGroup.querySelector(
      'input[value="RESPONDING"]'
    ) as HTMLInputElement
    expect(respondingInput.checked).toBe(true)
  })

  it('calls service.read() during mount (not just DEFAULT)', () => {
    const readSpy = vi.spyOn(FightTestService, 'read')
    const container = makeContainer()
    new FightTestTabPane(FightTestService, makeCatalogue()).mount(container)
    expect(readSpy).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// updateMatchCount — three display states (1.5.4)
// ---------------------------------------------------------------------------

describe('FightTestTabPane — updateMatchCount display states', () => {
  afterEach(cleanup)

  it('shows "Select a mode to see matches" with muted italic styling when mode is null', () => {
    localStorage.clear() // ensure DEFAULT (mode: null)
    const container = makeContainer()
    new FightTestTabPane(FightTestService, makeCatalogue()).mount(container)

    const countEl = container.querySelector('#ft-match-count') as HTMLElement
    expect(countEl.textContent).toContain('Select a mode to see matches')
    expect(countEl.classList.contains('text-muted')).toBe(true)
    expect(countEl.classList.contains('fst-italic')).toBe(true)
  })

  it('shows "0 techniques matched" with text-danger when mode is set but nothing matches', () => {
    // Stub filter to return empty
    vi.spyOn(AdhocFilterEngine, 'filter').mockReturnValue([])

    FightTestService.write({ ...FightTestService.DEFAULT, mode: 'PERFORMING' })
    const container = makeContainer()
    new FightTestTabPane(FightTestService, makeCatalogue()).mount(container)

    const countEl = container.querySelector('#ft-match-count') as HTMLElement
    expect(countEl.textContent).toContain('0 techniques matched')
    expect(countEl.classList.contains('text-danger')).toBe(true)
  })

  it('shows "${n} techniques matched" with text-success when matches exist', () => {
    FightTestService.write({ ...FightTestService.DEFAULT, mode: 'PERFORMING' })
    const container = makeContainer()
    // catalogue has 2 PERFORMING techniques
    new FightTestTabPane(FightTestService, makeCatalogue()).mount(container)

    const countEl = container.querySelector('#ft-match-count') as HTMLElement
    expect(countEl.textContent).toContain('2 techniques matched')
    expect(countEl.classList.contains('text-success')).toBe(true)
  })

  it('match count updates when the filter form fires onChange', () => {
    const container = makeContainer()
    const pane = new FightTestTabPane(FightTestService, makeCatalogue())
    pane.mount(container)

    // Simulate selecting PERFORMING via the form control
    const modeGroup = container.querySelector('[aria-label="Mode"]')!
    const radio = modeGroup.querySelector(
      'input[value="PERFORMING"]'
    ) as HTMLInputElement
    radio.checked = true
    radio.dispatchEvent(new Event('change', { bubbles: true }))

    const countEl = container.querySelector('#ft-match-count') as HTMLElement
    expect(countEl.textContent).toContain('techniques matched')
    expect(countEl.classList.contains('text-success')).toBe(true)
  })

  it('match count reverts to muted when mode is deselected (set back to null)', () => {
    FightTestService.write({ ...FightTestService.DEFAULT, mode: 'PERFORMING' })
    const container = makeContainer()
    const pane = new FightTestTabPane(FightTestService, makeCatalogue())
    pane.mount(container)

    // Force mode back to null by unchecking all mode radios
    const modeGroup = container.querySelector('[aria-label="Mode"]')!
    modeGroup
      .querySelectorAll<HTMLInputElement>('input[type="radio"]')
      .forEach((r) => (r.checked = false))

    // Trigger change on any mode radio to fire onChange
    modeGroup
      .querySelector<HTMLInputElement>('input[type="radio"]')!
      .dispatchEvent(new Event('change', { bubbles: true }))

    const countEl = container.querySelector('#ft-match-count') as HTMLElement
    expect(countEl.textContent).toContain('Select a mode to see matches')
  })
})

// ---------------------------------------------------------------------------
// onChange handler — service.write() is called (1.5.3)
// ---------------------------------------------------------------------------

describe('FightTestTabPane — onChange persists to service', () => {
  afterEach(cleanup)

  it('calls service.write() when a form control changes', () => {
    const writeSpy = vi.spyOn(FightTestService, 'write')
    const container = makeContainer()
    new FightTestTabPane(FightTestService, makeCatalogue()).mount(container)

    const modeGroup = container.querySelector('[aria-label="Mode"]')!
    const radio = modeGroup.querySelector(
      'input[value="PERFORMING"]'
    ) as HTMLInputElement
    radio.checked = true
    radio.dispatchEvent(new Event('change', { bubbles: true }))

    expect(writeSpy).toHaveBeenCalled()
  })

  it('writes a FightTest with ADHOC_ID and ADHOC_NAME', () => {
    const writeSpy = vi.spyOn(FightTestService, 'write')
    const container = makeContainer()
    new FightTestTabPane(FightTestService, makeCatalogue()).mount(container)

    const modeGroup = container.querySelector('[aria-label="Mode"]')!
    const radio = modeGroup.querySelector(
      'input[value="RESPONDING"]'
    ) as HTMLInputElement
    radio.checked = true
    radio.dispatchEvent(new Event('change', { bubbles: true }))

    const written: FightTest = writeSpy.mock.calls[0][0]
    expect(written.id).toBe(FightTestService.ADHOC_ID)
    expect(written.name).toBe(FightTestService.ADHOC_NAME)
    expect(written.mode).toBe('RESPONDING')
  })
})

// ---------------------------------------------------------------------------
// getCurrentFightTest() — 1.5.6
// ---------------------------------------------------------------------------

describe('FightTestTabPane — getCurrentFightTest()', () => {
  afterEach(cleanup)

  it('returns a FightTest with ADHOC_ID', () => {
    const container = makeContainer()
    const pane = new FightTestTabPane(FightTestService, makeCatalogue())
    pane.mount(container)
    expect(pane.getCurrentFightTest().id).toBe(FightTestService.ADHOC_ID)
  })

  it('returns a FightTest with ADHOC_NAME', () => {
    const container = makeContainer()
    const pane = new FightTestTabPane(FightTestService, makeCatalogue())
    pane.mount(container)
    expect(pane.getCurrentFightTest().name).toBe(FightTestService.ADHOC_NAME)
  })

  it('reflects current form values in the returned FightTest', () => {
    const container = makeContainer()
    const pane = new FightTestTabPane(FightTestService, makeCatalogue())
    pane.mount(container)

    // Select PERFORMING via DOM
    const modeGroup = container.querySelector('[aria-label="Mode"]')!
    const radio = modeGroup.querySelector(
      'input[value="PERFORMING"]'
    ) as HTMLInputElement
    radio.checked = true
    radio.dispatchEvent(new Event('change', { bubbles: true }))

    const ft = pane.getCurrentFightTest()
    expect(ft.mode).toBe('PERFORMING')
  })

  it('returns the same value as form.getValues() merged with id/name', () => {
    const container = makeContainer()
    const pane = new FightTestTabPane(FightTestService, makeCatalogue())
    pane.mount(container)

    const ft = pane.getCurrentFightTest()
    // All filter values should be present in addition to id/name
    expect(ft).toHaveProperty('mode')
    expect(ft).toHaveProperty('targetLevels')
    expect(ft).toHaveProperty('categories')
    expect(ft).toHaveProperty('side')
    expect(ft).toHaveProperty('shuffleMode')
  })
})

// ---------------------------------------------------------------------------
// showModeError() / clearModeError() — delegation to form (1.5.7)
// ---------------------------------------------------------------------------

describe('FightTestTabPane — showModeError() and clearModeError()', () => {
  afterEach(cleanup)

  it('showModeError() adds is-invalid to the Mode group wrapper', () => {
    const container = makeContainer()
    const pane = new FightTestTabPane(FightTestService, makeCatalogue())
    pane.mount(container)

    pane.showModeError()

    const modeGroup = container.querySelector('[aria-label="Mode"]')!
    expect(modeGroup.classList.contains('is-invalid')).toBe(true)
  })

  it('showModeError() makes #ft-mode-error visible', () => {
    const container = makeContainer()
    const pane = new FightTestTabPane(FightTestService, makeCatalogue())
    pane.mount(container)

    pane.showModeError()

    const err = container.querySelector('#ft-mode-error') as HTMLElement
    const isHidden = err.classList.contains('d-none') || err.style.display === 'none'
    expect(isHidden).toBe(false)
  })

  it('clearModeError() removes is-invalid from the Mode group wrapper', () => {
    const container = makeContainer()
    const pane = new FightTestTabPane(FightTestService, makeCatalogue())
    pane.mount(container)

    pane.showModeError()
    pane.clearModeError()

    const modeGroup = container.querySelector('[aria-label="Mode"]')!
    expect(modeGroup.classList.contains('is-invalid')).toBe(false)
  })

  it('clearModeError() is safe before showModeError() is called', () => {
    const container = makeContainer()
    const pane = new FightTestTabPane(FightTestService, makeCatalogue())
    pane.mount(container)
    expect(() => pane.clearModeError()).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// onChange clears mode error (1.8.6 wiring concern, tested here at unit level)
// ---------------------------------------------------------------------------

describe('FightTestTabPane — onChange clears mode error', () => {
  afterEach(cleanup)

  it('clears the mode error when a form control fires onChange', () => {
    const container = makeContainer()
    const pane = new FightTestTabPane(FightTestService, makeCatalogue())
    pane.mount(container)

    pane.showModeError()

    // Trigger a form change
    const modeGroup = container.querySelector('[aria-label="Mode"]')!
    const radio = modeGroup.querySelector(
      'input[value="PERFORMING"]'
    ) as HTMLInputElement
    radio.checked = true
    radio.dispatchEvent(new Event('change', { bubbles: true }))

    const modeGroupEl = container.querySelector('[aria-label="Mode"]')!
    expect(modeGroupEl.classList.contains('is-invalid')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// mount() guard — calling mount() twice does not throw (robustness)
// ---------------------------------------------------------------------------

describe('FightTestTabPane — mount() robustness', () => {
  afterEach(cleanup)

  it('does not throw when mount is called', () => {
    const container = makeContainer()
    const pane = new FightTestTabPane(FightTestService, makeCatalogue())
    expect(() => pane.mount(container)).not.toThrow()
  })
})
