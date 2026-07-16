import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  RandomTechniqueSelectionStrategy,
  UnifiedRandomTechniqueSelectionStrategy,
  OrderedTechniqueSelectionStrategy,
  PrioritizedTechniqueSelectionStrategy,
  TechniqueSelectionStrategyFactory
} from '../utils/TechniqueSelectionStrategy'
import { STRATEGY_TYPES } from '../constants/strategies'
import { Technique } from '../types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTechnique(name: string, weight: number): Technique {
  return {
    name,
    weight,
    selected: true,
    priority: 'medium',
    file: `${name}.wav`,
    category: 'Punches',
    targetLevel: 'HEAD',
    side: 'LEFT'
  } as Technique
}

// ---------------------------------------------------------------------------
// RandomTechniqueSelectionStrategy
// ---------------------------------------------------------------------------

describe('RandomTechniqueSelectionStrategy', () => {
  let strategy: RandomTechniqueSelectionStrategy

  beforeEach(() => {
    strategy = new RandomTechniqueSelectionStrategy()
  })

  it('respects weighted distribution (weight 4 picked ~80% of the time)', () => {
    const low = makeTechnique('low', 1)
    const high = makeTechnique('high', 4)
    const techniques = [low, high]

    let highCount = 0
    const RUNS = 10_000
    for (let i = 0; i < RUNS; i++) {
      if (strategy.selectTechnique(techniques).name === 'high') highCount++
    }

    const ratio = highCount / RUNS
    expect(ratio).toBeGreaterThanOrEqual(0.75)
    expect(ratio).toBeLessThanOrEqual(0.85)
  })

  it('returns the only element when the array has one technique', () => {
    const only = makeTechnique('solo', 5)
    expect(strategy.selectTechnique([only])).toBe(only)
  })

  it('throws when the technique list is empty', () => {
    expect(() => strategy.selectTechnique([])).toThrow('No techniques available for selection')
  })
})

// ---------------------------------------------------------------------------
// UnifiedRandomTechniqueSelectionStrategy
// ---------------------------------------------------------------------------

describe('UnifiedRandomTechniqueSelectionStrategy', () => {
  let strategy: UnifiedRandomTechniqueSelectionStrategy

  beforeEach(() => {
    strategy = new UnifiedRandomTechniqueSelectionStrategy()
  })

  it('covers all techniques in a single round (no repeats)', () => {
    const techniques = ['A', 'B', 'C', 'D'].map(n => makeTechnique(n, 1))
    const picks = Array.from({ length: 4 }, () => strategy.selectTechnique(techniques).name)

    expect(new Set(picks)).toEqual(new Set(['A', 'B', 'C', 'D']))
    expect(picks.length).toBe(4)
  })

  it('does not repeat any technique within one round', () => {
    const techniques = ['A', 'B', 'C', 'D'].map(n => makeTechnique(n, 1))
    const picks = Array.from({ length: 4 }, () => strategy.selectTechnique(techniques).name)

    expect(new Set(picks).size).toBe(4)
  })

  it('all techniques are eligible again after a full round', () => {
    const techniques = ['A', 'B', 'C', 'D'].map(n => makeTechnique(n, 1))

    // consume the first round
    Array.from({ length: 4 }, () => strategy.selectTechnique(techniques))

    // second round should again contain all four
    const secondRound = Array.from({ length: 4 }, () => strategy.selectTechnique(techniques).name)
    expect(new Set(secondRound)).toEqual(new Set(['A', 'B', 'C', 'D']))
  })

  it('reset() clears internal state so all techniques are eligible immediately', () => {
    const techniques = ['A', 'B', 'C', 'D'].map(n => makeTechnique(n, 1))

    // consume 2 picks from the round
    strategy.selectTechnique(techniques)
    strategy.selectTechnique(techniques)

    strategy.reset()

    // after reset a full new round should cover all 4
    const picks = Array.from({ length: 4 }, () => strategy.selectTechnique(techniques).name)
    expect(new Set(picks)).toEqual(new Set(['A', 'B', 'C', 'D']))
  })

  it('does not throw with a single technique', () => {
    const only = makeTechnique('solo', 1)
    expect(() => {
      for (let i = 0; i < 3; i++) strategy.selectTechnique([only])
    }).not.toThrow()
  })

  it('always returns the same technique when there is only one', () => {
    const only = makeTechnique('solo', 1)
    const results = Array.from({ length: 3 }, () => strategy.selectTechnique([only]))
    results.forEach(r => expect(r).toBe(only))
  })

  it('throws when the technique list is empty', () => {
    expect(() => strategy.selectTechnique([])).toThrow('No techniques available for selection')
  })
})

// ---------------------------------------------------------------------------
// OrderedTechniqueSelectionStrategy
// ---------------------------------------------------------------------------

describe('OrderedTechniqueSelectionStrategy', () => {
  let strategy: OrderedTechniqueSelectionStrategy

  beforeEach(() => {
    strategy = new OrderedTechniqueSelectionStrategy()
  })

  it('returns techniques in array order', () => {
    const [a, b, c] = ['A', 'B', 'C'].map(n => makeTechnique(n, 1))
    expect(strategy.selectTechnique([a, b, c])).toBe(a)
    expect(strategy.selectTechnique([a, b, c])).toBe(b)
    expect(strategy.selectTechnique([a, b, c])).toBe(c)
  })

  it('wraps around to the first element after the last', () => {
    const [a, b, c] = ['A', 'B', 'C'].map(n => makeTechnique(n, 1))
    strategy.selectTechnique([a, b, c]) // A
    strategy.selectTechnique([a, b, c]) // B
    strategy.selectTechnique([a, b, c]) // C
    expect(strategy.selectTechnique([a, b, c])).toBe(a) // wraps → A
  })

  it('reset() restarts from index 0', () => {
    const [a, b, c] = ['A', 'B', 'C'].map(n => makeTechnique(n, 1))
    strategy.selectTechnique([a, b, c]) // A
    strategy.selectTechnique([a, b, c]) // B
    strategy.reset()
    expect(strategy.selectTechnique([a, b, c])).toBe(a)
  })

  it('does not throw with a single technique, always returns it', () => {
    const only = makeTechnique('solo', 1)
    for (let i = 0; i < 3; i++) {
      expect(strategy.selectTechnique([only])).toBe(only)
    }
  })

  it('throws when the technique list is empty', () => {
    expect(() => strategy.selectTechnique([])).toThrow('No techniques available for selection')
  })
})

// ---------------------------------------------------------------------------
// PrioritizedTechniqueSelectionStrategy
// ---------------------------------------------------------------------------

describe('PrioritizedTechniqueSelectionStrategy', () => {
  let strategy: PrioritizedTechniqueSelectionStrategy

  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    strategy = new PrioritizedTechniqueSelectionStrategy()
  })

  it('respects weighted distribution (weight 4 picked ~80% of the time)', () => {
    const low = makeTechnique('low', 1)
    const high = makeTechnique('high', 4)
    const techniques = [low, high]

    let highCount = 0
    const RUNS = 10_000
    for (let i = 0; i < RUNS; i++) {
      if (strategy.selectTechnique(techniques).name === 'high') highCount++
      // reset after each pick so anti-starvation never fires during this test
      strategy.reset()
    }

    const ratio = highCount / RUNS
    expect(ratio).toBeGreaterThanOrEqual(0.75)
    expect(ratio).toBeLessThanOrEqual(0.85)
  })

  it('increments counters for non-selected techniques', () => {
    const a = makeTechnique('A', 5)
    const b = makeTechnique('B', 1)
    const techniques = [a, b]

    // Force Math.random to always return 0 → always picks the first technique (A, highest weight)
    vi.spyOn(Math, 'random').mockReturnValue(0)

    strategy.selectTechnique(techniques) // A picked, B counter → 1
    strategy.selectTechnique(techniques) // A picked, B counter → 2
    strategy.selectTechnique(techniques) // A picked, B counter → 3

    // Access private counters via index signature
    const counters = (strategy as any).counters as Map<string, number>
    expect(counters.get('B')).toBe(3)
  })

  it('anti-starvation fires at threshold 5: forces the starving technique', () => {
    const a = makeTechnique('A', 5)
    const b = makeTechnique('B', 1)
    const techniques = [a, b]

    vi.spyOn(Math, 'random').mockReturnValue(0) // always picks A in normal draw

    // 5 normal picks — B reaches counter 5
    for (let i = 0; i < 5; i++) strategy.selectTechnique(techniques)

    // 6th call — anti-starvation should force B
    const forced = strategy.selectTechnique(techniques)
    expect(forced.name).toBe('B')
  })

  it('when multiple techniques are starving, the lowest-weight one is force-selected', () => {
    const a = makeTechnique('A', 10) // high weight, always wins normal draw
    const b = makeTechnique('B', 3)  // starving, weight 3
    const c = makeTechnique('C', 1)  // starving, weight 1 — should be picked
    const techniques = [a, b, c]

    vi.spyOn(Math, 'random').mockReturnValue(0) // always picks A

    // Starve B and C past the threshold
    for (let i = 0; i < 5; i++) strategy.selectTechnique(techniques)

    const forced = strategy.selectTechnique(techniques)
    expect(forced.name).toBe('C')
  })

  it('when starving techniques tie on weight, the earliest-index one wins', () => {
    const a = makeTechnique('A', 10) // always wins normal draw
    const b = makeTechnique('B', 1)  // starving, index 1
    const c = makeTechnique('C', 1)  // starving, index 2 — same weight as B
    const techniques = [a, b, c]

    vi.spyOn(Math, 'random').mockReturnValue(0) // always picks A

    for (let i = 0; i < 5; i++) strategy.selectTechnique(techniques)

    // Both B and C are starving with equal weight → B (index 1) wins
    const forced = strategy.selectTechnique(techniques)
    expect(forced.name).toBe('B')
  })

  it('reset() clears counters so anti-starvation does not trigger on the next pick', () => {
    const a = makeTechnique('A', 5)
    const b = makeTechnique('B', 1)
    const techniques = [a, b]

    vi.spyOn(Math, 'random').mockReturnValue(0) // always picks A

    // Build counters up to 3 without triggering starvation
    for (let i = 0; i < 3; i++) strategy.selectTechnique(techniques)
    strategy.reset()

    // After reset, even with random=0, no starvation should fire on pick 1
    const first = strategy.selectTechnique(techniques)
    expect(first.name).toBe('A') // normal draw, not forced to B
  })

  it('does not throw with a single technique; counter stays consistent after reset', () => {
    const only = makeTechnique('solo', 1)
    strategy.selectTechnique([only])
    strategy.reset()
    expect(() => strategy.selectTechnique([only])).not.toThrow()
  })

  it('throws when the technique list is empty', () => {
    expect(() => strategy.selectTechnique([])).toThrow('No techniques available for selection')
  })
})

// ---------------------------------------------------------------------------
// TechniqueSelectionStrategyFactory
// ---------------------------------------------------------------------------

describe('TechniqueSelectionStrategyFactory', () => {
  it('createStrategy returns RandomTechniqueSelectionStrategy for RANDOM', () => {
    expect(TechniqueSelectionStrategyFactory.createStrategy(STRATEGY_TYPES.RANDOM))
      .toBeInstanceOf(RandomTechniqueSelectionStrategy)
  })

  it('createStrategy returns UnifiedRandomTechniqueSelectionStrategy for UNIFIED_RANDOM', () => {
    expect(TechniqueSelectionStrategyFactory.createStrategy(STRATEGY_TYPES.UNIFIED_RANDOM))
      .toBeInstanceOf(UnifiedRandomTechniqueSelectionStrategy)
  })

  it('createStrategy returns OrderedTechniqueSelectionStrategy for ORDERED', () => {
    expect(TechniqueSelectionStrategyFactory.createStrategy(STRATEGY_TYPES.ORDERED))
      .toBeInstanceOf(OrderedTechniqueSelectionStrategy)
  })

  it('createStrategy returns PrioritizedTechniqueSelectionStrategy for PRIORITIZED', () => {
    expect(TechniqueSelectionStrategyFactory.createStrategy(STRATEGY_TYPES.PRIORITIZED))
      .toBeInstanceOf(PrioritizedTechniqueSelectionStrategy)
  })

  it('getAvailableStrategies includes all three new strategies', () => {
    const strategies = TechniqueSelectionStrategyFactory.getAvailableStrategies()
    const types = strategies.map(s => s.type)
    expect(types).toContain(STRATEGY_TYPES.UNIFIED_RANDOM)
    expect(types).toContain(STRATEGY_TYPES.ORDERED)
    expect(types).toContain(STRATEGY_TYPES.PRIORITIZED)
  })
})
