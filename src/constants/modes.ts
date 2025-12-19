/**
 * Mode constants for techniques and fightlists
 * Defines the available modes and validation rules
 */

/**
 * Technique modes - defines how a technique can be used
 */
export const TECHNIQUE_MODES = {
  /** The player actively uses the technique to achieve an effect */
  PERFORMING: 'PERFORMING',
  /** The player uses the technique to react to or counter an effect */
  RESPONDING: 'RESPONDING'
} as const

/**
 * Fightlist modes - defines the type of fightlist
 */
export const FIGHTLIST_MODES = {
  /** Fightlist contains techniques used in PERFORMING mode */
  PERFORMING: 'PERFORMING',
  /** Fightlist contains techniques used in RESPONDING mode */
  RESPONDING: 'RESPONDING'
} as const

/**
 * Mode validation rules
 */
export const MODE_VALIDATION = {
  /** Minimum number of modes a technique must support */
  MIN_MODES_PER_TECHNIQUE: 1,
  /** Maximum number of modes a technique can support */
  MAX_MODES_PER_TECHNIQUE: 2,
  /** Valid technique mode values */
  VALID_TECHNIQUE_MODES: Object.values(TECHNIQUE_MODES),
  /** Valid fightlist mode values */
  VALID_FIGHTLIST_MODES: Object.values(FIGHTLIST_MODES)
} as const

/**
 * Type for technique mode values
 */
export type TechniqueModeValue = typeof TECHNIQUE_MODES[keyof typeof TECHNIQUE_MODES]

/**
 * Type for fightlist mode values
 */
export type FightListModeValue = typeof FIGHTLIST_MODES[keyof typeof FIGHTLIST_MODES]

