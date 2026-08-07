import { Technique } from '../types'
import { STRATEGY_TYPES, PRIORITY_LEVELS, ERROR_MESSAGES } from '../constants'

// Strategy interface for technique selection (OCP principle)
export interface ITechniqueSelectionStrategy {
  selectTechnique(techniques: Technique[]): Technique
  getName(): string
  reset?(): void
}

// Random selection strategy implementation
export class RandomTechniqueSelectionStrategy implements ITechniqueSelectionStrategy {
  selectTechnique(techniques: Technique[]): Technique {
    if (techniques.length === 0) {
      throw new Error(ERROR_MESSAGES.NO_TECHNIQUES_AVAILABLE)
    }

    // Calculate total weight for weighted random selection
    const totalWeight = techniques.reduce((sum, technique) => sum + technique.weight, 0)
    let random = Math.random() * totalWeight

    // Select technique based on weight
    for (const technique of techniques) {
      random -= technique.weight
      if (random <= 0) {
        return technique
      }
    }

    // Fallback to first technique
    return techniques[0]
  }

  getName(): string {
    return 'Random Selection'
  }

  reset(): void {
    // Stateless — no-op for interface compliance
  }
}

// Unified random selection strategy — shuffles all techniques before repeating any
export class UnifiedRandomTechniqueSelectionStrategy implements ITechniqueSelectionStrategy {
  private remaining: Set<string> = new Set()

  selectTechnique(techniques: Technique[]): Technique {
    if (techniques.length === 0) {
      throw new Error(ERROR_MESSAGES.NO_TECHNIQUES_AVAILABLE)
    }

    // Start a fresh round when all techniques have been picked
    if (this.remaining.size === 0) {
      techniques.forEach(t => this.remaining.add(t.name))
    }

    const eligible = techniques.filter(t => this.remaining.has(t.name))
    const picked = eligible[Math.floor(Math.random() * eligible.length)]
    this.remaining.delete(picked.name)

    // Pre-seed next round immediately so the set is never empty on the next call
    if (this.remaining.size === 0) {
      techniques.forEach(t => this.remaining.add(t.name))
    }

    return picked
  }

  getName(): string {
    return 'Unified Random Selection'
  }

  reset(): void {
    this.remaining = new Set()
  }
}

// Ordered selection strategy — cycles through techniques in array order, wrapping around
export class OrderedTechniqueSelectionStrategy implements ITechniqueSelectionStrategy {
  private index: number = 0

  selectTechnique(techniques: Technique[]): Technique {
    if (techniques.length === 0) {
      throw new Error(ERROR_MESSAGES.NO_TECHNIQUES_AVAILABLE)
    }

    const technique = techniques[this.index % techniques.length]
    this.index = (this.index + 1) % techniques.length
    return technique
  }

  getName(): string {
    return 'Ordered Selection'
  }

  reset(): void {
    this.index = 0
  }
}

// Prioritized selection strategy — weighted draw with anti-starvation protection
export class PrioritizedTechniqueSelectionStrategy implements ITechniqueSelectionStrategy {
  /** Tracks how many consecutive rounds each technique was NOT picked. */
  private counters: Map<string, number> = new Map()

  private static readonly STARVATION_THRESHOLD = 5

  selectTechnique(techniques: Technique[]): Technique {
    if (techniques.length === 0) {
      throw new Error(ERROR_MESSAGES.NO_TECHNIQUES_AVAILABLE)
    }

    // Ensure every technique has a counter entry
    for (const t of techniques) {
      if (!this.counters.has(t.name)) this.counters.set(t.name, 0)
    }

    // Anti-starvation: force-select the lowest-weight starving technique (ties → earliest index)
    const starving = techniques.filter(
      t => (this.counters.get(t.name) ?? 0) >= PrioritizedTechniqueSelectionStrategy.STARVATION_THRESHOLD
    )
    if (starving.length > 0) {
      const forced = starving.reduce((min, t) => (t.weight < min.weight ? t : min))
      this.incrementCountersExcept(techniques, forced.name)
      this.counters.set(forced.name, 0)
      return forced
    }

    // Normal weighted random draw
    const totalWeight = techniques.reduce((sum, t) => sum + t.weight, 0)
    let r = Math.random() * totalWeight
    let selected: Technique | undefined
    for (const t of techniques) {
      r -= t.weight
      if (r <= 0) { selected = t; break }
    }
    // Floating-point fallback
    selected = selected ?? techniques[techniques.length - 1]

    this.incrementCountersExcept(techniques, selected.name)
    this.counters.set(selected.name, 0)
    return selected
  }

  private incrementCountersExcept(techniques: Technique[], excludeName: string): void {
    for (const t of techniques) {
      if (t.name !== excludeName) {
        this.counters.set(t.name, (this.counters.get(t.name) ?? 0) + 1)
      }
    }
  }

  getName(): string {
    return 'Prioritized Selection'
  }

  reset(): void {
    this.counters.clear()
  }
}

// Round-robin selection strategy implementation
export class RoundRobinTechniqueSelectionStrategy implements ITechniqueSelectionStrategy {
  private currentIndex: number = 0

  selectTechnique(techniques: Technique[]): Technique {
    if (techniques.length === 0) {
      throw new Error(ERROR_MESSAGES.NO_TECHNIQUES_AVAILABLE)
    }

    const technique = techniques[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % techniques.length
    return technique
  }

  getName(): string {
    return 'Round Robin Selection'
  }
}

// Priority-based selection strategy implementation
export class PriorityBasedTechniqueSelectionStrategy implements ITechniqueSelectionStrategy {
  selectTechnique(techniques: Technique[]): Technique {
    if (techniques.length === 0) {
      throw new Error(ERROR_MESSAGES.NO_TECHNIQUES_AVAILABLE)
    }

    // Group techniques by priority
    const highPriority = techniques.filter(t => t.priority === PRIORITY_LEVELS.HIGH)
    const mediumPriority = techniques.filter(t => t.priority === PRIORITY_LEVELS.MEDIUM)
    const lowPriority = techniques.filter(t => t.priority === PRIORITY_LEVELS.LOW)

    // Select from highest available priority
    if (highPriority.length > 0) {
      return this.selectRandomFromGroup(highPriority)
    } else if (mediumPriority.length > 0) {
      return this.selectRandomFromGroup(mediumPriority)
    } else {
      return this.selectRandomFromGroup(lowPriority)
    }
  }

  private selectRandomFromGroup(techniques: Technique[]): Technique {
    const randomIndex = Math.floor(Math.random() * techniques.length)
    return techniques[randomIndex]
  }

  getName(): string {
    return 'Priority-Based Selection'
  }
}

// Strategy factory for easy strategy creation
export class TechniqueSelectionStrategyFactory {
  static createStrategy(type: typeof STRATEGY_TYPES[keyof typeof STRATEGY_TYPES]): ITechniqueSelectionStrategy {
    switch (type) {
      case STRATEGY_TYPES.RANDOM:
        return new RandomTechniqueSelectionStrategy()
      case STRATEGY_TYPES.ROUND_ROBIN:
        return new RoundRobinTechniqueSelectionStrategy()
      case STRATEGY_TYPES.PRIORITY_BASED:
        return new PriorityBasedTechniqueSelectionStrategy()
      case STRATEGY_TYPES.UNIFIED_RANDOM:
        return new UnifiedRandomTechniqueSelectionStrategy()
      case STRATEGY_TYPES.ORDERED:
        return new OrderedTechniqueSelectionStrategy()
      case STRATEGY_TYPES.PRIORITIZED:
        return new PrioritizedTechniqueSelectionStrategy()
      default:
        return new RandomTechniqueSelectionStrategy()
    }
  }

  static getAvailableStrategies(): Array<{ type: string; name: string }> {
    return [
      { type: STRATEGY_TYPES.RANDOM, name: 'Random Selection' },
      { type: STRATEGY_TYPES.ROUND_ROBIN, name: 'Round Robin Selection' },
      { type: STRATEGY_TYPES.PRIORITY_BASED, name: 'Priority-Based Selection' },
      { type: STRATEGY_TYPES.UNIFIED_RANDOM, name: 'Unified Random Selection' },
      { type: STRATEGY_TYPES.ORDERED, name: 'Ordered Selection' },
      { type: STRATEGY_TYPES.PRIORITIZED, name: 'Prioritized Selection' }
    ]
  }
}
