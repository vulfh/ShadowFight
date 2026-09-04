/**
 * Task 1.3 — TDD tests for AdhocFilterEngine.
 *
 * Covers all 2.2.x acceptance criteria:
 *   - Mode filter (2.2.2)
 *   - TargetLevel filter — empty = any (2.2.3–2.2.4)
 *   - Category filter   — empty = any (2.2.5–2.2.6)
 *   - Side filter       — BOTH/null/LEFT/RIGHT (2.2.7–2.2.10)
 *   - Conjunctive combination (2.2.11)
 *   - Determinism (2.2.12)
 *   - Subset property (2.2.13)
 *   - PBT #1 Determinism (2.2.14)
 *   - PBT #2 Subset (2.2.15)
 *   - PBT #3 Mode inclusion (2.2.16)
 *   - PBT #4 Empty targetLevels = any (2.2.17)
 *   - PBT #5 Empty categories = any (2.2.18)
 *   - PBT #6 side 'BOTH' ≡ side null (2.2.19)
 *
 * Pure logic — no DOM, no localStorage.  Runs in the default Vitest (node) environment.
 */
import { describe, it, expect } from 'vitest'
import { AdhocFilterEngine } from '../utils/AdhocFilterEngine'
import type { Technique, FightTest, TechniqueCategory, TargetLevel, Side } from '../types/index'
import type { Mode } from '../constants/modes'

// ---------------------------------------------------------------------------
// Constants mirrored here so tests are self-contained and don't break if a
// constant file changes structure (single source of truth remains the source)
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

const ALL_SIDES: Side[] = ['LEFT', 'RIGHT']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _seq = 0

/**
 * Builds a minimal Technique.  Callers override only what they care about.
 */
function makeTechnique(overrides: Partial<Technique> = {}): Technique {
  _seq++
  return {
    name: `technique-${_seq}`,
    file: `technique-${_seq}.wav`,
    category: 'Punches',
    priority: 'medium',
    selected: true,
    weight: 1,
    targetLevel: 'HEAD',
    side: 'LEFT',
    modes: ['PERFORMING', 'RESPONDING'],
    ...overrides,
  }
}

/**
 * Builds a base FightTest with all filters at their "pass-everything" defaults.
 * Callers override individual dimensions to test isolation.
 */
function makeFightTest(overrides: Partial<FightTest> = {}): FightTest {
  return {
    id: 'adhoc',
    name: 'Adhoc',
    mode: 'PERFORMING',
    targetLevels: [],
    categories: [],
    side: null,
    shuffleMode: 'Random',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Pseudo-random helpers for PBT (hand-rolled, no fast-check dependency)
// ---------------------------------------------------------------------------

/** Seeded LCG — deterministic across runs. */
function makeLcg(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0x100000000
  }
}

function pickRandom<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)]
}

function pickSubset<T>(arr: T[], rand: () => number): T[] {
  const n = Math.floor(rand() * (arr.length + 1)) // 0..length inclusive
  const copy = [...arr]
  const result: T[] = []
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(rand() * copy.length)
    result.push(copy.splice(idx, 1)[0])
  }
  return result
}

/**
 * Generates a random catalogue (1–20 techniques) with arbitrary attribute combos.
 */
function randomCatalogue(rand: () => number, size?: number): Technique[] {
  const count = size ?? (1 + Math.floor(rand() * 20))
  return Array.from({ length: count }, () =>
    makeTechnique({
      category: pickRandom(ALL_CATEGORIES, rand),
      targetLevel: pickRandom(ALL_TARGET_LEVELS, rand),
      side: pickRandom(ALL_SIDES, rand),
      modes: pickSubset(ALL_MODES, rand).length === 0
        ? [pickRandom(ALL_MODES, rand)] // ensure at least one mode
        : pickSubset(ALL_MODES, rand),
    })
  )
}

/**
 * Generates a random FightTest with a non-null mode (caller contract).
 */
function randomFightTest(rand: () => number): FightTest {
  const sideOptions: Array<Side | 'BOTH' | null> = ['LEFT', 'RIGHT', 'BOTH', null]
  return makeFightTest({
    mode: pickRandom(ALL_MODES, rand),
    targetLevels: pickSubset(ALL_TARGET_LEVELS, rand),
    categories: pickSubset(ALL_CATEGORIES, rand),
    side: pickRandom(sideOptions, rand),
  })
}

// ---------------------------------------------------------------------------
// 2.2.2 — Technique not matching mode is excluded
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — mode filter', () => {
  it('excludes a technique whose modes array does not include the selected mode', () => {
    const cat = [
      makeTechnique({ modes: ['PERFORMING'] }),
      makeTechnique({ modes: ['RESPONDING'] }),
    ]
    const result = AdhocFilterEngine.filter(cat, makeFightTest({ mode: 'PERFORMING' }))
    expect(result).toHaveLength(1)
    expect(result[0].modes).toContain('PERFORMING')
  })

  it('excludes a technique with an empty modes array', () => {
    const cat = [makeTechnique({ modes: [] })]
    const result = AdhocFilterEngine.filter(cat, makeFightTest({ mode: 'PERFORMING' }))
    expect(result).toHaveLength(0)
  })

  it('excludes a technique with an undefined modes array', () => {
    const cat = [makeTechnique({ modes: undefined })]
    const result = AdhocFilterEngine.filter(cat, makeFightTest({ mode: 'PERFORMING' }))
    expect(result).toHaveLength(0)
  })

  it('includes a technique that supports both modes when mode is RESPONDING', () => {
    const cat = [makeTechnique({ modes: ['PERFORMING', 'RESPONDING'] })]
    const result = AdhocFilterEngine.filter(cat, makeFightTest({ mode: 'RESPONDING' }))
    expect(result).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// 2.2.3 — Empty targetLevels accepts all target levels
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — targetLevel filter (empty = any)', () => {
  it('includes all techniques when targetLevels is empty', () => {
    const cat = ALL_TARGET_LEVELS.map(tl => makeTechnique({ targetLevel: tl }))
    const result = AdhocFilterEngine.filter(cat, makeFightTest({ targetLevels: [] }))
    expect(result).toHaveLength(cat.length)
  })
})

// ---------------------------------------------------------------------------
// 2.2.4 — Non-empty targetLevels excludes non-matching techniques
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — targetLevel filter (non-empty)', () => {
  it('excludes techniques whose targetLevel is not in the filter list', () => {
    const cat = [
      makeTechnique({ targetLevel: 'HEAD' }),
      makeTechnique({ targetLevel: 'CHEST' }),
      makeTechnique({ targetLevel: 'FOOT' }),
    ]
    const result = AdhocFilterEngine.filter(cat, makeFightTest({ targetLevels: ['HEAD', 'CHEST'] }))
    expect(result).toHaveLength(2)
    result.forEach(t => expect(['HEAD', 'CHEST']).toContain(t.targetLevel))
  })

  it('returns empty array when no technique matches the targetLevels filter', () => {
    const cat = [makeTechnique({ targetLevel: 'FOOT' })]
    const result = AdhocFilterEngine.filter(cat, makeFightTest({ targetLevels: ['HEAD'] }))
    expect(result).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 2.2.5 — Empty categories accepts all categories
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — category filter (empty = any)', () => {
  it('includes all techniques when categories is empty', () => {
    const cat = ALL_CATEGORIES.map(c => makeTechnique({ category: c }))
    const result = AdhocFilterEngine.filter(cat, makeFightTest({ categories: [] }))
    expect(result).toHaveLength(cat.length)
  })
})

// ---------------------------------------------------------------------------
// 2.2.6 — Non-empty categories excludes non-matching techniques
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — category filter (non-empty)', () => {
  it('excludes techniques whose category is not in the filter list', () => {
    const cat = [
      makeTechnique({ category: 'Punches' }),
      makeTechnique({ category: 'Kicks' }),
      makeTechnique({ category: 'Knees' }),
    ]
    const result = AdhocFilterEngine.filter(cat, makeFightTest({ categories: ['Punches', 'Kicks'] }))
    expect(result).toHaveLength(2)
    result.forEach(t => expect(['Punches', 'Kicks']).toContain(t.category))
  })

  it('returns empty array when no technique matches the categories filter', () => {
    const cat = [makeTechnique({ category: 'Weapons' })]
    const result = AdhocFilterEngine.filter(cat, makeFightTest({ categories: ['Punches'] }))
    expect(result).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 2.2.7 — side 'BOTH' includes LEFT and RIGHT techniques
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — side filter (BOTH)', () => {
  it('includes both LEFT and RIGHT techniques when side is "BOTH"', () => {
    const cat = [
      makeTechnique({ side: 'LEFT' }),
      makeTechnique({ side: 'RIGHT' }),
    ]
    const result = AdhocFilterEngine.filter(cat, makeFightTest({ side: 'BOTH' }))
    expect(result).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// 2.2.8 — side null includes both LEFT and RIGHT
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — side filter (null)', () => {
  it('includes both LEFT and RIGHT techniques when side is null', () => {
    const cat = [
      makeTechnique({ side: 'LEFT' }),
      makeTechnique({ side: 'RIGHT' }),
    ]
    const result = AdhocFilterEngine.filter(cat, makeFightTest({ side: null }))
    expect(result).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// 2.2.9 — side 'LEFT' excludes RIGHT techniques
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — side filter (LEFT)', () => {
  it('excludes RIGHT techniques when side is "LEFT"', () => {
    const cat = [
      makeTechnique({ side: 'LEFT' }),
      makeTechnique({ side: 'RIGHT' }),
    ]
    const result = AdhocFilterEngine.filter(cat, makeFightTest({ side: 'LEFT' }))
    expect(result).toHaveLength(1)
    expect(result[0].side).toBe('LEFT')
  })
})

// ---------------------------------------------------------------------------
// 2.2.10 — side 'RIGHT' excludes LEFT techniques
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — side filter (RIGHT)', () => {
  it('excludes LEFT techniques when side is "RIGHT"', () => {
    const cat = [
      makeTechnique({ side: 'LEFT' }),
      makeTechnique({ side: 'RIGHT' }),
    ]
    const result = AdhocFilterEngine.filter(cat, makeFightTest({ side: 'RIGHT' }))
    expect(result).toHaveLength(1)
    expect(result[0].side).toBe('RIGHT')
  })
})

// ---------------------------------------------------------------------------
// 2.2.11 — All four filters are applied conjunctively
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — conjunctive combination', () => {
  it('a technique must pass ALL active filters to be included', () => {
    const pass = makeTechnique({
      modes: ['PERFORMING'],
      targetLevel: 'HEAD',
      category: 'Punches',
      side: 'LEFT',
    })
    const failMode = makeTechnique({
      modes: ['RESPONDING'],
      targetLevel: 'HEAD',
      category: 'Punches',
      side: 'LEFT',
    })
    const failLevel = makeTechnique({
      modes: ['PERFORMING'],
      targetLevel: 'FOOT',
      category: 'Punches',
      side: 'LEFT',
    })
    const failCategory = makeTechnique({
      modes: ['PERFORMING'],
      targetLevel: 'HEAD',
      category: 'Kicks',
      side: 'LEFT',
    })
    const failSide = makeTechnique({
      modes: ['PERFORMING'],
      targetLevel: 'HEAD',
      category: 'Punches',
      side: 'RIGHT',
    })

    const ft = makeFightTest({
      mode: 'PERFORMING',
      targetLevels: ['HEAD'],
      categories: ['Punches'],
      side: 'LEFT',
    })

    const result = AdhocFilterEngine.filter(
      [pass, failMode, failLevel, failCategory, failSide],
      ft
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toBe(pass)
  })

  it('empty catalogue returns empty result regardless of filters', () => {
    const ft = makeFightTest({
      mode: 'PERFORMING',
      targetLevels: ['HEAD'],
      categories: ['Punches'],
      side: 'LEFT',
    })
    expect(AdhocFilterEngine.filter([], ft)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// 2.2.12 — Determinism: calling filter() twice returns identical results
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — determinism', () => {
  it('returns the same result on two consecutive calls with identical arguments', () => {
    const cat = [
      makeTechnique({ modes: ['PERFORMING'], targetLevel: 'HEAD', category: 'Punches', side: 'LEFT' }),
      makeTechnique({ modes: ['RESPONDING'], targetLevel: 'CHEST', category: 'Kicks', side: 'RIGHT' }),
      makeTechnique({ modes: ['PERFORMING'], targetLevel: 'GROIN', category: 'Kicks', side: 'LEFT' }),
    ]
    const ft = makeFightTest({ mode: 'PERFORMING', targetLevels: ['HEAD', 'GROIN'], categories: ['Punches', 'Kicks'] })

    const first = AdhocFilterEngine.filter(cat, ft)
    const second = AdhocFilterEngine.filter(cat, ft)

    expect(first).toEqual(second)
    expect(first.map(t => t.name)).toEqual(second.map(t => t.name))
  })
})

// ---------------------------------------------------------------------------
// 2.2.13 — Subset: every element in the result is in the input catalogue
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — subset property', () => {
  it('every returned technique is a reference that exists in the input catalogue', () => {
    const cat = [
      makeTechnique({ modes: ['PERFORMING'] }),
      makeTechnique({ modes: ['PERFORMING'] }),
      makeTechnique({ modes: ['RESPONDING'] }),
    ]
    const result = AdhocFilterEngine.filter(cat, makeFightTest({ mode: 'PERFORMING' }))

    result.forEach(t => {
      expect(cat).toContain(t) // reference equality
    })
  })
})

// ---------------------------------------------------------------------------
// PBT #1 — Determinism (2.2.14)
// For 50 random (catalogue, ft) pairs, filter() called twice returns identical results.
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — PBT #1: determinism', () => {
  it('produces identical results on two calls for 50 randomly generated (catalogue, ft) pairs', () => {
    const rand = makeLcg(42)
    for (let i = 0; i < 50; i++) {
      const cat = randomCatalogue(rand)
      const ft = randomFightTest(rand)
      const first = AdhocFilterEngine.filter(cat, ft)
      const second = AdhocFilterEngine.filter(cat, ft)
      expect(first).toEqual(second)
    }
  })
})

// ---------------------------------------------------------------------------
// PBT #2 — Subset (2.2.15)
// Every item in filter(cat, ft) is present in cat.
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — PBT #2: subset', () => {
  it('every result item is present in the input catalogue for 50 random pairs', () => {
    const rand = makeLcg(137)
    for (let i = 0; i < 50; i++) {
      const cat = randomCatalogue(rand)
      const ft = randomFightTest(rand)
      const result = AdhocFilterEngine.filter(cat, ft)
      result.forEach(t => expect(cat).toContain(t))
    }
  })
})

// ---------------------------------------------------------------------------
// PBT #3 — Mode inclusion (2.2.16)
// Every item in the result satisfies modes.includes(ft.mode).
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — PBT #3: mode inclusion', () => {
  it('every result technique includes ft.mode in its modes array for 50 random pairs', () => {
    const rand = makeLcg(999)
    for (let i = 0; i < 50; i++) {
      const cat = randomCatalogue(rand)
      const ft = randomFightTest(rand)
      const result = AdhocFilterEngine.filter(cat, ft)
      result.forEach(t => {
        expect(t.modes ?? []).toContain(ft.mode)
      })
    }
  })
})

// ---------------------------------------------------------------------------
// PBT #4 — Empty targetLevels = any (2.2.17)
// ft.targetLevels = [] never causes a technique to be excluded due to targetLevel.
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — PBT #4: empty targetLevels = any', () => {
  it('result with empty targetLevels is a superset of result with non-empty targetLevels for 50 pairs', () => {
    const rand = makeLcg(256)
    for (let i = 0; i < 50; i++) {
      const cat = randomCatalogue(rand)
      const ft = randomFightTest(rand)

      const withLevels = AdhocFilterEngine.filter(cat, ft)
      const withoutLevels = AdhocFilterEngine.filter(cat, { ...ft, targetLevels: [] })

      // Every technique that passed the level filter also passes with no level filter
      withLevels.forEach(t => expect(withoutLevels).toContain(t))
    }
  })
})

// ---------------------------------------------------------------------------
// PBT #5 — Empty categories = any (2.2.18)
// ft.categories = [] never causes a technique to be excluded due to category.
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — PBT #5: empty categories = any', () => {
  it('result with empty categories is a superset of result with non-empty categories for 50 pairs', () => {
    const rand = makeLcg(512)
    for (let i = 0; i < 50; i++) {
      const cat = randomCatalogue(rand)
      const ft = randomFightTest(rand)

      const withCats = AdhocFilterEngine.filter(cat, ft)
      const withoutCats = AdhocFilterEngine.filter(cat, { ...ft, categories: [] })

      withCats.forEach(t => expect(withoutCats).toContain(t))
    }
  })
})

// ---------------------------------------------------------------------------
// PBT #6 — side 'BOTH' ≡ side null (2.2.19)
// filter(cat, { ...ft, side: 'BOTH' }) deep-equals filter(cat, { ...ft, side: null })
// ---------------------------------------------------------------------------

describe('AdhocFilterEngine.filter — PBT #6: side BOTH ≡ null', () => {
  it('produces identical results for side="BOTH" and side=null for 50 random pairs', () => {
    const rand = makeLcg(1024)
    for (let i = 0; i < 50; i++) {
      const cat = randomCatalogue(rand)
      const ft = randomFightTest(rand)

      const withBoth = AdhocFilterEngine.filter(cat, { ...ft, side: 'BOTH' })
      const withNull = AdhocFilterEngine.filter(cat, { ...ft, side: null })

      expect(withBoth).toEqual(withNull)
    }
  })
})
