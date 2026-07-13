import { STRATEGY_TYPES } from '../constants/strategies'

/**
 * The four play modes exposed in the Play Mode Selector dropdown.
 * String values intentionally match display labels so no separate label map is needed.
 */
export type PlayMode = 'Random' | 'Unified Random' | 'Ordered' | 'Prioritized'

/** Ordered list used to populate the dropdown and validate stored values. */
export const PLAY_MODES: readonly PlayMode[] = [
  'Random',
  'Unified Random',
  'Ordered',
  'Prioritized'
]

/** Fallback used when localStorage contains no valid value. */
export const DEFAULT_PLAY_MODE: PlayMode = 'Random'

/**
 * Maps each PlayMode to the corresponding STRATEGY_TYPES value
 * consumed by TechniqueSelectionStrategyFactory.
 */
export const PLAY_MODE_TO_STRATEGY: Record<
  PlayMode,
  typeof STRATEGY_TYPES[keyof typeof STRATEGY_TYPES]
> = {
  'Random':         STRATEGY_TYPES.RANDOM,
  'Unified Random': STRATEGY_TYPES.UNIFIED_RANDOM,
  'Ordered':        STRATEGY_TYPES.ORDERED,
  'Prioritized':    STRATEGY_TYPES.PRIORITIZED
}
