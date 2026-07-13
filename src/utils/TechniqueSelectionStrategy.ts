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
      default:
        return new RandomTechniqueSelectionStrategy()
    }
  }

  static getAvailableStrategies(): Array<{ type: string; name: string }> {
    return [
      { type: STRATEGY_TYPES.RANDOM, name: 'Random Selection' },
      { type: STRATEGY_TYPES.ROUND_ROBIN, name: 'Round Robin Selection' },
      { type: STRATEGY_TYPES.PRIORITY_BASED, name: 'Priority-Based Selection' }
    ]
  }
}
