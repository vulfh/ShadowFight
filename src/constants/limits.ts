// Session configuration limits
export const SESSION_LIMITS = {
  MIN_DURATION: 1,
  MAX_DURATION: 30,
  MIN_DELAY: 1,
  MAX_DELAY: 10,
  MIN_VOLUME: 0,
  MAX_VOLUME: 100,
  MAX_CONSECUTIVE_AUDIO_FAILURES: 3,
  SESSION_RESTORE_TIME_LIMIT: 5 * 60 * 1000, // 5 minutes in milliseconds
  SESSION_SAVE_INTERVAL: 30 // Save every 30 seconds
} as const

// Fight List limits
export const FIGHT_LIST_LIMITS = {
  MAX_FIGHT_LISTS: 50,
  MAX_NAME_LENGTH: 50,
  MIN_NAME_LENGTH: 1,
  MAX_TECHNIQUES_PER_LIST: 100
} as const

// Performance limits
export const PERFORMANCE_LIMITS = {
  MAX_MEMORY_USAGE: 50, // MB
  MAX_LOAD_TIME: 2000, // ms
  MAX_OPERATION_TIME: 200 // ms
} as const
