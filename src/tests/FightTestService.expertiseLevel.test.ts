/**
 * Task 2 — TDD tests for FightTestService expertise-level additions.
 *
 * Covers:
 *   2.1 — DEFAULT includes expertiseLevel: null, expertiseLevelMode: 'cumulative'
 *   2.2 — read() validation: invalid expertiseLevel → null, invalid mode → 'cumulative'
 *         read() happy-path: valid values are preserved as-is
 *   Req 5.1–5.5, Req 8.2–8.3
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { FightTestService } from '../services/FightTestService'
import { STORAGE_KEYS } from '../constants/storage'
import type { FightTest } from '../types/index'
import { EXPERTISE_LEVELS } from '../types/index'

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
    expertiseLevel: null,
    expertiseLevelMode: 'cumulative',
    ...overrides,
  }
}

function storeRaw(obj: object): void {
  localStorage.setItem(STORAGE_KEYS.FIGHT_TEST, JSON.stringify(obj))
}

// ---------------------------------------------------------------------------
// 2.1 — DEFAULT fields
// ---------------------------------------------------------------------------

describe('FightTestService DEFAULT — expertise-level fields (Task 2.1)', () => {
  it('DEFAULT.expertiseLevel is null', () => {
    expect(FightTestService.DEFAULT.expertiseLevel).toBeNull()
  })

  it('DEFAULT.expertiseLevelMode is "cumulative"', () => {
    expect(FightTestService.DEFAULT.expertiseLevelMode).toBe('cumulative')
  })
})

// ---------------------------------------------------------------------------
// 2.2 — read() validation
// ---------------------------------------------------------------------------

describe('FightTestService read() — expertise-level validation (Task 2.2)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  // ---------- expertiseLevel validation ----------

  it('preserves null expertiseLevel when stored value is null', () => {
    storeRaw(makeValidFightTest({ expertiseLevel: null }))
    expect(FightTestService.read().expertiseLevel).toBeNull()
  })

  it.each(EXPERTISE_LEVELS)('preserves valid expertiseLevel "%s"', (level) => {
    storeRaw(makeValidFightTest({ expertiseLevel: level }))
    expect(FightTestService.read().expertiseLevel).toBe(level)
  })

  it('replaces unrecognised expertiseLevel with null', () => {
    storeRaw(makeValidFightTest({ expertiseLevel: 'purple' as never }))
    expect(FightTestService.read().expertiseLevel).toBeNull()
  })

  it('replaces empty-string expertiseLevel with null', () => {
    storeRaw(makeValidFightTest({ expertiseLevel: '' as never }))
    expect(FightTestService.read().expertiseLevel).toBeNull()
  })

  it('replaces numeric expertiseLevel with null', () => {
    storeRaw(makeValidFightTest({ expertiseLevel: 3 as never }))
    expect(FightTestService.read().expertiseLevel).toBeNull()
  })

  // ---------- expertiseLevelMode validation ----------

  it('preserves "strict" expertiseLevelMode', () => {
    storeRaw(makeValidFightTest({ expertiseLevelMode: 'strict' }))
    expect(FightTestService.read().expertiseLevelMode).toBe('strict')
  })

  it('preserves "cumulative" expertiseLevelMode', () => {
    storeRaw(makeValidFightTest({ expertiseLevelMode: 'cumulative' }))
    expect(FightTestService.read().expertiseLevelMode).toBe('cumulative')
  })

  it('replaces unrecognised expertiseLevelMode with "cumulative"', () => {
    storeRaw(makeValidFightTest({ expertiseLevelMode: 'fuzzy' as never }))
    expect(FightTestService.read().expertiseLevelMode).toBe('cumulative')
  })

  it('replaces empty-string expertiseLevelMode with "cumulative"', () => {
    storeRaw(makeValidFightTest({ expertiseLevelMode: '' as never }))
    expect(FightTestService.read().expertiseLevelMode).toBe('cumulative')
  })

  it('replaces numeric expertiseLevelMode with "cumulative"', () => {
    storeRaw(makeValidFightTest({ expertiseLevelMode: 1 as never }))
    expect(FightTestService.read().expertiseLevelMode).toBe('cumulative')
  })

  // ---------- absence of new fields in stored object ----------

  it('defaults expertiseLevel to null when field absent from stored object', () => {
    const withoutNew = {
      id: 'adhoc', name: 'Adhoc', mode: null,
      targetLevels: [], categories: [], side: null, shuffleMode: 'Random',
      // no expertiseLevel, no expertiseLevelMode
    }
    storeRaw(withoutNew)
    expect(FightTestService.read().expertiseLevel).toBeNull()
  })

  it('defaults expertiseLevelMode to "cumulative" when field absent from stored object', () => {
    const withoutNew = {
      id: 'adhoc', name: 'Adhoc', mode: null,
      targetLevels: [], categories: [], side: null, shuffleMode: 'Random',
    }
    storeRaw(withoutNew)
    expect(FightTestService.read().expertiseLevelMode).toBe('cumulative')
  })

  // ---------- round-trip ----------

  it('round-trips full FightTest with both new fields', () => {
    const ft = makeValidFightTest({ expertiseLevel: 'green', expertiseLevelMode: 'strict' })
    FightTestService.write(ft)
    const result = FightTestService.read()
    expect(result.expertiseLevel).toBe('green')
    expect(result.expertiseLevelMode).toBe('strict')
  })
})
