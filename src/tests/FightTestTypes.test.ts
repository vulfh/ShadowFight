/**
 * Task 1.1 — TDD tests for FightTest types and FIGHT_TEST storage key.
 *
 * These tests verify:
 *   - The FightTest interface shape (all required fields with correct types)
 *   - The FightTestFilterValues type is FightTest minus id and name
 *   - The FIGHT_TEST storage key is present with the correct value
 *
 * No DOM required; runs in the default Vitest (node) environment.
 */
import { describe, it, expect } from 'vitest'
import type { FightTest, FightTestFilterValues } from '../types/index'
import { STORAGE_KEYS } from '../constants/storage'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Builds a minimal valid FightTest with all required fields. */
function makeFightTest(overrides: Partial<FightTest> = {}): FightTest {
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
// FightTest interface shape
// ---------------------------------------------------------------------------

describe('FightTest interface', () => {
  it('accepts a fully-populated record with mode set', () => {
    const ft: FightTest = makeFightTest({ mode: 'PERFORMING', side: 'LEFT' })

    expect(ft.id).toBe('adhoc')
    expect(ft.name).toBe('Adhoc')
    expect(ft.mode).toBe('PERFORMING')
    expect(ft.targetLevels).toEqual([])
    expect(ft.categories).toEqual([])
    expect(ft.side).toBe('LEFT')
    expect(ft.shuffleMode).toBe('Random')
  })

  it('allows mode to be null (not yet selected)', () => {
    const ft: FightTest = makeFightTest({ mode: null })
    expect(ft.mode).toBeNull()
  })

  it('allows side to be null (treated as BOTH)', () => {
    const ft: FightTest = makeFightTest({ side: null })
    expect(ft.side).toBeNull()
  })

  it('allows side to be the literal "BOTH"', () => {
    const ft: FightTest = makeFightTest({ side: 'BOTH' })
    expect(ft.side).toBe('BOTH')
  })

  it('allows targetLevels to contain recognised TargetLevel values', () => {
    const ft: FightTest = makeFightTest({ targetLevels: ['HEAD', 'CHEST'] })
    expect(ft.targetLevels).toContain('HEAD')
    expect(ft.targetLevels).toContain('CHEST')
  })

  it('allows categories to contain recognised TechniqueCategory values', () => {
    const ft: FightTest = makeFightTest({ categories: ['Kicks', 'Punches'] })
    expect(ft.categories).toContain('Kicks')
    expect(ft.categories).toContain('Punches')
  })

  it('accepts all valid shuffleMode values', () => {
    const modes = ['Random', 'Unified Random', 'Ordered', 'Prioritized'] as const
    for (const m of modes) {
      const ft: FightTest = makeFightTest({ shuffleMode: m })
      expect(ft.shuffleMode).toBe(m)
    }
  })

  it('accepts RESPONDING as a valid mode', () => {
    const ft: FightTest = makeFightTest({ mode: 'RESPONDING' })
    expect(ft.mode).toBe('RESPONDING')
  })
})

// ---------------------------------------------------------------------------
// FightTestFilterValues — structural compatibility with FightTest
// ---------------------------------------------------------------------------

describe('FightTestFilterValues type', () => {
  it('can be created by omitting id and name from a FightTest', () => {
    const ft = makeFightTest({ mode: 'PERFORMING', side: 'RIGHT' })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, name: _name, ...filterValues } = ft
    const values: FightTestFilterValues = filterValues

    expect(values.mode).toBe('PERFORMING')
    expect(values.side).toBe('RIGHT')
    expect(values.targetLevels).toEqual([])
    expect(values.categories).toEqual([])
    expect(values.shuffleMode).toBe('Random')
  })

  it('roundtrip: FightTest spread from FightTestFilterValues preserves all filter fields', () => {
    const original = makeFightTest({ mode: 'RESPONDING', targetLevels: ['HEAD'], side: 'LEFT', shuffleMode: 'Ordered' })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, name: _name, ...filterValues } = original
    const values: FightTestFilterValues = filterValues

    const reconstructed: FightTest = { id: 'adhoc', name: 'Adhoc', ...values }

    expect(reconstructed).toEqual(original)
  })
})

// ---------------------------------------------------------------------------
// STORAGE_KEYS.FIGHT_TEST
// ---------------------------------------------------------------------------

describe('STORAGE_KEYS.FIGHT_TEST', () => {
  it('is defined', () => {
    expect(STORAGE_KEYS.FIGHT_TEST).toBeDefined()
  })

  it('has the correct value "kravMagaFightTest"', () => {
    expect(STORAGE_KEYS.FIGHT_TEST).toBe('kravMagaFightTest')
  })

  it('is distinct from all other storage keys', () => {
    const allValues = Object.values(STORAGE_KEYS)
    const fightTestValue = STORAGE_KEYS.FIGHT_TEST
    const occurrences = allValues.filter(v => v === fightTestValue)
    expect(occurrences).toHaveLength(1)
  })
})
