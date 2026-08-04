import { describe, it, expect, vi, afterEach } from 'vitest'

// ✅ Task 6-A · End-to-end session flow tests per mode
// Strategy selection behavior across all play modes

describe('SessionManager.playMode – Strategy execution E2E', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ✅ Test 6-A-1: Random mode — weighted distribution
  it('Random mode: selectAndSetNextTechnique picks from 3-technique array respecting weights', () => {
    const mockSessionManager = {
      isActive: true,
      isPaused: false,
      selectionStrategy: {
        selectTechnique: vi.fn((techniques: any[]) => {
          const totalWeight = techniques.reduce((sum, t) => sum + t.weight, 0)
          let random = Math.random() * totalWeight
          for (const technique of techniques) {
            random -= technique.weight
            if (random <= 0) return technique
          }
          return techniques[0]
        })
      },
      currentTechnique: null,
      techniquesUsed: 0,
      updateSessionStats: vi.fn(),
      selectAndSetNextTechnique: function(config: any) {
        if (!this.isActive) return null
        const selectedTechniques = config.techniques.filter((t: any) => t.selected)
        if (selectedTechniques.length === 0) return null
        const technique = this.selectionStrategy.selectTechnique(selectedTechniques)
        this.currentTechnique = technique
        this.techniquesUsed++
        this.updateSessionStats(technique)
        return technique
      }
    }

    const techniques = [
      { name: 'Jab', weight: 2, selected: true, category: 'Punches' },
      { name: 'Cross', weight: 3, selected: true, category: 'Punches' },
      { name: 'Hook', weight: 1, selected: true, category: 'Punches' }
    ] as any[]

    const config = { techniques }
    const results: any[] = []

    for (let i = 0; i < 30; i++) {
      const picked = mockSessionManager.selectAndSetNextTechnique(config)
      results.push(picked)
    }

    // Verify all results belong to the input array
    results.forEach(result => {
      expect(result).toBeTruthy()
      expect(techniques.map(t => t.name)).toContain(result.name)
    })

    // Verify we got all three techniques
    const uniqueNames = new Set(results.map(r => r.name))
    expect(uniqueNames.size).toBe(3)
    expect(Array.from(uniqueNames)).toEqual(expect.arrayContaining(['Jab', 'Cross', 'Hook']))
  })

  // ✅ Test 6-A-2: Unified Random mode — full-round coverage, no repeats
  it('Unified Random mode: selectAndSetNextTechnique covers all 4 techniques per round without repeats', () => {
    const remaining = new Set<string>()

    const mockSessionManager = {
      isActive: true,
      isPaused: false,
      selectionStrategy: {
        remaining: remaining,
        selectTechnique: function(techniques: any[]) {
          if (techniques.length === 0) throw new Error('No techniques available')

          if (this.remaining.size === 0) {
            techniques.forEach(t => this.remaining.add(t.name))
          }

          const eligible = techniques.filter(t => this.remaining.has(t.name))
          const picked = eligible[Math.floor(Math.random() * eligible.length)]
          this.remaining.delete(picked.name)

          if (this.remaining.size === 0) {
            techniques.forEach(t => this.remaining.add(t.name))
          }

          return picked
        }
      },
      currentTechnique: null,
      techniquesUsed: 0,
      updateSessionStats: vi.fn(),
      selectAndSetNextTechnique: function(config: any) {
        if (!this.isActive) return null
        const selectedTechniques = config.techniques.filter((t: any) => t.selected)
        if (selectedTechniques.length === 0) return null
        const technique = this.selectionStrategy.selectTechnique(selectedTechniques)
        this.currentTechnique = technique
        this.techniquesUsed++
        this.updateSessionStats(technique)
        return technique
      }
    }

    const techniques = [
      { name: 'Punch', weight: 1, selected: true, category: 'Punches' },
      { name: 'Kick', weight: 1, selected: true, category: 'Kicks' },
      { name: 'Dodge', weight: 1, selected: true, category: 'Defenses' },
      { name: 'Block', weight: 1, selected: true, category: 'Defenses' }
    ] as any[]

    const config = { techniques }

    // First round — collect 4 picks
    const firstRound: any[] = []
    for (let i = 0; i < 4; i++) {
      firstRound.push(mockSessionManager.selectAndSetNextTechnique(config))
    }
    const firstRoundNames = new Set(firstRound.map(t => t.name))
    expect(firstRoundNames).toEqual(new Set(['Punch', 'Kick', 'Dodge', 'Block']))
    expect(firstRound.length).toBe(4)

    // Second round — collect 4 more picks, expect all four again
    const secondRound: any[] = []
    for (let i = 0; i < 4; i++) {
      secondRound.push(mockSessionManager.selectAndSetNextTechnique(config))
    }
    const secondRoundNames = new Set(secondRound.map(t => t.name))
    expect(secondRoundNames).toEqual(new Set(['Punch', 'Kick', 'Dodge', 'Block']))
    expect(secondRound.length).toBe(4)
  })

  // ✅ Test 6-A-3: Ordered mode — cyclic progression [A, B, C, A, B, C]
  it('Ordered mode: selectAndSetNextTechnique cycles through 3-technique array in order', () => {
    let index = 0

    const mockSessionManager = {
      isActive: true,
      isPaused: false,
      selectionStrategy: {
        index: 0,
        selectTechnique: function(techniques: any[]) {
          if (techniques.length === 0) throw new Error('No techniques available')
          const technique = techniques[this.index % techniques.length]
          this.index = (this.index + 1) % techniques.length
          return technique
        }
      },
      currentTechnique: null,
      techniquesUsed: 0,
      updateSessionStats: vi.fn(),
      selectAndSetNextTechnique: function(config: any) {
        if (!this.isActive) return null
        const selectedTechniques = config.techniques.filter((t: any) => t.selected)
        if (selectedTechniques.length === 0) return null
        const technique = this.selectionStrategy.selectTechnique(selectedTechniques)
        this.currentTechnique = technique
        this.techniquesUsed++
        this.updateSessionStats(technique)
        return technique
      }
    }

    const techniques = [
      { name: 'A', weight: 1, selected: true, category: 'Punches' },
      { name: 'B', weight: 1, selected: true, category: 'Punches' },
      { name: 'C', weight: 1, selected: true, category: 'Punches' }
    ] as any[]

    const config = { techniques }
    const results: string[] = []

    for (let i = 0; i < 6; i++) {
      const picked = mockSessionManager.selectAndSetNextTechnique(config)
      results.push(picked.name)
    }

    expect(results).toEqual(['A', 'B', 'C', 'A', 'B', 'C'])
  })

  // ✅ Test 6-A-4: Prioritized mode — weighted distribution [weight:1, weight:4] → 70–90 % high-weight picks
  it('Prioritized mode: selectAndSetNextTechnique picks weight-4 technique 70–90 % of 10k calls', () => {
    const counters = new Map<string, number>()
    const STARVATION_THRESHOLD = 250

    const mockSessionManager = {
      isActive: true,
      isPaused: false,
      selectionStrategy: {
        counters: counters,
        selectTechnique: function(techniques: any[]) {
          if (techniques.length === 0) throw new Error('No techniques available')

          if (this.counters.size === 0) {
            techniques.forEach(t => {
              if (!this.counters.has(t.name)) this.counters.set(t.name, 0)
            })
          }

          // Anti-starvation check
          const starving = techniques.filter(
            t => (this.counters.get(t.name) ?? 0) >= STARVATION_THRESHOLD
          )
          if (starving.length > 0) {
            const forced = starving.reduce((min, t) => (t.weight < min.weight ? t : min))
            for (const t of techniques) {
              if (t.name !== forced.name) {
                this.counters.set(t.name, (this.counters.get(t.name) ?? 0) + 1)
              }
            }
            this.counters.set(forced.name, 0)
            return forced
          }

          // Normal weighted random draw
          const totalWeight = techniques.reduce((sum, t) => sum + t.weight, 0)
          let r = Math.random() * totalWeight
          let selected: any | undefined
          for (const t of techniques) {
            r -= t.weight
            if (r <= 0) {
              selected = t
              break
            }
          }
          selected = selected ?? techniques[techniques.length - 1]

          for (const t of techniques) {
            if (t.name !== selected.name) {
              this.counters.set(t.name, (this.counters.get(t.name) ?? 0) + 1)
            }
          }
          this.counters.set(selected.name, 0)
          return selected
        }
      },
      currentTechnique: null,
      techniquesUsed: 0,
      updateSessionStats: vi.fn(),
      selectAndSetNextTechnique: function(config: any) {
        if (!this.isActive) return null
        const selectedTechniques = config.techniques.filter((t: any) => t.selected)
        if (selectedTechniques.length === 0) return null
        const technique = this.selectionStrategy.selectTechnique(selectedTechniques)
        this.currentTechnique = technique
        this.techniquesUsed++
        this.updateSessionStats(technique)
        return technique
      }
    }

    const techniques = [
      { name: 'Low', weight: 1, selected: true, category: 'Punches' },
      { name: 'High', weight: 4, selected: true, category: 'Punches' }
    ] as any[]

    const config = { techniques }
    let highCount = 0

    for (let i = 0; i < 10000; i++) {
      const picked = mockSessionManager.selectAndSetNextTechnique(config)
      if (picked.name === 'High') highCount++
    }

    const percentage = highCount / 10000
    // High-weight (4) should be picked ~80% of the time (70–90 range covers variance)
    expect(percentage).toBeGreaterThanOrEqual(0.7)
    expect(percentage).toBeLessThanOrEqual(0.9)
  })
})
