// Strategy types
export const STRATEGY_TYPES = {
  RANDOM: 'random',
  ROUND_ROBIN: 'roundRobin',
  PRIORITY_BASED: 'priorityBased'
} as const

// Technique categories
export const TECHNIQUE_CATEGORIES = {
  PUNCHES: 'Punches',
  STRIKES: 'Strikes',
  KICKS: 'Kicks',
  KNEES: 'Knees',
  DEFENSES_GRABS: 'Defenses/Grabs',
  WEAPONS: 'Weapons'
} as const

// Priority levels
export const PRIORITY_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const
