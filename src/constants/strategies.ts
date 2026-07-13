// Strategy types
export const STRATEGY_TYPES = {
  RANDOM:         'random',
  ROUND_ROBIN:    'roundRobin',       // keep — backward compat
  PRIORITY_BASED: 'priorityBased',   // keep — backward compat
  UNIFIED_RANDOM: 'unifiedRandom',
  ORDERED:        'ordered',
  PRIORITIZED:    'prioritized'
} as const

// Technique categories
export const TECHNIQUE_CATEGORIES = {
  PUNCHES: 'Punches',
  STRIKES: 'Strikes',
  KICKS: 'Kicks',
  KNEES: 'Knees',
  DEFENSES_GRABS: 'Defenses/Grabs',
  WEAPONS: 'Weapons',
  HAND_GRIP: 'Hand-Grip',
  KNIFE: 'Knife',
  SLIP: 'Slip',
  DEFENCE: 'Defence',
  KNEE_PROTECTION: 'Knee-Protection',
  TAKE_DOWN: 'Take Down',
  ELBOW_STRIKE: 'Elbow Strike'
} as const

// Priority levels
export const PRIORITY_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
} as const
