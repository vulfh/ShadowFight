/**
 * Task 1 — Type Foundation TDD tests
 * Covers: ExpertiseLevel type, EXPERTISE_LEVELS array, expertiseLevelRank helper,
 *         Technique.expertiseLevel field, FightTest new fields.
 */
import { describe, it, expect } from 'vitest'
import {
  EXPERTISE_LEVELS,
  expertiseLevelRank,
} from '../types/index'
import type {
  ExpertiseLevel,
  Technique,
  FightTest,
  FightTestFilterValues,
} from '../types/index'

// -----------------------------------------------------------------------
// Req 1.1 — ExpertiseLevel union has exactly the six documented values
// -----------------------------------------------------------------------
describe('ExpertiseLevel type members', () => {
  const validLevels: ExpertiseLevel[] = [
    'yellow', 'orange', 'green', 'blue', 'brown', 'black-dan-1',
  ]

  it('has exactly 6 valid values', () => {
    expect(validLevels).toHaveLength(6)
  })

  it('all members are present in EXPERTISE_LEVELS', () => {
    for (const level of validLevels) {
      expect(EXPERTISE_LEVELS).toContain(level)
    }
  })
})

// -----------------------------------------------------------------------
// Req 1.2 — EXPERTISE_LEVELS is readonly, ordered, length 6
// -----------------------------------------------------------------------
describe('EXPERTISE_LEVELS constant', () => {
  it('has length 6', () => {
    expect(EXPERTISE_LEVELS).toHaveLength(6)
  })

  it('ordered from lowest (yellow) to highest (black-dan-1)', () => {
    expect(EXPERTISE_LEVELS[0]).toBe('yellow')
    expect(EXPERTISE_LEVELS[1]).toBe('orange')
    expect(EXPERTISE_LEVELS[2]).toBe('green')
    expect(EXPERTISE_LEVELS[3]).toBe('blue')
    expect(EXPERTISE_LEVELS[4]).toBe('brown')
    expect(EXPERTISE_LEVELS[5]).toBe('black-dan-1')
  })
})

// -----------------------------------------------------------------------
// Req 1.3 — expertiseLevelRank helper
// -----------------------------------------------------------------------
describe('expertiseLevelRank', () => {
  it('returns 0 for yellow', () => {
    expect(expertiseLevelRank('yellow')).toBe(0)
  })

  it('returns 1 for orange', () => {
    expect(expertiseLevelRank('orange')).toBe(1)
  })

  it('returns 2 for green', () => {
    expect(expertiseLevelRank('green')).toBe(2)
  })

  it('returns 3 for blue', () => {
    expect(expertiseLevelRank('blue')).toBe(3)
  })

  it('returns 4 for brown', () => {
    expect(expertiseLevelRank('brown')).toBe(4)
  })

  it('returns 5 for black-dan-1', () => {
    expect(expertiseLevelRank('black-dan-1')).toBe(5)
  })

  it('ranks are strictly increasing along the hierarchy', () => {
    const ranks = EXPERTISE_LEVELS.map(l => expertiseLevelRank(l))
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]).toBeGreaterThan(ranks[i - 1])
    }
  })

  it('returns 0 for unknown string (defensive fallback)', () => {
    expect(expertiseLevelRank('unknown-belt')).toBe(0)
  })

  it('returns 0 for empty string (defensive fallback)', () => {
    expect(expertiseLevelRank('')).toBe(0)
  })
})

// -----------------------------------------------------------------------
// Req 1.4 — Technique interface has expertiseLevel field
// -----------------------------------------------------------------------
describe('Technique.expertiseLevel field', () => {
  it('accepts a valid ExpertiseLevel on a Technique object', () => {
    // Type-level check: if this compiles, the field exists on the interface.
    const t: Technique = {
      name: 'Left Hook',
      file: 'left-hook.wav',
      category: 'Punches',
      priority: 'medium',
      selected: true,
      weight: 1,
      targetLevel: 'HEAD',
      side: 'LEFT',
      expertiseLevel: 'yellow',   // ← new required field
    }
    expect(t.expertiseLevel).toBe('yellow')
  })

  it('expertiseLevel is required — object without it is a type error (runtime guard)', () => {
    // We cannot force a compile error in vitest, but we verify the field is used at runtime.
    const t: Technique = {
      name: 'Right Hook',
      file: 'right-hook.wav',
      category: 'Punches',
      priority: 'medium',
      selected: true,
      weight: 1,
      targetLevel: 'HEAD',
      side: 'RIGHT',
      expertiseLevel: 'orange',
    }
    expect(t.expertiseLevel).toBe('orange')
  })
})

// -----------------------------------------------------------------------
// Req 1.5 — FightTest interface has expertiseLevel + expertiseLevelMode
// -----------------------------------------------------------------------
describe('FightTest new fields', () => {
  it('accepts expertiseLevel: null (no restriction)', () => {
    const ft: FightTest = {
      id: 'adhoc',
      name: 'Adhoc',
      mode: null,
      targetLevels: [],
      categories: [],
      side: null,
      shuffleMode: 'Random',
      expertiseLevel: null,
      expertiseLevelMode: 'cumulative',
    }
    expect(ft.expertiseLevel).toBeNull()
    expect(ft.expertiseLevelMode).toBe('cumulative')
  })

  it('accepts expertiseLevel with a specific level', () => {
    const ft: FightTest = {
      id: 'adhoc',
      name: 'Adhoc',
      mode: null,
      targetLevels: [],
      categories: [],
      side: null,
      shuffleMode: 'Random',
      expertiseLevel: 'green',
      expertiseLevelMode: 'strict',
    }
    expect(ft.expertiseLevel).toBe('green')
    expect(ft.expertiseLevelMode).toBe('strict')
  })
})

// -----------------------------------------------------------------------
// Req 3.5 / derived — FightTestFilterValues includes the new fields
// -----------------------------------------------------------------------
describe('FightTestFilterValues includes new fields', () => {
  it('can be constructed with expertiseLevel and expertiseLevelMode', () => {
    const fv: FightTestFilterValues = {
      mode: null,
      targetLevels: [],
      categories: [],
      side: null,
      shuffleMode: 'Random',
      expertiseLevel: 'blue',
      expertiseLevelMode: 'cumulative',
    }
    expect(fv.expertiseLevel).toBe('blue')
  })
})
