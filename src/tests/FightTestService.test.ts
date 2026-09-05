/**
 * Task 1.2 — TDD tests for FightTestService.
 *
 * Covers:
 *   - Static constants (ADHOC_ID, ADHOC_NAME, DEFAULT)
 *   - read()  — empty storage, corrupted JSON, missing fields, happy path
 *   - write() — round-trip, SecurityError swallowed
 *   - reset() — returns DEFAULT and clears state
 *
 * No DOM required; runs in the default Vitest (node) environment.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FightTestService } from '../services/FightTestService'
import { STORAGE_KEYS } from '../constants/storage'
import type { FightTest } from '../types/index'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidFightTest(overrides: Partial<FightTest> = {}): FightTest {
  return {
    id: 'adhoc',
    name: 'Adhoc',
    mode: null,
    targetLevels: [],
    categories: [],
    side: null,
    shuffleMode: 'Random',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Static constants
// ---------------------------------------------------------------------------

describe('FightTestService — static constants', () => {
  it('ADHOC_ID is "adhoc"', () => {
    expect(FightTestService.ADHOC_ID).toBe('adhoc')
  })

  it('ADHOC_NAME is "Adhoc"', () => {
    expect(FightTestService.ADHOC_NAME).toBe('Adhoc')
  })

  it('DEFAULT has id "adhoc" and name "Adhoc"', () => {
    expect(FightTestService.DEFAULT.id).toBe('adhoc')
    expect(FightTestService.DEFAULT.name).toBe('Adhoc')
  })

  it('DEFAULT has mode null', () => {
    expect(FightTestService.DEFAULT.mode).toBeNull()
  })

  it('DEFAULT has empty targetLevels, categories arrays', () => {
    expect(FightTestService.DEFAULT.targetLevels).toEqual([])
    expect(FightTestService.DEFAULT.categories).toEqual([])
  })

  it('DEFAULT has side null', () => {
    expect(FightTestService.DEFAULT.side).toBeNull()
  })

  it('DEFAULT has shuffleMode "Random"', () => {
    expect(FightTestService.DEFAULT.shuffleMode).toBe('Random')
  })
})

// ---------------------------------------------------------------------------
// read()
// ---------------------------------------------------------------------------

describe('FightTestService — read()', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('returns DEFAULT when localStorage is empty', () => {
    const result = FightTestService.read()
    expect(result).toEqual(FightTestService.DEFAULT)
  })

  it('returns DEFAULT when stored value is corrupted JSON', () => {
    localStorage.setItem(STORAGE_KEYS.FIGHT_TEST, '{ not valid json }}}')
    const result = FightTestService.read()
    expect(result).toEqual(FightTestService.DEFAULT)
  })

  it('returns DEFAULT when stored object is missing required field "mode"', () => {
    const partial = { id: 'adhoc', name: 'Adhoc', targetLevels: [], categories: [], side: null, shuffleMode: 'Random' }
    localStorage.setItem(STORAGE_KEYS.FIGHT_TEST, JSON.stringify(partial))
    const result = FightTestService.read()
    expect(result).toEqual(FightTestService.DEFAULT)
  })

  it('returns DEFAULT when stored object is missing required field "shuffleMode"', () => {
    const partial = { id: 'adhoc', name: 'Adhoc', mode: null, targetLevels: [], categories: [], side: null }
    localStorage.setItem(STORAGE_KEYS.FIGHT_TEST, JSON.stringify(partial))
    const result = FightTestService.read()
    expect(result).toEqual(FightTestService.DEFAULT)
  })

  it('returns DEFAULT when stored object is missing required field "targetLevels"', () => {
    const partial = { id: 'adhoc', name: 'Adhoc', mode: null, categories: [], side: null, shuffleMode: 'Random' }
    localStorage.setItem(STORAGE_KEYS.FIGHT_TEST, JSON.stringify(partial))
    const result = FightTestService.read()
    expect(result).toEqual(FightTestService.DEFAULT)
  })

  it('returns the stored value when all fields are present and valid', () => {
    const stored = makeValidFightTest({ mode: 'PERFORMING', targetLevels: ['HEAD'], side: 'LEFT', shuffleMode: 'Ordered' })
    localStorage.setItem(STORAGE_KEYS.FIGHT_TEST, JSON.stringify(stored))
    const result = FightTestService.read()
    expect(result).toEqual(stored)
  })

  it('returns DEFAULT when localStorage.getItem throws SecurityError', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Simulated SecurityError', 'SecurityError')
    })
    const result = FightTestService.read()
    expect(result).toEqual(FightTestService.DEFAULT)
  })
})

// ---------------------------------------------------------------------------
// write()
// ---------------------------------------------------------------------------

describe('FightTestService — write()', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('write(ft) followed by read() returns a deep-equal value (round-trip)', () => {
    const ft = makeValidFightTest({ mode: 'RESPONDING', targetLevels: ['CHEST', 'HEAD'], shuffleMode: 'Prioritized' })
    FightTestService.write(ft)
    expect(FightTestService.read()).toEqual(ft)
  })

  it('write() stores the value under STORAGE_KEYS.FIGHT_TEST', () => {
    const ft = makeValidFightTest({ mode: 'PERFORMING' })
    FightTestService.write(ft)
    const raw = localStorage.getItem(STORAGE_KEYS.FIGHT_TEST)
    expect(JSON.parse(raw!)).toEqual(ft)
  })

  it('write() swallows SecurityError without throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Simulated SecurityError', 'SecurityError')
    })
    expect(() => FightTestService.write(makeValidFightTest())).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// reset()
// ---------------------------------------------------------------------------

describe('FightTestService — reset()', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('returns DEFAULT', () => {
    expect(FightTestService.reset()).toEqual(FightTestService.DEFAULT)
  })

  it('overwrites a previously stored value so subsequent read() returns DEFAULT', () => {
    const ft = makeValidFightTest({ mode: 'PERFORMING', shuffleMode: 'Ordered' })
    FightTestService.write(ft)

    FightTestService.reset()

    expect(FightTestService.read()).toEqual(FightTestService.DEFAULT)
  })

  it('writes DEFAULT to localStorage (persists the reset)', () => {
    FightTestService.reset()
    const raw = localStorage.getItem(STORAGE_KEYS.FIGHT_TEST)
    expect(JSON.parse(raw!)).toEqual(FightTestService.DEFAULT)
  })
})
